# NyaDB

Simple JSON "database" for NodeJS.

[![npm (scoped)](https://img.shields.io/npm/v/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@decaded/nyadb)](https://bundlephobia.com/result?p=@decaded/nyadb)
[![npm](https://img.shields.io/npm/dt/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![GitHub](https://img.shields.io/github/license/Decaded/NyaDB)](https://github.com/Decaded/NyaDB/blob/master/LICENSE.md)
[![Node.js version](https://img.shields.io/badge/Node.js-%3E=12.x-green.svg)](https://nodejs.org/)

---

All files (database file and config) will be stored in the `NyaDB` folder in the project's root directory.

---

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

You can pass settings on initialization. [More information below.](#configuration-settings).

### Create new database

```js
nyadb.create('test'); // Creates a new database called 'test'
```

### Inserting data

```js
const mockDatabase = {
	yellow: ['banana', 'citrus'],
	red: ['apple', 'paprika'],
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

## Configuration Settings <a name="configuration-settings"></a>

Users can customize the behavior of the application by modifying the following settings.

| Setting           | Default Value | Optional Values                           | Description                                                                                                    |
| ----------------- | ------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| formattingEnabled | true          | false                                     | Enable or disable formatting of output.                                                                        |
| formattingStyle   | tab           | space                                     | Choose between using tabs or spaces for indentation.                                                           |
| indentSize        | 4             | Any positive integer                      | Specify the number of spaces for indentation. Only applicable if `formattingStyle` is set to "space".          |
| encoding          | utf8          | utf16, utf16le, utf16be, ascii, latin1... | Specify the encoding for file input/output operations. Any encoding supported by Node.js and JSON should work. |
| enableConsoleLogs | false         | true                                      | Enable or disable logging output to the console. Errors will be logged regardless of this setting.             |

The configuration file is created only after passing the data on initialization, like so:

```js
const nyadb = new NyaDB({ formattingStyle: 'space', indentSize: 5 });
```

### Note:

- Changes to these settings will only take effect after restarting the application.
- The JSON file containing these settings is located in the `NyaDB` folder in the project's root directory and by default is named `customDatabaseConfiguration.json`.
- To return to the default configuration values, simply remove custom settings from the initialization.

## Migration Guide

### Compatibility with Databases from Version 1.x

NyaDB version 2.0 is fully compatible with databases created using version 1.x. No data migration is required when upgrading to version 2.0.

### Method Renaming

In version 2.0, some method names have been updated for consistency and clarity. Here's a quick guide on how to update your code:

- `createDatabase()` is now `create()`
- `deleteDatabase()` is now `delete()`
- `setDatabase()` is now `set()`
- `getDatabase()` is now `get()`
- `getDatabaseList()` is now `getList()`

For example, if you previously used `nyadb.createDatabase('test')`, you should now use `nyadb.create('test')`.

### Deprecation Notice

Please note that the previous method names have been [deprecated since version 1.5.0](CHANGELOG.md#150) and were removed in 2.0.

---

### Like what i do?

<a href='https://ko-fi.com/decaded' target='_blank'><img height='30' style='border:0px;height:40px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />
