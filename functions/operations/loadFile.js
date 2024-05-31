const { readFileSync } = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');

/**
 * Loads data from a file.
 * @returns {object} - The data loaded from the file.
 * @throws {Error} - If there is an error loading the file.
 */
module.exports = function loadFile() {
	try {
		const fullPath = path.join('./', config.storage.databaseFolderName, config.storage.databaseFileName);
		const data = readFileSync(fullPath, config.encoding);
		log('Load File', 'File loaded successfully', fullPath);
		return JSON.parse(data);
	} catch (error) {
		log('Error', 'Loading file:', error);
		process.exit();
	}
};
