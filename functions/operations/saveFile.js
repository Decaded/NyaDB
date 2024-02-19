const { writeFileSync } = require('fs');
const path = require('path');
const config = require('../../config/config');

/**
 * Saves the database object to a JSON file.
 * @param {object} database - The database object to be saved.
 * @returns {boolean} - Returns true if the database was saved successfully, false otherwise.
 */
module.exports = function saveFile(database) {
	try {
		// Construct the full file path
		const fullPath = path.join('./', config.storage.databaseFolderName, config.storage.databaseFileName);

		// Check if the database object is empty
		if (Object.keys(database).length === 0) {
			if (config.enableConsoleLogs) {
				console.error('NyaDB: Database object is empty. Nothing to save.');
			}
			return false;
		}

		// Convert the database object to a JSON string
		const jsonString = config.formattingEnabled
			? JSON.stringify(database, null, config.formattingStyle === 'space' ? ' '.repeat(config.indentSize) : '\t')
			: JSON.stringify(database);

		// Save the JSON string to the file
		writeFileSync(fullPath, jsonString, { encoding: config.encoding });

		// If file writing succeeds, return true
		return true;
	} catch (error) {
		// If an error occurs during file writing, log the error and return false
		console.error('NyaDB: Error saving file:', error);
		return false;
	}
};
