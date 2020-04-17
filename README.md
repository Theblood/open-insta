# open-insta
Welcome to best autonomous API for Instagram Direct. This library provide you an alternative solution for Instagram API without any approval process, just setup an use your private API. It's based on reverse engineering of Instagram Web and runs into headless browser behind the scenes.

Special thanks to developers of amazing packages and ideas used here, Pedro Lopez (whatsapp-web.js) and Mohammed Shah (smashah)

## Features

| Feature  | Status |
| ------------- | ------------- |
| Receive messages  | ✅  |
| Send messages  | ✅  |
| Send Likes  | ✅  |
| Send typing  | ✅  |
| Read inbox | ✅ |
| Get profile info | ✅ |


## Setup Example
```node
const fs = require('fs');
const { Client } = require('./index');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/* 
* Checking if we have information about some previous loggin
*/
const SESSION_FILE_PATH = './session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

/* 
* This represent begginig of declaration, you can parse values to puppeter also
* can avoiding a new loggin sendind previous login data saved on ./session.json
*/
const client = new Client({ 
    puppeteer: { headless: false }, 
    session: sessionCfg 
});

/* 
* Calling initialization pipeline, will open headless and start project
*/
client.initialize();

/* 
* This important step is fired when during loggin you're forced to 
* an 2factor authentication, this wrapper will ask you for some token
* received over SMS or e-mail, over terminal, when you type press ENTER.
* Method based on: https://github.com/joaomirandasa/headless2FA
*/
client.on('authentication_2fa', ()=>{
    rl.question("[2Factor Bypass] - What is the token received over SMS/E-mail? ", (input) => {
        client.emit('authentication_answer',input);
    });
});

/* 
* If everything goes well, your loggin is processed and you can save 
* data on some file to future avoid new loggins
*/
client.on('authenticated', (session) => {
    console.log('[AUTHENTICATED]', session);
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});

/* 
* When you face something wrong over loggin and auth,  
* probabbly is time to set headless: false and check
* why your auth failed
*/
client.on('auth_failure', inform => {
   console.error('[AUTHENTICATION FAILURE]', inform);
});

/* 
* Claps! Your instance is running now  
*/
client.on('ready', () => {
    console.log('[READY]');
});

/* 
* When you receive some message this event will be fired
*/
client.on('message', async msg => {
    console.log('[MESSAGE RECEIVED]', msg);
});

/* 
* For some reason your instance is disconnected, firing this event
*/
client.on('disconnected', (reason) => {
    console.log('[DISCONNECTED]', reason);
});
```


## Security
I can't precise if you will be banned of Instagram services or anything related to this, this project was created to study reverse engineering into production applications. You're is the unique responsible for wich use you make of this.