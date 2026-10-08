const { readdirSync, lstatSync, unlinkSync } = require('fs');
const path = require('path');
const log = require('../logs/logger');
const { resolveDataRoot } = require('../validation/validateInput');

/**
 * Only temp filenames matching safeAtomicWrite's exact format can be reaped,
 * `${dbName}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`.
 * That is the only format an orphan can take, so nothing else can match.
 * Legacy `.tmp.json` is excluded because `foo.tmp` is a valid database name.
 */
const TEMP_FILE_PATTERN = /^(.+)\.tmp-\d{13}-[a-z0-9]*\.json$/;

/**
 * An in-flight temp file from another process exists only for the microseconds
 * between writeFileSync and renameSync, so 60 seconds also absorbs mtime skew.
 */
const TEMP_MAX_AGE_MS = 60 * 1000;

/**
 * Reaps temp files orphaned by a hard process death during an atomic write.
 * Never throws and never touches files that do not match the temp pattern.
 * @param {string} [rootDir] - Optional data root override (resolved from config otherwise).
 * @returns {number} - The number of temp files removed.
 */
module.exports = function cleanupTempFiles(rootDir) {
	const rootAbs = resolveDataRoot(rootDir);

	let entries;
	try {
		entries = readdirSync(rootAbs);
	} catch (error) {
		log('Error', 'Cleaning temporary files:', error.message || error);
		return 0;
	}

	const now = Date.now();
	let removed = 0;

	entries.forEach(entry => {
		if (!TEMP_FILE_PATTERN.test(entry)) return;

		const filePath = path.join(rootAbs, entry);

		try {
			const stats = lstatSync(filePath);

			// Future-dated mtimes (clock skew) also stay within the age gate
			if (now - stats.mtimeMs <= TEMP_MAX_AGE_MS) return;

			unlinkSync(filePath);
			removed++;
		} catch (error) {
			log('Error', `Failed to remove temporary file ${entry}:`, error.message || error);
		}
	});

	if (removed > 0) {
		log('Setup Database', 'Orphaned temporary files removed:', removed);
	}

	return removed;
};
