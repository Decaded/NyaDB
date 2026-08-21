import NyaDB = require('../index');

const database = new NyaDB({
	maxFileSize: 0,
	writeDebounce: 10,
});

const size: NyaDB.DatabaseSize | NyaDB.MultipleDatabaseSize | null = database.size();
const status: NyaDB.DatabaseSizeStatus | NyaDB.MultipleDatabaseSizeStatus | null = database.sizeStatus();
const lastError: Error | null = database.getLastError();

void size;
void status;
void lastError;
