'use strict';

const EventEmitter = require('events');
const puppeteer = require('puppeteer');

const Util = require('./util/Util');
const { InstagramURL, UserAgent, DefaultOptions, Events, Selectors } = require('./util/Constants');
const igRaid = require('./util/igRaid');
const { ExposeStore } = require('./util/Injected');
const Message = require('./structures/Message');
const User = require('./structures/User');

class Client extends EventEmitter {

    constructor(options = {}) {
        super();
        this.options = Util.mergeDefault(DefaultOptions, options);
        this.pupBrowser = null;
        this.pupPage = null;
    }

    async initialize() {
        const browser = await puppeteer.launch(this.options.puppeteer);
        const page = (await browser.pages())[0];
        page.setUserAgent(UserAgent);

        /**
         * Making Browser available on scope
         * @event Client#ready
         */        
        const that = this;
        this.pupBrowser = browser;
        this.pupPage = page;

        /**
        * Checking if session is alredy registered previously
        */
        if (this.options.session) {

            await page.setCookie(...this.options.session);

            this.emit(Events.AUTHENTICATED);

            /**
            * Navigating to Instagram Home Page - 
            * It's important access initial instagram address for security issues and 
            * not be tracked as an crawler (param when sessionAuth)
            */
            await page.goto(InstagramURL);

        } else {

            /**
            * Navigating to Instagram Home Page - 
            * It's important access initial instagram address for security issues and 
            * not be tracked as an crawler (param when sessionAuth)
            */
            await page.goto(InstagramURL);

        	/**
	        * Processing login steps,
	        * (1) - Open login form and wait fields load
	        * (2) - Fill userInformation
	        * (3) - Click Login Button
	        * (4) - Wait page navigation load
	        */
        	await page.waitForSelector(Selectors.USERNAME, { timeout: 6000 });
		    await page.focus(Selectors.USERNAME);
			await page.keyboard.type(this.options.credentials.username);
			await page.focus(Selectors.PASSWORD);
			await page.keyboard.type(this.options.credentials.password);
			await page.click(Selectors.SUBMIT_LOGIN);
            
            /**
            * bypassing 2Factor autentication using aconecpt of another lib
            * more info: https://github.com/joaomirandasa/headless2FA
            * Here, this concept as used in addition to eventEmitter
            */
            try {
                await page.waitForSelector(Selectors.PAGE_LOADED, { timeout: 6000 });
                await page.click(Selectors.BUTTON_BYPASS);
                this.emit(Events.AUTHENTICATION_2FA);
                var token2FA = await new Promise((resolve, reject) => {
                    that.on('2fa_answer', resolve);
                });
                await page.focus(Selectors.SECURITY_CODE);
                await page.keyboard.type(token2FA);
                await page.click(Selectors.SECURITY_CODE_2);
            } catch (error) {
                console.log("* 2Factor not detected *");
                return true;
            }

            /**
            * Checking if login procedue goes wrong
            * verify if error message of credentials among other thing is showed
            */
            try {
                await page.waitForSelector(Selectors.TROUBLES, { timeout: 10000 });
                this.emit(Events.AUTHENTICATION_FAILURE, 'Unable to log in. Are the session details valid?');
                browser.close();
            } catch (error) {

                /**
                * Getting Session information from browser
                */
                const localStorage = JSON.parse(await page.evaluate(() => {
                    return JSON.stringify(window.localStorage);
                }));

                /**
                * Getting Session information from browser
                */
                const _sharedData = JSON.parse(await page.evaluate(() => {
                    return JSON.stringify(window._sharedData);
                }));

                /**
                * Getting cookies to storage with session info
                */
                const cookies = await page.cookies();

                /**
                 * Emitted when authentication is successful
                 * @event Client#authenticated
                 * @param {object} session Object containing session information. Can be used to restore the session.
                 */
                this.emit(Events.AUTHENTICATED, {
                    localStorage: localStorage,
                    _sharedData: _sharedData,
                    cookies: cookies
                });

                /**
                * Closing notification popUp if appear
                */
                // await this._closeNotificationPopUp();
                try {
                    await this.pupPage.waitForSelector(Selectors.NOTIFICATION_APPEAR, { timeout: 5000 });
                    await this.pupPage.click(Selectors.NOTIFICATION_CLOSE);
                } catch (error) {
                    return true;
                }

            }

        }

        /**
        * Waiting feed page load properlly guided by selector browser
        */
        await page.waitForSelector(Selectors.ALREDY_LOADED, { timeout: 600000 }); 

        /**
        * (1) - Navigating to inbox page
        * (2) - Wait inbox page load propperly guided by class and secure by timeout in case of something goes wrong
        */
        await page.goto(InstagramURL+'direct/inbox/');
        await page.waitForSelector(Selectors.INBOX, { timeout: 60000 }); 

        /**
        * Closing notification popUp if appear
        */
        // await this._closeNotificationPopUp();
        try {
            await this.pupPage.waitForSelector(Selectors.NOTIFICATION_APPEAR, { timeout: 5000 });
            await this.pupPage.click(Selectors.NOTIFICATION_CLOSE);
        } catch (error) {
            console.log("* popup not detected *");
        }

        /**
        * Exposing functions from InjectedFile
        */
        await page.evaluate(ExposeStore, igRaid.toString());

		/**
        * Register eventEmitter for Event
        * @event Client#onAddMessageEvent
        * @param {object} message object guided by constructor message.
        */
        await page.exposeFunction('onAddMessageEvent', async msg => {

            const self = this;

            /*
            * Important forEach  - an event fired can contains more
            * than one action or message, usefull for group
            * simultaneous actions
            */
            msg.data.forEach(function(dataItem){

                const message = {
                    thread_id: msg.thread_id,
                    mutation_token: ( msg.mutation_token ? msg.mutation_token : null ),
                    body: new Message(self, dataItem).body,
                    user: new User(self, msg.user)
                };

                if(message.body.op == 'add'){
                    self.emit(Events.MESSAGE_RECEIVED, message);
                } else {
                    self.emit(Events.MESSAGE_REVOKED_EVERYONE, message);
                }

            });

        });

        /**
        * Exposing functions and connecting to eventEmitter
        */
		await page.evaluate(() => {
           window.openInsta.messageSync( window.onAddMessageEvent );
        });

        /**
         * Emitted when the client has initialized and is ready to receive messages.
         * @event Client#ready
         */
        this.emit(Events.READY);

        if(this.options.restartOnCrash) {
            this.pupPage.on('error', async error => {
                console.error('Page Crashed! Restarting...', error);
            });
        }

	};

