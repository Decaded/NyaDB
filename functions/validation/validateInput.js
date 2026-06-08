const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const log = require('../logs/logger');

/**
 * Helper: get the configured data root directory.
 * Priority:
 *  - explicit rootDir param (passed to validators)
 *  - config.storage.databaseFolderName (relative to cwd)
 *  - fallback to ./NyaDB
 */
function resolveDataRoot(rootDir) {
	if (rootDir) return path.resolve(String(rootDir));

	const folderName = (config && config.storage && config.storage.databaseFolderName) || 'NyaDB';

	return path.resolve(process.cwd(), String(folderName));
}

function getDatabaseFilePath(dbName, opts = {}) {
	const ext = opts.ext || '.json';
	const rootDir = opts.rootDir;

	if (opts.validate !== false && config.validateInput === true) {
		validateDatabaseName(dbName, rootDir);
	}

	return path.resolve(resolveDataRoot(rootDir), dbName + ext);
}

/**
 * Validates a database name to ensure it cannot escape the configured data root.
 * - If config.validateInput === false, validation is entirely skipped (after type check).
 * - Subpaths are disallowed (no '/' or '\').
 *
 * @param {string} name - database name (single segment, no subfolders)
 * @param {string} [rootDir] - optional override for data root (absolute or relative)
 * @returns {boolean} true if valid
 * @throws {Error} when invalid
 */
