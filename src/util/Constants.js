'use strict';

exports.InstagramURL = 'https://www.instagram.com/';

/**
 * Values read from the live web client on 2026-11-09.
 * `X-IG-App-ID` comes from RelayAPIConfigDefaults and `X-ASBD-ID`
 * from the BDHeaderConfig module. A logged-in session overwrites
 * them when the page itself makes a request.
 */
exports.WebClient = {
    appId: '936619743392459',
    asbdId: '359341',
    igD: 'www'
};

exports.DefaultOptions = {
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--lang=es-CL,es,en-US',
            '--window-size=1280,900'
        ]
    },
    session: false,
    pollInterval: 5000,
    otpTimeout: 600000,
    credentials: null
};

/**
 * Events that can be emitted by the client
 * @readonly
 */
exports.Events = {
    AUTHENTICATED: 'authenticated',
    AUTHENTICATION_FAILURE: 'auth_failure',
    READY: 'ready',
    MESSAGE_RECEIVED: 'message',
    MESSAGE_CREATE: 'message_create',
    MESSAGE_REVOKED_EVERYONE: 'message_revoke_everyone',
    MESSAGE_REVOKED_ME: 'message_revoke_me',
    MESSAGE_ACK: 'message_ack',
    DISCONNECTED: 'disconnected',
    STATE_CHANGED: 'change_state',
    AUTHENTICATION_2FA: 'authentication_2fa',
    AUTHENTICATION_ANSWER: 'authentication_answer'
};

/**
 * Selectors observed on the current login page.
 * The form is rendered in Spanish or English and no longer uses the
 * 2020 CSS-module class names. `email` / `pass` are the live names;
 * `username` / `password` remain as a fallback.
 * @readonly
 */
exports.Selectors = {
    USERNAME: 'input[name="email"], input[name="username"]',
    PASSWORD: 'input[name="pass"], input[name="password"]',
    SUBMIT_LOGIN: 'button[type="submit"], input[type="submit"]'
};

exports.Labels = {
    LOGIN: '^(iniciar sesi[oó]n|log in)$',
    DISMISS: '^(ahora no|not now|omitir)$',
    SAVE: '^(guardar( informaci[oó]n)?|save( info)?)$',
    TRUST: '^(s[ií],? confiar|confiar( en este dispositivo)?|trust( this device)?|recordar( este)? dispositivo)$',
    CONFIRM: '^(continuar|continue|confirmar|confirm|enviar|verificar|verify)$',
    COOKIES: '^(permitir todas( las cookies)?|allow all( cookies)?|aceptar todo)$'
};
