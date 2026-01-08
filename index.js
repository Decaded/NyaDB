/**
 * Ensure all necessary files are present.
 */
require('./functions/startup/setupDatabase');
const customConfig = require('./config/customConfig');
const config = require('./config/config');
const log = require('./functions/logs/logger');
const { validateDatabaseName, validateData } = require('./functions/validation/validateInput');

/**
 * Load basic database functions.
 */
const createDatabase = require('./functions/createDatabase');
const deleteDatabase = require('./functions/deleteDatabase');
const loadDatabase = require('./functions/loadDatabase');
const setDatabase = require('./functions/setDatabase');
const getSize = require('./functions/getSize');
const clearDatabase = require('./functions/clearDatabase');
const renameDatabase = require('./functions/renameDatabase');

/**
 * Array of scheduled actions (load, create, delete, set, clear, rename) and the name of the database to be used in the action.
 * @typedef {Object} ScheduledAction
 * @property {string} action - The action to be performed (create, delete, load, set, clear, rename).
 * @property {string} [name] - The name of the database to be used in the action (optional).
 * @property {object} [data] - The data to be used in the action (optional).
 */
const scheduledActions = [];

let database = loadDatabase();
let isRunning = false;

/**
 * Debounce timers for write operations per database.
 * @type {Object.<string, NodeJS.Timeout>}
 */
const debounceTimers = {};

/**
 * Pending set operations for debouncing.
 * @type {Object.<string, object>}
 */
const pendingSetOperations = {};

/**
 * Schedule a database action for execution.
 * @param {string} action - The action to be scheduled (create, delete, set, clear, rename).
 * @param {string} [name] - The name of the database to be used in the action (optional).
 * @param {object} [data] - The data to be used in the action (optional).
 * @param {boolean} [immediate] - Whether to execute immediately without debouncing.
 */
async function scheduleAction(action, name, data, immediate = false) {
	if (action === 'set' && config.writeDebounce > 0 && !immediate) {
		if (debounceTimers[name]) {
			clearTimeout(debounceTimers[name]);
		}

		if (!pendingSetOperations[name]) {
			pendingSetOperations[name] = {};
		}
		Object.assign(pendingSetOperations[name], data);

		debounceTimers[name] = setTimeout(() => {
			const mergedData = pendingSetOperations[name];
			delete pendingSetOperations[name];
			delete debounceTimers[name];

			scheduledActions.push({ action: 'set', name, data: mergedData });
			scheduledActions.push({ action: 'load' });
			synchronizedScheduler();
		}, config.writeDebounce);

		return;
	}

	// For immediate operations or non-set operations, schedule normally
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
	log('Action Scheduled', action.action, action.name, action.data);
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
		case 'clear':
			clearDatabase(action.name);
			break;
		case 'rename':
			renameDatabase(action.name, action.data.newName);
			break;
		default:
			log('Error', 'Unknown action:', action.action);
			break;
	}
}

/**
 * Main NyaDB class that handles all database operations.
 * @class
 * @example
 * const NyaDB = require("@decaded/nyadb");
 * const nyadb = new NyaDB();
 * nyadb.create("test"); // Creates a new database called "test" if it doesn't exist.
 * nyadb.set("test", {"lorem": {"ipsum": "dolor sit amet"}}); // Sets the database "test" to provided JSON object.
 * nyadb.getList(); // Returns an array of all database names in the database.
 * nyadb.get("test"); // Returns the database object for the database called "test" if it exists.
 * nyadb.delete("test"); // Deletes the database called "test" if it exists.
 * nyadb.size(); // Returns size information for all databases.
 * nyadb.size("test"); // Returns size information for the database called "test".
 * nyadb.size(["test1", "test2"]); // Returns size information for multiple databases.
 * nyadb.exists("test"); // Returns true if the database "test" exists, false otherwise.
 * nyadb.clear("test"); // Clears all data from the database "test", resetting it to an empty object.
 * nyadb.rename("test", "newTest"); // Renames the database "test" to "newTest".
 */
