const saveFile = require('./operations/saveFile');
const loadFile = require('./operations/loadFile');
const config = require('../config/config');

/**
 * Creates a new database.
 * @param {string} name - The name of the database to create.
 * @returns {boolean} - Whether or not the database was created successfully.
 */
module.exports = function createDatabase(name) {
	try {
		const database = loadFile();
		if (database[name]) {
			if (config.enableConsoleLogs) {
				console.log('NyaDB: Database already exists:', name);
			}
			return false;
		}

		database[name] = {};

		// Save the database
		saveFile(database);

		return true;
	} catch (error) {
		console.error('NyaDB: Error creating database:', error);
		return false;
	}
};
