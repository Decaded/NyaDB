# NyaDB [![npm](https://img.shields.io/npm/v/nyadb)](https://www.npmjs.com/package/nyadb) [![npm](https://img.shields.io/npm/dw/nyadb)](https://www.npmjs.com/package/nyadb) [![Minimum NodeJS version](https://img.shields.io/node/v/nyadb)](https://www.npmjs.com/package/nyadb) [![Dependents (via libraries.io)](https://img.shields.io/librariesio/dependents/npm/nyadb)](https://libraries.io/npm/nyadb/dependents)

Simple JSON "database" for NodeJS.

# Installation  
  ```sh
  npm install @decaded/nyadb
  ```

# Usage
### Initialize
  ```js
  const NyaDB = require('@decaded/nyadb');
  const nyadb = new NyaDB();
  ```

### Create new database
  ```js
  nyadb.createDatabase('test'); // Creates a new database called 'test'
  ```

### Inserting data
  ```js
  const mockDatabase = {
	  yellow: ["banana", "citrus"],
	  red: ["apple", "paprika"],
  };
  nyadb.setDatabase('test', mockDatabase); // Sets the database 'test' to the mockDatabase object
  ```

### Retrieving data
  ```js 
  nyadb.getDatabase('test'); // Returns the 'test' database
  nyadb.getDatabaseList(); // Returns an array of all databases names
  ```
  
### Deleting data
  ```js
  nyadb.deleteDatabase('test'); // Deletes the database 'test' 
  ```
