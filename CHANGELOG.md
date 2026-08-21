# Change Log

All notable changes to the project will be documented in this file.

---

## [6.1.1](https://www.npmjs.com/package/@decaded/nyadb/v/6.1.1) (2026-08-21)

### Security

- Replaced prototype-sensitive debounce registries with prototype-less objects and safe own-property definitions.
- Rejected prototype-sensitive database names and used a prototype-less database map while loading database files to prevent prototype pollution.

## [6.1.0](https://www.npmjs.com/package/@decaded/nyadb/v/6.1.0) (2026-08-21)

### Fixed

- Restored the documented v6 behavior where `set()` throws when the database does not exist.
- Ordered debounced writes with `clear()`, `delete()`, and `rename()` to prevent stale writes from resurrecting or losing data.
- Exposed asynchronous debounced write failures through `getLastError()` instead of allowing uncaught timer exceptions.
- Reserved loader metadata and temporary-file names during input validation.
- Ignored symbolic links while loading databases and calculating database sizes.
- Corrected the TypeScript declaration to match the package's CommonJS export.
- Aligned file-size checks with the formatted and encoded representation saved to disk.
- Prevented duplicate database names from being double-counted in size totals.
- Defined `maxFileSize: 0` consistently as unlimited.
- Enforced one shared NyaDB instance per process. Repeated construction reuses the existing instance.

### Deprecated

- Legacy pre-v4 `database.json` migration remains available for v6 compatibility and is scheduled for removal in v7.

## [6.0.0](https://www.npmjs.com/package/@decaded/nyadb/v/6.0.0) (2026-07-03)

### ⚠ Breaking Changes

- **`set()` now throws an error instead of returning false** when the database doesn't exist:
  - Previously: `db.set('nonexistent', data)` returned `false` silently (or with debug logging only)
  - Now: throws `Error: Cannot set database 'nonexistent': Database does not exist. Call create('nonexistent') first.`
  - **Migration:** If you were checking the return value, wrap the call in a try-catch; if you weren't checking it, ensure `create()` is called before `set()`

### Fixed

- `get()` now returns consistent data including any pending debounced writes from recent `set()` calls (reads immediately after `set()` no longer return stale data)

## [5.0.1](https://www.npmjs.com/package/@decaded/nyadb/v/5.0.1) (2026-06-08)

### Fixed

- IntelliSense now correctly displays JSDoc comments for all methods and properties

## [5.0.0](https://www.npmjs.com/package/@decaded/nyadb/v/5.0.0) (2026-06-08)

### ⚠ Breaking Changes

- **Input validation enabled by default:**
  - `validateInput` defaults to `true`
  - Database names are validated for security by default
  - Prevents path traversal attempts and invalid characters
  - To disable validation (not recommended), explicitly set `validateInput: false`

- **Atomic writes enabled by default:**
  - `useAtomicWrites` defaults to `true`
  - Uses temporary file + rename pattern for safer write operations
  - Prevents data corruption during write operations
  - Requires `validateInput: true` (throws error if not met)

### Added

- **Atomic file operations:**
  - Implemented atomic writes using temporary file + rename pattern
  - Prevents data corruption during write operations
  - Requires `validateInput: true` to enable
  - Configurable via `useAtomicWrites` setting (default: true)

- **Input validation:**
  - Database names are validated for security
  - Prevents path traversal attempts and invalid characters
  - Configurable via `validateInput` setting (default: true)

- **Write debouncing:**
  - Automatic batching of rapid write operations
  - Configurable delay via `writeDebounce` setting (default: 10ms)
  - Improves performance for applications with frequent updates

- **File size limits:**
  - Added `maxFileSize` configuration setting (default: 100MB)
  - Prevents memory issues with large datasets
  - Warning at 80% of limit
  - Grace threshold at 99% of limit
  - At or above 100% of limit, saves the latest write and raises a critical error so the application can stop cleanly

- **Enhanced logging:**
  - Added log levels: error, warn, info, debug
  - Configurable via `logLevel` setting (default: 'warn')
  - Errors are now logged based on logLevel setting
  - Critical errors bypass all settings and shut down the application with extensive error messages

- **Database size monitoring:**
  - Added `size` method to retrieve the size of a database
  - Added `sizeStatus` method with percent-of-limit and status labels
  - Supports getting sizes of a specified database, multiple specified databases, or all existing databases
  - Returns detailed size information including byte count and formatted size

- **`exists()` method:**
  - Check if a database exists without loading its data
  - Returns `true` if database exists, `false` otherwise
  - Example: `nyadb.exists('users')`

- **`clear()` method:**
  - Reset a database to an empty state without deleting the file
  - Preserves the database file but clears all contents
  - Example: `nyadb.clear('users')`

- **`rename()` method:**
  - Rename a database file from one name to another
  - Returns `false` if source doesn't exist or target already exists
  - Example: `nyadb.rename('oldName', 'newName')`

- **New configuration options:**
  - `validateInput` (boolean, default: true)
  - `useAtomicWrites` (boolean, default: true)
  - `maxFileSize` (number, default: 100)
  - `writeDebounce` (number, default: 10)
  - `logLevel` (string, default: 'warn')

### Improved

- **Standardized return types**: All top-level database methods now return boolean values (true/false) instead of undefined
- **Return value consistency:** `create()` and `delete()` methods now correctly return `false` when database already exists or doesn't exist, respectively
- Better error handling throughout the codebase
- More descriptive error messages
- Graceful handling of corrupted database files
- Updated TypeScript definitions with current default values

### Fixed

- Temporary files are now properly skipped during database loading
- Improved cleanup of temporary files after write operations

