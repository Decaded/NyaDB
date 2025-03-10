const { readFileSync, writeFileSync, existsSync, renameSync } = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');
const saveFile = require('../operations/saveFile');

/**
 * Migrates data from the old database.json file to the new file structure.
 * @returns {boolean} - Returns true if migration was successful or not needed, false if migration failed.
 */
module.exports = function migrateOldData() {
	const oldFilePath = path.join('./', config.storage.databaseFolderName, config.storage.databaseFileName);
	const backupFilePath = path.join('./', config.storage.databaseFolderName, 'database_backup.json');

	try {
		// Check if the old file exists
		if (!existsSync(oldFilePath)) {
			log('Migration', 'Old database file does not exist. Skipping migration.');
			return true; // No migration needed
		}

		// Read the old file
		const oldData = readFileSync(oldFilePath, config.encoding);
		const oldDatabase = JSON.parse(oldData);

		// Check if the old file has already been migrated
		if (oldDatabase.databaseMigratedToDedicatedFiles === true) {
			log('Migration', 'Old database file has already been migrated. Skipping migration.');
			return true; // Already migrated
		}

		log('Migration', 'Starting migration of old database file...');

		// Migrate each database to its own file
		for (const dbName in oldDatabase) {
			if (oldDatabase.hasOwnProperty(dbName)) {
				saveFile(oldDatabase[dbName], dbName);
				log('Migration', `Migrated database: ${dbName}`);
			}
		}

		// Mark the old file as migrated
		oldDatabase.databaseMigratedToDedicatedFiles = true;
		writeFileSync(oldFilePath, JSON.stringify(oldDatabase, null, 2), { encoding: config.encoding });

		// Create a backup of the old file (optional, for safety)
		renameSync(oldFilePath, backupFilePath);
		log('Migration', 'Old database file backed up as database_backup.json');

		log('Migration', 'Migration completed successfully.');
		return true;
	} catch (error) {
		log('Error', 'Migration failed:', error);
		return false; // Migration failed
	}
};
