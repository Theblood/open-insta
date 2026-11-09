const fs = require('fs');
const path = require('path');
const { Client } = require('./index');
const { loadEnvFile } = require('./src/util/env');
const readline = require('readline');

loadEnvFile(path.join(__dirname, '.env'));

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const SESSION_FILE_PATH = path.join(__dirname, 'session.json');
const PROFILE_DIR = path.join(__dirname, '.session', 'chrome');
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

const username = process.env.INSTAGRAM_USERNAME;
const password = process.env.INSTAGRAM_PASSWORD;
if (!sessionCfg && (!username || !password)) {
    console.error('Crea un archivo .env con INSTAGRAM_USERNAME e INSTAGRAM_PASSWORD.');
    process.exit(1);
}

fs.mkdirSync(PROFILE_DIR, { recursive: true });

const client = new Client({
    puppeteer: {
        headless: false,
        userDataDir: PROFILE_DIR
    },
    session: sessionCfg,
    credentials: username && password ? { username, password } : null
});

client.on('authentication_2fa', (challenge) => {
    const where = challenge && challenge.channel ? challenge.channel : 'verificación';
    const hint = challenge && challenge.hint ? ' (' + challenge.hint + ')' : '';
    rl.question('[Código ' + where + hint + '] Pégalo y presiona ENTER: ', (input) => {
        client.answerChallenge(input);
    });
});

client.on('authenticated', (session) => {
    const names = (session.cookies || []).map((cookie) => cookie.name);
    console.log('[AUTHENTICATED] cookies:', names.join(', '));
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) console.error(err);
    });
});

client.on('auth_failure', (inform) => {
    console.error('[AUTHENTICATION FAILURE]', inform);
});

client.on('ready', async () => {
    console.log('[READY] Sesión guardada. La próxima ejecución reutiliza el mismo Chrome.');
    try {
        const inbox = await client.getInbox();
        console.log('[INBOX]', inbox.threads.map((thread) => ({
            thread_id: thread.thread_id,
            users: thread.users.map((user) => user.username)
        })));
    } catch (error) {
        console.error('[INBOX]', error.message);
    }
});

client.on('message', async (msg) => {
    console.log('[MESSAGE RECEIVED]', msg.thread_id, msg.body && msg.body.text, msg.user && msg.user.username);
});

client.on('disconnected', (reason) => {
    console.log('[DISCONNECTED]', reason);
});

client.initialize().catch((error) => {
    console.error('[INITIALIZE]', error.message);
    process.exitCode = 1;
});
