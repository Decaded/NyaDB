const { unlinkSync, existsSync } = require('fs');
const path = require('path');
const config = require('../config/config');
const log = require('./logs/logger');

/**
 * Deletes a database.
 * @param {string} name - The name of the database to delete.
 * @returns {boolean} - Whether or not the database was deleted successfully.
 */
module.exports = function deleteDatabase(name) {
	try {
		const fullPath = path.join('./', config.storage.databaseFolderName, `${name}.json`);
		if (!existsSync(fullPath)) {
			log('Delete Database', 'Database does not exist:', name);
			return false;
		}

		unlinkSync(fullPath);
		log('Delete Database', 'Database deleted:', name);
		return true;
	} catch (error) {
		log('Error', 'Deleting database:', error);
		return false;
	}
};
