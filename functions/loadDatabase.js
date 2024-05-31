const loadFile = require('./operations/loadFile');
const log = require('./logs/logger');

/**
 * Loads the entire database.
 * @returns {object} - The database object.
 */
module.exports = function loadDatabase() {
	try {
		const database = loadFile();
		log('Load Database', 'Database loaded successfully');
		return database;
	} catch (error) {
		log('Error', 'Loading database:', error);
		return {};
	}
};
