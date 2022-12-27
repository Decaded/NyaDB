const { readFileSync, writeFileSync } = require('fs');
const jsonFormat = require('json-format');

/**
 * Deletes the database.
 * @param {string} name - The name of the database to delete
 * @returns {boolean} - Whether or not the database was deleted
 */

module.exports = function deleteDatabase(name) {
	// Check if the database exists in the database.json file
	let database = {};
	try {
		database = JSON.parse(readFileSync('./NyaDB/database.json'));
	} catch (e) {
		console.log('Error loading database: ' + e);
	}
	if (!database[name]) {
		console.log('Database does not exist: ' + name);
		return false;
	}

	// Delete the database
	delete database[name];

	// Format the database before saving
	const formattedDatabase = jsonFormat(database, {
		type: 'tab',
	});

	// Save the database
	writeFileSync('./NyaDB/database.json', formattedDatabase);

	return true;
};
