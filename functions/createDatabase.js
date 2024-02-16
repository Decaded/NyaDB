const saveFile = require('./operations/saveFile');
const loadFile = require('./operations/loadFile');

/**
 * Creates a new database.
 * @param {string} name - The name of the database to create.
 * @returns {boolean} - Whether or not the database was created successfully.
 */
module.exports = function createDatabase(name) {
	const database = loadFile();
	if (database[name]) {
		console.log('Database already exists:', name);
		return false;
	}

	database[name] = {};

	// Save the database
	saveFile(database);

	return true;
};
