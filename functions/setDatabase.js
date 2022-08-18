const { writeFileSync } = require('fs');

/**
 * Updates the database with the new data.
 * @param {object} cache - The database object
 * @param {string} name - The name of the database to update
 * @param {object} data - The data to be added to the database
 * @returns {object} - The updated database object
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
module.exports = function updateDatabase(cache, name, data) {
	// Check if the database exists in the database.json file
	if (!cache[name]) {
		console.log('Database does not exist ' + name);
		return false;
	}

	// Update the corresponding entry in the database
	cache[name] = {
		...cache[name],
		...data,
	};

	// Save the database
	writeFileSync('./NyaDB/database.json', JSON.stringify(cache));
	return true;
};
