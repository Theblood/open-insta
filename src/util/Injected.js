'use strict';

// Exposes the internal Store to the Instagram Inbox Page
exports.ExposeStore = (igRaidStr) => {
    eval('var igRaid = ' + igRaidStr);
    // eslint-disable-next-line no-undef
    window.iR = igRaid();

    /*
    * Instagram Message Broker
    * [Possible events on MQTT message Broker]
    * CONNECT: 'mqtt_client_connect',
    * DISCONNECT: 'mqtt_client_disconnect',
    * PUBLISH: 'mqtt_client_publish',
    * CLIENT_ERROR: 'mqtt_client_error'
    */
    window.Broker = window.__mqtt;

    /*
    * Instance openInsta initializing
    */
    window.openInsta = {};
    window.openInsta.observers = Broker.$DirectMQTT5;

    /*
    * Usefull functions extracted from instagram base code
    */
    window.openInsta.genToken = function (){
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, x => {
            const n = 16 * Math.random() | 0;
            return ('x' == x ? n : 3 & n | 8).toString(16)
        });
    };
    window.openInsta.getLinkRegex = function() {
        return new RegExp("(?:(?:(?:[a-z]+:)?//)?|www\\.)(?:\\S+(?::\\S*)?@)?(?:localhost|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:((?:[a-z\\u00a1-\\uffff]{2,}))))\\.?)(?::\\d{2,5})?(?:[/?#][^\\s\"]*)?",'ig');
    }
    window.openInsta.createBlob = function(dataURL) {
        const BASE64_MARKER = ';base64,';
        const parts = dataURL.split(BASE64_MARKER);
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
            uInt8Array[i] = raw.charCodeAt(i);
        }
        return new Blob([uInt8Array], { type: contentType });
    };

    /*
    * Function Mapper base on igRaid
    */
    window.openInsta.ajax = window.iR.findModule((module) => typeof module.get === 'function' && typeof module.post  === 'function' && typeof module.put  === 'function')[0];
    window.openInsta.urlUtils = window.iR.findModule('configureUrlForWebAPI')[0];
    window.openInsta.Direct = window.iR.findModule((module) => typeof module.getInbox === 'function' && typeof module.getPendingInbox  === 'function' && typeof module.getThread  === 'function')[0];
    window.openInsta.redux = window.iR.findModule('getStore')[0];
    window.openInsta.thread = window.iR.findModule('ThreadItemType')[0];
    window.openInsta.translator = window.iR.findModule('INBOX_STRING')[0];
    window.openInsta.senders = window.iR.findModule((module) => typeof module.sendLinkMessage === 'function' && typeof module.sendTextMessage === 'function' )[0];
    // Discover how to take this modules by another way
    window.openInsta.magicBox = __r(9699424); 
    window.openInsta.me = __r(9699336).getViewerId();
    // [9699424] //MAGIC BOX
    // __r(9699424).disableTwoFactorAuth().then(data=>console.log(data))
    // __r(9568331).post('/accounts/phone_confirm_send_sms_code/', {phone_number: "PHONENUMBER"}).then(data=>console.log(data));

    /*
    * Prepare api address controller to became easy on updates
    */
    window.openInsta.apiAddress = function (endpoint){
        return window.openInsta.urlUtils.configureUrlForWebAPI(`/api/v1/direct_v2/${endpoint}`);
    }

    /*
    * Get user details by ThreadID
    */
    openInsta.getUserByThread = async function(search){
        var response = await openInsta.Direct.getInbox().then(function(data){
            return data.inbox.threads.find(function(thread){
                return thread.thread_id == search;
            })['users'][0];
        });
        return response;
    };

    /*
    * Message Sync processor (observer) to fire events on newMessages received
    */
    openInsta.messageSync = function (callback) {
        openInsta.observers.subscribe('/ig_message_sync', async data => {
            let c;
            try {
                c = JSON.parse(data);
                if(c[0]){
                    if(c[0].data[0]){
                        if(c[0].data[0].path){
                            if(c[0].data[0].path.includes('/direct_v2/threads/')){
                                c[0].thread_id = c[0].data[0].path.split("/")[3];
                                c[0].user = await openInsta.getUserByThread(c[0].thread_id);
                            }
                        }
                    }
                }
                return callback(c[0]);
            } catch (t) {
               console.error("[Watcher/messageSync] - Error on Decompress",t);
            }
        });
    };

    /*
    * Message Sender processor (observer) to fire events when some message is sended from here
    */
    openInsta.messageSender = function (callback) {
        openInsta.observers.subscribe('/ig_send_message_response', async data => {
            let c;
            try {
                c = JSON.parse(data);
                if(c[0]){
                    if(c[0].data[0]){
                        if(c[0].data[0].path){
                            if(c[0].data[0].path.includes('/direct_v2/threads/')){
                                c[0].thread_id = c[0].data[0].path.split("/")[3];
                                c[0].user = await openInsta.getUserByThread(c[0].thread_id);
                            }
                        }
                    }
                }
                return callback(data);
            } catch (t) {
               console.log("[Watcher/messageSender] - Error on Decompress",t);
            }
        });
    };

    /*
    * Observers knowed
    * Most part of this observers is not understandable rith now, it's necessary more study to decompress
    */
    // openInsta.observers.subscribe('/ig_sub_iris_response', data => {
    //     console.log("[ig_sub_iris_response]",data);
    // });

    // openInsta.observers.subscribe("/pubsub", async data => {
    //     console.log("[pubsub]");
    //     console.log(data);
    // });

    // openInsta.observers.subscribe("/ig_realtime_sub", data => {
    //     console.log("[ig_realtime_sub]",data);
    // });

    // openInsta.observers.subscribe('/ig_message_sync', data => {
    //     console.log("[ig_message_sync]",data);
    // });

    // openInsta.observers.subscribe('/ig_send_message_response', data => {
    //     console.log("[ig_send_message_response]",data);
    // });

    /*
    * Indicate Typing for user
    * @param {string} [thread_id] - Identificator of which user you're talking
    * @param {Boolean} [activity_status] - indicate if you are typing to user
    * @param {object} [options] - Expansion or replace object for futher implementations
    */
    openInsta.indicateTyping = async (thread_id, isTyping, options = {}) => {
        var dispatch = {
            action: 'indicate_activity',
            mutation_token: openInsta.genToken(),
            thread_id: thread_id,
            activity_status: typeof isTyping != 'undefined' ? isTyping : false
        };
        var response = await Broker.$DirectMQTT14(dispatch);
        return {
            dispatch: dispatch,
            sended: response
        };
    };

    /*
    * Send Text Messages
    * @param {string} [thread_id] - Identificator of which user you're talking
    * @param {string} [text] - Content of message to be sent
    * @param {object} [options] - Expansion or replace object for futher implementations
    */
    openInsta.sendTextMessage = async (thread_id, text, options = {}) => {
        const linkBuilder = text.match(openInsta.getLinkRegex());
        if(linkBuilder){
            var dispatch = await openInsta.senders.sendLinkMessage(thread_id,text,linkBuilder,openInsta.genToken());
            return dispatch;
        } else {
            var dispatch = await openInsta.senders.sendTextMessage(thread_id,text);
            return dispatch;
        }
    };

    /*
    * Send Like
    * @param {string} [thread_id] - Identificator of which user you're talking
    * @param {object} [options] - Expansion or replace object for futher implementations
    */
    openInsta.sendLike = async (thread_id, options = {}) => {
        var dispatch = {
            action: 'send_item',
            mutation_token: openInsta.genToken(),
            item_type: "like",
            thread_id: thread_id,
            ...options
        };
        var response = await Broker.$DirectMQTT14(dispatch);
        return {
            dispatch: dispatch,
            sended: response
        };
    };

    /*
    * Send Link
    * @param {string} [thread_id] - Identificator of which user you're talking
    * @param {object} [options] - Expansion or replace object for futher implementations
    */
    openInsta.sendLink = async (thread_id, address, text, options = {}) => {
        var dispatch = await openInsta.senders.sendLinkMessage(thread_id,text,[address],openInsta.genToken())
        return dispatch;
    };
    
    /*
    * Send Image
    * @param {string} [thread_id] - Identificator of which user you're talking
    * @param {string} [base64Image] - An JPEG image in base64 string
    * @param {Int} [width] - width of image sended
    * @param {Int} [height] - height of image sended
    */     
    openInsta.sendImage = async (thread_id, base64Image, width, height, options = {}) => {
        var now = Date.now().toString();
        openInsta.magicBox.uploadPhoto({
            entityName: 'direct_'+now,
            file: openInsta.createBlob(base64Image),
            uploadId: now,
            uploadMediaHeight: height,
            uploadMediaWidth: width
        }).then((uploadedData) => {
            openInsta.Direct.configurePhoto(openInsta.genToken(),thread_id,uploadedData['upload_id']);
        }).then((postSended) => {
           console.log("Picture sended",postSended);
        }).catch(err => {
           console.log("error on send",err);
        });
    };

    /*
    * Get pending inbox 
    * You half to approval all conversations for start 
    */
    openInsta.pendingInbox = async () => {
        const pendingInbox = await openInsta.Direct.getPendingInbox();
        return pendingInbox;
    };

    /*
    * Get pending inbox 
    * This return the last time of each user was online on conversations
    */
    openInsta.presenceInbox = async () => {
        const presenceInbox = await openInsta.Direct.getInboxPresence();
        return presenceInbox;
    };

    /*
    * Get user FacebookID
    */
    openInsta.getFbId = async () => {
        const fbId = await Broker.$DirectMQTT8();
        return fbId;
    };

    /*
    * Get appID
    */
    openInsta.appId = async () => {
        const appId = await Broker.$DirectMQTT9();
        return appId;
    };

    /*
    * Get DeviceID
    */
    openInsta.deviceId = async () => {
        const deviceId = await Broker.$DirectMQTT10();
        return deviceId;
    };

};