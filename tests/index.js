const NyaDB = require('../index');
const nyadb = new NyaDB();
const mockDatabase = {
	yellow: ['banana', 'citrus'],
	red: ['apple', 'paprika'],
};

// Create a database called "numbers"
nyadb.create('numbers');
// insert increasing numbers into the database, one by one
for (let i = 0; i < 1000; i++) {
	nya(i);
}

async function nya(i) {
	nyadb.set('numbers', {
		[i]: i,
	});
}

// Create a database called "fruits"
nyadb.create('fruits');

// Insert mock data into the fruits database
nyadb.set('fruits', mockDatabase);

// Create a database called "deleteMe"
nyadb.create('deleteMe');

// Log the contents of the database "numbers" to the console
console.log('Log "numbers" database');
console.log(nyadb.get('numbers'));
console.log('\n');

// Log all the databases to the console
console.log('Get database list');
console.log(nyadb.getList());
console.log('\n');

// Log 'fruits' database
console.log('Log "fruits" database');
console.log(nyadb.get('fruits'));
console.log('\n');

// Log "yellow" key from "fruits" database
console.log('Log "yellow" key from "fruits" database');
console.log(nyadb.get('fruits').yellow);
console.log('\n');

// Delete the database "deleteMe", then log all the databases to the console again
console.log('Delete "deleteMe" database');
nyadb.delete('deleteMe');
console.log('\n');

// Log all the databases to the console
console.log('Log all databases');
console.log(nyadb.getList());
console.log('\n');

// Close tests
console.log('Done');
process.exit();
