# NyaDB 
Simple JSON "database" for NodeJS.

![npm (scoped)](https://img.shields.io/npm/v/@decaded/nyadb) 
![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@decaded/nyadb)
![npm](https://img.shields.io/npm/dt/@decaded/nyadb)
![GitHub](https://img.shields.io/github/license/Decaded/NyaDB)

***
All files (databases) will be stored in the `NyaDB` folder in the project's root directory.
***

# Installation  
  ```sh
  npm i @decaded/nyadb
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
  nyadb.getDatabaseList(); // Returns the names of all databases in an array
  ```
  
### Deleting data
  ```js
  nyadb.deleteDatabase('test'); // Deletes the database 'test' 
  ```

___
### Like what i do? 
<a href='https://ko-fi.com/decaded' target='_blank'><img height='30' style='border:0px;height:40px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />
