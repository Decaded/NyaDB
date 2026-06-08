const { existsSync, readFileSync } = require('fs');
const path = require('path');

function mergeConfigs(defaultConfig, customConfig) {
	const mergedConfig = { ...defaultConfig };

	for (const key in customConfig) {
		if (typeof customConfig[key] === 'object' && customConfig[key] !== null && typeof defaultConfig[key] === 'object' && defaultConfig[key] !== null) {
			mergedConfig[key] = mergeConfigs(defaultConfig[key], customConfig[key]);
		} else {
			mergedConfig[key] = customConfig[key];
		}
	}

	return mergedConfig;
}

function loadJsonFile(filePath) {
	try {
		const fileContent = readFileSync(filePath, 'utf8');
		return JSON.parse(fileContent);
	} catch (error) {
		console.error(`Error loading JSON file '${filePath}':`, error);
		return {};
	}
}

function cloneConfig(data) {
	return JSON.parse(JSON.stringify(data));
}

const defaultConfigPath = path.join(__dirname, 'default.json');
const defaultConfig = loadJsonFile(defaultConfigPath);

let baseConfig = defaultConfig;
const customConfigPath = path.join('./', defaultConfig.storage.databaseFolderName, 'custom.json');
if (existsSync(customConfigPath)) {
	const customConfig = loadJsonFile(customConfigPath);
	baseConfig = mergeConfigs(defaultConfig, customConfig);
}

const config = cloneConfig(baseConfig);

function createConfig(overrides) {
	return mergeConfigs(cloneConfig(baseConfig), overrides || {});
}

function resetConfig(overrides) {
	const nextConfig = createConfig(overrides);

	for (const key of Object.keys(config)) {
		delete config[key];
	}

	Object.assign(config, nextConfig);
	return config;
}

module.exports = {
	config,
	createConfig,
	resetConfig,
};
