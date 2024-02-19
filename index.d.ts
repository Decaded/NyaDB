/**
 * Main NyaDB class that handles all database operations.
 */
declare class NyaDB {
    /**
     * Creates a new database with the given name, if it doesn't already exist.
     * @param {string} name - The name of the database to create.
     * @returns {boolean} - Whether or not the database was created successfully.
     */
    create(name: string): boolean;

    /**
     * Deletes the database with the provided name, if it exists.
     * @param {string} name - The name of the database to delete.
     * @returns {boolean} - Whether or not the database was deleted successfully.
     */
    delete(name: string): boolean;

    /**
     * Sets the database with the given name to the provided JSON object.
     * @param {string} name - The name of the database to set.
     * @param {object} data - The JSON object to set the database to.
     * @returns {boolean} - Whether or not the database was set successfully.
     */
    set(name: string, data: object): boolean;

    /**
     * Returns the database object for the provided name, or false if it doesn't exist.
     * @param {string} name - The name of the database to retrieve.
     * @returns {object|false} - The database object, or false if not found.
     */
    get(name: string): object | false;

    /**
     * Returns an array of all database names.
     * @returns {string[]} - An array containing the names of all databases.
     */
    getList(): string[];
}

export default NyaDB;
