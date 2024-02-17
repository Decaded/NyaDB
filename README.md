# NyaDB 
Simple JSON "database" for NodeJS.

[![npm (scoped)](https://img.shields.io/npm/v/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@decaded/nyadb)](https://bundlephobia.com/result?p=@decaded/nyadb)
[![npm](https://img.shields.io/npm/dt/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![GitHub](https://img.shields.io/github/license/Decaded/NyaDB)](https://github.com/Decaded/NyaDB/blob/master/LICENSE.md)
[![Node.js version](https://img.shields.io/badge/Node.js-%3E=12.x-green.svg)](https://nodejs.org/)

***
All files (databases) will be stored in the `NyaDB` folder in the project's root directory.
***

## Node.js Version Requirement
This package requires Node.js version 12.x or higher for compatibility with the features and syntax used in the codebase.


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
  nyadb.create('test'); // Creates a new database called 'test'
  ```

### Inserting data
  ```js
  const mockDatabase = {
	  yellow: ["banana", "citrus"],
	  red: ["apple", "paprika"],
  };
  nyadb.set('test', mockDatabase); // Sets the database 'test' to the 'mockDatabase' object
  ```

### Retrieving data
  ```js 
nyadb.get('test'); // Returns the 'test' database

//  {
//    "yellow": ["banana", "citrus"],
//    "red": ["apple", "paprika"],
//  } 
```

```js
nyadb.getList(); // Returns the names of all databases in an array

// ['test']
```
  
### Deleting data
  ```js
  nyadb.delete('test'); // Deletes the database 'test' 
  ```

___
### Like what i do? 
<a href='https://ko-fi.com/decaded' target='_blank'><img height='30' style='border:0px;height:40px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />
