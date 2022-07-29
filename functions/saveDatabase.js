const { writeFileSync } = require("fs");
const jsonFormat = require("json-format");

/**
 * @param {object} database - The json database object to save to the file
 */
module.exports = function saveDatabase(database) {
	// format the database before saving
	let formattedDatabase = jsonFormat(database, {
		type: "tab",
	});

	// save the database
	writeFileSync("./NyaDB/database.json", formattedDatabase);
};