module.exports = class NyaDB {
	/**
	 * Constructs the NyaDB instance and applies the user configuration.
	 * @param {object} userConfig - User configuration to override the default settings.
	 * @example
	 * const nyadb = new NyaDB({
	 *   enableConsoleLogs: true,
	 *   validateInput: true,
	 *   maxFileSize: 50, // 50MB
	 *   writeDebounce: 10, // 10ms
	 *   logLevel: 'info'
	 * });
	 */
	constructor(userConfig) {
		customConfig(userConfig);
		log('NyaDB Initialized', userConfig);
	}

	/**
	 * Creates a new database with the given name, if it doesn't already exist.
	 * @param {string} name - The name of the database to create.
	 * @returns {boolean} - True if database was created, false if it already exists or creation failed.
	 * @example
	 * const success = nyadb.create('users');
	 */
	create(name) {
		try {
			if (config.validateInput === true) validateDatabaseName(name);

			if (database.hasOwnProperty(name)) {
				log('Create Database', 'Database already exists:', name);
				return false;
			}

			scheduleAction('create', name);
			scheduleAction('load');
			return true;
		} catch (error) {
			log('Error', 'Create operation failed:', error.message);
			return false;
		}
	}

	/**
	 * Deletes the database with the provided name, if it exists.
	 * @param {string} name - The name of the database to delete.
	 * @returns {boolean} - True if database was deleted, false if it doesn't exist or deletion failed.
	 * @example
	 * const success = nyadb.delete('users');
	 */
	delete(name) {
		try {
			if (config.validateInput === true) validateDatabaseName(name);

			if (!database.hasOwnProperty(name)) {
				log('Delete Database', 'Database does not exist:', name);
				return false;
			}

			scheduleAction('delete', name);
			scheduleAction('load');
			return true;
		} catch (error) {
			log('Error', 'Delete operation failed:', error.message);
			return false;
		}
	}

	/**
	 * Sets the database with the given name to the provided JSON object.
	 * @param {string} name - The name of the database to set.
	 * @param {object} data - The JSON object to set the database to.
	 * @returns {boolean} - True if the operation was scheduled successfully, false if validation failed.
	 * @example
	 * const success = nyadb.set('users', { john: { age: 30, role: 'admin' } });
	 */
	set(name, data) {
		try {
			if (config.validateInput === true) {
				validateDatabaseName(name);
				validateData(data);
			}

			scheduleAction('set', name, data);
			return true;
		} catch (error) {
			log('Error', 'Set operation failed:', error.message);
			return false;
		}
	}

	/**
	 * Returns the database object for the provided name, or false if it doesn't exist.
	 * @param {string} name - The name of the database to retrieve.
	 * @returns {object|false} The database object, or false if not found.
	 * @example
	 * const users = nyadb.get('users');
	 * if (users) {
	 *   console.log(users);
	 * }
	 */
	get(name) {
		if (database.hasOwnProperty(name)) {
			return database[name];
		} else {
			return false;
		}
	}

	/**
	 * Returns an array of all database names.
	 * @returns {string[]} An array containing the names of all databases.
	 * @example
	 * const allDatabases = nyadb.getList();
	 * console.log(allDatabases); // ['users', 'posts', 'comments']
	 */
	getList() {
		return Object.keys(database);
	}

	/**
	 * Returns the size of one or more databases.
	 * @param {string|string[]} [names] - Database name(s) to check. If not provided, returns sizes for all databases.
	 * @returns {object|object[]|null} Size information for the requested database(s).
	 * @example
	 * nyadb.size(); // Returns sizes for all databases with total
	 * nyadb.size('test'); // Returns size for 'test' database
	 * nyadb.size(['test1', 'test2']); // Returns sizes for multiple databases with total
	 */
	size(names) {
		return getSize(names, database);
	}

	/**
	 * Checks if a database with the given name exists.
	 * @param {string} name - The name of the database to check.
	 * @returns {boolean} - True if the database exists, false otherwise.
	 * @example
	 * if (nyadb.exists('users')) {
	 *   console.log('Users database exists!');
	 * }
	 */
	exists(name) {
		try {
			if (config.validateInput === true) validateDatabaseName(name);

			return database.hasOwnProperty(name);
		} catch (error) {
			log('Error', 'Exists check failed:', error.message);
			return false;
		}
	}

	/**
	 * Clears all data from a database, resetting it to an empty state.
	 * The database file is preserved but its contents are set to an empty object.
	 * @param {string} name - The name of the database to clear.
	 * @returns {boolean} - True if the database was cleared, false if it doesn't exist or clearing failed.
	 * @example
	 * nyadb.clear('users'); // Clears all data from 'users' database
	 */
	clear(name) {
		try {
			if (config.validateInput === true) validateDatabaseName(name);

			if (!database.hasOwnProperty(name)) {
				log('Clear Database', 'Database does not exist:', name);
				return false;
			}

			scheduleAction('clear', name);
			scheduleAction('load');
			return true;
		} catch (error) {
			log('Error', 'Clear operation failed:', error.message);
			return false;
		}
	}

	/**
	 * Renames a database from oldName to newName.
	 * @param {string} oldName - The current name of the database.
	 * @param {string} newName - The new name for the database.
	 * @returns {boolean} - True if renamed successfully, false if oldName doesn't exist, newName already exists, or renaming failed.
	 * @example
	 * nyadb.rename('users', 'customers'); // Renames 'users' to 'customers'
	 */
	rename(oldName, newName) {
		try {
			if (config.validateInput === true) {
				validateDatabaseName(oldName);
				validateDatabaseName(newName);
			}

			if (!database.hasOwnProperty(oldName)) {
				log('Rename Database', 'Source database does not exist:', oldName);
				return false;
			}

			if (database.hasOwnProperty(newName)) {
				log('Rename Database', 'Target database already exists:', newName);
				return false;
			}

			scheduleAction('rename', oldName, { newName });
			scheduleAction('load');
			return true;
		} catch (error) {
			log('Error', 'Rename operation failed:', error.message);
			return false;
		}
	}
};
