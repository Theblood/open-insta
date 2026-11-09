'use strict';

const EventEmitter = require('events');
const puppeteer = require('puppeteer-core');

const Util = require('./util/Util');
const { InstagramURL, WebClient, DefaultOptions, Events, Labels } = require('./util/Constants');
const { classifyLoginState } = require('./util/loginState');
const { sessionCookies, sessionLocalStorage } = require('./util/Session');
const { textPayload, likePayload, typingPayload, simplifyInbox } = require('./util/directPayload');
const { findChrome } = require('./util/browser');
const { installApi } = require('./util/Injected');
const Message = require('./Structures/Message');
const User = require('./Structures/User');

class Client extends EventEmitter {

    constructor(options = {}) {
        super();
        this.options = Util.mergeDefault(DefaultOptions, options);
        this.pupBrowser = null;
        this.pupPage = null;
        this._pollTimer = null;
        this._webConfig = Object.assign({}, WebClient);
    }

    /**
     * Opens Instagram, restores or creates a session, and starts watching the inbox.
     * A WhatsApp / SMS / app code pauses on `authentication_2fa` until
     * `answerChallenge(code)` (or the `authentication_answer` event) arrives.
     */
    async initialize() {
        const executablePath = findChrome(this.options.puppeteer.executablePath);
        const launchOptions = Object.assign({}, this.options.puppeteer, {
            executablePath,
            ignoreDefaultArgs: ['--enable-automation']
        });
        const browser = await puppeteer.launch(launchOptions);
        const page = (await browser.pages())[0] || await browser.newPage();
        this.pupBrowser = browser;
        this.pupPage = page;

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'es-CL,es;q=0.9,en-US;q=0.8,en;q=0.7'
        });

        const cookies = sessionCookies(this.options.session);
        if (cookies.length) {
            await page.setCookie(...cookies);
        }
        await this._restoreLocalStorage(sessionLocalStorage(this.options.session));

        await page.goto(InstagramURL + 'accounts/login/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        await this._settle(1500);
        let state = await this._readState();

        if (state.type !== 'authenticated') {
            if (cookies.length) {
                await this._settle(2000);
                state = await this._readState();
            }
            if (state.type !== 'authenticated') {
                await this._login();
            }
        }

        await this._finishChallenges();
        await this._emitSession();

        await page.goto(InstagramURL + 'direct/inbox/', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await this._settle(2000);
        await this._finishChallenges();
        await this._refreshWebConfig();
        await page.evaluate(installApi, {
            appId: this._webConfig.appId,
            asbdId: this._webConfig.asbdId,
            rollout: this._webConfig.rollout || null,
            lsd: this._webConfig.lsd || null,
            wwwClaim: this._webConfig.wwwClaim || '0'
        });

        await this._emitSession();
        this.emit(Events.READY);
        this._watchInbox().catch((error) => {
            this.emit(Events.DISCONNECTED, error.message);
        });
    }

    /**
     * Provide the code Instagram showed on the WhatsApp / SMS / app screen.
     * @param {string} code
     */
    answerChallenge(code) {
        this.emit(Events.AUTHENTICATION_ANSWER, String(code || '').trim());
    }

    async destroy() {
        if (this._pollTimer) clearInterval(this._pollTimer);
        if (this.pupBrowser) await this.pupBrowser.close();
    }

    async getInbox() {
        const raw = await this._api('/api/v1/direct_v2/inbox/?persistentBadging=true&folder=&limit=20&thread_message_limit=10');
        return simplifyInbox(raw);
    }

    async getThread(threadId) {
        return this._api('/api/v1/direct_v2/threads/' + encodeURIComponent(threadId) + '/?limit=20');
    }

    async getProfile() {
        try {
            return await this._api('/api/v1/accounts/edit/web_form_data/');
        } catch (error) {
            return this._api('/api/v1/accounts/current_user/?edit=true');
        }
    }

    async sendMessage(threadId, message) {
        if (!message) throw new Error('El mensaje está vacío.');
        return this._api('/api/v1/direct_v2/threads/broadcast/text/', {
            method: 'POST',
            form: textPayload(threadId, message)
        });
    }

    async sendLike(threadId) {
        return this._api('/api/v1/direct_v2/threads/broadcast/like/', {
            method: 'POST',
            form: likePayload(threadId)
        });
    }

    async indicateTyping(threadId, isTyping) {
        return this._api('/api/v1/direct_v2/threads/' + encodeURIComponent(threadId) + '/indicate_activity/', {
            method: 'POST',
            form: typingPayload(isTyping)
        });
    }

    async _api(path, options) {
        return this.pupPage.evaluate(async (requestPath, requestOptions) => {
            return window.openInsta.request(requestPath, requestOptions);
        }, path, options || {});
    }

    async _login() {
        const credentials = this.options.credentials || {};
        if (!credentials.username || !credentials.password) {
            throw new Error('Faltan credentials.username y credentials.password, o una sesión previa.');
        }

        await this._clickLabel(Labels.COOKIES);
        await this.pupPage.waitForSelector('input[name="email"], input[name="username"]', { timeout: 30000 });

        const userSelector = await this.pupPage.$('input[name="email"]')
            ? 'input[name="email"]'
            : 'input[name="username"]';
        const passwordSelector = await this.pupPage.$('input[name="pass"]')
            ? 'input[name="pass"]'
            : 'input[name="password"]';

        await this.pupPage.click(userSelector, { clickCount: 3 });
        await this.pupPage.type(userSelector, credentials.username, { delay: 25 });
        await this.pupPage.click(passwordSelector, { clickCount: 3 });
        await this.pupPage.type(passwordSelector, credentials.password, { delay: 25 });

        const clicked = await this._clickLabel(Labels.LOGIN);
        if (!clicked) await this.pupPage.keyboard.press('Enter');
        await this._settle(2500);
    }

    async _finishChallenges() {
        for (let attempt = 0; attempt < 8; attempt++) {
            const state = await this._readState();
            if (state.type === 'authenticated') return;
            if (state.type === 'otp') {
                await this._answerOtp(state);
                continue;
            }
            if (state.type === 'trust_device') {
                await this._checkTrustBox();
                const trusted = await this._clickLabel(Labels.TRUST) || await this._clickLabel(Labels.SAVE) || await this._clickLabel(Labels.CONFIRM);
                if (!trusted) await this.pupPage.keyboard.press('Enter');
                await this._settle(1500);
                continue;
            }
            if (state.type === 'save_login') {
                const saved = await this._clickLabel(Labels.SAVE);
                if (!saved) await this._clickLabel(Labels.CONFIRM);
                await this._settle(1500);
                continue;
            }
            if (state.type === 'notifications') {
                await this._clickLabel(Labels.DISMISS);
                await this._settle(1000);
                continue;
            }
            if (state.type === 'bad_credentials' || state.type === 'rate_limited' || state.type === 'challenge') {
                this.emit(Events.AUTHENTICATION_FAILURE, state.message);
                throw new Error(state.message);
            }
            const pendingScreen = /\/accounts\/login|\/auth_platform|\/challenge/.test(state.path || '');
            if (state.type === 'unknown' && attempt >= 3 && !pendingScreen) return;
            await this._settle(1500);
        }

        const finalState = await this._readState();
        if (finalState.type === 'authenticated') return;
        if (finalState.type === 'otp') {
            await this._answerOtp(finalState);
            return;
        }
        const message = finalState.message || 'El ingreso no terminó. La última pantalla fue ' + finalState.type + '.';
        this.emit(Events.AUTHENTICATION_FAILURE, message);
        throw new Error(message);
    }

    async _answerOtp(state) {
        const pending = this._waitForCode();
        this.emit(Events.AUTHENTICATION_2FA, {
            channel: state.channel,
            hint: state.hint,
            path: state.path
        });
        const code = await pending;
        await this._checkTrustBox();
        await this._typeCode(code);
        await this._checkTrustBox();
        const confirmed = await this._clickLabel(Labels.CONFIRM);
        if (!confirmed) await this.pupPage.keyboard.press('Enter');
        await this._settle(3000);
    }

    _waitForCode() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.removeListener(Events.AUTHENTICATION_ANSWER, onAnswer);
                reject(new Error('Se agotó la espera del código de verificación.'));
            }, this.options.otpTimeout);
            const onAnswer = (code) => {
                clearTimeout(timer);
                resolve(String(code || '').trim());
            };
            this.once(Events.AUTHENTICATION_ANSWER, onAnswer);
        });
    }

    async _typeCode(code) {
        const ready = await this.pupPage.evaluate(() => {
            const inputs = [...document.querySelectorAll('input')].filter((el) => {
                const type = (el.type || 'text').toLowerCase();
                if (['hidden', 'password', 'checkbox', 'submit', 'button'].includes(type)) return false;
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
            });
            const preferred = inputs.find((el) => {
                const blob = [
                    el.name,
                    el.placeholder,
                    el.getAttribute('aria-label'),
                    el.getAttribute('autocomplete')
                ].join(' ');
                return /c[oó]digo|code|security|verification|one-time/i.test(blob);
            });
            const target = preferred || inputs[0];
            if (!target) return false;
            target.setAttribute('data-open-insta-code', '1');
            return true;
        });
        if (!ready) throw new Error('No apareció el campo del código.');
        await this.pupPage.click('input[data-open-insta-code="1"]', { clickCount: 3 });
        await this.pupPage.keyboard.type(code, { delay: 40 });
    }

    async _readState() {
        const hasSession = (await this.pupPage.cookies()).some((cookie) => cookie.name === 'sessionid');
        const snapshot = await this.pupPage.evaluate(() => ({
            href: location.href,
            text: (document.body && document.body.innerText || '').slice(0, 4000),
            inputs: [...document.querySelectorAll('input')].map((el) => ({ name: el.name, type: el.type }))
        }));
        return classifyLoginState(Object.assign({ hasSession }, snapshot));
    }

    async _checkTrustBox() {
        return this.pupPage.evaluate(() => {
            const boxes = [...document.querySelectorAll('input[type="checkbox"]')];
            let checked = false;
            for (const box of boxes) {
                const label = [
                    box.getAttribute('aria-label'),
                    box.getAttribute('name'),
                    box.labels && box.labels[0] ? box.labels[0].innerText : ''
                ].join(' ');
                const nearby = (box.parentElement && box.parentElement.innerText) || '';
                if (!/confiar|trust|recordar|dispositivo|device/i.test(label + ' ' + nearby)) continue;
                if (!box.checked) box.click();
                checked = true;
            }
            return checked;
        });
    }

    async _restoreLocalStorage(entries) {
        if (!entries) return;
        await this.pupPage.evaluateOnNewDocument((stored) => {
            try {
                for (const key of Object.keys(stored)) {
                    if (localStorage.getItem(key) == null) localStorage.setItem(key, stored[key]);
                }
            } catch (error) {
                /* storage can be blocked on the first empty document */
            }
        }, entries);
    }

    async _clickLabel(patternSource) {
        return this.pupPage.evaluate((source) => {
            const pattern = new RegExp(source, 'i');
            const nodes = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')];
            const target = nodes.find((el) => pattern.test((el.innerText || el.value || '').replace(/\s+/g, ' ').trim()));
            if (!target) return null;
            target.click();
            return (target.innerText || target.value || '').trim();
        }, patternSource);
    }

    async _refreshWebConfig() {
        const discovered = await this.pupPage.evaluate(() => {
            const html = document.documentElement.innerHTML;
            const app = html.match(/"X-IG-App-ID":"(\d+)"/);
            const rollout = html.match(/"rollout_hash":"(\d+)"/);
            const lsd = html.match(/"LSD",\[\],\{"token":"([^"]+)"/);
            return {
                appId: app && app[1],
                rollout: rollout && rollout[1],
                lsd: lsd && lsd[1]
            };
        });
        if (discovered.appId) this._webConfig.appId = discovered.appId;
        if (discovered.rollout) this._webConfig.rollout = discovered.rollout;
        if (discovered.lsd) this._webConfig.lsd = discovered.lsd;

        const client = await this.pupPage.createCDPSession();
        await client.send('Network.enable');
        await new Promise((resolve) => {
            const timer = setTimeout(resolve, 4000);
            client.on('Network.requestWillBeSent', (event) => {
                const headers = event.request.headers || {};
                const asbd = headers['x-asbd-id'] || headers['X-ASBD-ID'];
                const appId = headers['x-ig-app-id'] || headers['X-IG-App-ID'];
                const claim = headers['x-ig-www-claim'] || headers['X-IG-WWW-Claim'];
                if (asbd) this._webConfig.asbdId = asbd;
                if (appId) this._webConfig.appId = appId;
                if (claim) this._webConfig.wwwClaim = claim;
                if (asbd || appId) {
                    clearTimeout(timer);
                    resolve();
                }
            });
        });
        try { await client.detach(); } catch (error) { /* the page may already have closed the session */ }
    }

    async _emitSession() {
        const cookies = await this.pupPage.cookies();
        const localStorage = await this.pupPage.evaluate(() => {
            const stored = {};
            for (let index = 0; index < localStorage.length; index++) {
                const key = localStorage.key(index);
                stored[key] = localStorage.getItem(key);
            }
            return stored;
        });
        this.emit(Events.AUTHENTICATED, { cookies, localStorage });
    }

    async _watchInbox() {
        const seen = new Set();
        const prime = await this.getInbox();
        for (const thread of prime.threads) {
            for (const item of thread.items) {
                if (item.item_id) seen.add(String(item.item_id));
            }
        }
        if (!this.options.pollInterval) return;

        this._pollTimer = setInterval(() => {
            this.getInbox().then((inbox) => {
                for (const thread of inbox.threads) {
                    const user = new User(this, thread.users[0] || null);
                    for (const item of thread.items) {
                        const id = item.item_id && String(item.item_id);
                        if (!id || seen.has(id)) continue;
                        seen.add(id);
                        const message = {
                            thread_id: thread.thread_id,
                            mutation_token: null,
                            body: new Message(this, item).body,
                            user
                        };
                        if (message.body && message.body.op === 'remove') {
                            this.emit(Events.MESSAGE_REVOKED_EVERYONE, message);
                        } else {
                            this.emit(Events.MESSAGE_RECEIVED, message);
                        }
                    }
                }
            }).catch((error) => {
                this.emit(Events.DISCONNECTED, error.message);
            });
        }, this.options.pollInterval);
    }

    _settle(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports = Client;
