/**
 * Make sure all needed files are there
 */
require('./functions/startup/setupDatabase');

/**
 * Load basic functions
 */
const createDatabase = require('./functions/createDatabase');
const deleteDatabase = require('./functions/deleteDatabase');
const loadDatabase = require('./functions/loadDatabase');
const setDatabase = require('./functions/setDatabase');

/**
 * Array of scheduled actions (load, create, delete, set) and the name of the database to be used in the action (optional)
 * (ex: { action: "create", name: "databaseName", data: "data" })
 */
const scheduledActions = [];

let database = loadDatabase();
let isRunning = false;

async function scheduleAction(action, name, data) {
	scheduledActions.push({ action, name, data });
	synchronizedScheduler();
}

function synchronizedScheduler() {
	if (isRunning) return;
	if (scheduledActions.length <= 0) return;

	isRunning = true;
	scheduler();
	isRunning = false;

	synchronizedScheduler();
}

/**
 * Scheduler for database functions. This is used to prevent corruption of the database.json file.
 * Scheduler calls the appropriate function and ensures that no two functions are called at the same time.
 * Scheduler runs in background every 0.1 seconds and checks if there are any scheduled actions. If there are, it runs the scheduled action.
 * @param {string} action - The action to be scheduled (create, delete, save, load, set)
 * @param {string} name - The name of the database to be used in the action (optional) (ex: "databaseName")
 * @param {object} data - The data to be used in the action (optional) (ex: { key: "value" })
 */
function scheduler() {
	const action = scheduledActions.shift();
	switch (action.action) {
		case 'create':
			createDatabase(action.name);
			break;
		case 'delete':
			deleteDatabase(action.name);
			break;
		case 'load':
			database = loadDatabase();
			break;
		case 'set':
			setDatabase(database, action.name, action.data);
			break;
		default:
			console.log('Error: Unknown action: ' + action.action);
			break;
	}
}

/**
 * Main NyaDB class that handles all database operations.
 * @class
 *
 * @example
 * const NyaDB = require("nyadb");
 * const nyadb = new NyaDB();
 * nyadb.create("test"); // Creates a new database called "test" if it doesn't exist.
 * nyadb.set("test", {"lorem": {"ipsum": "dolor sit amet"}}); // Sets the database "test" to provided JSON object.
 * nyadb.getList(); // Returns an array of all database names in the database.
 * nyadb.get("test"); // Returns the database object for the database called "test" if it exists.
 * nyadb.delete("test"); // Deletes the database called "test" if it exist.
 */
module.exports = class NyaDB {
	/**
	 * Create database with given name, if it doesn't exist
	 */
	create(name) {
		// Schedule the action
		scheduleAction('create', name);
		// Schedule the load action to reload the database
		scheduleAction('load');
	}

	/**
	 * Delete database with provided name, if exist
	 */
	delete(name) {
		// Schedule the action
		scheduleAction('delete', name);
		// Schedule the load action to reload the database
		scheduleAction('load');
	}

	/**
	 * Set database with given name to given JSON object
	 */
	set(name, data) {
		// Schedule the action
		scheduleAction('set', name, data);
		// Schedule the load action to reload the database
		scheduleAction('load');
	}

	/**
	 * Return database with provided name, if exist
	 */
	get(name) {
		// Loop through the database and return only the database with the name provided if it exists
		for (const key in database) {
			if (key === name) {
				return database[key];
			}
		}
	}

	/**
	 * Return an array of all database names
	 */
	getList() {
		return Object.keys(database);
	}
};
