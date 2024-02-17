const { existsSync, mkdirSync, writeFileSync } = require('fs');
const config = require('../../config/config');

/**
 * Creates a file if it doesn't exist, initializing it with the provided content.
 * It can be customized in 'config/default.json' file.
 * @param {string} databaseFolderPath - The path of the main database folder.
 * @param {string} filePath - The path of the database file to create.
 * @param {object} content - The content to initialize the file with.
 * @returns {boolean} - True if the file was created successfully, false otherwise.
 */

console.log('NYA');
// Create database folder if it doesn't exist
if (!existsSync(config.databaseFolderPath)) {
	mkdirSync(config.databaseFolderPath);
}
// Create database file if it doesn't exist
if (!existsSync(config.databaseFolderPath + config.filePath)) {
	writeFileSync(config.databaseFolderPath + config.filePath, config.content);
}
