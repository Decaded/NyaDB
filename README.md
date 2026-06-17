# NyaDB

Simple JSON "database" for NodeJS.

[![npm (scoped)](https://img.shields.io/npm/v/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
[![npm unpacked size (scoped)](https://img.shields.io/npm/unpacked-size/@decaded/nyadb)](https://www.npmjs.com/package/@decaded/nyadb)
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

### Creating new database

```js
nyadb.create('test');
```

### Inserting data

```js
const mockDatabase = {
	yellow: ['banana', 'citrus'],
	red: ['apple', 'paprika'],
};
nyadb.set('test', mockDatabase);
```

### Retrieving data

```js
nyadb.get('test');

//  {
//    "yellow": ["banana", "citrus"],
//    "red": ["apple", "paprika"],
//  }
```

```js
nyadb.getList(); // Returns the names of all existing databases in an array

// ['test']
```

### Checking if database exists

```js
if (nyadb.exists('test')) console.log('Database exists!');
```

Returns true if `test` database exists, false otherwise

### Clearing a database

```js
nyadb.clear('test');
```

Clears all data from `test` database, keeping the file The database will now be an empty object: `{}`

### Renaming a database

```js
nyadb.rename('test', 'newName');
```

Renames `test` to `newName`

Returns false if `test` doesn't exist or `newName` already exists

## Getting database sizes

```js
// Get size of a single database
const size = nyadb.size('test');
console.log(size);
// { name: 'test', bytes: 1234, formatted: '1.21 KB' }

// Get sizes of multiple databases
const sizes = nyadb.size(['test', 'users']);
console.log(sizes.total.formatted); // '10.5 KB'
console.log(sizes.databases.test.formatted); // '1.21 KB'

// Get sizes of all databases
const allSizes = nyadb.size();
console.log(allSizes.databases); // Object with all database sizes
console.log(allSizes.total.formatted); // Total size of all databases
```

### Checking database size status

```js
const status = nyadb.sizeStatus('test');
console.log(status);
// { name: 'test', bytes: 1234, formatted: '1.21 KB', percentOfLimit: 0.01, status: 'ok' }

const allStatuses = nyadb.sizeStatus();
console.log(allStatuses.total.status); // 'ok', 'warning', 'grace', 'critical', or 'unknown'
```

### Deleting data

```js
nyadb.delete('test');
```

## Configuration Settings

You can customize the behavior of the application by modifying the following settings.

| Setting           | Default Value | Optional Values                         | Description                                                                                                                                                                 |
| ----------------- | ------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| formattingEnabled | true          | false                                   | Enable or disable formatting of output.                                                                                                                                     |
| formattingStyle   | tab           | space                                   | Choose between using tabs or spaces for indentation.                                                                                                                        |
| indentSize        | 4             | Any non-negative integer                | Specify the number of spaces for indentation. Only applicable if `formattingStyle` is set to `space`.                                                                       |
| encoding          | utf8          | Any valid encoding supported by Node.js | Specify the encoding for file input/output operations.                                                                                                                      |
| enableConsoleLogs | false         | true                                    | Enable or disable logging output to the console. Errors will be logged regardless of this setting.                                                                          |
| logLevel          | warn          | error, warn, info, debug                | Log level for filtering log messages. Only affects logs when `enableConsoleLogs` is true. The log priority is: `error` > `warn` > `info` > `debug`                                  |
| validateInput     | true          | false                                   | Enable input validation for database names and data. Prevents path traversal and validates data integrity.                                                                  |
| useAtomicWrites   | true          | false                                   | Enable atomic write operations using temp file + rename pattern. Requires `validateInput: true` (throws error if not met). Prevents possible data corruption during writes. |
| maxFileSize       | 100           | Any non-negative integer                | Maximum file size in megabytes. Warns at 80%, grace threshold at 99%, saves the latest write at 100%, then raises a critical error so the app can stop cleanly.             |
| writeDebounce     | 10            | Any non-negative integer                | Debounce delay for write operations in milliseconds. Automatically batches rapid writes for better performance. Set to 0 to disable.                                        |

### Example

```js
const nyadb = new NyaDB({
	formattingStyle: 'space',
	indentSize: 5,
	enableConsoleLogs: true,
	logLevel: 'info',
});
```

### Security Configuration

Version 5.0.0 enables security features by default:

```js
// Default behavior (recommended)
const nyadb = new NyaDB(); // validateInput: true, useAtomicWrites: true

// Disable security features (not recommended)
const nyadb = new NyaDB({
	validateInput: false, // Allows path traversal - use with caution
	useAtomicWrites: false, // Must be false when validateInput is false
});
```

**⚠ Security Warning:** Disabling `validateInput` may expose your application to path traversal vulnerabilities. Only disable if you have complete control over all database names.

### Note

- Changes to these settings will take effect immediately on initialization.
- To return to the default values, simply remove the setting.
- `useAtomicWrites` requires `validateInput: true`. Setting `useAtomicWrites: true` with `validateInput: false` will throw a configuration error.

## Migration Guide

### Upgrading from v4.0.0 to v5.0.0

Version 5.0.0 is a **major release** with breaking changes.

#### Breaking Changes

1. **`validateInput` defaults to `true`**

   - Database names are validated by default
   - Path traversal attempts are blocked
   - Invalid characters in database names will cause operations to fail

2. **`useAtomicWrites` defaults to `true`**
   - Write operations use atomic file operations by default
   - Prevents data corruption during writes

#### Migration Steps

**If your application uses only valid database names (alphanumeric, dots, dashes, underscores):**

- No changes needed! Your code will continue to work.

**If your application uses invalid database names (path separators, parent directory references):**

```js
// Option 1: Update your database names (recommended)
// Change: nyadb.create('../data/users')
// To: nyadb.create('users')

// Option 2: Explicitly disable validation (not recommended)
const nyadb = new NyaDB({
	validateInput: false,
	useAtomicWrites: false,
});
```

**⚠ Important:** If you disable `validateInput`, you must also set `useAtomicWrites: false`. Attempting to enable atomic writes without validation will throw a configuration error.

### Compatibility with previous versions

NyaDB version 4+ uses a multi-file storage system, where each database is stored as its own JSON file.

| ⚠   | **If migrating from version 3.x or earlier**, the system will **automatically detect** an existing `database.json` file and split it into multiple files.                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ⚠   | **This migration is one-way and cannot be reversed. The original `database.json` file will be backed up as `database_backup.json` in the `NyaDB` folder. However, it's recommended to create your own backup before upgrading.** |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

---

## Like what I do?

If you find this project helpful or fun to use, consider supporting me on Ko-fi! Your support helps me keep creating and improving.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L3L02XV6J)
