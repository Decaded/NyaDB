const { writeFileSync } = require('fs');
const config = require('../../config/config');

/**
 * Saves the database object to a JSON file.
 * @param {object} database - The database object to be saved.
 * @returns {boolean} - Returns true if the database was saved successfully, false otherwise.
 */
module.exports = function saveFile(database) {
	try {
		// Convert the database object to a formatted JSON string
		const jsonString = formatJson(database);

		// Save the JSON string to a file
		writeFileSync(config.databaseFolderPath + config.filePath, jsonString);

		// If file writing succeeds, return true
		return true;
	} catch (error) {
		// If an error occurs during file writing, log the error and return false
		console.error('Error saving file:', error);
		return false;
	}
};

/**
 * Formats a JavaScript object as a JSON string with custom indentation.
 * @param {object} obj - The object to be formatted as JSON.
 * @returns {string} - The formatted JSON string.
 */
function formatJson(obj) {
	// Convert the object to a JSON string with custom formatting
	// Using '\t' for tab indentation
	return JSON.stringify(obj, null, '\t');
}
