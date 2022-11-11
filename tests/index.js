const NyaDB = require('../index');
const nyadb = new NyaDB();
const mockDatabase = {
	yellow: ['banana', 'citrus'],
	red: ['apple', 'paprika'],
};

// Create a database called "numbers"
nyadb.createDatabase('numbers');
// insert increasing numbers into the database, one by one
for (let i = 0; i < 10; i++) {
	nyadb.setDatabase('numbers', {
		[i]: i,
	});
}

// Create a database called "fruits"
nyadb.createDatabase('fruits');

// Insert mock data into the fruits database
nyadb.setDatabase('fruits', mockDatabase);

// Create a database called "deleteMe"
nyadb.createDatabase('deleteMe');

setTimeout(() => {
	console.log(nyadb.database);
}, 5000);

// Log the contents of the database "numbers" to the console after 6 seconds
setTimeout(() => {
	console.log(nyadb.getDatabase('numbers'));
}, 6000);

// Log all the databases to the console after 8 seconds
setTimeout(() => {
	console.log(nyadb.getDatabaseList());
}, 8000);

// Delete the database "deleteMe" after 10 seconds, then log all the databases to the console again
setTimeout(() => {
	nyadb.deleteDatabase('deleteMe');
	console.log(nyadb.getDatabaseList());
}, 10000);

// Close tests
setTimeout(() => {
	console.log('Done');
	process.exit();
}, 12000);
