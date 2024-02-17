const { readFileSync } = require('fs');
const path = require('path');
const config = require('../../config/config');

/**
 * Loads data from a file.
 * @param {string} filePath - The path to the file to load.
 * @returns {object} - The data loaded from the file.
 */
module.exports = function loadFile() {
	try {
		const fullPath = path.join(config.databaseFolderPath, config.filePath);
		const data = readFileSync(fullPath, 'utf8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error loading file:', error);
		return {};
	}
};
