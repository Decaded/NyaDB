const fs = require('fs');
const path = require('path');

/**
 * Merges two JSON objects recursively.
 * @param {object} defaultConfig - The default configuration object.
 * @param {object} customConfig - The custom configuration object.
 * @returns {object} - The merged configuration object.
 */
function mergeConfigs(defaultConfig, customConfig) {
	const mergedConfig = JSON.parse(JSON.stringify(defaultConfig));

	Object.keys(customConfig).forEach(key => {
		if (typeof customConfig[key] === 'object' && typeof defaultConfig[key] === 'object') {
			mergedConfig[key] = mergeConfigs(defaultConfig[key], customConfig[key]);
		} else {
			mergedConfig[key] = customConfig[key];
		}
	});

	return mergedConfig;
}

/**
 * Loads and parses a JSON file.
 * @param {string} filePath - The path to the JSON file.
 * @returns {object} - The parsed JSON object.
 */
function loadJsonFile(filePath) {
	const fileContent = fs.readFileSync(filePath, 'utf8');
	return JSON.parse(fileContent);
}

// Path to the configuration files
const defaultConfigPath = path.join(__dirname, 'default.json');
const customConfigPath = path.join(__dirname, 'custom.json');

let config;

// Check if custom.json exists
if (fs.existsSync(customConfigPath)) {
	// Load default and custom configurations
	const defaultConfig = loadJsonFile(defaultConfigPath);
	const customConfig = loadJsonFile(customConfigPath);

	// Merge configurations
	config = mergeConfigs(defaultConfig, customConfig);
} else {
	// Load only the default configuration
	config = loadJsonFile(defaultConfigPath);
}

// Export the configuration object
module.exports = config;
