'use strict';

const Base = require('./Base');

/**
 * Represents a user on Instagram
 * @extends {Base}
 */
class User extends Base {
    constructor(client, data) {
        super(client);
        if (data) this._patch(data);
    }

    _patch(data) {
        this.pk = data.pk || data.id || null;
        this.username = data.username || null;
        this.full_name = data.full_name || null;
        this.profile_pic_url = data.profile_pic_url || null;
        return super._patch(data);
    }
}

module.exports = User;
