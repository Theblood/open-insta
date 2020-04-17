'use strict';

exports.InstagramURL = 'https://www.instagram.com/';
exports.UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36';

exports.DefaultOptions = {
    puppeteer: {
        headless: true, 
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--no-default-browser-check',
            '--disable-infobars',
            '--disable-web-security',
            '--no-experiments',
            '--ignore-gpu-blacklist',
            '--ignore-certificate-errors',
            '--ignore-certificate-errors-spki-list',
            '--disable-extensions'
        ]
    },
    session: false
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
 * Selectors used for mapping movements of headless
 * @readonly
 */
exports.Selectors = {
    USERNAME: '._2hvTZ.pexuQ.zyHYP[name=username]',
    PASSWORD: '._2hvTZ.pexuQ.zyHYP[name=password]',
    SUBMIT_LOGIN: '.sqdOP.L3NKy.y3zKF[type=submit]',
    PAGE_LOADED: 'p.O4QwN',
    BUTTON_BYPASS: 'button.yZn4P',
    SECURITY_CODE: 'input[name=security_code]',
    SECURITY_CODE_2: '.yZn4P',
    TROUBLES: 'p#slfErrorAlert',
    NOTIFICATION_APPEAR: '.piCib',
    NOTIFICATION_CLOSE: '.aOOlW.HoLwm',
    ALREDY_LOADED: '._2dbep.qNELH',
    INBOX: '.sqdOP.L3NKy.y3zKF'
};