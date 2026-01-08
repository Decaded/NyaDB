const config = require('../../config/config');

/**
 * Log level priorities for filtering.
 */
const LOG_LEVELS = {
	error: 0,
	warn: 1,
	info: 2,
	debug: 3,
};

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
 * Determines if a message should be logged based on configured log level.
 * @param {string} messageLevel - The level of the message being logged.
 * @returns {boolean} - Whether the message should be logged.
 */
function shouldLog(messageLevel) {
	const configuredLevel = config.logLevel || 'warn';
	return LOG_LEVELS[messageLevel] <= LOG_LEVELS[configuredLevel];
}

/**
 * Logs a critical error that bypasses all settings, outputs to console.error, and shuts down the application.
 * @param {string} errorMessage - The critical error message.
 * @param {...any} additionalInfo - Additional information to log.
 */
function logCritical(errorMessage, ...additionalInfo) {
	const timestamp = getFormattedTimestamp();
	console.error('\n' + '='.repeat(80));
	console.error(`NyaDB CRITICAL ERROR | ${timestamp}`);
	console.error('='.repeat(80));
	console.error(errorMessage);
	if (additionalInfo.length > 0) {
		console.error('\nAdditional Information:');
		additionalInfo.forEach(info => {
			if (typeof info === 'object') {
				console.error(JSON.stringify(info, null, 2));
			} else {
				console.error(info);
			}
		});
	}
	console.error('='.repeat(80));
	console.error('Application shutting down to prevent data loss.\n');
	process.exit(1);
}

/**
 * Logs a message to the console if logging is enabled and level is appropriate.
 * @param {string} actionType - The type of action being logged.
 * @param {...any} values - The values to log.
 */
function log(actionType, ...values) {
	let level = 'info';
	if (actionType === 'Error') {
		level = 'error';
	} else if (actionType === 'Warning') {
		level = 'warn';
	} else if (actionType === 'Debug') {
		level = 'debug';
	}

	// Always log errors, regardless of enableConsoleLogs setting
	if (level === 'error') {
		if (shouldLog(level)) {
			const timestamp = getFormattedTimestamp();
			const filteredValues = values.filter(value => value !== undefined);
			console.error(`NyaDB | ${timestamp} | ${actionType} |`, ...filteredValues);
		}
		return;
	}

	if (config.enableConsoleLogs && shouldLog(level)) {
		const timestamp = getFormattedTimestamp();
		const filteredValues = values.filter(value => value !== undefined);

		const consoleMethod = level === 'warn' ? console.warn : console.log;
		consoleMethod(`NyaDB | ${timestamp} | ${actionType} |`, ...filteredValues);
	}
}
	
module.exports = log;
module.exports.logCritical = logCritical;
