const { writeFileSync } = require('fs');
const config = require('../../config/config');
const log = require('../logs/logger');
const { getDatabaseFilePath, safeAtomicWrite, serializeDatabase } = require('../validation/validateInput');

/**
 * Saves the database object to a JSON file.
 * Uses atomic writes if both useAtomicWrites and validateInput are enabled.
 * @param {object} database - The database object to be saved.
 * @param {string} dbName - The name of the database to be saved.
 * @returns {boolean} - Returns true if the database was saved successfully, false otherwise.
 */
module.exports = function saveFile(database, dbName) {
	try {
		const fullPath = getDatabaseFilePath(dbName, { validate: config.validateInput === true });

		const jsonString = serializeDatabase(database);

		if (config.useAtomicWrites === true && config.validateInput === true) {
			safeAtomicWrite(undefined, dbName, jsonString, { ext: '.json' });
			log('Save File', 'File saved successfully (atomic)', fullPath);
		} else {
			writeFileSync(fullPath, jsonString, { encoding: config.encoding });
			log('Save File', 'File saved successfully', fullPath);
		}

		return true;
	} catch (error) {
		log('Error', 'Saving file:', error.message || error);
		return false;
	}
};
