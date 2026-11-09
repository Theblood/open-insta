'use strict';

const fs = require('fs');

const CANDIDATES = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];

function findChrome(explicit) {
    const candidates = [explicit].concat(CANDIDATES).filter(Boolean);
    for (const candidate of candidates) {
        try {
            if (fs.existsSync(candidate)) return candidate;
        } catch (error) {
            continue;
        }
    }
    throw new Error('No se encontró Chrome o Chromium. Define puppeteer.executablePath o PUPPETEER_EXECUTABLE_PATH.');
}

module.exports = {
    findChrome
};
