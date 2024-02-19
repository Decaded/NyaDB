const { existsSync, writeFileSync, unlinkSync } = require('fs');
const config = require('./config');

module.exports = function customConfig(data) {
	// Path to the custom configuration file
	const customConfigPath = './' + config.storage.databaseFolderName + '/' + config.storage.customConfigFile;

	try {
		if (data === undefined || Object.keys(data).length === 0) {
			// If data is undefined or empty, delete custom.json file if it exists
			if (existsSync(customConfigPath)) {
				unlinkSync(customConfigPath);
			}
		} else {
			// Write data to custom.json file
			writeFileSync(customConfigPath, JSON.stringify(data, null, '\t'), { encoding: 'utf8' });
		}
	} catch (error) {
		console.error('NyaDB: Error updating custom configuration file:', error);
	}
};
