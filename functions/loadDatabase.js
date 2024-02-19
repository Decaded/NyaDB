const loadFile = require('./operations/loadFile');

/**
 * Loads the entire database.
 * @returns {object} - The database object.
 */
module.exports = function loadDatabase() {
	try {
		return loadFile();
	} catch (error) {
		console.error('NyaDB: Error loading database:', error);
		return {};
	}
};
