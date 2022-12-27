const { writeFileSync, readFileSync } = require('fs');
const jsonFormat = require('json-format');

/**
 *
 * @param {string} name - The name of the database to create
 * @returns {boolean} - Whether or not the database was created
 */
module.exports = function createDatabase(name) {
	// Check if the database exists in the database.json file
	let database = {};
	try {
		database = JSON.parse(readFileSync('./NyaDB/database.json'));
	} catch (e) {
		console.log('Error loading database: ' + e);
	}
	if (database[name]) {
		console.log('Database already exists: ' + name);
		return;
	}

	// Create the database
	database[name] = {};

	// Format the database before saving
	const formattedDatabase = jsonFormat(database, {
		type: 'tab',
	});

	// Save the database
	writeFileSync('./NyaDB/database.json', formattedDatabase);

	return true;
};