function validateDatabaseName(name, rootDir) {
	if (typeof name !== 'string') {
		const err = new Error('Database name must be a string.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	if (config && config.validateInput === false) {
		return true;
	}

	const trimmed = name.trim();

	if (trimmed.length === 0) {
		const err = new Error('Database name cannot be empty.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	if (trimmed !== name) {
		const err = new Error('Database name cannot start or end with whitespace.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	// Disallow ASCII control characters
	if (/[\x00-\x1F\x7F]/.test(trimmed)) {
		const err = new Error('Database name contains invalid control characters.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	// Names consisting only of dots or whitespace are problematic
	if (/^[\s.]+$/.test(trimmed)) {
		const err = new Error('Database name cannot consist only of dots or spaces.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	// Disallow path separators
	if (trimmed.includes('/') || trimmed.includes('\\')) {
		const err = new Error('Database name cannot contain path separators or subpaths.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	if (/[<>:"|?*]/.test(trimmed)) {
		const err = new Error('Database name contains characters that are invalid on Windows filesystems.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	// Windows reserved device names
	if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(trimmed)) {
		const err = new Error('Database name is a reserved device name on Windows.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	if (/[ .]$/.test(trimmed)) {
		const err = new Error('Database name cannot end with a space or dot.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	// Length cap
	if (trimmed.length > 255) {
		const err = new Error('Database name is too long (max 255 characters).');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	// Root-lock check
	const rootAbs = resolveDataRoot(rootDir);
	const candidate = path.resolve(rootAbs, trimmed);
	const relative = path.relative(rootAbs, candidate);

	// Escapes root if relative path is '..' or starts with '../'
	if (relative === '..' || relative.startsWith('..' + path.sep)) {
		const err = new Error('Database name would escape the configured data root.');
		log('Error', 'Validation failed:', err.message, {
			name: trimmed,
			root: rootAbs,
			resolved: candidate,
		});
		throw err;
	}

	return true;
}

/**
 * After an atomic write/rename, verify the real path of the file is still
 * inside the real data root. If not, attempt to unlink the file and throw.
 *
 * @param {string} filePath - the final file path you wrote to (absolute or relative)
 * @param {string} [rootDir] - optional rootDir override
 * @returns {boolean} true if inside root
 * @throws {Error} if outside root or filesystem errors occur
 */
function assertRealPathInsideRoot(filePath, rootDir) {
	const rootAbs = resolveDataRoot(rootDir);

	let rootReal;
	let fileReal;

	try {
		rootReal = fs.realpathSync(rootAbs);
	} catch (err) {
		const e = new Error(`Failed to resolve real path for data root: ${err.message}`);
		log('Error', 'Validation failed:', e.message);
		throw e;
	}

	try {
		fileReal = fs.realpathSync(path.resolve(filePath));
	} catch (err) {
		const e = new Error(`Failed to resolve real path for file: ${err.message}`);
		log('Error', 'Validation failed:', e.message);
		throw e;
	}

	// Normalize case for Windows
	const isWin = process.platform === 'win32';
	const a = isWin ? rootReal.toLowerCase() : rootReal;
	const b = isWin ? fileReal.toLowerCase() : fileReal;

	if (b === a) return true;
	if (!b.startsWith(a + path.sep)) {
		try {
			fs.unlinkSync(filePath);
		} catch (cleanupErr) {
			// ignore cleanup errors
		}

		const err = new Error('Write resulted in a file outside of the configured data root – aborted for security.');
		log('Error', 'Validation failed:', err.message, { fileReal: b, rootReal: a });
		throw err;
	}

	return true;
}

/**
 * Perform an atomic write to the NyaDB folder using a temp file in the same directory,
 * then rename to the final filename. After rename, assert the realpath is inside the root.
 *
 * Throws on failure. Returns true on success.
 * @param {string} rootDir - optional root dir override (if omitted, resolved from config)
 * @param {string} dbName - database name (single segment, no separators)
 * @param {string|Buffer} dataString - data to write
 * @param {object} [opts] - optional: { ext: '.json' }
 * @returns {boolean}
 */
function safeAtomicWrite(rootDir, dbName, dataString, opts = {}) {
	const ext = opts.ext || '.json';
	const rootAbs = resolveDataRoot(rootDir);

	validateDatabaseName(dbName, rootAbs);

	if (!fs.existsSync(rootAbs)) {
		fs.mkdirSync(rootAbs, { recursive: true });
	}

	const finalPath = getDatabaseFilePath(dbName, { rootDir: rootAbs, ext, validate: false });

	// Create a reasonably unique temp filename inside the same dir
	const tmpName = `${dbName}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
	const tmpPath = path.join(rootAbs, tmpName);

	try {
		fs.writeFileSync(tmpPath, dataString, { encoding: config.encoding });
		fs.renameSync(tmpPath, finalPath);

		if (config.validateInput === true) {
			assertRealPathInsideRoot(finalPath, rootAbs);
		}

		return true;
	} catch (err) {
		try {
			if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
		} catch (cleanupErr) {}

		throw err;
	}
}

/**
 * Validates data to ensure it can be safely serialized and stored.
 * @param {*} data - The data to validate.
 * @throws {Error} - If the data is invalid.
 * @returns {boolean} - Returns true if valid.
 */
function validateData(data) {
	if (data === undefined) {
		const err = new Error('Data cannot be undefined.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	if (data === null) {
		const err = new Error('Data cannot be null.');
		log('Error', 'Validation failed:', err.message);
		throw err;
	}

	try {
		JSON.stringify(data);
	} catch (err) {
		const msg = err && err.message ? err.message : String(err);
		if (msg.toLowerCase().includes('circular')) {
			const vErr = new Error('Data contains circular references and cannot be serialized.');
			log('Error', 'Validation failed:', vErr.message);
			throw vErr;
		}
		const vErr = new Error(`Data validation failed: ${msg}`);
		log('Error', 'Validation failed:', vErr.message);
		throw vErr;
	}

	return true;
}

/**
 * Checks merged data size and enforces limits with warnings and grace margin.
 * @param {string} name - The database name.
 * @param {object} mergedData - The merged data to check.
 * @param {number} maxSizeMB - Maximum size in megabytes (optional, from config).
 * @returns {object} - Size status for the merged data.
 */
function checkMergedDataSize(name, mergedData, maxSizeMB) {
	const encoding = (config && config.encoding) || 'utf8';
	if (!maxSizeMB) {
		return {
			isCritical: false,
			sizeMB: 0,
			limitMB: 0,
		};
	}

	const jsonString = JSON.stringify(mergedData);
	const sizeInBytes = Buffer.byteLength(jsonString, encoding);
	const sizeMB = sizeInBytes / 1024 / 1024;
	const limitMB = Number(maxSizeMB);
	const warningThresholdMB = limitMB * 0.8;
	const graceThresholdMB = limitMB * 0.99;

	if (sizeMB > warningThresholdMB && sizeMB < graceThresholdMB) {
		log('Warning', `Database '${name}' size (${sizeMB.toFixed(2)}MB) approaching limit (${limitMB}MB at 100%).`);
	}

	if (sizeMB >= graceThresholdMB && sizeMB < limitMB) {
		log('Error', `Database '${name}' size (${sizeMB.toFixed(2)}MB) in grace threshold (99% of ${limitMB}MB limit). Next write may trigger a critical stop.`);
	}

	return {
		isCritical: sizeMB >= limitMB,
		sizeMB,
		limitMB,
	};
}

module.exports = {
	getDatabaseFilePath,
	resolveDataRoot,
	validateDatabaseName,
	validateData,
	checkMergedDataSize,
	safeAtomicWrite,
};
