'use strict';

const Base = require('./Base');

/**
 * Represents a Message on Instagram
 * @extends {Base}
 */
class Message extends Base {
    constructor(client, data) {
        super(client);
        if (data) this._patch(data);
    }

    _patch(data) {
        if (data.item_id || data.item_type) {
            this.body = {
                op: data.op || 'add',
                item_id: data.item_id || null,
                item_type: data.item_type || null,
                text: data.text || null,
                timestamp: data.timestamp || null,
                user_id: data.user_id || null,
                like: data.like || null
            };
            return super._patch(data);
        }

        try {
            this.body = JSON.parse(data.value);
            this.body.op = data.op;
            return super._patch(data);
        } catch (err) {
            this.body = null;
            return super._patch(data);
        }
    }
}

module.exports = Message;
