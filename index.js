'use strict';

module.exports = {
    Client: require('./src/Client'),
    version: require('./package.json').version,
    Message: require('./src/structures/Message'),
    User: require('./src/structures/User')
};