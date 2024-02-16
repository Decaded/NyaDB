const loadFile = require('./operations/loadFile');

/**
 * Loads the database.
 * @returns {object} - The loaded database.
 */
module.exports = function loadDatabase() {
	return loadFile();
};
