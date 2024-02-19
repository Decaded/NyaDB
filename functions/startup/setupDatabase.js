const { existsSync, mkdirSync, writeFileSync } = require('fs');
const config = require('../../config/config');

const databaseFolderPath = `./${config.storage.databaseFolderName}`;
const databaseFilePath = `/${config.storage.databaseFileName}`;

try {
	// Create database folder if it doesn't exist
	if (!existsSync(databaseFolderPath)) {
		mkdirSync(databaseFolderPath);
	}
	// Create database file if it doesn't exist
	if (!existsSync(databaseFolderPath + databaseFilePath)) {
		writeFileSync(databaseFolderPath + databaseFilePath, config.storage.content);
	}
} catch (error) {
	console.error('NyaDB: Error setting up database:', error);
}
