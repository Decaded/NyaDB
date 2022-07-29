const { readFileSync } = require("fs");

module.exports = function loadDatabase() {
	// Load the database
	let database = {};
	try {
		database = JSON.parse(readFileSync("./NyaDB/database.json"));
	} catch (e) {
		console.log("Error loading database: " + e);
	}
	return database;
};
