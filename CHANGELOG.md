# Change Log

All notable changes to the project will be documented in this file.

---

## [2.0](#) (Release Date TBD)

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

- Removed `createDatabase`, `deleteDatabase`, `setDatabase`, `getDatabase`, and `getDatabaseList` functions as they were no longer needed and were deprecated in version [1.5.0](#150)
- Removed dependency on [json-format](https://www.npmjs.com/package/json-format)

---

## [1.6.0](https://www.npmjs.com/package/@decaded/nyadb/v/1.6.0) (11-07-2023)

- [fix: CVE-2023-26115](https://security.snyk.io/vuln/SNYK-JS-WORDWRAP-3149973)
  - by replacing [word-warp](https://www.npmjs.com/package/word-wrap) unmaintained repo with [word-warp fork by aashutoshrathi](https://github.com/aashutoshrathi/word-wrap)

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
