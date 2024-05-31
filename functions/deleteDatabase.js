const saveFile = require('./operations/saveFile');
const loadFile = require('./operations/loadFile');
const log = require('./logs/logger');

/**
 * Deletes a database.
 * @param {string} name - The name of the database to delete.
 * @returns {boolean} - Whether or not the database was deleted successfully.
 */
module.exports = function deleteDatabase(name) {
	try {
		const database = loadFile();
		if (!database[name]) {
			log('Delete Database', 'Database does not exist:', name);
			return false;
		}

		delete database[name];

		saveFile(database);
		log('Delete Database', 'Database deleted:', name);
		return true;
	} catch (error) {
		log('Error', 'Deleting database:', error);
		return false;
	}
};
