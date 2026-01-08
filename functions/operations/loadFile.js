const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');

/**
 * Loads data from all database files, excluding the migrated database backup and temporary files.
 * @returns {object} - The combined data from all database files, excluding migrated ones.
 * @throws {Error} - If there is an error loading the files.
 */
module.exports = function loadFile() {
	try {
		const databaseFolderPath = path.join('./', config.storage.databaseFolderName);
		const files = readdirSync(databaseFolderPath).filter(file => file.endsWith('.json'));
		const database = {};
		const successfullyLoadedFiles = [];
		const failedFiles = [];

		files.forEach(file => {
			if (file === 'database_backup.json') {
				const filePath = path.join(databaseFolderPath, file);
				try {
					const data = readFileSync(filePath, config.encoding);
					const parsedData = JSON.parse(data);

					// Check if "migrated": true is present in the backup data
					if (parsedData.databaseMigratedToDedicatedFiles === true) {
						log('Load File', `Skipping migrated backup file: ${file}`);
						return;
					}
				} catch (error) {
					log('Error', `Failed to check migration status of ${file}:`, error.message);
					return;
				}
			}

			// Skip temporary files
			if (file.endsWith('.tmp.json') || file.includes('.tmp-')) {
				log('Load File', `Skipping temporary file: ${file}`);
				return;
			}

			// Process other database files
			try {
				const filePath = path.join(databaseFolderPath, file);
				const data = readFileSync(filePath, config.encoding);
				const dbName = file.replace('.json', '');

				try {
					database[dbName] = JSON.parse(data);
					successfullyLoadedFiles.push(file);
				} catch (parseError) {
					log('Error', `Failed to parse JSON in ${file}:`, parseError.message);
					failedFiles.push({ file, error: 'Invalid JSON' });
					// Continue loading other files instead of crashing
				}
			} catch (readError) {
				log('Error', `Failed to read file ${file}:`, readError.message);
				failedFiles.push({ file, error: 'Read error' });
			}
		});

		if (successfullyLoadedFiles.length > 0) {
			log('Load File', 'Files loaded successfully', successfullyLoadedFiles);
		}

		if (failedFiles.length > 0) {
			log('Error', 'Some files failed to load:', failedFiles.map(f => f.file).join(', '));
		}

		return database;
	} catch (error) {
		log('Error', 'Loading files:', error.message || error);
		// Return empty database instead of crashing
		return {};
	}
};
