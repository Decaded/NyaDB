const saveFile = require('./operations/saveFile');
const log = require('./logs/logger');
const config = require('../config/config');
const { validateDatabaseName, validateData, checkMergedDataSize } = require('./validation/validateInput');

/**
 * Updates the database with the new data.
 * @param {object} database - The database object
 * @param {string} name - The name of the database to update
 * @param {object} data - The data to be added to the database
 * @returns {boolean} - Whether or not the database was updated
 */
module.exports = function setDatabase(database, name, data) {
	try {
		if (config.validateInput === true) {
			validateDatabaseName(name);
			validateData(data);
		}

		if (!database[name]) {
			log('Set Database', 'Database does not exist:', name);
			return false;
		}

		const mergedData = {
			...database[name],
			...data,
		};

		log('Debug', `About to check merged data size for ${name}: ${JSON.stringify(mergedData).length} bytes`);

		// Check merged data size and enforce limits with grace margin BEFORE updating database
		// This will throw on critical error
		if (config.validateInput === true) {
			checkMergedDataSize(name, mergedData, config.maxFileSize);
		}

		log('Debug', `Size check passed for ${name}, updating database`);

		database[name] = mergedData;

		log('Debug', `Calling saveFile for ${name}`);
		saveFile(database[name], name);

		log('Set Database', 'Database updated:', name, data);
		return true;
	} catch (error) {
		log('Error', 'Setting database:', error.message || error);
		log('Debug', `setDatabase caught error, returning false without saving`);
		return false;
	}
};
