'use strict';

module.exports = {
    Client: require('./src/Client'),
    version: require('./package.json').version,
    Message: require('./src/Structures/Message'),
    User: require('./src/Structures/User')
};
