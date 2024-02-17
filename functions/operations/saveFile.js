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
		const fullPath = path.join(config.databaseFolderPath, config.filePath);

		// Convert the database object to a formatted JSON string
		const jsonString = JSON.stringify(database, null, '\t');

		// Save the JSON string to the file
		writeFileSync(fullPath, jsonString);

		// If file writing succeeds, return true
		return true;
	} catch (error) {
		// If an error occurs during file writing, log the error and return false
		console.error('Error saving file:', error);
		return false;
	}
};
