'use strict';

const Base = require('./Base');

/**
 * Represents a Message on Instagram
 * @extends {Base}
 */
class Message extends Base {
    constructor(client, data) {
        super(client);

        if(data) this._patch(data);
    }

    _patch(data) {
        
        try{

            this.body = JSON.parse(data.value);

            this.body.op = data.op;

            return super._patch(data);

        } catch(err){

            console.log("[Structure] - Error to compile message",err);
            
        }

    }
}

module.exports = Message;