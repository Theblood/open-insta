'use strict';

/**
 * Runs inside the logged-in Instagram page. Cookies stay in the browser;
 * this only attaches the headers the web client itself sends.
 */
function installApi(config) {
    const csrf = () => {
        const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    window.openInsta = {
        async request(path, options) {
            const settings = options || {};
            const headers = {
                'x-csrftoken': csrf(),
                'x-ig-app-id': config.appId,
                'x-asbd-id': config.asbdId,
                'x-requested-with': 'XMLHttpRequest',
                'x-ig-www-claim': config.wwwClaim || '0'
            };
            if (config.rollout) headers['x-instagram-ajax'] = config.rollout;
            if (config.lsd) headers['x-fb-lsd'] = config.lsd;
            if (settings.form) headers['content-type'] = 'application/x-www-form-urlencoded';

            const response = await fetch(path, {
                method: settings.method || 'GET',
                credentials: 'include',
                headers,
                body: settings.form ? new URLSearchParams(settings.form).toString() : undefined
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || data.status === 'fail') {
                const error = new Error(data.message || data.error_type || ('HTTP ' + response.status));
                error.status = response.status;
                error.payload = data;
                throw error;
            }
            return data;
        }
    };
}

module.exports = {
    installApi
};
