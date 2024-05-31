const config = require('../../config/config');

/**
 * Formats the current date and time as a human-readable string.
 * @returns {string} The formatted date and time.
 */
function getFormattedTimestamp() {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Logs a message to the console if logging is enabled.
 * @param {string} actionType - The type of action being logged.
 * @param {...any} values - The values to log.
 */
function log(actionType, ...values) {
	if (config.enableConsoleLogs) {
		const timestamp = getFormattedTimestamp();
		const filteredValues = values.filter(value => value !== undefined);
		console.log(`NyaDB | ${timestamp} | ${actionType} |`, ...filteredValues);
	}
}

module.exports = log;
