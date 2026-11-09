'use strict';

/**
 * Accept either a cookie array (current session file) or the older
 * `{ cookies, localStorage, _sharedData }` object.
 * @param {Array|object|false|null} session
 * @returns {Array<object>}
 */
function sessionCookies(session) {
    if (!session) return [];
    const list = Array.isArray(session) ? session : session.cookies;
    if (!Array.isArray(list)) return [];
    return list
        .filter((cookie) => cookie && cookie.name && cookie.value != null)
        .map((cookie) => {
            const next = {
                name: cookie.name,
                value: String(cookie.value),
                domain: cookie.domain || '.instagram.com',
                path: cookie.path || '/',
                secure: cookie.secure !== false,
                httpOnly: Boolean(cookie.httpOnly)
            };
            if (cookie.expires && cookie.expires > 0) next.expires = cookie.expires;
            if (!cookie.domain) next.url = 'https://www.instagram.com/';
            return next;
        });
}

module.exports = {
    sessionCookies
};
