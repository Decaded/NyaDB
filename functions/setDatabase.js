const saveFile = require('./operations/saveFile');
const log = require('./logs/logger');

/**
 * Updates the database with the new data.
 * @param {object} database - The database object
 * @param {string} name - The name of the database to update
 * @param {object} data - The data to be added to the database
 * @returns {boolean} - Whether or not the database was updated
 */
module.exports = function setDatabase(database, name, data) {
	if (!database[name]) {
		log('Set Database', 'Database does not exist:', name);
		return false;
	}

	database[name] = {
		...database[name],
		...data,
	};

	saveFile(database);
	log('Set Database', 'Database updated:', name, data);
	return true;
};
