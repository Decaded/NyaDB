const saveFile = require('./operations/saveFile');
const loadFile = require('./operations/loadFile');

/**
 * Deletes a database.
 * @param {string} name - The name of the database to delete.
 * @returns {boolean} - Whether or not the database was deleted successfully.
 */
module.exports = function deleteDatabase(name) {
	const database = loadFile();
	if (!database[name]) {
		console.log('Database does not exist:', name);
		return false;
	}

	delete database[name];

	// Save the database
	saveFile(database);

	return true;
};
