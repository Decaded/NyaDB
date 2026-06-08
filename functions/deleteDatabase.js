const { unlinkSync, existsSync } = require('fs');
const config = require('../config/config');
const log = require('./logs/logger');
const { getDatabaseFilePath, validateDatabaseName } = require('./validation/validateInput');

/**
 * Deletes a database.
 * @param {string} name - The name of the database to delete.
 * @returns {boolean} - Whether or not the database was deleted successfully.
 */
module.exports = function deleteDatabase(name) {
	try {
		if (config.validateInput === true) {
			validateDatabaseName(name);
		}

		const fullPath = getDatabaseFilePath(name, { validate: false });
		if (!existsSync(fullPath)) {
			log('Delete Database', 'Database does not exist:', name);
			return false;
		}

		unlinkSync(fullPath);
		log('Delete Database', 'Database deleted:', name);
		return true;
	} catch (error) {
		log('Error', 'Deleting database:', error.message || error);
		return false;
	}
};
