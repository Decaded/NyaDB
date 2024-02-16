export default NyaDB;
declare class NyaDB {
    database: any;
    
    create(name: any): void;
    delete(name: any): void;
    set(name: any, data: any): void;
    get(name: any): any;
    getList(): string[];
}
