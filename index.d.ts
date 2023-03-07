export default NyaDB;
declare class NyaDB {
    database: any;
    createDatabase(name: any): void;
    deleteDatabase(name: any): void;
    setDatabase(name: any, data: any): void;
    getDatabase(name: any): any;
    getDatabaseList(): string[];

    create(name: any): void;
    delete(name: any): void;
    set(name: any, data: any): void;
    get(name: any): any;
    getList(): string[];
}
