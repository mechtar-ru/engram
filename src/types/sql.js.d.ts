/**
 * Minimal type shim for sql.js. The upstream package ships no types;
 * the official @types/sql.js is outdated. We use a tiny surface area
 * so a typed shim is cheap.
 */
declare module "sql.js" {
  export interface Statement {
    bind(params: unknown[]): boolean;
    step(): boolean;
    get(): unknown[];
    getAsObject(): Record<string, unknown>;
    free(): boolean;
    reset(): boolean;
  }

  export interface Database {
    run(sql: string, params?: unknown[]): Database;
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | ArrayBuffer) => Database;
  }

  export interface InitSqlJsStaticConfig {
    locateFile?: (filename: string, prefix: string) => string;
  }

  const initSqlJs: (
    config?: InitSqlJsStaticConfig
  ) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
