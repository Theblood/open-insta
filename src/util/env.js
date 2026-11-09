'use strict';

const fs = require('fs');

/**
 * Load KEY=VALUE lines into process.env without expanding `$`.
 * Existing variables win, so a shell export overrides the file.
 * Quoted values keep their contents, including `$` and `*`.
 * @param {string} filePath
 * @returns {boolean} whether the file existed
 */
function loadEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const text = fs.readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const separator = trimmed.indexOf('=');
        if (separator <= 0) continue;
        const key = trimmed.slice(0, separator).trim();
        let value = trimmed.slice(separator + 1).trim();
        if (
            (value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] == null || process.env[key] === '') {
            process.env[key] = value;
        }
    }
    return true;
}

module.exports = {
    loadEnvFile
};
