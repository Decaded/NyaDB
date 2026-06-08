const saveFile = require('./operations/saveFile');
const log = require('./logs/logger');
const config = require('../config/config');
const { validateDatabaseName } = require('./validation/validateInput');

/**
 * Clears a database by resetting its contents to an empty object.
 * @param {string} name - The name of the database to clear.
 * @returns {boolean} - Whether or not the database was cleared successfully.
 */
module.exports = function clearDatabase(name) {
	try {
		if (config.validateInput === true) {
			validateDatabaseName(name);
		}

		const saved = saveFile({}, name);
		if (!saved) return false;

		log('Clear Database', 'Database cleared:', name);
		return true;
	} catch (error) {
		log('Error', 'Clearing database:', error.message || error);
		return false;
	}
};
