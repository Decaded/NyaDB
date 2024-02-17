const { readFileSync } = require('fs');
const config = require('../../config/config');

/**
 * Loads data from a file.
 * @param {string} filePath - The path to the file to load.
 * @returns {object} - The data loaded from the file.
 */
module.exports = function loadFile() {
	try {
		return JSON.parse(readFileSync(config.databaseFolderPath + config.filePath));
	} catch (error) {
		console.error('Error loading file:', error);
		return {};
	}
};
