const { readFileSync } = require('fs');

/**
 * Loads database.
 * @returns {object} database - The loaded database
 */

module.exports = function loadDatabase() {
	// Load the database
	let database = {};
	try {
		database = JSON.parse(readFileSync('./NyaDB/database.json'));
	} catch (e) {
		console.log('Error loading database: ' + e);
	}
	return database;
};
