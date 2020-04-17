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
    window.openInsta.genToken = function (){
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, x => {
            const n = 16 * Math.random() | 0;
            return ('x' == x ? n : 3 & n | 8).toString(16)
        });
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
        var dispatch = {
            action: 'send_item',
            mutation_token: openInsta.genToken(),
            item_type: "text",
            text: text,
            thread_id: thread_id,
            ...options
        }
        var response = await Broker.$DirectMQTT14(dispatch);
        return {
            dispatch: dispatch,
            sended: response
        };
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