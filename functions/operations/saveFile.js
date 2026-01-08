const { writeFileSync } = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');
const { safeAtomicWrite } = require('../validation/validateInput');

/**
 * Saves the database object to a JSON file.
 * Uses atomic writes if both useAtomicWrites and validateInput are enabled.
 * @param {object} database - The database object to be saved.
 * @param {string} dbName - The name of the database to be saved.
 * @returns {boolean} - Returns true if the database was saved successfully, false otherwise.
 */
module.exports = function saveFile(database, dbName) {
	try {
		const fullPath = path.join('./', config.storage.databaseFolderName, `${dbName}.json`);

		const jsonString = config.formattingEnabled
			? JSON.stringify(database, null, config.formattingStyle === 'space' ? ' '.repeat(config.indentSize) : '\t')
			: JSON.stringify(database);

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
