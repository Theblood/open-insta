'use strict';

const Base = require('./Base');

/**
 * Represents a user on Instagram
 * @extends {Base}
 */
class User extends Base {
    constructor(client, data) {
        super(client);
        
        if(data) this._patch(data);
    }

    _patch(data) {

        try{

            this.pk = data.pk;

            this.username = data.username;

            this.full_name = data.full_name;

            this.profile_pic_url = data.profile_pic_url;

            return super._patch(data);

        } catch(err){
            console.log("[Structure] - Error to compile user",err);
        }

    }
}

module.exports = User;