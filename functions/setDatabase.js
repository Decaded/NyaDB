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

		if (!Object.prototype.hasOwnProperty.call(database, name)) {
			log('Set Database', 'Database does not exist:', name);
			return false;
		}

		const previousData = database[name];
		const mergedData = {
			...database[name],
			...data,
		};

		log('Debug', `About to check merged data size for ${name}: ${JSON.stringify(mergedData).length} bytes`);

		let sizeStatus = { isCritical: false };
		if (config.validateInput === true) {
			sizeStatus = checkMergedDataSize(name, mergedData, config.maxFileSize);
		}

		log('Debug', `Size check passed for ${name}, updating database`);

		database[name] = mergedData;

		log('Debug', `Calling saveFile for ${name}`);
		const saved = saveFile(database[name], name);
		if (!saved) {
			database[name] = previousData;
			return false;
		}

		log('Set Database', 'Database updated:', name, data);
		if (sizeStatus.isCritical) {
			const errorMsg = `Database '${name}' has reached the hard size limit (${sizeStatus.sizeMB.toFixed(2)}MB / ${sizeStatus.limitMB}MB).`;

			log.logCritical(
				errorMsg,
				'The latest write was saved before raising this critical condition.',
				`Database: ${name}`,
				`Current size: ${sizeStatus.sizeMB.toFixed(2)}MB`,
				`Configured limit: ${sizeStatus.limitMB}MB`,
				'',
				'Recommended actions:',
				'1. Split your data into multiple databases',
				'2. Increase maxFileSize in configuration',
				'3. Archive old data to separate storage',
			);
		}

		return true;
	} catch (error) {
		if (error && error.isCritical) {
			throw error;
		}

		log('Error', 'Setting database:', error.message || error);
		log('Debug', 'setDatabase caught error, returning false');
		return false;
	}
};
