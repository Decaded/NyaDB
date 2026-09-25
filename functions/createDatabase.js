const { existsSync } = require('fs');
const saveFile = require('./operations/saveFile');
const log = require('./logs/logger');
const config = require('../config/config');
const { getDatabaseFilePath, validateDatabaseName } = require('./validation/validateInput');

/**
 * Creates a new database.
 * @param {string} name - The name of the database to create.
 * @param {object} database - The in-memory database registry.
 * @returns {boolean} - Whether or not the database was created successfully.
 */
module.exports = function createDatabase(name, database) {
	try {
		if (config.validateInput === true) {
			validateDatabaseName(name);
		}

		if (Object.prototype.hasOwnProperty.call(database, name)) {
			log('Create Database', 'Database already exists:', name);
			return false;
		}

		const fullPath = getDatabaseFilePath(name, { validate: false });
		if (existsSync(fullPath)) {
			log('Create Database', 'Database already exists:', name);
			return false;
		}

		const entry = {};
		const saved = saveFile(entry, name);
		if (!saved) return false;

		database[name] = entry;
		log('Create Database', 'Database created:', name);
		return true;
	} catch (error) {
		log('Error', 'Creating database:', error.message || error);
		return false;
	}
};
