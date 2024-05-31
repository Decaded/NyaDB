# NyaDB

Simple JSON "database" for NodeJS.

[![npm (scoped)](https://img.shields.io/npm/v/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@decaded/nyadb)](https://bundlephobia.com/result?p=@decaded/nyadb)
[![npm](https://img.shields.io/npm/dt/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![GitHub](https://img.shields.io/github/license/Decaded/NyaDB)](https://github.com/Decaded/NyaDB/blob/master/LICENSE.md)
[![Node.js version](https://img.shields.io/badge/Node.js-%3E=12.x-green.svg)](https://nodejs.org/)

---

All files will be stored in the `NyaDB` folder in the project's root directory.

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

You can pass settings on initialization. [More information below](#configuration-settings).

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

You can customize the behavior of the application by modifying the following settings.

| Setting           | Default Value | Optional Values                         | Description                                                                                           |
| ----------------- | ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| formattingEnabled | true          | false                                   | Enable or disable formatting of output.                                                               |
| formattingStyle   | tab           | space                                   | Choose between using tabs or spaces for indentation.                                                  |
| indentSize        | 4             | Any non-negative integer                | Specify the number of spaces for indentation. Only applicable if `formattingStyle` is set to "space". |
| encoding          | utf8          | Any valid encoding supported by Node.js | Specify the encoding for file input/output operations.                                                |
| enableConsoleLogs | false         | true                                    | Enable or disable logging output to the console. Errors will be logged regardless of this setting.    |

### Example:

```js
const nyadb = new NyaDB({ formattingStyle: 'space', indentSize: 5 });
```

### Note:

- Changes to these settings will take effect immediately on initialization.
- To return to the default values, simply remove the setting.

## Migration Guide

### Compatibility with previous versions

NyaDB version 3 is fully compatible with databases created using version 2.x. and 1.x. No data migration is required when upgrading to version 3.

⚠ NyaDB version 3 introduces strict procedures for handling [configuration settings](#configuration-settings). If you use them, make sure you pass the correct values ​​listed in the table.

⚠ If you are migrating from 1.x, make sure to update your methods as listed below.

### Method Renaming

In version 2.0, some method names were updated for consistency and clarity. Here’s a quick guide on how to update your code:

- `createDatabase()` is now `create()`
- `deleteDatabase()` is now `delete()`
- `setDatabase()` is now `set()`
- `getDatabase()` is now `get()`
- `getDatabaseList()` is now `getList()`

For example, if you previously used `nyadb.createDatabase('test')`, you should now use `nyadb.create('test')`.

### Passing Arguments

Passing arguments on initialization is optional and compatible with version 1.x and 2.x, meaning if you initialized it like this:

```js
const NyaDB = require('@decaded/nyadb');
const nyadb = new NyaDB();
```

It will still work in version 3.0 the same way as it did before. Just make sure you updated your methods as shown above if you are migrating from version 1.x.

### Deprecation Notice

Please note that the previous method names have been [deprecated since version 1.5.0](CHANGELOG.md#150) and were removed in 2.0.

---

# Like what I do?

<a href='https://ko-fi.com/decaded' target='_blank'><img height='30' style='border:0px;height:40px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />
