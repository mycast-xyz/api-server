export interface DatabaseModel {
    query(query: string, args: any): Promise<any>;
}
