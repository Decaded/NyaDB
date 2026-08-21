const { readFileSync, readdirSync, lstatSync } = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');
const { resolveDataRoot } = require('../validation/validateInput');

function shouldLoadDatabaseFile(file) {
	if (!file.endsWith('.json')) return false;
	if (file === 'database_backup.json') return false;
	if (file === 'custom.json') return false;
	if (file.endsWith('.tmp.json') || file.includes('.tmp-')) return false;

	return true;
}

function isWithinMaxFileSize(filePath, fileName) {
	if (!config.maxFileSize) return true;

	const stats = lstatSync(filePath);
	if (stats.isSymbolicLink()) {
		log('Error', `Skipping ${fileName}: symbolic links are not supported.`);
		return false;
	}

	const limitBytes = Number(config.maxFileSize) * 1024 * 1024;

	if (stats.size >= limitBytes) {
		log('Error', `Skipping ${fileName}: file size exceeds configured maxFileSize.`);
		return false;
	}

	return true;
}

/**
 * Loads data from all user database files, excluding config, backup, and temporary files.
 * @returns {object} - The combined data from all readable database files.
 */
module.exports = function loadFile() {
	try {
		const databaseFolderPath = resolveDataRoot();
		const files = readdirSync(databaseFolderPath).filter(shouldLoadDatabaseFile);
		const database = Object.create(null);
		const successfullyLoadedFiles = [];
		const failedFiles = [];

		files.forEach(file => {
			try {
				const filePath = path.join(databaseFolderPath, file);
				if (lstatSync(filePath).isSymbolicLink()) {
					log('Error', `Skipping ${file}: symbolic links are not supported.`);
					failedFiles.push({ file, error: 'Symbolic link' });
					return;
				}

				if (!isWithinMaxFileSize(filePath, file)) {
					failedFiles.push({ file, error: 'File too large' });
					return;
				}

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
