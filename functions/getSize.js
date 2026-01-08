const { statSync, existsSync } = require('fs');
const path = require('path');
const config = require('../config/config');
const log = require('./logs/logger');

/**
 * Formats bytes to human-readable format.
 * @param {number} bytes - The size in bytes.
 * @param {number} decimals - Number of decimal places.
 * @returns {string} - Formatted size string.
 */
function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Gets the size of a single database file.
 * @param {string} dbName - The name of the database.
 * @returns {object|null} - Object containing size info or null if file doesn't exist.
 */
function getDatabaseSize(dbName) {
	try {
		const filePath = path.join('./', config.storage.databaseFolderName, `${dbName}.json`);

		if (!existsSync(filePath)) {
			return null;
		}

		const stats = statSync(filePath);
		return {
			name: dbName,
			bytes: stats.size,
			formatted: formatBytes(stats.size),
		};
	} catch (error) {
		log('Error', `Getting size for database '${dbName}':`, error);
		return null;
	}
}

/**
 * Gets the size of one or more databases.
 * @param {string|string[]|null} names - Database name(s) or null for all databases.
 * @param {object} database - The current database object.
 * @returns {object|object[]} - Size information for requested database(s).
 */
module.exports = function getSize(names, database) {
	try {
		// If no names provided, get all databases
		if (!names || (Array.isArray(names) && names.length === 0)) {
			const allDatabases = Object.keys(database);
			const sizes = {};
			let totalBytes = 0;

			allDatabases.forEach(dbName => {
				const sizeInfo = getDatabaseSize(dbName);
				if (sizeInfo) {
					sizes[dbName] = sizeInfo;
					totalBytes += sizeInfo.bytes;
				}
			});

			log('Get Size', 'Retrieved sizes for all databases');
			return {
				databases: sizes,
				total: {
					bytes: totalBytes,
					formatted: formatBytes(totalBytes),
				},
			};
		}

		// If single string provided, return single database size
		if (typeof names === 'string') {
			const sizeInfo = getDatabaseSize(names);
			if (!sizeInfo) {
				log('Get Size', `Database '${names}' not found`);
				return null;
			}
			log('Get Size', `Retrieved size for database '${names}'`);
			return sizeInfo;
		}

		// If array provided, return sizes for specified databases
		if (Array.isArray(names)) {
			const sizes = {};
			let totalBytes = 0;

			names.forEach(dbName => {
				const sizeInfo = getDatabaseSize(dbName);
				if (sizeInfo) {
					sizes[dbName] = sizeInfo;
					totalBytes += sizeInfo.bytes;
				}
			});

			log('Get Size', `Retrieved sizes for ${names.length} database(s)`);
			return {
				databases: sizes,
				total: {
					bytes: totalBytes,
					formatted: formatBytes(totalBytes),
				},
			};
		}

		log('Error', 'Invalid parameter type for getSize');
		return null;
	} catch (error) {
		log('Error', 'Getting database size(s):', error);
		return null;
	}
};
