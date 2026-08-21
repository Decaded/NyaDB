const { existsSync, mkdirSync } = require('fs');
const log = require('../logs/logger');
const migrateOldData = require('./migrateOldData');
const { resolveDataRoot } = require('../validation/validateInput');

module.exports = function setupDatabase() {
	const databaseFolderPath = resolveDataRoot();

	try {
		// Create database folder if it doesn't exist
		if (!existsSync(databaseFolderPath)) {
			mkdirSync(databaseFolderPath);
			log('Setup Database', 'Database folder created:', databaseFolderPath);
		}

		// Deprecated legacy migration is retained through v6 and removed in v7.
		const migrationSuccess = migrateOldData();
		if (!migrationSuccess) {
			throw new Error('Database initialization halted due to migration failure.');
		}

		return true;
	} catch (error) {
		log('Error', 'Setting up database:', error);
		throw error;
	}
};
