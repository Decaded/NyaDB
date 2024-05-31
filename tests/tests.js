/* eslint-disable no-inline-comments */

const NyaDB = require('../index');
const nyadb = new NyaDB({ formattingStyle: 'space', indentSize: 5, enableConsoleLogs: true });
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
 * Creates a new database and logs the action.
 * @param {string} name - The name of the database to create.
 */
function createDatabase(name) {
	console.log(colorize(`Creating "${name}" database...`, '32')); // Green color
	nyadb.create(name);
	console.log(colorize(`"${name}" database created.`, '32')); // Green color
	console.log('');
}

/**
 * Inserts data into a database and logs the action.
 * @param {string} dbName - The name of the database.
 * @param {any} data - The data to insert into the database.
 */
function insertData(dbName, data) {
	// Loop through the data to be inserted
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
	console.log(colorize(`Logging "${dbName}" database...`, '35')); // Magenta color
	console.log(nyadb.get(dbName));
	console.log(colorize(`End of "${dbName}" database log.`, '35')); // Magenta color
	console.log('');
}

// Function to start the timer
function startTimer() {
	return process.hrtime(); // Returns the current high-resolution real time in a [seconds, nanoseconds] tuple Array
}

// Function to calculate the elapsed time
function calculateElapsedTime(startTime) {
	const endTime = process.hrtime(startTime);
	// Convert the elapsed time to milliseconds
	const elapsedTimeInMs = endTime[0] * 1000 + endTime[1] / 1000000;
	return elapsedTimeInMs.toFixed(2);
}

// Start the timer
const startTime = startTimer();

// Create databases
createDatabase('numbers');
createDatabase('fruits');
createDatabase('deleteMe');

// Insert data into the "numbers" and "fruits" databases
console.log(colorize('Inserting data into "numbers" database...', '33')); // Yellow color
for (let i = 0; i < 10; i++) {
	insertData('numbers', { [i]: i });
}
console.log(colorize('Numbers inserted into "numbers" database.', '33')); // Yellow color
console.log('');

console.log(colorize('Inserting data into "fruits" database...', '33')); // Yellow color
insertData('fruits', mockDatabase);
console.log(colorize('Mock data inserted into "fruits" database.', '33')); // Yellow color
console.log('');

// Log database contents
logDatabase('numbers');
logDatabase('fruits');

// Log all the databases to the console
console.log(colorize('Logging all databases...', '35')); // Magenta color
console.log(nyadb.getList());
console.log(colorize('End of all databases log.', '35')); // Magenta color
console.log('');

// Delete the "deleteMe" database
console.log(colorize('Deleting "deleteMe" database...', '31')); // Red color
nyadb.delete('deleteMe');
console.log(colorize('"deleteMe" database deleted.', '31')); // Red color
console.log('');

// Log all the databases to the console again
console.log(colorize('Logging all databases again...', '35')); // Magenta color
console.log(nyadb.getList());
console.log(colorize('End of all databases log.', '35')); // Magenta color
console.log('');

// Calculate and log the elapsed time
const elapsedTime = calculateElapsedTime(startTime);
console.log(colorize(`Tests completed in ${elapsedTime} ms.`, '36')); // Cyan color

// Close tests
console.log(colorize('Done.', '36')); // Cyan color
process.exit();
