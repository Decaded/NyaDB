/* eslint-disable no-inline-comments */

const assert = require('assert');
const NyaDB = require('../index');
const nyadb = new NyaDB({ enableConsoleLogs: true });

const mockDatabase = {
	yellow: ['banana', 'citrus'],
	red: ['apple', 'paprika'],
};

/**
 * Function to colorize text for console logging.
 * @param {string} text - The text to colorize.
 * @param {string} color - The ANSI color code.
 * @returns {string} - The colorized text.
 */
const colorize = (text, color) => `\x1b[${color}m${text}\x1b[0m`;

/**
 * Logs a message with a specific color.
 * @param {string} message - The message to log.
 * @param {string} colorCode - The ANSI color code.
 */
const logMessage = (message, colorCode) => {
	console.log(colorize(message, colorCode));
};

/**
 * Creates a new database and logs the action.
 * @param {string} dbName - The name of the database to create.
 */
function createDatabase(dbName) {
	logMessage(`Creating "${dbName}" database...`, '32'); // Green color
	nyadb.create(dbName);
	logMessage(`"${dbName}" database created.`, '32'); // Green color
	console.log('');
}

/**
 * Inserts data into a database and logs the action.
 * @param {string} dbName - The name of the database.
 * @param {object} data - The data to insert into the database.
 */
function insertData(dbName, data) {
	for (const key in data) {
		if (data.hasOwnProperty(key)) {
			nyadb.set(dbName, { [key]: data[key] });
		}
	}
}

/**
 * Logs the contents of a database.
 * @param {string} dbName - The name of the database to log.
 */
function logDatabase(dbName) {
	logMessage(`Logging "${dbName}" database...`, '35'); // Magenta color
	console.log(nyadb.get(dbName));
	logMessage(`End of "${dbName}" database log.`, '35'); // Magenta color
	console.log('');
}

/**
 * Starts the high-resolution real time timer.
 * @returns {Array} The start time as a [seconds, nanoseconds] tuple.
 */
function startTimer() {
	return process.hrtime();
}

/**
 * Calculates the elapsed time from the start time.
 * @param {Array} startTime - The start time as a [seconds, nanoseconds] tuple.
 * @returns {string} The elapsed time in milliseconds.
 */
function calculateElapsedTime(startTime) {
	const [seconds, nanoseconds] = process.hrtime(startTime);
	const elapsedTimeInMs = seconds * 1000 + nanoseconds / 1000000;
	return elapsedTimeInMs.toFixed(2);
}

/**
 * Main test function.
 */
function runTests() {
	// Start the timer
	const startTime = startTimer();

	// Create databases
	createDatabase('numbers');
	createDatabase('fruits');
	createDatabase('deleteMe');

	// Insert data into the "numbers" and "fruits" databases
	logMessage('Inserting data into "numbers" database...', '33'); // Yellow color
	for (let i = 0; i < 10; i++) {
		insertData('numbers', { [i]: i });
	}
	logMessage('Numbers inserted into "numbers" database.', '33'); // Yellow color
	console.log('');

	logMessage('Inserting data into "fruits" database...', '33'); // Yellow color
	insertData('fruits', mockDatabase);
	logMessage('Mock data inserted into "fruits" database.', '33'); // Yellow color
	console.log('');

	// Log database contents
	logDatabase('numbers');
	logDatabase('fruits');

	// Verify data insertion
	assert.deepStrictEqual(nyadb.get('numbers'), { 0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9 });
	assert.deepStrictEqual(nyadb.get('fruits'), mockDatabase);

	// Log all the databases to the console
	logMessage('Logging all databases...', '35'); // Magenta color
	console.log(nyadb.getList());
	logMessage('End of all databases log.', '35'); // Magenta color
	console.log('');

	// Delete the "deleteMe" database
	logMessage('Deleting "deleteMe" database...', '31'); // Red color
	nyadb.delete('deleteMe');
	logMessage('"deleteMe" database deleted.', '31'); // Red color
	console.log('');

	// Verify deletion
	assert.strictEqual(nyadb.get('deleteMe'), false);

	// Log all the databases to the console again
	logMessage('Logging all databases again...', '35'); // Magenta color
	console.log(nyadb.getList());
	logMessage('End of all databases log.', '35'); // Magenta color
	console.log('');

	// Calculate and log the elapsed time
	const elapsedTime = calculateElapsedTime(startTime);
	logMessage(`Tests completed in ${elapsedTime} ms.`, '36'); // Cyan color

	// Close tests
	logMessage('Done.', '36'); // Cyan color
	process.exit();
}

// Run the tests
runTests();
