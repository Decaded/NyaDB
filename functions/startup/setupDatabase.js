const { existsSync, mkdirSync } = require('fs');
const config = require('../../config/config');
const log = require('../logs/logger');
const migrateOldData = require('./migrateOldData');

const databaseFolderPath = `./${config.storage.databaseFolderName}`;

try {
	// Create database folder if it doesn't exist
	if (!existsSync(databaseFolderPath)) {
		mkdirSync(databaseFolderPath);
		log('Setup Database', 'Database folder created:', databaseFolderPath);
	}

	// Migrate old data if necessary
	const migrationSuccess = migrateOldData();
	if (!migrationSuccess) {
		log('Error', 'Database initialization halted due to migration failure.');
		process.exit(1); // Halt initialization if migration fails
	}
} catch (error) {
	log('Error', 'Setting up database:', error);
}
