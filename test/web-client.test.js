'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const fs = require('fs');
const os = require('os');
const path = require('path');
const { classifyLoginState } = require('../src/util/loginState');
const { sessionCookies, sessionLocalStorage } = require('../src/util/Session');
const { loadEnvFile } = require('../src/util/env');
const { textPayload, likePayload, typingPayload, simplifyInbox } = require('../src/util/directPayload');
const Message = require('../src/Structures/Message');
const User = require('../src/Structures/User');

const WHATSAPP_SCREEN = [
    'blood.sys • Instagram',
    'Revisa tus mensajes de WhatsApp',
    'Ingresa el código que enviamos a tu cuenta de WhatsApp al +*********78.',
    'Código',
    'Continuar',
    'Usar otro método'
].join('\n');

test('login form uses the email and pass fields seen on the live page', () => {
    const state = classifyLoginState({
        href: 'https://www.instagram.com/accounts/login/',
        text: 'Iniciar sesión en Instagram\nNúmero de celular, nombre de usuario o correo electrónico\nContraseña',
        inputs: [
            { name: 'email', type: 'text' },
            { name: 'pass', type: 'password' }
        ]
    });
    assert.equal(state.type, 'login_form');
});

test('WhatsApp checkpoint is an otp challenge', () => {
    const state = classifyLoginState({
        href: 'https://www.instagram.com/auth_platform/codeentry/?apc=redacted',
        text: WHATSAPP_SCREEN
    });
    assert.equal(state.type, 'otp');
    assert.equal(state.channel, 'whatsapp');
    assert.equal(state.hint, '+*********78');
    assert.equal(state.path, '/auth_platform/codeentry/');
});

test('a rejected password stays a credential error', () => {
    const state = classifyLoginState({
        href: 'https://www.instagram.com/accounts/login/',
        text: 'La información de inicio de sesión que ingresaste es incorrecta.',
        inputs: [
            { name: 'email', type: 'text' },
            { name: 'pass', type: 'password' }
        ]
    });
    assert.equal(state.type, 'bad_credentials');
});

test('a trust-device screen is not dismissed', () => {
    const state = classifyLoginState({
        href: 'https://www.instagram.com/',
        text: 'Confiar en este dispositivo\nNo volver a pedir el código en este navegador\nConfiar'
    });
    assert.equal(state.type, 'trust_device');
});

test('env values keep a dollar sign and a star', () => {
    const file = path.join(os.tmpdir(), 'open-insta-env-' + process.pid + '.env');
    const previous = process.env.INSTAGRAM_PASSWORD;
    fs.writeFileSync(file, "INSTAGRAM_PASSWORD='$secret*'\n");
    delete process.env.INSTAGRAM_PASSWORD;
    loadEnvFile(file);
    assert.equal(process.env.INSTAGRAM_PASSWORD, '$secret*');
    if (previous == null) delete process.env.INSTAGRAM_PASSWORD;
    else process.env.INSTAGRAM_PASSWORD = previous;
    fs.unlinkSync(file);
});

test('saved localStorage is restored with the cookies', () => {
    const stored = sessionLocalStorage({
        cookies: [],
        localStorage: { trusted_devices_storage_version: '{"1":{"nonce":"abc"}}' }
    });
    assert.equal(JSON.parse(stored.trusted_devices_storage_version)['1'].nonce, 'abc');
    assert.equal(sessionLocalStorage([{ name: 'sessionid', value: 'x' }]), null);
});

test('session cookies accept the old object and a bare array', () => {
    const cookie = { name: 'sessionid', value: 'abc', domain: '.instagram.com', path: '/' };
    assert.deepEqual(sessionCookies({ cookies: [cookie], localStorage: {} }).map((item) => item.name), ['sessionid']);
    assert.deepEqual(sessionCookies([cookie]).map((item) => item.value), ['abc']);
    assert.deepEqual(sessionCookies(false), []);
});

test('direct payloads keep one id for context and mutation', () => {
    const text = textPayload('1789', 'hola', 'fixed-id');
    assert.equal(text.client_context, 'fixed-id');
    assert.equal(text.mutation_token, 'fixed-id');
    assert.equal(text.thread_ids, '["1789"]');
    assert.equal(text.text, 'hola');
    assert.equal(text.action, 'send_item');

    const like = likePayload('1789', 'like-id');
    assert.equal(like.thread_ids, '["1789"]');
    assert.equal(like.action, 'send_item');
    assert.equal(like.text, undefined);

    assert.equal(typingPayload(true, 'type-id').activity_status, '1');
    assert.equal(typingPayload(false, 'type-id').activity_status, '0');
});

test('inbox threads keep the user and the item id', () => {
    const inbox = simplifyInbox({
        inbox: {
            unseen_count: 1,
            has_older: false,
            threads: [{
                thread_id: '42',
                thread_title: 'Ana',
                users: [{ pk: '7', username: 'ana', full_name: 'Ana', profile_pic_url: 'https://cdn.example/a.jpg' }],
                items: [{ item_id: '99', item_type: 'text', text: 'hola' }]
            }]
        }
    });
    assert.equal(inbox.unseen_count, 1);
    assert.equal(inbox.threads[0].users[0].username, 'ana');
    assert.equal(inbox.threads[0].items[0].item_id, '99');
});

test('message and user structures accept a direct item', () => {
    const message = new Message(null, {
        item_id: '99',
        item_type: 'text',
        text: 'hola',
        user_id: '7',
        timestamp: 10
    });
    assert.equal(message.body.op, 'add');
    assert.equal(message.body.text, 'hola');

    const legacy = new Message(null, { op: 'remove', value: '{"item_id":"1"}' });
    assert.equal(legacy.body.op, 'remove');
    assert.equal(legacy.body.item_id, '1');

    const user = new User(null, { id: '7', username: 'ana' });
    assert.equal(user.pk, '7');
    assert.equal(user.username, 'ana');
});
