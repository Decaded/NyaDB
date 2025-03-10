# NyaDB

Simple JSON "database" for NodeJS.

[![npm (scoped)](https://img.shields.io/npm/v/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![npm bundle size (scoped)](https://img.shields.io/bundlephobia/min/@decaded/nyadb)](https://bundlephobia.com/result?p=@decaded/nyadb)
[![npm](https://img.shields.io/npm/dt/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![GitHub](https://img.shields.io/github/license/Decaded/NyaDB)](https://github.com/Decaded/NyaDB/blob/master/LICENSE.md)
[![Node.js version](https://img.shields.io/badge/Node.js-%3E=12.x-green.svg)](https://nodejs.org/)

---

All databases are stored as **separate JSON files** in the `NyaDB` folder in the project's root directory.

---

## Node.js Version Requirement

This package requires Node.js version 12.x or higher for compatibility with the features and syntax used in the codebase.

## Installation

```sh
npm install @decaded/nyadb
```

## Usage

### Initialize

```js
const NyaDB = require('@decaded/nyadb');
const nyadb = new NyaDB();
```

You can pass settings on initialization. [More information below](#configuration-settings).

### Create new database

```js
nyadb.create('test'); // Creates a new database called 'test.json'
```

### Inserting data

```js
const mockDatabase = {
	yellow: ['banana', 'citrus'],
	red: ['apple', 'paprika'],
};
nyadb.set('test', mockDatabase); // Saves data in 'test.json'
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
nyadb.delete('test'); // Deletes 'test.json'
```

## Configuration Settings

You can customize the behavior of the application by modifying the following settings.

| Setting           | Default Value | Optional Values                         | Description                                                                                           |
| ----------------- | ------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| formattingEnabled | true          | false                                   | Enable or disable formatting of output.                                                               |
| formattingStyle   | tab           | space                                   | Choose between using tabs or spaces for indentation.                                                  |
| indentSize        | 4             | Any non-negative integer                | Specify the number of spaces for indentation. Only applicable if `formattingStyle` is set to "space". |
| encoding          | utf8          | Any valid encoding supported by Node.js | Specify the encoding for file input/output operations.                                                |
| enableConsoleLogs | false         | true                                    | Enable or disable logging output to the console. Errors will be logged regardless of this setting.    |

### Example

```js
const nyadb = new NyaDB({ formattingStyle: 'space', indentSize: 5 });
```

### Note

- Changes to these settings will take effect immediately on initialization.
- To return to the default values, simply remove the setting.

## Migration Guide

### Compatibility with previous versions

NyaDB version 4 transitions from a single-file database structure (`database.json`) to a multi-file storage system, where each database is stored as its own JSON file.

| ⚠   | **If migrating from version 3.x or earlier**, the system will **automatically detect** an existing `database.json` file and split it into multiple files.                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚠   | **This migration is one-way and cannot be reversed. The original `database.json` file will be backed up as `database_backup.json` in the `NyaDB` folder. However, it's recommended to create your own backup before upgrading.** |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Like what I do?

If you find this project helpful or fun to use, consider supporting me on Ko-fi! Your support helps me keep creating and improving.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L3L02XV6J)
