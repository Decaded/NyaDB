const { writeFileSync } = require('fs');
const jsonFormat = require('json-format');

/**
 * Updates the database with the new data.
 * @param {object} database - The database object
 * @param {string} name - The name of the database to update
 * @param {object} data - The data to be added to the database
 * @returns {boolean} - Whether or not the database was updated
 *
 * @example
 * updateDatabase(database, "test", {
 *   "test": "test"
 * });
 * // Returns:
 * // {
 * //   "test": "test"
 * // }
 */

module.exports = function updateDatabase(database, name, data) {
	// Check if the database exists in the database.json file
	if (!database[name]) {
		console.log('Database does not exist: ' + name);
		return false;
	}

	// Update the corresponding entry in the database
	database[name] = {
		...database[name],
		...data,
	};

	// Format the database before saving
	const formattedDatabase = jsonFormat(database, {
		type: 'tab',
	});

	// Save the database
	writeFileSync('./NyaDB/database.json', formattedDatabase);
	return true;
};
