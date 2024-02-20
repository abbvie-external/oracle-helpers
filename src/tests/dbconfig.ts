import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { ConnectionAttributes } from 'oracledb';
import { Sql, raw, sql } from '../lib/sql.js';
import { isDBError } from '../lib/sqlHelpers.js';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

export const dbConfig: ConnectionAttributes = {
  connectString: process.env.NODE_ORACLEDB_CONNECTION_STRING,
  user: process.env.NODE_ORACLEDB_USER,
  password: process.env.NODE_ORACLEDB_PASSWORD,
};

export const ERR_NOT_EXIST = 942;

export function isNotExistError(error: unknown): boolean {
  return isDBError(error) && error.errorNum === ERR_NOT_EXIST;
}

export const getTable = (add: string) => sql`OH_TEST_BOOKS_${raw(add)}`;

export const getTableCreation = (table: Sql) => `CREATE TABLE ${table.sql}
(
  ID      NUMBER           NOT NULL,
  title   VARCHAR2(400)    NOT NULL,
  author  VARCHAR2(400)    NOT NULL,
  pages   INTEGER          NOT NULL,
  nullable DATE
)`;
// No point in keeping a test table around... PURGE IT
export const getDropTable = (table: Sql) => `DROP TABLE ${table.sql} PURGE`;
export interface Book {
  AUTHOR: string;
  TITLE: string;
  PAGES: number;
  ID: number;
  nullable?: string;
}
let id = 1;
// spell-checker:disable
export const seedBooks: Book[] = [
  {
    ID: ++id,
    TITLE: 'SQL Antipatterns',
    AUTHOR: 'Bill Karwin',
    PAGES: 328,
  },
  {
    ID: ++id,
    TITLE: 'SQL Performance Explained',
    AUTHOR: 'Markus Winand',
    PAGES: 204,
  },
  {
    ID: ++id,
    TITLE: 'Learning SQL',
    AUTHOR: 'Alan Beaulieu',
    PAGES: 289,
  },
  {
    ID: ++id,
    TITLE: 'SQL Cookbook',
    AUTHOR: 'Anthony Molinaro',
    PAGES: 636,
  },
];
export const extraBooks: Book[] = [
  {
    ID: ++id,
    TITLE: 'Good Omens',
    AUTHOR: 'Terry Pratchett & Neil Gaiman',
    PAGES: 288,
  },
  {
    ID: ++id,
    TITLE: 'Guards! Guards!',
    AUTHOR: 'Terry Pratchett',
    PAGES: 416,
  },
  {
    ID: ++id,
    TITLE: 'The Eye of the World',
    AUTHOR: 'Robert Jordan',
    PAGES: 784,
  },
];
// spell-checker:enable

export const allBooks = seedBooks.concat(extraBooks);
export const getSelectBooks = (table: Sql) =>
  sql`SELECT ID, TITLE, AUTHOR, PAGES FROM ${table}`;
export const getInsertBook = (table: Sql) =>
  sql`INSERT INTO ${table} (ID, TITLE, AUTHOR, PAGES) VALUES`;
