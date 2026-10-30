const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const NyaDB = require('../index');
const config = require('../config/config');
const { serializeDatabase, checkSizeBytes, checkMergedDataSize } = require('../functions/validation/validateInput');
const loadDatabase = require('../functions/loadDatabase');
const saveFile = require('../functions/operations/saveFile');

// Test configuration
const TEST_PREFIX = '__nyadb_test__';
const TEST_DB_FOLDER = 'NyaDB';
const TEST_DB_NAME = `${TEST_PREFIX}database`;
const TEST_DB_NAME_2 = `${TEST_PREFIX}database_2`;

/**
 * Clean up test databases created during tests
 */
function cleanupTestDatabases() {
	const dbPath = path.join('./', TEST_DB_FOLDER);
	if (fs.existsSync(dbPath)) {
		const files = fs.readdirSync(dbPath);
		files.forEach(file => {
			if (file.startsWith(TEST_PREFIX) || file.endsWith('.tmp') || file === 'escape_link') {
				try {
					const filePath = path.join(dbPath, file);
					if (fs.lstatSync(filePath).isDirectory()) {
						fs.rmdirSync(filePath);
					} else {
						fs.unlinkSync(filePath);
					}
				} catch (err) {
					// Ignore cleanup errors
				}
			}
		});
	}

	const escapeTarget = path.resolve('./symlink_escape_target');
	if (fs.existsSync(escapeTarget)) {
		try {
			fs.rmdirSync(escapeTarget);
		} catch (err) {
			// Ignore cleanup errors
		}
	}
}

/**
 * Wait for debounced operations to complete
 */
function wait(ms = 50) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function removeDirectory(directoryPath) {
	if (!fs.existsSync(directoryPath)) return;

	fs.readdirSync(directoryPath).forEach(entry => {
		const entryPath = path.join(directoryPath, entry);
		if (fs.lstatSync(entryPath).isDirectory()) {
			removeDirectory(entryPath);
		} else {
			fs.unlinkSync(entryPath);
		}
	});

	fs.rmdirSync(directoryPath);
}

function withMutedConsoleError(callback) {
	const originalConsoleError = console.error;
	console.error = () => undefined;

	try {
		return callback();
	} finally {
		console.error = originalConsoleError;
	}
}

let stringifyCalls = [];

function hasKeys(value, keys) {
	if (value === null || typeof value !== 'object') return false;

	return keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
}

function countSerialized(keys) {
	return stringifyCalls.filter(value => hasKeys(value, keys)).length;
}

async function captureConsole(fn) {
	const calls = { warn: [], error: [], log: [] };
	const original = {
		warn: console.warn,
		error: console.error,
		log: console.log,
	};

	console.warn = (...args) => calls.warn.push(args.join(' '));
	console.error = (...args) => calls.error.push(args.join(' '));
	console.log = (...args) => calls.log.push(args.join(' '));

	try {
		await fn(calls);
	} finally {
		console.warn = original.warn;
		console.error = original.error;
		console.log = original.log;
	}

	return calls;
}

function percentile(sorted, fraction) {
	const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1);
	return sorted[Math.max(0, index)];
}

function buildBenchmarkPayload(keyCount, valueSize) {
	const payload = {};

	for (let i = 0; i < keyCount; i++) {
		payload['k' + i] = 'x'.repeat(valueSize);
	}

	return payload;
}

function measureEventLoopLag(action, durationMs) {
	return new Promise(resolve => {
		let maxLag = 0;
		let last = process.hrtime.bigint();
		const deadline = Date.now() + durationMs;

		function sample() {
			const now = process.hrtime.bigint();
			const lag = Number(now - last) / 1e6 - 10;
			if (lag > maxLag) maxLag = lag;
			last = now;

			if (Date.now() >= deadline) {
				resolve(maxLag);
				return;
			}

			setTimeout(sample, 10);
		}

		action();
		setTimeout(sample, 10);
	});
}

/**
 * Test Suite
 */
