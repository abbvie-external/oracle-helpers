import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { ConnectionAttributes } from 'oracledb';
import { sql } from '..';
import { raw, Sql } from '../lib/sql';

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

export const dbConfig: ConnectionAttributes = {
  connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING,
  user: process.env.NODE_ORACLEDB_USER,
  password: process.env.NODE_ORACLEDB_PASSWORD,
};

export const getTable = (add: string) => sql`OH_TEST_BOOKS_${raw(add)}`;

export const getTableCreation = (table: Sql) => `CREATE TABLE ${table.sql}
(
  ID      NUMBER           NOT NULL,
  title   VARCHAR2(400)    NOT NULL,
  author  VARCHAR2(400)    NOT NULL,
  pages   INTEGER          NOT NULL
)`;
// No point in keeping a test table around... PURGE IT
export const getDropTable = (table: Sql) => `DROP TABLE ${table.sql} PURGE`;
export interface Book {
  AUTHOR: string;
  TITLE: string;
  PAGES: number;
  ID: number;
}
let id = 1;
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
export const allBooks = seedBooks.concat(extraBooks);
export const getSelectBooks = (table: Sql) => sql`SELECT * FROM ${table}`;
export const getInsertBook = (table: Sql) =>
  sql`INSERT INTO ${table} (ID, TITLE, AUTHOR, PAGES) VALUES`;
