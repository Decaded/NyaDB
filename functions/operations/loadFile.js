const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');

/**
 * Loads data from all database files, excluding the migrated database backup.
 * @returns {object} - The combined data from all database files, excluding migrated ones.
 * @throws {Error} - If there is an error loading the files.
 */
module.exports = function loadFile() {
	try {
		const databaseFolderPath = path.join('./', config.storage.databaseFolderName);
		const files = readdirSync(databaseFolderPath).filter(file => file.endsWith('.json'));
		const database = {};
		const successfullyLoadedFiles = []; // Keep track of files that were successfully loaded

		files.forEach(file => {
			// Skip database_backup.json if it has already been migrated
			if (file === 'database_backup.json') {
				const filePath = path.join(databaseFolderPath, file);
				const data = readFileSync(filePath, config.encoding);
				const parsedData = JSON.parse(data);

				// Check if "migrated": true is present in the backup data
				if (parsedData.databaseMigratedToDedicatedFiles === true) {
					log('Load File', `Skipping migrated backup file: ${file}`);
					return; // Skip this file
				}
			}

			// Process other database files
			const filePath = path.join(databaseFolderPath, file);
			const data = readFileSync(filePath, config.encoding);
			const dbName = file.replace('.json', '');
			database[dbName] = JSON.parse(data);
			successfullyLoadedFiles.push(file); // Add the file to the list of successfully loaded files
		});

		log('Load File', 'Files loaded successfully', successfullyLoadedFiles);
		return database;
	} catch (error) {
		log('Error', 'Loading files:', error);
		process.exit();
	}
};
