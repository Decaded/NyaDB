const saveFile = require('./operations/saveFile');
const loadFile = require('./operations/loadFile');
const config = require('../config/config');

/**
 * Deletes a database.
 * @param {string} name - The name of the database to delete.
 * @returns {boolean} - Whether or not the database was deleted successfully.
 */
module.exports = function deleteDatabase(name) {
	try {
		const database = loadFile();
		if (!database[name]) {
			if (config.enableConsoleLogs) {
				console.log('NyaDB: Database does not exist:', name);
			}
			return false;
		}

		delete database[name];

		// Save the updated database
		saveFile(database);

		return true;
	} catch (error) {
		console.error('NyaDB: Error deleting database:', error);
		return false;
	}
};