### Removed

- Removed `word-wrap` override as the security issue has been resolved

---

## [4.0.0](https://www.npmjs.com/package/@decaded/nyadb/v/4.0.0) (10-03-2025)

### Changed

- **Multi-file storage system:**
  - Each database is now stored as a separate JSON file (`databaseName.json`) instead of a single `database.json` file.
  - This improves data isolation, reduces unnecessary file writes, and allows more efficient updates.

- **Automated Migration from v3.x:**
  - If an existing `database.json` is detected, NyaDB will **automatically split** it into multiple files, maintaining the original structure.
  - The old `database.json` will be **backed up** as `database_backup.json` in the `NyaDB` folder.

### Removed

- **Deprecated `database.json`:**
  - All operations now target individual database files instead of a centralized JSON file.

---

## [3.0.0](https://www.npmjs.com/package/@decaded/nyadb/v/3.0.0) (31-05-2024)

### Added

- **Dynamic Configuration**:
  - Added dynamic configuration functionality.

- **Configuration Validation**:
  - Implemented robust validation for configuration settings to enforce expected formats and values.
  - Enhanced error handling for configuration-related errors.
  - ⚠ This is a possible breaking change necessitating the major version update to 3.

- **Logging Enhancements**:
  - Improved logging functionality to support dynamic configurations and provide more detailed log messages.
  - Added support for logging database operations with timestamps and action types.

- **Documentation and Typings**:
  - Updated JSDoc comments for better code documentation.
  - Improved README with updated usage instructions and configuration settings.

### Removed

- Removed unnecessary `customConfigFile` setting as dynamic configuration handling was implemented.

---

## [2.0.0](https://www.npmjs.com/package/@decaded/nyadb/v/2.0.0) (19-02-2024)

### Added

- Introducing configuration handling:
  - Added `config` module for centralized configuration management
  - Moved creating initial DB files from `index.js` to separate file (`setupDatabase.js`)
  - Created operations (`loadFile.js` and `saveFile.js`) to handle file operations

- Enhanced documentation and typings:
  - Improved JSDoc comments for better code documentation
  - Updated TypeScript declaration file (`index.d.ts`) to reflect accurate types and structure of the `NyaDB` class and its methods

- Updated `README` with migration guide:
  - Added instructions for upgrading from version `1.x` to `2.0`
  - Included information about method renaming and deprecation notices

### Removed

- Removed `createDatabase`, `deleteDatabase`, `setDatabase`, `getDatabase`, and `getDatabaseList` functions as they were no longer needed and were deprecated in version
  [1.5.0](#150)
- Removed dependency on [json-format](https://www.npmjs.com/package/json-format)

---

## [1.6.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.6.0) (11-07-2023) <a name="160"></a>

- [fix: CVE-2023-26115](https://security.snyk.io/vuln/SNYK-JS-WORDWRAP-3149973)
  - by replacing [word-wrap](https://www.npmjs.com/package/word-wrap) unmaintained repo with [word-wrap fork by aashutoshrathi](https://github.com/aashutoshrathi/word-wrap)

---

## [1.5.1](https://www.npmjs.com/package/@decaded/nyadb/v/1.5.1) (11-06-2023)

- Changed author url to [decaded.dev](https://decaded.dev) in package.json

---

## [1.5.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.5.0) (25-01-2023) <a name="150"></a>

- Updated database function names:
  - .createDatabase() -> .create()
  - .deleteDatabase() -> .delete()
  - .setDatabase() -> .set()
  - .getDatabase() -> .get()
  - .getDatabaseList() -> .getList()
- Updated [README](https://github.com/Decaded/NyaDB/commit/98d28f57de1adf105c19ee7caec7876378814319)
- Added deprecation warnings

---

## [1.4.2](https://www.npmjs.com/package/@decaded/nyadb/v/1.4.2) (29-12-2022)

- Updated [README](https://github.com/Decaded/NyaDB/commit/18a59db007b9088011b3fd7bf51387c6edd45de2)
  - Added badges
- Added [license](https://github.com/Decaded/NyaDB/blob/master/LICENSE.md)

---

## [1.4.1](https://www.npmjs.com/package/@decaded/nyadb/v/1.4.1) (29-12-2022)

- Added CHANGELOG (this file)

---

## [1.4.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.4.0) (28-12-2022)

- Updated [README](https://github.com/Decaded/NyaDB/commit/433826eae5e9ec4e23c21a18b7b39f477c05c4fb)
- Removed internal cache

---

## [1.3.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.3.0) (27-12-2022)

- Updated [README](https://github.com/Decaded/NyaDB/commit/d63e61e89f26c599a202a0da3f62b91172bc7951)
- Removed [unused function](https://github.com/Decaded/NyaDB/commit/6b58b12dcc1bf19fdad71eb22f9c572f99701785)
- Added [formatting while saving database to file](https://github.com/Decaded/NyaDB/commit/69f02485edafe0ad1e16760dc6047d348bbcf4c8)

---

## [1.2.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.2.0) (11-11-2022)

- Merged [pull request](https://github.com/Decaded/NyaDB/pull/1)
  - Added looped synchronized scheduler
    - Internal cache became depreciated

---

## [1.1.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.1.0) (04-08-2022)

- Added typings

---

## [1.0.6](https://www.npmjs.com/package/@decaded/nyadb/v/1.0.6) (31-07-2022)

- Increased internal cache refresh from 150ms to 500ms

---

## [1.0.5](https://www.npmjs.com/package/@decaded/nyadb/v/1.0.5) (29-07-2022)

- First public release
