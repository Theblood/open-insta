# open-insta
Welcome to best autonomous API for Instagram Direct. This library provide you an alternative solution for Instagram API without any approval process, just setup an use your private API. It's based on reverse engineering of Instagram Web and runs into headless browser behind the scenes.

Special thanks to developers of amazing packages and ideas used here, Pedro Lopez [(pedroslopez)](https://github.com/pedroslopez) (whatsapp-web.js) and Mohammed Shah [(smashah)](https://github.com/smashah)

## Features

| Feature  | Status |
| ------------- | ------------- |
| Receive messages  | ✅  |
| Send messages  | ✅  |
| Send Likes  | ✅  |
| Send typing  | ✅  |
| Read inbox | ✅ |
| Get profile info | ✅ |
| WhatsApp / SMS / app code at login | ✅ |


## What changed in 1.1.0

The 2020 CSS selectors and the `window.__r` module walk no longer match the web client. Login is the page itself: it encrypts the password and posts the GraphQL mutation `useCDSWebLoginMutation`. On 9 Nov 2026 that mutation, from a fresh browser, continued to `https://www.instagram.com/auth_platform/codeentry/` and rendered **Revisa tus mensajes de WhatsApp**. The library waits there and submits whatever code you pass to `answerChallenge`.

Requests made by that page used `X-IG-App-ID: 936619743392459` and `X-ASBD-ID: 359341`. Direct calls reuse those headers inside the same browser session. The inbox itself stays on `/api/v1/direct_v2/`. That part could not be re-captured: Instagram stopped the session on the WhatsApp code, before `/direct/inbox/` loaded.

Chrome or Chromium has to be installed. `puppeteer-core` does not download a browser. Set `puppeteer.executablePath` or `PUPPETEER_EXECUTABLE_PATH` when it is not on the default path.

## Run

Put the account in `.env` (this file is gitignored). Quote the password when it contains `$`:

```
INSTAGRAM_USERNAME=you@example.com
INSTAGRAM_PASSWORD='your password'
```

```
npm install
node example.js
```

Chrome opens visibly. If Instagram sends a WhatsApp code, the terminal asks for it. Paste the code and press Enter. The script then accepts **Guardar información** and **Confiar en este dispositivo**. The next run reuses `.session/chrome` and `session.json`, which is how Instagram recognizes the same device and skips the login.

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
    session: sessionCfg,
    credentials: {
        username: process.env.INSTAGRAM_USERNAME,
        password: process.env.INSTAGRAM_PASSWORD
    }
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
client.on('authentication_2fa', (challenge) => {
    const where = challenge && challenge.channel ? challenge.channel : 'verification';
    rl.question("[Código " + where + "] Pégalo y presiona ENTER: ", (input) => {
        client.answerChallenge(input);
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

## Contributing

I'm looking forward to seeing what you can build out of it, so if you create something using this library, please let me know. If you develop something interesting we will be waiting for your PULL REQUEST.

## License

[MIT](https://choosealicense.com/licenses/mit/)

## Legal

This code is in no way affiliated with, authorized, maintained, sponsored or endorsed by Instagram or any of its affiliates or subsidiaries. This is an independent and unofficial software. Use at your own risk.

## Cryptography Notice

This distribution includes cryptographic software. The country in which you currently reside may have restrictions on the import, possession, use, and/or re-export to another country, of encryption software. BEFORE using any encryption software, please check your country's laws, regulations and policies concerning the import, possession, or use, and re-export of encryption software, to see if this is permitted. See [http://www.wassenaar.org/](http://www.wassenaar.org/) for more information.

The U.S. Government Department of Commerce, Bureau of Industry and Security (BIS), has classified this software as Export Commodity Control Number (ECCN) 5D002.C.1, which includes information security software using or performing cryptographic functions with asymmetric algorithms. The form and manner of this distribution makes it eligible for export under the License Exception ENC Technology Software Unrestricted (TSU) exception (see the BIS Export Administration Regulations, Section 740.13) for both object code and source code.