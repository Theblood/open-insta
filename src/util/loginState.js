'use strict';

function pathOf(href) {
    try {
        return new URL(href, 'https://www.instagram.com').pathname;
    } catch (error) {
        return String(href || '');
    }
}

function hintFrom(text) {
    const phone = String(text || '').match(/\+\*+\d+/);
    return phone ? phone[0] : null;
}

/**
 * Classify the screen currently shown by instagram.com.
 * The samples come from the live login flow: the form posts
 * `useCDSWebLoginMutation`, and a checkpoint lands on
 * `/auth_platform/codeentry/` with the heading
 * "Revisa tus mensajes de WhatsApp".
 *
 * @param {{ href?: string, text?: string, hasSession?: boolean, inputs?: Array<{name?: string, type?: string}> }} snapshot
 * @returns {{ type: string, channel?: string, hint?: string|null, path?: string, message?: string }}
 */
function classifyLoginState(snapshot = {}) {
    const text = String(snapshot.text || '');
    const normalized = text.toLowerCase();
    const path = pathOf(snapshot.href);
    const inputs = Array.isArray(snapshot.inputs) ? snapshot.inputs : [];

    if (/http error 429|please wait a few minutes|espera unos minutos/.test(normalized)) {
        return {
            type: 'rate_limited',
            path,
            message: 'Instagram respondió 429. Hay que esperar antes de volver a intentar.'
        };
    }

    if (/whatsapp/.test(normalized) && /c[oó]digo|code/.test(normalized)) {
        return { type: 'otp', channel: 'whatsapp', hint: hintFrom(text), path };
    }

    if (/\/auth_platform\/|\/accounts\/login\/two_factor|\/two_step_verification/.test(path)) {
        let channel = 'app';
        if (/whatsapp/.test(normalized)) channel = 'whatsapp';
        else if (/sms|mensaje de texto|tel[eé]fono/.test(normalized)) channel = 'sms';
        else if (/correo|e-mail|email/.test(normalized)) channel = 'email';
        return { type: 'otp', channel, hint: hintFrom(text), path };
    }

    if (/c[oó]digo de seguridad|security code|two-factor|autenticaci[oó]n en dos pasos/.test(normalized)) {
        return { type: 'otp', channel: 'app', hint: hintFrom(text), path };
    }

    if (/la informaci[oó]n de inicio de sesi[oó]n que ingresaste es incorrecta|sorry, your password was incorrect|the login information you entered is incorrect/.test(normalized)) {
        return {
            type: 'bad_credentials',
            path,
            message: 'Instagram rechazó el usuario o la contraseña.'
        };
    }

    if (/confiar en este dispositivo|trust this device|recordar este dispositivo|dispositivo de confianza|don't ask for (the )?code again|no volver a pedir/.test(normalized)) {
        return { type: 'trust_device', path };
    }

    if (/guardar (tu |la )?informaci[oó]n de inicio|save your login info|save info/.test(normalized)) {
        return { type: 'save_login', path };
    }

    if (/activar notificaciones|turn on notifications/.test(normalized)) {
        return { type: 'notifications', path };
    }

    if (snapshot.hasSession && !/\/accounts\/login|\/auth_platform|\/challenge\//.test(path)) {
        return { type: 'authenticated', path };
    }

    const hasUser = inputs.some((input) => input.name === 'email' || input.name === 'username');
    const hasPassword = inputs.some((input) => input.name === 'pass' || input.name === 'password' || input.type === 'password');
    if (hasUser && hasPassword && /\/accounts\/login/.test(path)) {
        return { type: 'login_form', path };
    }

    if (/\/challenge\//.test(path)) {
        return {
            type: 'challenge',
            path,
            message: 'Instagram pidió una verificación que no es un código de un solo uso.'
        };
    }

    return { type: 'unknown', path };
}

module.exports = {
    classifyLoginState,
    pathOf
};
