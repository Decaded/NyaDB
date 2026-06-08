const { createConfig, resetConfig } = require('./manager');

/**
 * Validates and dynamically updates the configuration without saving to a file.
 * @param {object} data - The custom configuration data.
 * @throws {Error} - If the configuration is invalid.
 */
module.exports = function customConfig(data) {
	if (!data || Object.keys(data).length === 0) {
		return resetConfig();
	}

	validateConfig(data, false, false);
	const nextConfig = createConfig(data);
	validateConfig(nextConfig, true, true);
	return resetConfig(data);
};

/**
 * Validates the configuration data.
 * @param {object} data - The configuration data to validate.
 * @throws {Error} - If the configuration is invalid.
 */
function validateConfig(data, allowStorage = false, validateRelationships = true) {
	const allowedProperties = {
		formattingEnabled: { type: 'boolean' },
		formattingStyle: { type: 'string', enum: ['tab', 'space'] },
		indentSize: { type: 'number', minimum: 0 },
		encoding: { type: 'string' },
		enableConsoleLogs: { type: 'boolean' },
		validateInput: { type: 'boolean' },
		useAtomicWrites: { type: 'boolean' },
		maxFileSize: { type: 'number', minimum: 1 },
		writeDebounce: { type: 'number', minimum: 0 },
		logLevel: { type: 'string', enum: ['error', 'warn', 'info', 'debug'] },
	};

	for (const key in data) {
		if (Object.prototype.hasOwnProperty.call(data, key)) {
			if (key === 'storage' && allowStorage === true) {
				continue;
			}

			if (!Object.prototype.hasOwnProperty.call(allowedProperties, key)) {
				throw new Error(`Invalid configuration: ${key} is not allowed.`);
			}

			const { type, enum: allowedValues, minimum } = allowedProperties[key];
			const value = data[key];

			if (typeof value !== type) {
				throw new Error(`Invalid configuration: ${key} should be of type ${type}.`);
			}

			if (allowedValues && !allowedValues.includes(value)) {
				throw new Error(`Invalid configuration: ${key} should be one of ${allowedValues.join(', ')}.`);
			}

			if (minimum !== undefined && value < minimum) {
				throw new Error(`Invalid configuration: ${key} should be greater than or equal to ${minimum}.`);
			}

		}
	}

	if (Object.prototype.hasOwnProperty.call(data, 'storage') && allowStorage !== true) {
		throw new Error('Invalid configuration: "storage" setting cannot be modified.');
	}

	if (validateRelationships && data.useAtomicWrites === true && data.validateInput !== true) {
		throw new Error('Invalid configuration: useAtomicWrites requires validateInput to be enabled.');
	}
}
