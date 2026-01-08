const { renameSync, existsSync } = require('fs');
const path = require('path');
const config = require('../config/config');
const log = require('./logs/logger');
const { validateDatabaseName } = require('./validation/validateInput');

/**
 * Renames a database file.
 * @param {string} oldName - The current name of the database.
 * @param {string} newName - The new name for the database.
 * @returns {boolean} - Whether or not the database was renamed successfully.
 */
module.exports = function renameDatabase(oldName, newName) {
	try {
		if (config.validateInput === true) {
			validateDatabaseName(oldName);
			validateDatabaseName(newName);
		}

		const oldPath = path.join('./', config.storage.databaseFolderName, `${oldName}.json`);
		const newPath = path.join('./', config.storage.databaseFolderName, `${newName}.json`);

		if (!existsSync(oldPath)) {
			log('Rename Database', 'Source database does not exist:', oldName);
			return false;
		}

		if (existsSync(newPath)) {
			log('Rename Database', 'Target database already exists:', newName);
			return false;
		}

		renameSync(oldPath, newPath);
		log('Rename Database', 'Database renamed:', oldName, '->', newName);
		return true;
	} catch (error) {
		log('Error', 'Renaming database:', error.message || error);
		return false;
	}
};
