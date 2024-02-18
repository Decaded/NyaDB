export default NyaDB;

/**
 * Main NyaDB class that handles all database operations.
 */
declare class NyaDB {
    /**
     * Creates a new database with the given name, if it doesn't already exist.
     * @param {string} name - The name of the database to create.
     */
    create(name: string): void;

    /**
     * Deletes the database with the provided name, if it exists.
     * @param {string} name - The name of the database to delete.
     */
    delete(name: string): void;

    /**
     * Sets the database with the given name to the provided JSON object.
     * @param {string} name - The name of the database to set.
     * @param {object} data - The JSON object to set the database to.
     */
    set(name: string, data: object): void;

    /**
     * Returns the database object for the provided name, or false if it doesn't exist.
     * @param {string} name - The name of the database to retrieve.
     * @returns {object|false} The database object, or false if not found.
     */
    get(name: string): object | false;

    /**
     * Returns an array of all database names.
     * @returns {string[]} An array containing the names of all databases.
     */
    getList(): string[];
}
