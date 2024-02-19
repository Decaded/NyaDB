/**
 * Ensure all necessary files are present.
 */
require('./functions/startup/setupDatabase');
const customConfig = require('./config/customConfig');

/**
 * Load basic database functions.
 */
const createDatabase = require('./functions/createDatabase');
const deleteDatabase = require('./functions/deleteDatabase');
const loadDatabase = require('./functions/loadDatabase');
const setDatabase = require('./functions/setDatabase');

/**
 * Array of scheduled actions (load, create, delete, set) and the name of the database to be used in the action (optional).
 * @typedef {Object} ScheduledAction
 * @property {string} action - The action to be performed (create, delete, load, set).
 * @property {string} [name] - The name of the database to be used in the action (optional).
 * @property {object} [data] - The data to be used in the action (optional).
 * @type {ScheduledAction[]}
 */
const scheduledActions = [];

let database = loadDatabase();
let isRunning = false;

/**
 * Schedule a database action for execution.
 * @param {string} action - The action to be scheduled (create, delete, set).
 * @param {string} [name] - The name of the database to be used in the action (optional).
 * @param {object} [data] - The data to be used in the action (optional).
 */
async function scheduleAction(action, name, data) {
	scheduledActions.push({ action, name, data });
	synchronizedScheduler();
}

/**
 * Ensure that database actions are executed sequentially without overlap.
 */
function synchronizedScheduler() {
	while (!isRunning && scheduledActions.length > 0) {
		isRunning = true;
		scheduler();
		isRunning = false;
	}
}

/**
 * Scheduler for database functions. Prevents corruption of the database.json file by ensuring sequential execution of actions.
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
 * @example
 * const NyaDB = require("nyadb");
 * const nyadb = new NyaDB();
 * nyadb.create("test"); // Creates a new database called "test" if it doesn't exist.
 * nyadb.set("test", {"lorem": {"ipsum": "dolor sit amet"}}); // Sets the database "test" to provided JSON object.
 * nyadb.getList(); // Returns an array of all database names in the database.
 * nyadb.get("test"); // Returns the database object for the database called "test" if it exists.
 * nyadb.delete("test"); // Deletes the database called "test" if it exists.
 */
module.exports = class NyaDB {
	constructor(userConfig) {
		customConfig(userConfig);
	}

	/**
	 * Creates a new database with the given name, if it doesn't already exist.
	 * @param {string} name - The name of the database to create.
	 */
	create(name) {
		// Schedule the action
		scheduleAction('create', name);
		// Schedule the load action to reload the database
		scheduleAction('load');
	}

	/**
	 * Deletes the database with the provided name, if it exists.
	 * @param {string} name - The name of the database to delete.
	 */
	delete(name) {
		// Schedule the action
		scheduleAction('delete', name);
		// Schedule the load action to reload the database
		scheduleAction('load');
	}

	/**
	 * Sets the database with the given name to the provided JSON object.
	 * @param {string} name - The name of the database to set.
	 * @param {object} data - The JSON object to set the database to.
	 */
	set(name, data) {
		// Schedule the action
		scheduleAction('set', name, data);
		// Schedule the load action to reload the database
		scheduleAction('load');
	}

	/**
	 * Returns the database object for the provided name, or false if it doesn't exist.
	 * @param {string} name - The name of the database to retrieve.
	 * @returns {object|false} The database object, or false if not found.
	 */
	get(name) {
		// Check if the database with the provided name exists
		if (database.hasOwnProperty(name)) {
			// Return the database object if it exists
			return database[name];
		} else {
			// Return false if the database doesn't exist
			return false;
		}
	}

	/**
	 * Returns an array of all database names.
	 * @returns {string[]} An array containing the names of all databases.
	 */
	getList() {
		return Object.keys(database);
	}
};
