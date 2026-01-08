const assert = require('assert');
const fs = require('fs');
const path = require('path');
const NyaDB = require('../index');

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
			if (file.startsWith(TEST_PREFIX) || file.endsWith('.tmp')) {
				try {
					fs.unlinkSync(path.join(dbPath, file));
				} catch (err) {
					// Ignore cleanup errors
				}
			}
		});
	}
}

/**
 * Wait for debounced operations to complete
 */
function wait(ms = 50) {
	return new Promise(resolve => setTimeout(resolve, ms));
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

	// Test 16: Input validation - invalid database name (with validation enabled)
	try {
		const db = new NyaDB({ validateInput: true });
		const result = db.create('../malicious');
		assert.strictEqual(result, false, 'create() should return false for invalid name');
		console.log('✓ Test 16: Input validation - invalid database name');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 16 failed:', err.message);
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
		const result = db.set(TEST_DB_NAME, circularData);
		assert.strictEqual(result, false, 'set() should return false for circular data');
		console.log('✓ Test 18: Set with invalid data (circular reference)');
		passedTests++;
	} catch (err) {
		console.error('✗ Test 18 failed:', err.message);
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
		];

		for (const name of invalidNames) {
			const result = db.create(name);
			assert.strictEqual(result, false, `create() should fail for name with control chars: ${JSON.stringify(name)}`);
		}

		console.log('✓ Test 28: Input validation - control characters rejected');
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
	if (process.platform === 'win32') {
		try {
			const db = new NyaDB({ validateInput: true });

			const reservedNames = ['CON', 'nul', 'LPT1', 'com1'];

			for (const name of reservedNames) {
				const result = db.create(name);
				assert.strictEqual(result, false, `create() should fail for Windows reserved name: ${name}`);
			}

			console.log('✓ Test 30: Windows reserved device names rejected');
			passedTests++;
		} catch (err) {
			console.error('✗ Test 30 failed:', err.message);
			failedTests++;
		}
	} else {
		console.log('↷ Test 30 skipped (not Windows)');
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

			try {
				fs.symlinkSync(outsideDir, linkPath);
			} catch (e) {
				throw new Error('Failed to create symlink (test environment does not support symlinks)');
			}

			const result = db.set(linkName, { hacked: true });

			assert.strictEqual(result, false, 'Write through symlink should be rejected');

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
