const saveFile = require('./operations/saveFile');
const loadFile = require('./operations/loadFile');
const log = require('./logs/logger');
const config = require('../config/config');
const { validateDatabaseName } = require('./validation/validateInput');

/**
 * Creates a new database.
 * @param {string} name - The name of the database to create.
 * @returns {boolean} - Whether or not the database was created successfully.
 */
module.exports = function createDatabase(name) {
	try {
		if (config.validateInput === true) {
			validateDatabaseName(name);
		}

		const database = loadFile();
		if (Object.prototype.hasOwnProperty.call(database, name)) {
			log('Create Database', 'Database already exists:', name);
			return false;
		}

		database[name] = {};
		const saved = saveFile(database[name], name);
		if (!saved) return false;

		log('Create Database', 'Database created:', name);
		return true;
	} catch (error) {
		log('Error', 'Creating database:', error.message || error);
		return false;
	}
};