async function runTests() {
	console.log('Starting NyaDB Test Suite...\n');
	let passedTests = 0;
	let failedTests = 0;

	// Clean up before tests
	cleanupTestDatabases();

	// Test 1: Initialize NyaDB with default config
	try {
		const db = new NyaDB();
		assert.ok(db, 'NyaDB instance should be created');
		console.log('✓ Test 1: Initialize NyaDB with default config');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 1 failed:', err.message);
		failedTests++;
	}

	// Test 1b: Requiring package should not initialize storage
	try {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-require-'));
		const originalCwd = process.cwd();
		const packagePath = path.resolve(__dirname, '..');
		const indexPath = require.resolve(packagePath);

		delete require.cache[indexPath];
		try {
			process.chdir(tempDir);
			require(packagePath);
		} finally {
			process.chdir(originalCwd);
		}

		assert.strictEqual(fs.existsSync(path.join(tempDir, 'NyaDB')), false, 'Requiring NyaDB should not create the storage folder');
		fs.rmdirSync(tempDir);
		console.log('✓ Test 1b: Require does not initialize storage');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 1b failed:', err.message);
		failedTests++;
	}

	// Test 1c: Loader ignores reserved JSON files
	try {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-load-'));
		const originalCwd = process.cwd();
		const dbDir = path.join(tempDir, TEST_DB_FOLDER);
		const validDbName = `${TEST_PREFIX}loader_real`;
		const tempDbName = `${TEST_PREFIX}orphan.tmp-123`;
		let db;

		try {
			fs.mkdirSync(dbDir);
			fs.writeFileSync(path.join(dbDir, `${validDbName}.json`), JSON.stringify({ ok: true }), 'utf8');
			fs.writeFileSync(path.join(dbDir, 'custom.json'), JSON.stringify({ hidden: true }), 'utf8');
			fs.writeFileSync(path.join(dbDir, 'database_backup.json'), JSON.stringify({ hidden: true }), 'utf8');
			fs.writeFileSync(path.join(dbDir, `${tempDbName}.json`), JSON.stringify({ hidden: true }), 'utf8');

			process.chdir(tempDir);
			db = new NyaDB();
			db.database = loadDatabase();
		} finally {
			process.chdir(originalCwd);
		}

		const list = db.getList();
		assert.deepStrictEqual(list, [validDbName], 'Only real database files should be loaded');
		db.database = loadDatabase();
		removeDirectory(tempDir);
		console.log('✓ Test 1c: Loader ignores reserved JSON files');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 1c failed:', err.message);
		failedTests++;
	}

	// Test 1d: Write-path operations do not reload the database directory
	try {
		const loadCountScript = `
const path = require('path');
const packagePath = process.env.NYADB_TEST_PACKAGE;
const tempDir = process.env.NYADB_TEST_ROOT;
process.chdir(tempDir);
const loadFilePath = require.resolve(path.join(packagePath, 'functions', 'operations', 'loadFile.js'));
const originalLoadFile = require(loadFilePath);
let loadCount = 0;
require.cache[loadFilePath].exports = function countedLoadFile() {
	loadCount += 1;
	return originalLoadFile.apply(this, arguments);
};
delete require.cache[require.resolve(path.join(packagePath, 'functions', 'loadDatabase.js'))];
delete require.cache[require.resolve(path.join(packagePath, 'index.js'))];
const NyaDB = require(packagePath);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
	const db = new NyaDB({ writeDebounce: 5 });
	const name = '__nyadb_test__load_count';
	const renamedName = '__nyadb_test__load_count_renamed';
	const initial = loadCount;
	db.create(name);
	const afterCreate = loadCount;
	db.set(name, { value: 1 });
	await wait(20);
	const afterSet = loadCount;
	db.clear(name);
	const afterClear = loadCount;
	db.delete(name);
	const afterDelete = loadCount;
	db.create(name);
	db.rename(name, renamedName);
	db.delete(renamedName);
	const afterLifecycle = loadCount;
	db.reload();
	const afterReload = loadCount;
	process.stdout.write('RESULT:' + JSON.stringify({ initial, afterCreate, afterSet, afterClear, afterDelete, afterLifecycle, afterReload }) + '\\n');
})();
`;
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-load-count-'));

		try {
			const result = spawnSync(process.execPath, ['-e', loadCountScript], {
				encoding: 'utf8',
				env: {
					...process.env,
					NYADB_TEST_PACKAGE: path.resolve(__dirname, '..'),
					NYADB_TEST_ROOT: tempDir,
				},
			});

			assert.strictEqual(result.status, 0, result.stderr || result.stdout);
			const resultLine = result.stdout.split('\n').find(line => line.startsWith('RESULT:'));
			assert.ok(resultLine, 'Load-count child process should return its result');
			const counts = JSON.parse(resultLine.slice('RESULT:'.length));
			assert.deepStrictEqual(counts, {
				initial: 1,
				afterCreate: 1,
				afterSet: 1,
				afterClear: 1,
				afterDelete: 1,
				afterLifecycle: 1,
				afterReload: 2,
			});
			console.log('✓ Test 1d: Write-path operations do not reload the database directory');
			passedTests++;
		} finally {
			removeDirectory(tempDir);
		}
	} catch (err) {
		console.error('✗ Test 1d failed:', err.message);
		failedTests++;
	}

	// Test 1e Startup sweep reaps orphaned temp files but preserves live files
	try {
		const sweepScript = `
process.chdir(process.env.NYADB_TEST_ROOT);
const NyaDB = require(process.env.NYADB_TEST_PACKAGE);
const db = new NyaDB();
process.stdout.write('RESULT:' + JSON.stringify(db.getList()) + '\\n');
`;
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-sweep-'));
		const dbDir = path.join(tempDir, TEST_DB_FOLDER);
		const backdatedOrphan = `rateLimit.tmp-${Date.now() - 3600000}-aaa.json`;
		const freshOrphan = `rateLimit.tmp-${Date.now()}-bbb.json`;
		const realDatabase = `${TEST_PREFIX}sweep_real`;
		const protectedFiles = ['rateLimit.json', 'custom.json', 'database_backup.json', `${realDatabase}.json`, 'legacy.tmp.json'];

		try {
			fs.mkdirSync(dbDir);
			fs.writeFileSync(path.join(dbDir, backdatedOrphan), JSON.stringify({ stale: true }), 'utf8');
			fs.writeFileSync(path.join(dbDir, freshOrphan), JSON.stringify({ pending: true }), 'utf8');
			protectedFiles.forEach(file => {
				fs.writeFileSync(path.join(dbDir, file), JSON.stringify({ keep: true }), 'utf8');
			});
			fs.utimesSync(path.join(dbDir, backdatedOrphan), new Date(Date.now() - 3600000), new Date(Date.now() - 3600000));

			const result = spawnSync(process.execPath, ['-e', sweepScript], {
				encoding: 'utf8',
				env: {
					...process.env,
					NYADB_TEST_PACKAGE: path.resolve(__dirname, '..'),
					NYADB_TEST_ROOT: tempDir,
				},
			});

			assert.strictEqual(result.status, 0, result.stderr || result.stdout);
			const resultLine = result.stdout.split('\n').find(line => line.startsWith('RESULT:'));
			assert.ok(resultLine, 'Sweep child process should return its result');
			const list = JSON.parse(resultLine.slice('RESULT:'.length));

			assert.strictEqual(list.includes('rateLimit'), true, 'Real rateLimit database should be loaded');
			assert.strictEqual(list.includes(realDatabase), true, 'Real database should be loaded');
			assert.strictEqual(list.length, 2, 'Only real database files should be loaded');
			assert.strictEqual(fs.existsSync(path.join(dbDir, backdatedOrphan)), false, 'Backdated orphan temp file should be removed');
			assert.strictEqual(fs.existsSync(path.join(dbDir, freshOrphan)), true, 'Fresh orphan temp file should be kept');
			protectedFiles.forEach(file => {
				assert.strictEqual(fs.existsSync(path.join(dbDir, file)), true, `${file} should be untouched by the sweep`);
			});

			console.log('✓ Test 1e: Startup sweep reaps orphaned temp files');
			passedTests++;
		} finally {
			removeDirectory(tempDir);
		}
	} catch (err) {
		console.error('✗ Test 1e failed:', err.message);
		failedTests++;
	}

	// Test 1f Startup sweep tolerates a missing or unreadable data root
	try {
		const sweepRootScript = `
process.chdir(process.env.NYADB_TEST_ROOT);
const NyaDB = require(process.env.NYADB_TEST_PACKAGE);
new NyaDB();
process.stdout.write('RESULT:ok\\n');
`;
		const missingRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-sweep-missing-'));
		const unreadableRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-sweep-unreadable-'));
		const childEnv = {
			...process.env,
			NYADB_TEST_PACKAGE: path.resolve(__dirname, '..'),
		};

		try {
			const missingResult = spawnSync(process.execPath, ['-e', sweepRootScript], {
				encoding: 'utf8',
				env: { ...childEnv, NYADB_TEST_ROOT: missingRootDir },
			});

			assert.strictEqual(missingResult.status, 0, missingResult.stderr || missingResult.stdout);
			assert.ok(missingResult.stdout.includes('RESULT:ok'), 'Constructor should succeed with a missing data root');
			assert.strictEqual(fs.existsSync(path.join(missingRootDir, TEST_DB_FOLDER)), true, 'Missing data root should be created');

			// The data root path is a regular file, so readdirSync during the sweep fails
			fs.writeFileSync(path.join(unreadableRootDir, TEST_DB_FOLDER), 'not a directory', 'utf8');
			const unreadableResult = spawnSync(process.execPath, ['-e', sweepRootScript], {
				encoding: 'utf8',
				env: { ...childEnv, NYADB_TEST_ROOT: unreadableRootDir },
			});

			assert.strictEqual(unreadableResult.status, 0, unreadableResult.stderr || unreadableResult.stdout);
			assert.ok(unreadableResult.stdout.includes('RESULT:ok'), 'Constructor should succeed with an unreadable data root');

			console.log('✓ Test 1f: Startup sweep tolerates a missing or unreadable data root');
			passedTests++;
		} finally {
			removeDirectory(missingRootDir);
			removeDirectory(unreadableRootDir);
		}
	} catch (err) {
		console.error('✗ Test 1f failed:', err.message);
		failedTests++;
	}

	// Test 2: Initialize NyaDB with custom config
	try {
		const db = new NyaDB({
			enableConsoleLogs: false,
			formattingStyle: 'space',
			indentSize: 2,
			maxFileSize: 50,
			writeDebounce: 5,
			logLevel: 'error',
		});
		assert.ok(db, 'NyaDB instance with custom config should be created');
		console.log('✓ Test 2: Initialize NyaDB with custom config');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 2 failed:', err.message);
		failedTests++;
	}

	// Test 3: Create a new database
	try {
		const db = new NyaDB();
		const result = db.create(TEST_DB_NAME);
		await wait();
		assert.strictEqual(result, true, 'create() should return true');
		assert.ok(fs.existsSync(path.join(TEST_DB_FOLDER, `${TEST_DB_NAME}.json`)), 'Database file should exist');
		console.log('✓ Test 3: Create a new database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 3 failed:', err.message);
		failedTests++;
	}

	// Test 4: Create duplicate database (should return false)
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		await wait();
		const result = db.create(TEST_DB_NAME);
		await wait();
		assert.strictEqual(result, false, 'create() should return false for existing database');
		console.log('✓ Test 4: Create duplicate database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 4 failed:', err.message);
		failedTests++;
	}

	// Test 5: Set data in database
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		await wait();
		const testData = { users: { john: { age: 30 }, jane: { age: 25 } } };
		const result = db.set(TEST_DB_NAME, testData);
		await wait();
		assert.strictEqual(result, true, 'set() should return true');
		const retrieved = db.get(TEST_DB_NAME);
		assert.deepStrictEqual(retrieved, testData, 'Retrieved data should match set data');
		console.log('✓ Test 5: Set data in database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 5 failed:', err.message);
		failedTests++;
	}

	// Test 6: Update existing data (merge)
	try {
		const db = new NyaDB();
		const testDbName = 'test_merge_db';
		db.create(testDbName);
		await wait();
		db.set(testDbName, { a: 1, b: 2 });
		await wait();
		db.set(testDbName, { b: 3, c: 4 });
		await wait();
		const result = db.get(testDbName);
		assert.deepStrictEqual(result, { a: 1, b: 3, c: 4 }, 'Data should be merged correctly');
		db.delete(testDbName);
		await wait();
		console.log('✓ Test 6: Update existing data (merge)');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 6 failed:', err.message);
		failedTests++;
	}

	// Test 7: Get existing database
	try {
		const db = new NyaDB();
		const testDbName = 'test_get_db';
		db.create(testDbName);
		await wait();
		const testData = { key: 'value' };
		db.set(testDbName, testData);
		await wait();
		const result = db.get(testDbName);
		assert.deepStrictEqual(result, testData, 'get() should return correct data');
		db.delete(testDbName);
		await wait();
		console.log('✓ Test 7: Get existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 7 failed:', err.message);
		failedTests++;
	}

	// Test 8: Get non-existent database
	try {
		const db = new NyaDB();
		const result = db.get('non_existent_db');
		assert.strictEqual(result, false, 'get() should return false for non-existent database');
		console.log('✓ Test 8: Get non-existent database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 8 failed:', err.message);
		failedTests++;
	}

	// Test 9: Get list of databases
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		db.create(TEST_DB_NAME_2);
		await wait();
		const list = db.getList();
		assert.ok(Array.isArray(list), 'getList() should return an array');
		assert.ok(list.includes(TEST_DB_NAME), 'List should include created database');
		assert.ok(list.includes(TEST_DB_NAME_2), 'List should include second database');
		console.log('✓ Test 9: Get list of databases');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 9 failed:', err.message);
		failedTests++;
	}

	// Test 10: Delete existing database
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		await wait();
		const result = db.delete(TEST_DB_NAME);
		await wait();
		assert.strictEqual(result, true, 'delete() should return true');
		assert.strictEqual(fs.existsSync(path.join(TEST_DB_FOLDER, `${TEST_DB_NAME}.json`)), false, 'Database file should be deleted');
		console.log('✓ Test 10: Delete existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 10 failed:', err.message);
		failedTests++;
	}

	// Test 11: Delete non-existent database (should return false)
	try {
		const db = new NyaDB();
		const result = db.delete('non_existent_db');
		await wait();
		assert.strictEqual(result, false, 'delete() should return false for non-existent database');
		console.log('✓ Test 11: Delete non-existent database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 11 failed:', err.message);
		failedTests++;
	}

	// Test 12: Size of single database
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		await wait();
		db.set(TEST_DB_NAME, { test: 'data', foo: 'bar' });
		await wait();
		const size = db.size(TEST_DB_NAME);
		assert.ok(size, 'size() should return an object');
		assert.strictEqual(size.name, TEST_DB_NAME, 'Size object should have correct name');
		assert.ok(typeof size.bytes === 'number', 'Size should have bytes property');
		assert.ok(typeof size.formatted === 'string', 'Size should have formatted property');
		console.log('✓ Test 12: Size of single database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 12 failed:', err.message);
		failedTests++;
	}

	// Test 13: Size of multiple databases
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		db.create(TEST_DB_NAME_2);
		await wait();
		db.set(TEST_DB_NAME, { a: 1 });
		db.set(TEST_DB_NAME_2, { b: 2 });
		await wait();
		const sizes = db.size([TEST_DB_NAME, TEST_DB_NAME_2]);
		assert.ok(sizes.databases, 'Should have databases property');
		assert.ok(sizes.total, 'Should have total property');
		assert.ok(sizes.databases[TEST_DB_NAME], 'Should include first database');
		assert.ok(sizes.databases[TEST_DB_NAME_2], 'Should include second database');
		assert.ok(typeof sizes.total.bytes === 'number', 'Total should have bytes');
		assert.ok(typeof sizes.total.formatted === 'string', 'Total should have formatted string');
		console.log('✓ Test 13: Size of multiple databases');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 13 failed:', err.message);
		failedTests++;
	}

	// Test 14: Size of all databases (no parameter)
	try {
		const db = new NyaDB();
		db.create(TEST_DB_NAME);
		db.create(TEST_DB_NAME_2);
		await wait();
		const sizes = db.size();
		assert.ok(sizes.databases, 'Should have databases property');
		assert.ok(sizes.total, 'Should have total property');
		console.log('✓ Test 14: Size of all databases');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 14 failed:', err.message);
		failedTests++;
	}

	// Test 15: Size of non-existent database
	try {
		const db = new NyaDB();
		const size = db.size('non_existent_db');
		assert.strictEqual(size, null, 'size() should return null for non-existent database');
		console.log('✓ Test 15: Size of non-existent database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 15 failed:', err.message);
		failedTests++;
	}

	// Test 15b: Size status of single and multiple databases
	try {
		const db = new NyaDB({ maxFileSize: 1 });
		db.create(TEST_DB_NAME);
		db.create(TEST_DB_NAME_2);
		await wait();
		db.set(TEST_DB_NAME, { a: 1 });
		db.set(TEST_DB_NAME_2, { b: 2 });
		await wait();

		const singleStatus = db.sizeStatus(TEST_DB_NAME);
		const allStatuses = db.sizeStatus();
		const selectedStatuses = db.sizeStatus([TEST_DB_NAME, TEST_DB_NAME_2]);

		assert.strictEqual(singleStatus.name, TEST_DB_NAME, 'Single status should have correct name');
		assert.strictEqual(singleStatus.status, 'ok', 'Single status should be ok');
		assert.ok(typeof singleStatus.percentOfLimit === 'number', 'Single status should have percentOfLimit');
		assert.ok(allStatuses.databases[TEST_DB_NAME], 'All statuses should include first database');
		assert.ok(selectedStatuses.databases[TEST_DB_NAME_2], 'Selected statuses should include second database');
		assert.strictEqual(allStatuses.total.percentOfLimit, null, 'Total percentOfLimit should be null because maxFileSize is per database');
		assert.strictEqual(allStatuses.total.status, 'unknown', 'Total status should be unknown because maxFileSize is per database');
		console.log('✓ Test 15b: Size status of single and multiple databases');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 15b failed:', err.message);
		failedTests++;
	}

	// Test 15c: Duplicate names are counted once and large sizes have valid units
	try {
		const db = new NyaDB();
		const dbName = `${TEST_PREFIX}size_unique`;
		assert.strictEqual(db.create(dbName), true, 'Size test database should be created');
		await wait();
		const singleSize = db.size(dbName);
		const duplicateSize = db.size([dbName, dbName]);
		assert.strictEqual(duplicateSize.total.bytes, singleSize.bytes, 'Duplicate names should not double-count total size');
		db.delete(dbName);
		await wait();
		console.log('✓ Test 15c: Duplicate names are counted once');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 15c failed:', err.message);
		failedTests++;
	}

	// Test 15d: Size checks use the same serialized representation as saved files
	try {
		const db = new NyaDB({ formattingEnabled: true, formattingStyle: 'space', indentSize: 2 });
		const dbName = `${TEST_PREFIX}size_serialization`;
		const data = { nested: { value: 'serialized' } };
		assert.strictEqual(db.create(dbName), true, 'Serialization test database should be created');
		await wait();
		db.set(dbName, data);
		await wait();
		const filePath = path.join(TEST_DB_FOLDER, `${dbName}.json`);
		const savedBytes = fs.statSync(filePath).size;
		const expectedBytes = Buffer.byteLength(serializeDatabase(data), config.encoding);
		assert.strictEqual(savedBytes, expectedBytes, 'Saved file size should match the shared serializer');
		db.delete(dbName);
		await wait();
		console.log('✓ Test 15d: Size checks use the saved representation');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 15d failed:', err.message);
		failedTests++;
	}

	// Test 16: Input validation - invalid database name (with validation enabled)
	try {
		const db = new NyaDB({ validateInput: true });
		const result = withMutedConsoleError(() => db.create('../malicious'));
		assert.strictEqual(result, false, 'create() should return false for invalid name');
		console.log('✓ Test 16: Input validation - invalid database name');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 16 failed:', err.message);
		failedTests++;
	}

	// Test 16b: Size validation rejects traversal probes
	try {
		const db = new NyaDB({ validateInput: true });
		const result = withMutedConsoleError(() => db.size('../package'));
		const statusResult = withMutedConsoleError(() => db.sizeStatus('../package'));

		assert.strictEqual(result, null, 'size() should return null for invalid database names');
		assert.strictEqual(statusResult, null, 'sizeStatus() should return null for invalid database names');
		console.log('✓ Test 16b: Size validation rejects traversal probes');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 16b failed:', err.message);
		failedTests++;
	}

	// Test 17: Input validation disabled
	try {
		const db = new NyaDB({ validateInput: false, useAtomicWrites: false });
		const uniqueDbName = 'test_validation_disabled';
		const result = db.create(uniqueDbName);
		await wait();
		assert.strictEqual(result, true, 'Should work with validation disabled');
		db.delete(uniqueDbName);
		await wait();
		console.log('✓ Test 17: Input validation disabled');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 17 failed:', err.message);
		failedTests++;
	}

	// Test 18: Set with invalid data (circular reference)
	try {
		const db = new NyaDB({ validateInput: true });
		db.create(TEST_DB_NAME);
		await wait();
		const circularData = { a: 1 };
		circularData.self = circularData;
		const result = withMutedConsoleError(() => db.set(TEST_DB_NAME, circularData));
		assert.strictEqual(result, false, 'set() should return false for circular data');
		console.log('✓ Test 18: Set with invalid data (circular reference)');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18 failed:', err.message);
		failedTests++;
	}

	// Test 18b: Configuration resets to defaults between instances
	try {
		new NyaDB({ validateInput: false, useAtomicWrites: false });
		new NyaDB();

		assert.strictEqual(config.validateInput, true, 'validateInput should reset to the default value');
		assert.strictEqual(config.useAtomicWrites, true, 'useAtomicWrites should reset to the default value');
		console.log('✓ Test 18b: Configuration resets to defaults between instances');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18b failed:', err.message);
		failedTests++;
	}

	// Test 18c: Set throws for missing database
	try {
		const db = new NyaDB();
		let setError;
		try {
			db.set('missing_set_target', { a: 1 });
		} catch (err) {
			setError = err;
		}
		await wait();

		assert.ok(setError, 'set() should throw for a missing database');
		assert.match(setError.message, /Database does not exist/);
		assert.strictEqual(db.exists('missing_set_target'), false, 'set() should not create a missing database');
		console.log('✓ Test 18c: Set throws for missing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18c failed:', err.message);
		failedTests++;
	}

	// Test 18d: Singleton configuration follows the latest initialization
	if (process.platform !== 'win32') {
		try {
			const db = new NyaDB({ validateInput: false, useAtomicWrites: false });
			const sameDb = new NyaDB();

			assert.strictEqual(sameDb, db, 'Repeated construction should return the singleton');
			const result = db.create('instance:config');

			assert.strictEqual(result, false, 'The latest singleton configuration should be applied');
			console.log('✓ Test 18d: Singleton configuration follows the latest initialization');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 18d failed:', err.message);
			failedTests++;
		}
	} else {
		console.log('↷ Test 18d skipped (Windows filename rules)');
	}

	// Test 18e: Critical size writes are saved before stopping
	try {
		const db = new NyaDB({ maxFileSize: 1, writeDebounce: 0 });
		const dbName = `${TEST_PREFIX}critical_size`;
		const payload = 'x'.repeat(1024 * 1024);
		let criticalError;

		db.create(dbName);
		await wait();

		try {
			withMutedConsoleError(() => db.set(dbName, { payload }));
		} catch (err) {
			criticalError = err;
		}

		const filePath = path.join(TEST_DB_FOLDER, `${dbName}.json`);
		const savedData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

		assert.ok(criticalError && criticalError.isCritical, 'Oversized write should raise a critical error');
		assert.strictEqual(savedData.payload, payload, 'Oversized write should be saved before stopping');

		db.delete(dbName);
		await wait();
		console.log('✓ Test 18e: Critical size writes are saved before stopping');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18e failed:', err.message);
		failedTests++;
	}

	// Test 18f: Debounced critical errors are observable without an uncaught exception
	try {
		const db = new NyaDB({ maxFileSize: 1, writeDebounce: 25 });
		const dbName = `${TEST_PREFIX}debounced_critical`;
		const payload = 'x'.repeat(1024 * 1024);

		assert.strictEqual(db.create(dbName), true, 'Debounced critical test database should be created');
		await wait();
		assert.strictEqual(db.exists(dbName), true, 'Debounced critical test database should be loaded');
		withMutedConsoleError(() => db.set(dbName, { payload }));
		await wait(100);

		const asyncError = db.getLastError();
		assert.ok(asyncError && asyncError.isCritical, 'Debounced critical errors should be observable');
		db.delete(dbName);
		await wait();
		console.log('✓ Test 18f: Debounced critical errors are observable');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18f failed:', err.message);
		failedTests++;
	}

	// Test 18g: Loader-owned names are reserved
	try {
		const db = new NyaDB();
		['custom', 'database_backup', `${TEST_PREFIX}.tmp-data`].forEach(name => {
			assert.strictEqual(db.create(name), false, `Reserved name should be rejected: ${name}`);
			assert.strictEqual(db.exists(name), false, `Reserved name should not exist: ${name}`);
		});
		console.log('✓ Test 18g: Loader-owned names are reserved');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18g failed:', err.message);
		failedTests++;
	}

	// Test 18h: Zero maxFileSize disables the limit
	try {
		const db = new NyaDB({ maxFileSize: 0 });
		const dbName = `${TEST_PREFIX}unlimited_size`;
		db.create(dbName);
		await wait();
		assert.strictEqual(db.set(dbName, { value: 'unlimited' }), true, 'maxFileSize: 0 should allow writes');
		await wait();
		db.delete(dbName);
		await wait();
		console.log('✓ Test 18h: Zero maxFileSize disables the limit');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18h failed:', err.message);
		failedTests++;
	}

	// Test 18i: NyaDB exposes one shared instance
	try {
		const first = new NyaDB();
		const second = new NyaDB({ maxFileSize: 0 });
		assert.strictEqual(second, first, 'NyaDB should return the existing singleton instance');
		console.log('✓ Test 18i: NyaDB exposes one shared instance');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18i failed:', err.message);
		failedTests++;
	}

	// Test 18j: Prototype-sensitive database names cannot pollute Object.prototype
	try {
		const db = new NyaDB({ writeDebounce: 25 });
		const dbName = '__proto__';
		const pollutedKey = '__nyadb_polluted__';

		delete Object.prototype[pollutedKey];
		assert.strictEqual(db.create(dbName), false, 'Prototype-sensitive database name should be rejected');

		assert.strictEqual(Object.prototype[pollutedKey], undefined, 'Object.prototype should not be modified');
		console.log('✓ Test 18j: Prototype-sensitive names do not pollute Object.prototype');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18j failed:', err.message);
		failedTests++;
	}

	// Test 18k: Byte-based size checks match object-based checks at thresholds
	try {
		const encoding = config.encoding || 'utf8';
		const samples = [
			{ tiny: 'value' },
			{ payload: 'x'.repeat(1024) },
			{ nested: { a: 1, b: [1, 2, 3] } },
			{ unicode: '😀 café'.repeat(64) },
		];
		const limits = [0, 0.0005, 1, 50];

		const originalWarn = console.warn;
		const originalError = console.error;
		console.warn = () => undefined;
		console.error = () => undefined;

		try {
			for (const sample of samples) {
				for (const limit of limits) {
					const expected = checkMergedDataSize('parity', sample, limit);
					const actual = checkSizeBytes(
						'parity',
						Buffer.byteLength(serializeDatabase(sample), encoding),
						limit,
					);

					assert.deepStrictEqual(
						actual,
						expected,
						`checkSizeBytes should match checkMergedDataSize for limit ${limit}`,
					);
				}
			}

			const limit = 1;
			const limitBytes = limit * 1024 * 1024;

			assert.strictEqual(
				checkSizeBytes('boundary', Math.floor(limitBytes * 0.8), limit).isCritical,
				false,
				'Size below the 80% warning threshold should not be critical',
			);
			assert.strictEqual(
				checkSizeBytes('boundary', Math.ceil(limitBytes * 0.8), limit).isCritical,
				false,
				'Size just above the 80% warning threshold should still be under the limit',
			);
			assert.strictEqual(
				checkSizeBytes('boundary', Math.ceil(limitBytes * 0.99), limit).isCritical,
				false,
				'Size in the 99% grace threshold should not be critical',
			);
			assert.strictEqual(
				checkSizeBytes('boundary', limitBytes, limit).isCritical,
				true,
				'Size at the limit should be critical',
			);
			assert.strictEqual(
				checkSizeBytes('boundary', limitBytes + 1, limit).isCritical,
				true,
				'Size above the limit should be critical',
			);
			assert.deepStrictEqual(
				checkSizeBytes('boundary', limitBytes * 4, 0),
				{ isCritical: false, sizeMB: 0, limitMB: 0 },
				'maxFileSize: 0 should disable the limit',
			);
		} finally {
			console.warn = originalWarn;
			console.error = originalError;
		}

		console.log('✓ Test 18k: Byte-based size checks match object-based thresholds');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18k failed:', err.message);
		failedTests++;
	}

	// Test 18l: Failed writes restore the previous in-memory data
	try {
		const db = new NyaDB({ writeDebounce: 0 });
		const dbName = `${TEST_PREFIX}rollback`;
		db.create(dbName);
		await wait();

		assert.strictEqual(db.set(dbName, { stable: true }), true, 'Initial write should succeed');

		const filePath = path.join(TEST_DB_FOLDER, `${dbName}.json`);
		fs.unlinkSync(filePath);
		fs.mkdirSync(filePath);

		try {
			const result = withMutedConsoleError(() => db.set(dbName, { unstable: true }));

			assert.strictEqual(result, false, 'set() should fail when the write cannot complete');
			assert.deepStrictEqual(db.get(dbName), { stable: true }, 'Failed write should restore previous data');

			const leftovers = fs.readdirSync(TEST_DB_FOLDER)
				.filter(file => file.startsWith(`${dbName}.tmp-`));
			assert.deepStrictEqual(leftovers, [], 'Failed atomic write should not leave temp files behind');
		} finally {
			fs.rmdirSync(filePath);
		}

		fs.writeFileSync(filePath, JSON.stringify({ stable: true }), 'utf8');
		db.delete(dbName);
		await wait();

		console.log('✓ Test 18l: Failed writes restore the previous in-memory data');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18l failed:', err.message);
		failedTests++;
	}

	// Test 19: Write debouncing (rapid writes)
	try {
		const db = new NyaDB({ writeDebounce: 20 });
		db.create(TEST_DB_NAME);
		await wait();
		db.set(TEST_DB_NAME, { count: 1 });
		db.set(TEST_DB_NAME, { count: 2 });
		db.set(TEST_DB_NAME, { count: 3 });
		await wait(50); // Wait for debounce
		const result = db.get(TEST_DB_NAME);
		assert.strictEqual(result.count, 3, 'Should have latest value after debouncing');
		console.log('✓ Test 19: Write debouncing (rapid writes)');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 19 failed:', err.message);
		failedTests++;
	}

	// Test 19a: Get returns pending writes during debounce
	try {
		const db = new NyaDB({ writeDebounce: 50 });
		db.create(TEST_DB_NAME);
		await wait();
		db.set(TEST_DB_NAME, { value: 'initial' });

		// Check get() immediately (during debounce, before flush)
		const pendingResult = db.get(TEST_DB_NAME);
		assert.strictEqual(pendingResult.value, 'initial', 'get() should return pending writes during debounce');

		await wait(100); // Wait for debounce to complete
		const finalResult = db.get(TEST_DB_NAME);
		assert.strictEqual(finalResult.value, 'initial', 'get() should still have the value after flush');
		console.log('✓ Test 19a: Get returns pending writes during debounce');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 19a failed:', err.message);
		failedTests++;
	}

	// Test 19b: Clear supersedes a pending debounced write
	try {
		const db = new NyaDB({ writeDebounce: 100 });
		const dbName = `${TEST_PREFIX}debounce_clear`;
		db.create(dbName);
		await wait();
		db.set(dbName, { value: 'discarded' });
		assert.strictEqual(db.clear(dbName), true, 'clear() should succeed with a pending write');
		await wait(150);
		assert.deepStrictEqual(db.get(dbName), {}, 'clear() should not be overwritten by a pending write');
		db.delete(dbName);
		await wait();
		console.log('✓ Test 19b: Clear supersedes a pending debounced write');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 19b failed:', err.message);
		failedTests++;
	}

	// Test 19c: Delete flushes a pending debounced write before removal
	try {
		const db = new NyaDB({ writeDebounce: 100 });
		const dbName = `${TEST_PREFIX}debounce_delete`;
		db.create(dbName);
		await wait();
		db.set(dbName, { value: 'flushed' });
		assert.strictEqual(db.delete(dbName), true, 'delete() should succeed with a pending write');
		await wait(150);
		assert.strictEqual(db.exists(dbName), false, 'delete() should not be undone by a pending write');
		console.log('✓ Test 19c: Delete flushes a pending debounced write before removal');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 19c failed:', err.message);
		failedTests++;
	}

	// Test 19d: Rename flushes a pending debounced write before moving the file
	try {
		const db = new NyaDB({ writeDebounce: 100 });
		const oldName = `${TEST_PREFIX}debounce_rename_old`;
		const newName = `${TEST_PREFIX}debounce_rename_new`;
		db.create(oldName);
		await wait();
		db.set(oldName, { value: 'flushed' });
		assert.strictEqual(db.rename(oldName, newName), true, 'rename() should succeed with a pending write');
		await wait(150);
		assert.deepStrictEqual(db.get(newName), { value: 'flushed' }, 'rename() should preserve the pending write');
		db.delete(newName);
		await wait();
		console.log('✓ Test 19d: Rename flushes a pending debounced write before moving the file');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 19d failed:', err.message);
		failedTests++;
	}

	// Test 20: Complex nested data structures
	try {
		const db = new NyaDB();
		const testDbName = 'test_complex_db';
		db.create(testDbName);
		await wait();
		const complexData = {
			users: {
				john: {
					profile: { age: 30, email: 'john@example.com' },
					settings: { theme: 'dark', notifications: true },
				},
				jane: {
					profile: { age: 25, email: 'jane@example.com' },
					posts: [
						{ id: 1, title: 'First Post' },
						{ id: 2, title: 'Second Post' },
					],
				},
			},
		};
		db.set(testDbName, complexData);
		await wait();
		const result = db.get(testDbName);
		assert.deepStrictEqual(result, complexData, 'Complex nested data should be stored correctly');
		db.delete(testDbName);
		await wait();
		console.log('✓ Test 20: Complex nested data structures');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 20 failed:', err.message);
		failedTests++;
	}

	// Test 21: exists() - Check existing database
	try {
		const db = new NyaDB();
		const testDbName = 'test_exists_db';
		db.create(testDbName);
		await wait();
		const result = db.exists(testDbName);
		assert.strictEqual(result, true, 'exists() should return true for existing database');
		db.delete(testDbName);
		await wait();
		console.log('✓ Test 21: exists() - Check existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 21 failed:', err.message);
		failedTests++;
	}

	// Test 22: exists() - Check non-existing database
	try {
		const db = new NyaDB();
		const result = db.exists('non_existent_db_12345');
		assert.strictEqual(result, false, 'exists() should return false for non-existing database');
		console.log('✓ Test 22: exists() - Check non-existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 22 failed:', err.message);
		failedTests++;
	}

	// Test 23: clear() - Clear existing database
	try {
		const db = new NyaDB();
		const testDbName = 'test_clear_db';
		db.create(testDbName);
		await wait();
		db.set(testDbName, { key: 'value', nested: { data: true } });
		await wait();
		const resultBefore = db.get(testDbName);
		assert.deepStrictEqual(resultBefore, { key: 'value', nested: { data: true } }, 'Data should be set before clear');
		const clearResult = db.clear(testDbName);
		await wait();
		assert.strictEqual(clearResult, true, 'clear() should return true');
		const resultAfter = db.get(testDbName);
		assert.deepStrictEqual(resultAfter, {}, 'Database should be empty after clear');
		db.delete(testDbName);
		await wait();
		console.log('✓ Test 23: clear() - Clear existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 23 failed:', err.message);
		failedTests++;
	}

	// Test 24: clear() - Clear non-existing database
	try {
		const db = new NyaDB();
		const result = db.clear('non_existent_db_12345');
		assert.strictEqual(result, false, 'clear() should return false for non-existing database');
		console.log('✓ Test 24: clear() - Clear non-existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 24 failed:', err.message);
		failedTests++;
	}

	// Test 25: rename() - Rename existing database
	try {
		const db = new NyaDB();
		const oldName = 'test_rename_old';
		const newName = 'test_rename_new';
		db.create(oldName);
		await wait();
		db.set(oldName, { preserved: 'data' });
		await wait();
		const renameResult = db.rename(oldName, newName);
		await wait();
		assert.strictEqual(renameResult, true, 'rename() should return true');
		assert.strictEqual(db.exists(oldName), false, 'Old database should not exist');
		assert.strictEqual(db.exists(newName), true, 'New database should exist');
		const data = db.get(newName);
		assert.deepStrictEqual(data, { preserved: 'data' }, 'Data should be preserved after rename');
		db.delete(newName);
		await wait();
		console.log('✓ Test 25: rename() - Rename existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 25 failed:', err.message);
		failedTests++;
	}

	// Test 25a: reload() flushes pending writes and observes external changes
	try {
		const db = new NyaDB({ writeDebounce: 50 });
		const dbName = `${TEST_PREFIX}reload_pending`;
		const externalName = `${TEST_PREFIX}reload_external`;
		const dbFile = path.join(TEST_DB_FOLDER, `${dbName}.json`);
		const externalFile = path.join(TEST_DB_FOLDER, `${externalName}.json`);

		assert.strictEqual(db.create(dbName), true, 'Reload test database should be created');
		db.set(dbName, { pending: true });
		assert.strictEqual(db.reload(), true, 'Explicit reload should succeed');
		assert.deepStrictEqual(db.get(dbName), { pending: true }, 'reload() should flush pending writes');
		assert.deepStrictEqual(JSON.parse(fs.readFileSync(dbFile, 'utf8')), { pending: true }, 'Reloaded data should be persisted');

		fs.writeFileSync(dbFile, JSON.stringify({ external: true }), 'utf8');
		fs.writeFileSync(externalFile, JSON.stringify({ added: true }), 'utf8');
		assert.deepStrictEqual(db.get(dbName), { pending: true }, 'External edits should not be observed automatically');
		assert.strictEqual(db.exists(externalName), false, 'External files should not appear before reload');

		assert.strictEqual(db.reload(), true, 'External-state reload should succeed');
		assert.deepStrictEqual(db.get(dbName), { external: true }, 'reload() should observe external edits');
		assert.deepStrictEqual(db.get(externalName), { added: true }, 'reload() should observe external additions');

		db.delete(dbName);
		db.delete(externalName);
		await wait();
		console.log('✓ Test 25a: reload() flushes pending writes and observes external changes');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 25a failed:', err.message);
		failedTests++;
	}

	// Test 26: rename() - Rename non-existing database
	try {
		const db = new NyaDB();
		const result = db.rename('non_existent_source', 'any_target');
		assert.strictEqual(result, false, 'rename() should return false for non-existing source');
		console.log('✓ Test 26: rename() - Rename non-existing database');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 26 failed:', err.message);
		failedTests++;
	}

	// Test 27: rename() - Rename to existing database name
	try {
		const db = new NyaDB();
		const sourceName = 'test_rename_source';
		const targetName = 'test_rename_target';
		db.create(sourceName);
		db.create(targetName);
		await wait();
		const result = db.rename(sourceName, targetName);
		assert.strictEqual(result, false, 'rename() should return false when target already exists');
		db.delete(sourceName);
		db.delete(targetName);
		await wait();
		console.log('✓ Test 27: rename() - Rename to existing database name');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 27 failed:', err.message);
		failedTests++;
	}

	// Test 28: Input validation - control characters in database name
	try {
		const db = new NyaDB({ validateInput: true });

		const invalidNames = [
			'test\x00db', // NUL
			'test\ndb', // newline
			'test\tdb', // tab
			'test\x7Fdb', // DEL
			' testdb',
			'testdb ',
			'test<db',
			'test>db',
			'test:db',
			'test"db',
			'test|db',
			'test?db',
			'test*db',
			'testdb.',
		];

		for (const name of invalidNames) {
			const result = withMutedConsoleError(() => db.create(name));
			assert.strictEqual(result, false, `create() should fail for name with control chars: ${JSON.stringify(name)}`);
		}

		console.log('✓ Test 28: Input validation - unsafe filename characters rejected');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 28 failed:', err.message);
		failedTests++;
	}

	// Test 29: Root-lock validation - valid name must not be rejected
	try {
		const db = new NyaDB({ validateInput: true });

		const result = db.create('root_lock_ok');
		await wait();

		assert.strictEqual(result, true, 'Valid database name should not be rejected by root-lock logic');
		assert.ok(fs.existsSync(path.join(TEST_DB_FOLDER, 'root_lock_ok.json')), 'Database file should exist inside root');

		db.delete('root_lock_ok');
		await wait();

		console.log('✓ Test 29: Root-lock validation regression');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 29 failed:', err.message);
		failedTests++;
	}

	// Test 30: Windows reserved device names
	try {
		const db = new NyaDB({ validateInput: true });

		const reservedNames = ['CON', 'nul', 'LPT1', 'com1'];

		for (const name of reservedNames) {
			const result = withMutedConsoleError(() => db.create(name));
			assert.strictEqual(result, false, `create() should fail for Windows reserved name: ${name}`);
		}

		console.log('✓ Test 30: Windows reserved device names rejected');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 30 failed:', err.message);
		failedTests++;
	}

	// Test 31: Symlink escape protection
	if (process.platform !== 'win32') {
		try {
			const db = new NyaDB({ validateInput: true });

			const outsideDir = path.resolve('./symlink_escape_target');
			const dbDir = path.resolve('./', TEST_DB_FOLDER);

			// Prepare outside target
			if (!fs.existsSync(outsideDir)) {
				fs.mkdirSync(outsideDir, { recursive: true });
			}

			// Create symlink inside DB folder pointing outside
			const linkName = 'escape_link';
			const linkPath = path.join(dbDir, linkName);

			if (!fs.existsSync(dbDir)) {
				fs.mkdirSync(dbDir, { recursive: true });
			}

			if (fs.existsSync(linkPath)) {
				fs.unlinkSync(linkPath);
			}

			try {
				fs.symlinkSync(outsideDir, linkPath);
			} catch (e) {
				throw new Error('Failed to create symlink (test environment does not support symlinks)');
			}

			assert.throws(() => db.set(linkName, { hacked: true }), /Database does not exist/, 'Write through symlink should be rejected');

			// Ensure no file was written outside root
			const outsideFiles = fs.readdirSync(outsideDir);
			assert.strictEqual(outsideFiles.length, 0, 'No files should be written outside root');

			// Cleanup
			fs.unlinkSync(linkPath);
			fs.rmdirSync(outsideDir);

			console.log('✓ Test 31: Symlink escape protection');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 31 failed:', err.message);
			failedTests++;
		}
	} else {
		console.log('↷ Test 31 skipped (symlink test not supported on Windows)');
	}

	// Test 32: Synchronous set serializes the merged database once
	const writePathTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-writepath-'));
	const writePathOriginalCwd = process.cwd();
	const writePathDataRoot = path.join(writePathTempDir, 'NyaDB');
	const writePathDbPath = name => path.join(writePathDataRoot, `${name}.json`);
	const writePathReadDb = name => fs.readFileSync(writePathDbPath(name), config.encoding);
	const writePathTempFiles = () => fs.readdirSync(writePathDataRoot).filter(file => file.includes('.tmp-'));
	const writePathUnique = prefix => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
	const writePathAssertBytesMatch = (db, name, expected) => {
		assert.strictEqual(writePathReadDb(name), serializeDatabase(expected));
		assert.deepStrictEqual(db.get(name), expected);
	};
	const writePathOriginalStringify = JSON.stringify;

	JSON.stringify = function patchedStringify(value, ...rest) {
		stringifyCalls.push(value);
		return writePathOriginalStringify.call(JSON, value, ...rest);
	};

	try {
		process.chdir(writePathTempDir);
		new NyaDB();

		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const name = writePathUnique('sync');

			assert.strictEqual(db.create(name), true);
			assert.strictEqual(db.set(name, { existing: true }), true);

			stringifyCalls = [];
			assert.strictEqual(db.set(name, { patched: true }), true);

			assert.strictEqual(countSerialized(['existing', 'patched']), 1, 'merged database should be serialized once');
			writePathAssertBytesMatch(db, name, { existing: true, patched: true });

			db.delete(name);
			await wait();
			console.log('✓ Test 32: Synchronous set serializes the merged database once');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32 failed:', err.message);
			failedTests++;
		}

		// Test 32b: Debounced sets serialize once at flush
		try {
			const db = new NyaDB({ writeDebounce: 30 });
			const name = writePathUnique('debounced');

			db.create(name);
			await wait();

			stringifyCalls = [];
			assert.strictEqual(db.set(name, { a: 1 }), true);
			assert.strictEqual(db.set(name, { b: 2 }), true);
			assert.strictEqual(db.set(name, { c: 3 }), true);

			assert.strictEqual(countSerialized(['a', 'b', 'c']), 0, 'no serialization before the debounce flush');
			assert.deepStrictEqual(db.get(name), { a: 1, b: 2, c: 3 }, 'get() should expose pending writes');

			await wait(80);

			assert.strictEqual(countSerialized(['a', 'b', 'c']), 1, 'debounced flush should serialize once');
			writePathAssertBytesMatch(db, name, { a: 1, b: 2, c: 3 });

			db.delete(name);
			await wait();
			console.log('✓ Test 32b: Debounced sets serialize once at flush');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32b failed:', err.message);
			failedTests++;
		}

		// Test 32c: get() references keep snapshot semantics
		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const name = writePathUnique('reference');

			db.create(name);
			db.set(name, { a: 1 });

			const before = db.get(name);
			assert.strictEqual(db.set(name, { b: 2 }), true);

			assert.deepStrictEqual(before, { a: 1 }, 'old reference should not observe later writes');
			assert.deepStrictEqual(db.get(name), { a: 1, b: 2 });
			assert.notStrictEqual(before, db.get(name), 'get() should return a new object after a write');

			db.delete(name);
			await wait();
			console.log('✓ Test 32c: get() references keep snapshot semantics');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32c failed:', err.message);
			failedTests++;
		}

		// Test 32d: Failed synchronous writes restore memory
		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const name = writePathUnique('rollback');

			db.create(name);
			db.set(name, { stable: true });

			const file = writePathDbPath(name);
			fs.unlinkSync(file);
			fs.mkdirSync(file);

			try {
				let result = false;
				await captureConsole(() => {
					result = db.set(name, { unstable: true });
				});

				assert.strictEqual(result, false, 'set() should fail when the target cannot be replaced');
				assert.deepStrictEqual(db.get(name), { stable: true }, 'failed write should restore previous data');
				assert.deepStrictEqual(writePathTempFiles(), [], 'failed atomic write should clean up its temp file');
			} finally {
				fs.rmdirSync(file);
				fs.writeFileSync(file, writePathOriginalStringify({ stable: true }), 'utf8');
				db.delete(name);
				await wait();
			}

			console.log('✓ Test 32d: Failed synchronous writes restore memory');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32d failed:', err.message);
			failedTests++;
		}

		// Test 32e: Failed debounced writes restore memory
		try {
			const db = new NyaDB({ writeDebounce: 20 });
			const name = writePathUnique('debounce_fail');

			db.create(name);
			await wait();
			db.set(name, { stable: true });
			await wait(80);

			const file = writePathDbPath(name);
			fs.unlinkSync(file);
			fs.mkdirSync(file);

			try {
				await captureConsole(async () => {
					assert.strictEqual(db.set(name, { unstable: true }), true, 'debounced set should schedule the write');
					await wait(80);
				});

				assert.deepStrictEqual(db.get(name), { stable: true }, 'failed debounced write should restore memory');
				assert.deepStrictEqual(writePathTempFiles(), [], 'failed debounced write should clean up its temp file');
			} finally {
				fs.rmdirSync(file);
				fs.writeFileSync(file, writePathOriginalStringify({ stable: true }), 'utf8');
				db.delete(name);
				await wait();
			}

			console.log('✓ Test 32e: Failed debounced writes restore memory');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32e failed:', err.message);
			failedTests++;
		}

		// Test 32f: Critical-size writes persist before throwing
		try {
			const db = new NyaDB({ maxFileSize: 0.001, writeDebounce: 0 });
			const name = writePathUnique('critical');
			const payload = 'x'.repeat(4096);

			db.create(name);

			let caught = null;
			await captureConsole(() => {
				try {
					db.set(name, { payload });
				} catch (error) {
					caught = error;
				}
			});

			assert.ok(caught && caught.isCritical, 'oversized write should throw a critical error');
			assert.strictEqual(caught.message.includes('hard size limit'), true);

			const saved = JSON.parse(writePathReadDb(name));
			assert.strictEqual(saved.payload, payload, 'critical write should be saved before throwing');
			assert.strictEqual(db.get(name).payload, payload, 'critical write should remain in memory');

			db.delete(name);
			await wait();
			console.log('✓ Test 32f: Critical-size writes persist before throwing');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32f failed:', err.message);
			failedTests++;
		}

		// Test 32g: Size warnings fire at 80% and grace at 99%
		try {
			const db = new NyaDB({
				maxFileSize: 0.01,
				writeDebounce: 0,
				enableConsoleLogs: true,
				logLevel: 'warn',
			});
			const warnName = writePathUnique('warn');
			const graceName = writePathUnique('grace');
			const limitBytes = 0.01 * 1024 * 1024;

			db.create(warnName);
			db.create(graceName);

			const warnData = { payload: 'x'.repeat(9000) };
			const graceData = { payload: 'x'.repeat(10400) };
			const warnBytes = Buffer.byteLength(serializeDatabase(warnData), config.encoding);
			const graceBytes = Buffer.byteLength(serializeDatabase(graceData), config.encoding);

			assert.ok(warnBytes > limitBytes * 0.8 && warnBytes < limitBytes * 0.99, 'warning sample should be in band');
			assert.ok(graceBytes >= limitBytes * 0.99 && graceBytes < limitBytes, 'grace sample should be in band');

			const logs = await captureConsole(() => {
				assert.strictEqual(db.set(warnName, warnData), true);
				assert.strictEqual(db.set(graceName, graceData), true);
			});

			const approaching = logs.warn.filter(message => message.includes('approaching limit'));
			const grace = logs.error.filter(message => message.includes('grace threshold'));

			assert.strictEqual(approaching.length, 1, '80% warning should be logged once');
			assert.strictEqual(grace.length, 1, '99% grace message should be logged once');
			assert.ok(approaching[0].includes(`'${warnName}'`));
			assert.ok(grace[0].includes(`'${graceName}'`));

			db.delete(warnName);
			db.delete(graceName);
			await wait();
			console.log('✓ Test 32g: Size warnings fire at 80% and grace at 99%');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32g failed:', err.message);
			failedTests++;
		}

		// Test 32h: maxFileSize: 0 skips size checks
		try {
			const db = new NyaDB({
				maxFileSize: 0,
				writeDebounce: 0,
				enableConsoleLogs: true,
				logLevel: 'debug',
			});
			const name = writePathUnique('unlimited');

			let result = false;
			const logs = await captureConsole(() => {
				db.create(name);
				result = db.set(name, { payload: 'x'.repeat(2048) });
				db.delete(name);
			});

			assert.strictEqual(result, true);
			assert.strictEqual(logs.warn.filter(message => message.includes('size')).length, 0);
			assert.strictEqual(logs.error.filter(message => message.includes('size')).length, 0);

			await wait();
			console.log('✓ Test 32h: maxFileSize: 0 skips size checks');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32h failed:', err.message);
			failedTests++;
		}

		// Test 32i: Number.MAX_SAFE_INTEGER allows writes without warnings
		try {
			const db = new NyaDB({
				maxFileSize: Number.MAX_SAFE_INTEGER,
				writeDebounce: 0,
				enableConsoleLogs: true,
				logLevel: 'debug',
			});
			const name = writePathUnique('maxsafe');
			const payload = 'x'.repeat(2048);

			let result = false;
			const logs = await captureConsole(() => {
				db.create(name);
				result = db.set(name, { payload });
			});

			assert.strictEqual(result, true, 'maximum safe storage limit should allow the write');

			const sizeMessages = [...logs.warn, ...logs.error].filter(
				message => message.includes('limit') || message.includes('size'),
			);
			assert.deepStrictEqual(sizeMessages, [], 'maximum safe storage limit should never warn or error');

			const status = db.sizeStatus(name);
			assert.ok(status, 'sizeStatus should return data for the written database');
			assert.strictEqual(status.status, 'ok');
			assert.ok(Number.isFinite(status.percentOfLimit), 'percentOfLimit should stay finite at the maximum limit');
			assert.ok(status.percentOfLimit >= 0 && status.percentOfLimit < 100);
			assert.strictEqual(JSON.parse(writePathReadDb(name)).payload, payload);

			await captureConsole(() => db.delete(name));
			await wait();
			console.log('✓ Test 32i: Number.MAX_SAFE_INTEGER allows writes without warnings');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32i failed:', err.message);
			failedTests++;
		}

		// Test 32j: Debug logging keeps the original write-path messages
		try {
			const db = new NyaDB({
				writeDebounce: 0,
				enableConsoleLogs: true,
				logLevel: 'debug',
			});
			const name = writePathUnique('debuglogs');
			const patch = { debugMarker: true };
			const expectedLength = JSON.stringify(patch).length;

			const logs = await captureConsole(() => {
				db.create(name);
				assert.strictEqual(db.set(name, patch), true);
				db.delete(name);
			});

			const about = logs.log.find(line => line.includes(`About to check merged data size for ${name}`));
			const passed = logs.log.find(line => line.includes(`Size check passed for ${name}`));
			const calling = logs.log.find(line => line.includes(`Calling saveFile for ${name}`));

			assert.ok(about, 'debug size-check message should still be logged');
			assert.ok(about.includes(`: ${expectedLength} bytes`), 'debug message should keep the compact JSON length');
			assert.ok(passed, 'debug size-check-passed message should still be logged');
			assert.ok(calling, 'debug saveFile message should still be logged');

			await wait();
			console.log('✓ Test 32j: Debug logging keeps the original write-path messages');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32j failed:', err.message);
			failedTests++;
		}

		// Test 32k: Serialization failures keep the original error path
		try {
			const db = new NyaDB({ validateInput: false, useAtomicWrites: false, writeDebounce: 0 });
			const name = writePathUnique('circular');

			db.create(name);

			const circular = { ok: true };
			circular.self = circular;

			let result = true;
			const logs = await captureConsole(() => {
				result = db.set(name, circular);
			});

			assert.strictEqual(result, false, 'set() should fail when merged data cannot be serialized');
			assert.ok(
				logs.error.some(line => line.includes('Setting database:')),
				'serialization failures should keep the original error label',
			);
			assert.ok(
				!logs.error.some(line => line.includes('Saving file:')),
				'serialization should not be reported as a file-save failure',
			);
			assert.deepStrictEqual(db.get(name), {}, 'failed serialization should not update memory');
			assert.deepStrictEqual(writePathTempFiles(), [], 'failed serialization should not leave temp files');

			db.delete(name);
			await wait();
			console.log('✓ Test 32k: Serialization failures keep the original error path');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32k failed:', err.message);
			failedTests++;
		}

		// Test 32l: Reconstructing the singleton applies new configuration
		try {
			const first = new NyaDB({ maxFileSize: 1, writeDebounce: 0 });
			const second = new NyaDB({ maxFileSize: 0, writeDebounce: 0 });

			assert.strictEqual(second, first, 'NyaDB should remain a singleton');
			assert.strictEqual(config.maxFileSize, 0, 'constructor should still apply new configuration');
			assert.strictEqual(config.writeDebounce, 0, 'constructor should still apply debounce configuration');

			new NyaDB();
			console.log('✓ Test 32l: Reconstructing the singleton applies new configuration');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32l failed:', err.message);
			failedTests++;
		}

		// Test 32m: saveFile only serializes without a provided string
		try {
			new NyaDB();
			const name = writePathUnique('savefile');
			const data = { onlySaveFile: true };

			stringifyCalls = [];
			assert.strictEqual(saveFile(data, name), true);
			assert.strictEqual(countSerialized(['onlySaveFile']), 1, 'saveFile should serialize once without a provided string');

			const serialized = '{"pre":true}';
			stringifyCalls = [];
			assert.strictEqual(saveFile({ ignored: true }, name, serialized), true);
			assert.strictEqual(countSerialized(['ignored']), 0, 'saveFile should not serialize a provided string');
			assert.strictEqual(writePathReadDb(name), serialized);

			fs.unlinkSync(writePathDbPath(name));
			console.log('✓ Test 32m: saveFile only serializes without a provided string');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32m failed:', err.message);
			failedTests++;
		}

		// Test 32n: Read-only operations do not serialize the database
		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const name = writePathUnique('reads');

			db.create(name);
			db.set(name, { readMarker: true });

			stringifyCalls = [];
			db.get(name);
			db.getList();
			db.exists(name);
			db.size(name);
			db.sizeStatus(name);

			assert.strictEqual(countSerialized(['readMarker']), 0, 'reads should not serialize database contents');

			db.delete(name);
			await wait();
			console.log('✓ Test 32n: Read-only operations do not serialize the database');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32n failed:', err.message);
			failedTests++;
		}

		// Test 32o: Writes to multiple databases serialize each once
		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const first = writePathUnique('multi_a');
			const second = writePathUnique('multi_b');

			db.create(first);
			db.create(second);
			db.set(first, { aSeed: true });
			db.set(second, { bSeed: true });

			stringifyCalls = [];
			assert.strictEqual(db.set(first, { aPatch: true }), true);
			assert.strictEqual(db.set(second, { bPatch: true }), true);

			assert.strictEqual(countSerialized(['aSeed', 'aPatch']), 1);
			assert.strictEqual(countSerialized(['bSeed', 'bPatch']), 1);
			writePathAssertBytesMatch(db, first, { aSeed: true, aPatch: true });
			writePathAssertBytesMatch(db, second, { bSeed: true, bPatch: true });

			db.delete(first);
			db.delete(second);
			await wait();
			console.log('✓ Test 32o: Writes to multiple databases serialize each once');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32o failed:', err.message);
			failedTests++;
		}

		// Test 32p: Validation disabled still serializes once
		try {
			const db = new NyaDB({ validateInput: false, useAtomicWrites: false, writeDebounce: 0 });
			const name = writePathUnique('novalidate');

			assert.strictEqual(db.create(name), true);
			db.set(name, { existing: true });

			stringifyCalls = [];
			assert.strictEqual(db.set(name, { patched: true }), true);

			assert.strictEqual(countSerialized(['existing', 'patched']), 1);
			writePathAssertBytesMatch(db, name, { existing: true, patched: true });

			db.delete(name);
			await wait();
			console.log('✓ Test 32p: Validation disabled still serializes once');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32p failed:', err.message);
			failedTests++;
		}

		// Test 32q: Formatting disabled writes compact bytes
		try {
			const db = new NyaDB({ formattingEnabled: false, writeDebounce: 0 });
			const name = writePathUnique('compact');
			const data = { unicode: '😀 café', nested: { list: [1, 2, 3] } };

			db.create(name);
			db.set(name, data);

			writePathAssertBytesMatch(db, name, data);
			assert.strictEqual(writePathReadDb(name).includes('\n'), false, 'compact output should not contain newlines');

			db.delete(name);
			await wait();
			console.log('✓ Test 32q: Formatting disabled writes compact bytes');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32q failed:', err.message);
			failedTests++;
		}

		// Test 32r: Missing databases fail before serializing
		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const name = writePathUnique('missing');
			const patch = { onlyMissing: true };

			stringifyCalls = [];
			let caught = null;
			await captureConsole(() => {
				try {
					db.set(name, patch);
				} catch (error) {
					caught = error;
				}
			});

			assert.ok(caught);
			assert.strictEqual(caught.code, 'DATABASE_NOT_FOUND');
			assert.strictEqual(stringifyCalls.filter(value => value !== patch && hasKeys(value, ['onlyMissing'])).length, 0);
			console.log('✓ Test 32r: Missing databases fail before serializing');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32r failed:', err.message);
			failedTests++;
		}

		// Test 32s: reload() flushes pending debounced writes
		try {
			const db = new NyaDB({ writeDebounce: 60 });
			const name = writePathUnique('reload');

			db.create(name);
			await wait();
			db.set(name, { pending: true });

			assert.strictEqual(db.reload(), true);
			assert.deepStrictEqual(db.get(name), { pending: true });
			assert.strictEqual(JSON.parse(writePathReadDb(name)).pending, true, 'reload should persist the pending write');

			db.delete(name);
			await wait();
			console.log('✓ Test 32s: reload() flushes pending debounced writes');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32s failed:', err.message);
			failedTests++;
		}

		// Test 32t: Successful atomic writes leave no temp files
		try {
			const db = new NyaDB({ writeDebounce: 0 });
			const name = writePathUnique('tempclean');

			db.create(name);
			db.set(name, { ok: true });

			assert.deepStrictEqual(writePathTempFiles(), []);

			db.delete(name);
			await wait();
			console.log('✓ Test 32t: Successful atomic writes leave no temp files');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32t failed:', err.message);
			failedTests++;
		}

		// Test 32u: Threshold messages match between byte and object checks
		try {
			new NyaDB({ maxFileSize: 0.01, enableConsoleLogs: true, logLevel: 'warn' });
			const limit = 0.01;
			const samples = [
				{ payload: 'x'.repeat(9000) },
				{ payload: '😀'.repeat(2200) },
				{ payload: 'x'.repeat(10400) },
			];

			for (const data of samples) {
				const bytes = Buffer.byteLength(serializeDatabase(data), config.encoding);
				const direct = await captureConsole(() => {
					checkSizeBytes('parity', bytes, limit);
				});
				const wrapped = await captureConsole(() => {
					checkMergedDataSize('parity', data, limit);
				});

				assert.deepStrictEqual(direct.warn, wrapped.warn, 'warning messages should match');
				assert.deepStrictEqual(direct.error, wrapped.error, 'grace messages should match');
				assert.strictEqual(direct.warn.length + direct.error.length, 1, 'each sample should log exactly once');
			}

			const multibyte = { payload: '😀'.repeat(2200) };
			const multibyteBytes = Buffer.byteLength(serializeDatabase(multibyte), config.encoding);
			assert.ok(
				multibyteBytes > 0.01 * 1024 * 1024 * 0.8 && multibyteBytes < 0.01 * 1024 * 1024 * 0.99,
				'multibyte sample should be sized by encoded bytes, not string length',
			);
			console.log('✓ Test 32u: Threshold messages match between byte and object checks');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 32u failed:', err.message);
			failedTests++;
		}
	} finally {
		await wait(100);
		JSON.stringify = writePathOriginalStringify;
		new NyaDB();
		process.chdir(writePathOriginalCwd);
		fs.rmSync(writePathTempDir, { recursive: true, force: true });
	}

	// Test 33: Write-path benchmark
	try {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nyadb-bench-'));
		const originalCwd = process.cwd();

		try {
			process.chdir(tempDir);
			const db = new NyaDB({
				enableConsoleLogs: false,
				writeDebounce: 0,
				maxFileSize: 0,
			});
			const name = 'bench_large';
			db.create(name);
			db.set(name, buildBenchmarkPayload(100000, 100));

			const times = [];
			for (let i = 0; i < 20; i++) {
				const start = process.hrtime.bigint();
				assert.strictEqual(db.set(name, { ['touch' + i]: i }), true);
				times.push(Number(process.hrtime.bigint() - start) / 1e6);
			}

			times.sort((a, b) => a - b);
			const p50 = percentile(times, 0.5);
			const p95 = percentile(times, 0.95);
			const max = times[times.length - 1];

			const debounced = new NyaDB({ enableConsoleLogs: false, writeDebounce: 10, maxFileSize: 0 });
			const names = [];
			const multiPayload = buildBenchmarkPayload(50000, 100);

			for (let i = 0; i < 5; i++) {
				const dbName = 'bench_multi_' + i;
				names.push(dbName);
				debounced.create(dbName);
				debounced.set(dbName, multiPayload);
			}

			const lagMs = await measureEventLoopLag(() => {
				for (const dbName of names) {
					debounced.set(dbName, { updated: Date.now() });
				}
			}, 1200);

			assert.ok(p50 > 0, 'Benchmark p50 should be positive');
			assert.ok(p95 >= p50, 'Benchmark p95 should be at least p50');
			assert.ok(max >= p95, 'Benchmark max should be at least p95');
			assert.ok(Number.isFinite(lagMs) && lagMs >= 0, 'Benchmark lag should be finite and non-negative');

			console.log(
				`✓ Test 33: Write-path benchmark (p50 ${p50.toFixed(1)} ms, ` +
				`p95 ${p95.toFixed(1)} ms, max lag ${lagMs.toFixed(1)} ms)`,
			);
			passedTests++;
		} finally {
			process.chdir(originalCwd);
			new NyaDB();
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	} catch (err) {
		console.error('✗ Test 33 failed:', err.message);
		failedTests++;
	}

	// Clean up after tests
	cleanupTestDatabases();

	// Print summary
	console.log('\n' + '='.repeat(50));
	console.log(`Test Summary: ${passedTests} passed, ${failedTests} failed`);
	console.log('='.repeat(50));

	// Exit with appropriate code
	process.exit(failedTests > 0 ? 1 : 0);
}

// Run tests
runTests().catch(err => {
	console.error('Test suite crashed:', err);
	process.exit(1);
});
