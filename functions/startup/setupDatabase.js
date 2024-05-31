const { existsSync, mkdirSync, writeFileSync } = require('fs');
const config = require('../../config/config');
const log = require('../logs/logger');

const databaseFolderPath = `./${config.storage.databaseFolderName}`;
const databaseFilePath = `/${config.storage.databaseFileName}`;

try {
	// Create database folder if it doesn't exist
	if (!existsSync(databaseFolderPath)) {
		mkdirSync(databaseFolderPath);
		log('Setup Database', 'Database folder created:', databaseFolderPath);
	}
	// Create database file if it doesn't exist
	if (!existsSync(databaseFolderPath + databaseFilePath)) {
		writeFileSync(databaseFolderPath + databaseFilePath, config.storage.content);
		log('Setup Database', 'Database file created:', databaseFolderPath + databaseFilePath);
	}
} catch (error) {
	log('Error', 'Setting up database:', error);
}