     /**
     * Closes the client
     */
    async destroy() {
        await this.pupBrowser.close();
    };

    /**
     * Send like into an DM
     * @param {string} thread_id
     * @param {boolean} isTyping 
     * @param {object} options 
     * @returns {Promise<Like>} Like that was just sent
     */
    async indicateTyping(thread_id, isTyping, options = {}) {
        const newTyping = await this.pupPage.evaluate(async (thread_id, isTyping, options) => {
            let typing;
            typing = await window.openInsta.indicateTyping(thread_id, isTyping, options);
            return typing
        }, thread_id, isTyping, options);
        return newTyping;
    };

    /**
     * Send a message into an DM
     * @param {string} thread_id
     * @param {string|MessageMedia|Location} content
     * @param {object} options 
     * @returns {Promise<Message>} Message that was just sent
     */
    async sendMessage(thread_id, message, options = {}) {
        const newMessage = await this.pupPage.evaluate(async (thread_id, message, options) => {
            let msg;
            msg = await window.openInsta.sendTextMessage(thread_id, message, options);
            return msg
        }, thread_id, message, options);
        return newMessage;
    };

    /**
     * Send like into an DM
     * @param {string} thread_id
     * @param {object} options 
     * @returns {Promise<Like>} Like that was just sent
     */
    async sendLike(thread_id, options = {}) {
        const newLike = await this.pupPage.evaluate(async (thread_id, options) => {
            let like;
            like = await window.openInsta.sendLike(thread_id, options);
            return like
        }, thread_id, options);
        return newLike;
    };

    /**
     * Get all current chat instances
     * @returns {Promise<Array<Chat>>}
     */
    async getInbox() {
        const inbox = await this.pupPage.evaluate(async () => {
            let inboxFetch;
            inboxFetch = await window.openInsta.Direct.getInbox();
            return inboxFetch;
        });
        return inbox;
    }; 


}

module.exports = Client;
