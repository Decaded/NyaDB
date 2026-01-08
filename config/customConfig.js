const config = require('./config');

/**
 * Validates and dynamically updates the configuration without saving to a file.
 * @param {object} data - The custom configuration data.
 * @throws {Error} - If the configuration is invalid.
 */
module.exports = function customConfig(data) {
	if (!data || Object.keys(data).length === 0) {
		// Early return if no data provided
		return;
	}

	validateConfig(data);

	Object.assign(config, data);
};

/**
 * Validates the configuration data.
 * @param {object} data - The configuration data to validate.
 * @throws {Error} - If the configuration is invalid.
 */
function validateConfig(data) {
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
		if (data.hasOwnProperty(key)) {
			if (!allowedProperties.hasOwnProperty(key)) {
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

			if (data.useAtomicWrites === true && data.validateInput !== true) {
				throw new Error('Invalid configuration: useAtomicWrites requires validateInput to be enabled.');
			}
		}
	}

	if (data.hasOwnProperty('storage')) {
		throw new Error('Invalid configuration: "storage" setting cannot be modified.');
	}
}
