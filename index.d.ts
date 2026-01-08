/**
 * Configuration options for NyaDB.
 */
interface NyaDBConfig {
	/**
	 * Enable or disable formatting of output.
	 * @default true
	 */
	formattingEnabled?: boolean;

	/**
	 * Choose between using tabs or spaces for indentation.
	 * @default 'tab'
	 */
	formattingStyle?: 'tab' | 'space';

	/**
	 * Specify the number of spaces for indentation (only applicable if formattingStyle is 'space').
	 * @default 4
	 */
	indentSize?: number;

	/**
	 * Specify the encoding for file input/output operations.
	 * @default 'utf8'
	 */
	encoding?: string;

	/**
	 * Enable or disable logging output to the console. Errors will be logged regardless of this setting.
	 * @default false
	 */
	enableConsoleLogs?: boolean;

	/**
	 * Enable or disable input validation for database names and data.
	 * Validates database names to prevent path traversal and other security issues.
	 * Validates data to prevent circular references and ensure serializability.
	 *
	 * ⚠️ Security Warning: Disabling this setting may expose your application to path traversal vulnerabilities.
	 * Only disable if you have complete control over all database names.
	 *
	 * @default true
	 */
	validateInput?: boolean;

	/**
	 * Enable atomic write operations using temporary file + rename pattern.
	 * This prevents data corruption during write operations.
	 *
	 * Requires validateInput to be enabled (true).
	 * Throwing an error if 'validateInput' is false and 'useAtomicWrites' is true.
	 *
	 * @default true
	 */
	useAtomicWrites?: boolean;

	/**
	 * Maximum file size in megabytes. Default is 100MB.
	 * - Warning at 80% of limit
	 * - Grace threshold at 99% of limit
	 * - Hard block at 100% (critical error, shuts down application)
	 * @default 100
	 */
	maxFileSize?: number;

	/**
	 * Debounce delay in milliseconds for write operations. Set to 0 to disable.
	 * @default 10
	 */
	writeDebounce?: number;

	/**
	 * Log level for filtering log messages.
	 * @default 'warn'
	 */
	logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Size information for a single database.
 */
interface DatabaseSize {
	/**
	 * The name of the database.
	 */
	name: string;

	/**
	 * The size of the database file in bytes.
	 */
	bytes: number;

	/**
	 * Human-readable formatted size (e.g., "1.21 KB", "5.5 MB").
	 */
	formatted: string;
}

/**
 * Size information for multiple databases with totals.
 */
interface MultipleDatabaseSize {
	/**
	 * Object containing size information for each database.
	 */
	databases: {
		[key: string]: DatabaseSize;
	};

	/**
	 * Total size across all databases.
	 */
	total: {
		/**
		 * Total size in bytes.
		 */
		bytes: number;

		/**
		 * Human-readable formatted total size.
		 */
		formatted: string;
	};
}

/**
 * Main NyaDB class that handles all database operations.
 */
declare class NyaDB {
	/**
	 * Constructs the NyaDB instance and applies the user configuration.
	 *
	 * @param {NyaDBConfig} userConfig - User configuration to override the default settings.
	 * @example
	 * // Use default settings (recommended - includes security features)
	 * const nyadb = new NyaDB();
	 *
	 * @example
	 * // Custom configuration
	 * const nyadb = new NyaDB({
	 *   enableConsoleLogs: true,
	 *   maxFileSize: 50, // 50MB
	 *   writeDebounce: 10
	 * });
	 *
	 * @example
	 * // Disable security features
	 * const nyadb = new NyaDB({
	 *   validateInput: false,
	 *   useAtomicWrites: false
	 * });
	 */
	constructor(userConfig?: NyaDBConfig);

	/**
	 * Creates a new database with the given name, if it doesn't already exist.
	 * @param {string} name - The name of the database to create.
	 * @returns {boolean} - True if database was created, false if it already exists or creation failed.
	 * @example
	 * const success = nyadb.create('users');
	 */
	create(name: string): boolean;

	/**
	 * Deletes the database with the provided name, if it exists.
	 * @param {string} name - The name of the database to delete.
	 * @returns {boolean} - True if database was deleted, false if it doesn't exist or deletion failed.
	 * @example
	 * const success = nyadb.delete('users');
	 */
	delete(name: string): boolean;

	/**
	 * Sets the database with the given name to the provided JSON object.
	 * Multiple rapid calls will be debounced automatically for better performance.
	 * @param {string} name - The name of the database to set.
	 * @param {object} data - The JSON object to set the database to.
	 * @returns {boolean} - True if the operation was scheduled successfully, false if validation failed.
	 * @example
	 * const success = nyadb.set('users', { john: { age: 30, role: 'admin' } });
	 */
	set(name: string, data: object): boolean;

	/**
	 * Returns the database object for the provided name, or false if it doesn't exist.
	 * @param {string} name - The name of the database to retrieve.
	 * @returns {object | false} - The database object, or false if not found.
	 * @example
	 * const users = nyadb.get('users');
	 * if (users) {
	 *   console.log(users);
	 * }
	 */
	get(name: string): object | false;

	/**
	 * Returns an array of all database names.
	 * @returns {string[]} - An array containing the names of all databases.
	 * @example
	 * const allDbs = nyadb.getList();
	 * console.log(allDbs); // ['users', 'posts']
	 */
	getList(): string[];

	/**
	 * Returns the size of one or more databases.
	 * @param {string | string[]} names - Database name(s) to check. If not provided, returns sizes for all databases.
	 * @returns {DatabaseSize | MultipleDatabaseSize | null} - Size information for the requested database(s), or null if not found.
	 * @example
	 * // Get size of a single database
	 * const size = nyadb.size('users');
	 * console.log(size); // { name: 'users', bytes: 1234, formatted: '1.21 KB' }
	 *
	 * @example
	 * // Get size of multiple databases
	 * const sizes = nyadb.size(['users', 'posts']);
	 * console.log(sizes.total.formatted); // '10.5 KB'
	 *
	 * @example
	 * // Get size of all databases
	 * const allSizes = nyadb.size();
	 * console.log(allSizes.databases);
	 */
	size(names?: string | string[]): DatabaseSize | MultipleDatabaseSize | null;

	/**
	 * Checks if a database with the given name exists.
	 * @param {string} name - The name of the database to check.
	 * @returns {boolean} - True if the database exists, false otherwise.
	 * @example
	 * if (nyadb.exists('users')) {
	 *   console.log('Users database exists!');
	 * }
	 */
	exists(name: string): boolean;

	/**
	 * Clears all data from a database, resetting it to an empty state.
	 * The database file is preserved but its contents are set to an empty object.
	 * @param {string} name - The name of the database to clear.
	 * @returns {boolean} - True if the database was cleared, false if it doesn't exist or clearing failed.
	 * @example
	 * nyadb.clear('users');
	 */
	clear(name: string): boolean;

	/**
	 * Renames a database from oldName to newName.
	 * @param {string} oldName - The current name of the database.
	 * @param {string} newName - The new name for the database.
	 * @returns {boolean} - True if renamed successfully, false if oldName doesn't exist, newName already exists, or renaming failed.
	 * @example
	 * nyadb.rename('users', 'customers');
	 */
	rename(oldName: string, newName: string): boolean;
}

export default NyaDB;
export { NyaDBConfig, DatabaseSize, MultipleDatabaseSize };
