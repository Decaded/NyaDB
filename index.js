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
const size = require('./functions/size');
const clearDatabase = require('./functions/clearDatabase');
const renameDatabase = require('./functions/renameDatabase');
const setupDatabase = require('./functions/startup/setupDatabase');

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
		this.userConfig = userConfig ? { ...userConfig } : undefined;
		this.applyConfig();
		setupDatabase();
		this.database = loadDatabase();
		this.scheduledActions = [];
		this.isRunning = false;
		this.debounceTimers = {};
		this.pendingSetOperations = {};
		log('NyaDB Initialized', userConfig);
	}

	/**
	 * Applies this instance's configuration to the shared low-level modules.
	 */
	applyConfig() {
		customConfig(this.userConfig);
	}

	/**
	 * Schedule a database action for execution.
	 * @param {string} action - The action to be scheduled (create, delete, set, clear, rename).
	 * @param {string} [name] - The name of the database to be used in the action.
	 * @param {object} [data] - The data to be used in the action.
	 * @returns {boolean} Whether the action was scheduled or executed successfully.
	 */
	scheduleAction(action, name, data) {
		this.applyConfig();

		if (action === 'set' && config.writeDebounce > 0) {
			if (this.debounceTimers[name]) {
				clearTimeout(this.debounceTimers[name]);
			}

			if (!this.pendingSetOperations[name]) {
				this.pendingSetOperations[name] = {};
			}
			Object.assign(this.pendingSetOperations[name], data);

			this.debounceTimers[name] = setTimeout(() => {
				this.applyConfig();
				const mergedData = this.pendingSetOperations[name];
				delete this.pendingSetOperations[name];
				delete this.debounceTimers[name];

				this.scheduledActions.push({ action: 'set', name, data: mergedData });
				this.scheduledActions.push({ action: 'load' });
				this.synchronizedScheduler();
			}, config.writeDebounce);

			return true;
		}

		this.scheduledActions.push({ action, name, data });
		return this.synchronizedScheduler();
	}

	/**
	 * Ensures scheduled database actions execute sequentially.
	 * @returns {boolean} Whether the last executed action succeeded.
	 */
	synchronizedScheduler() {
		let result = true;

		while (!this.isRunning && this.scheduledActions.length > 0) {
			this.isRunning = true;
			result = this.scheduler();
			this.isRunning = false;
		}

		return result;
	}

	/**
	 * Executes the next scheduled database action.
	 * @returns {boolean} Whether the action succeeded.
	 */
	scheduler() {
		this.applyConfig();
		const action = this.scheduledActions.shift();
		log('Action Scheduled', action.action, action.name, action.data);
		switch (action.action) {
			case 'create':
				return createDatabase(action.name);
			case 'delete':
				return deleteDatabase(action.name);
			case 'load':
				this.database = loadDatabase();
				return true;
			case 'set':
				return setDatabase(this.database, action.name, action.data);
			case 'clear':
				return clearDatabase(action.name);
			case 'rename':
				return renameDatabase(action.name, action.data.newName);
			default:
				log('Error', 'Unknown action:', action.action);
				return false;
		}
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
			this.applyConfig();
			if (config.validateInput === true) validateDatabaseName(name);

			if (Object.prototype.hasOwnProperty.call(this.database, name)) {
				log('Create Database', 'Database already exists:', name);
				return false;
			}

			const created = this.scheduleAction('create', name);
			if (!created) return false;

			this.scheduleAction('load');
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
			this.applyConfig();
			if (config.validateInput === true) validateDatabaseName(name);

			if (!Object.prototype.hasOwnProperty.call(this.database, name)) {
				log('Delete Database', 'Database does not exist:', name);
				return false;
			}

			const deleted = this.scheduleAction('delete', name);
			if (!deleted) return false;

			this.scheduleAction('load');
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
			this.applyConfig();
			if (config.validateInput === true) {
				validateDatabaseName(name);
				validateData(data);
			}

			if (!Object.prototype.hasOwnProperty.call(this.database, name)) {
				const error = new Error(`Cannot set database '${name}': Database does not exist. ` + `Call create('${name}') first.`);
				error.isCritical = false;
				log('Error', error.message);
				throw error;
			}

			return this.scheduleAction('set', name, data);
		} catch (error) {
			if (error && error.isCritical) {
				throw error;
			}

			log('Error', 'Set operation failed:', error.message);
			return false;
		}
	}

	/**
	 * Returns the database object for the provided name, or false if it doesn't exist.
	 * Includes any pending writes from debounced set() operations.
	 * @param {string} name - The name of the database to retrieve.
	 * @returns {object|false} The database object (with pending writes merged), or false if not found.
	 * @example
	 * const users = nyadb.get('users');
	 * if (users) {
	 *   console.log(users);
	 * }
	 */
	get(name) {
		this.applyConfig();
		if (Object.prototype.hasOwnProperty.call(this.database, name)) {
			// Merge pending writes from debounced set() operations
			const pending = this.pendingSetOperations[name];
			if (pending) {
				return { ...this.database[name], ...pending };
			}
			return this.database[name];
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
		this.applyConfig();
		return Object.keys(this.database);
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
		this.applyConfig();
		return size(names, this.database);
	}

	/**
	 * Returns size information with percent-of-limit and status labels.
	 * @param {string|string[]} [names] - Database name(s) to check. If not provided, returns statuses for all databases.
	 * @returns {object|null} Size status information for the requested database(s).
	 */
	sizeStatus(names) {
		this.applyConfig();
		return size.getStatus(names, this.database);
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
			this.applyConfig();
			if (config.validateInput === true) validateDatabaseName(name);

			return Object.prototype.hasOwnProperty.call(this.database, name);
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
			this.applyConfig();
			if (config.validateInput === true) validateDatabaseName(name);

			if (!Object.prototype.hasOwnProperty.call(this.database, name)) {
				log('Clear Database', 'Database does not exist:', name);
				return false;
			}

			const cleared = this.scheduleAction('clear', name);
			if (!cleared) return false;

			this.scheduleAction('load');
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
			this.applyConfig();
			if (config.validateInput === true) {
				validateDatabaseName(oldName);
				validateDatabaseName(newName);
			}

			if (!Object.prototype.hasOwnProperty.call(this.database, oldName)) {
				log('Rename Database', 'Source database does not exist:', oldName);
				return false;
			}

			if (Object.prototype.hasOwnProperty.call(this.database, newName)) {
				log('Rename Database', 'Target database already exists:', newName);
				return false;
			}

			const renamed = this.scheduleAction('rename', oldName, { newName });
			if (!renamed) return false;

			this.scheduleAction('load');
			return true;
		} catch (error) {
			log('Error', 'Rename operation failed:', error.message);
			return false;
		}
	}
};
