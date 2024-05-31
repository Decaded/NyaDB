const { existsSync, readFileSync } = require('fs');
const path = require('path');

/**
 * Merges two JSON objects recursively.
 * @param {object} defaultConfig - The default configuration object.
 * @param {object} customConfig - The custom configuration object.
 * @returns {object} - The merged configuration object.
 */
function mergeConfigs(defaultConfig, customConfig) {
	const mergedConfig = { ...defaultConfig };

	for (const key in customConfig) {
		if (typeof customConfig[key] === 'object' && typeof defaultConfig[key] === 'object') {
			mergedConfig[key] = mergeConfigs(defaultConfig[key], customConfig[key]);
		} else {
			mergedConfig[key] = customConfig[key];
		}
	}

	return mergedConfig;
}

/**
 * Loads and parses a JSON file.
 * @param {string} filePath - The path to the JSON file.
 * @returns {object} - The parsed JSON object.
 */
function loadJsonFile(filePath) {
	try {
		const fileContent = readFileSync(filePath, 'utf8');
		return JSON.parse(fileContent);
	} catch (error) {
		console.error(`Error loading JSON file '${filePath}':`, error);
		return {};
	}
}

// Path to the configuration files
const defaultConfigPath = path.join(__dirname, 'default.json');

// Load default configuration
const defaultConfig = loadJsonFile(defaultConfigPath);

let config = defaultConfig;

// Check if custom.json exists and merge configurations if available
const customConfigPath = path.join('./', defaultConfig.storage.databaseFolderName, 'custom.json');
if (existsSync(customConfigPath)) {
	const customConfig = loadJsonFile(customConfigPath);
	config = mergeConfigs(defaultConfig, customConfig);
}

// Export the configuration object
module.exports = config;
