declare module '*.sql' {
  const content: string;
  export default content;
}

declare module 'node:sqlite' {
  export interface StatementSync {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): Record<string, unknown> | undefined;
    all(...params: unknown[]): Record<string, unknown>[];
  }

  export class DatabaseSync {
    constructor(path: string);
    prepare(sql: string): StatementSync;
    exec(sql: string): void;
    close(): void;
  }
}