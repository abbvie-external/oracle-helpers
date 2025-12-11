import test, { after, before, describe } from 'node:test';
import type { BindParameters, Connection } from 'oracledb';
import OracleDB from 'oracledb';
import { Value, join, sql } from '../lib/sql.js';
import {
  Logger,
  getSql,
  isDBError,
  mutateManySql,
  mutateSql,
  setSqlErrorLogger,
} from '../lib/sqlHelpers.js';
import { toBindDefs } from '../lib/toBindDefs.js';
import {
  Book,
  dbConfig,
  extraBooks,
  getDropTable,
  getInsertBook,
  getSelectBooks,
  getTable,
  getTableCreation,
  isNotExistError,
  seedBooks,
} from './dbconfig.js';

const { BIND_OUT, NUMBER, STRING, getConnection } = OracleDB;

const table = getTable('main');
const insertBook = getInsertBook(table);
const selectBooks = getSelectBooks(table);
const dropTable = getDropTable(table);
// setSqlErrorLogger((error, sql, params) => {
//   console.error(error, sql, params);
// });
let connection: Connection;
describe('sqlHelpers', () => {
  before(async () => {
    try {
      connection = await getConnection(dbConfig);
      try {
        await connection.execute(dropTable);
      } catch (error) {
        // Ignore does not exist errors
        if (!isNotExistError(error)) {
          throw error;
        }
      }
      await connection.execute(getTableCreation(table));
      await connection.executeMany(
        `${insertBook.sql} (:ID, :TITLE, :AUTHOR, :PAGES)`,
        seedBooks as unknown as BindParameters[],
        { autoCommit: true },
      );
    } catch (error) {
      console.error(`Failed Creating/Seeding ${table.sql}`);
      throw error;
    }
  });
  after(async () => {
    try {
      await connection.execute(dropTable);
    } catch (error) {
      if (!isNotExistError(error)) {
        throw error;
      }
    } finally {
      await connection.close();
    }
  });
  describe('isDBError', () => {
    test('Should return true for an Oracle error', async (t: test.TestContext) => {
      try {
        await getSql(connection, sql`select '5' from dual where fish = ${0}`);
      } catch (error) {
        t.assert.equal(isDBError(error), true);
      }
    });
  });
  describe('getSql', () => {
    test('Should throw an error when config is undefined', async (t: test.TestContext) => {
      await t.assert.rejects(
        getSql(undefined as unknown as Connection, ''),
        new TypeError('ConfigOrConnection must be defined'),
      );
    });
    test("Should log when there's an error", async (t: test.TestContext) => {
      const logger = t.mock.fn<Logger>();
      setSqlErrorLogger(logger);
      const query = sql`select '5' from dual where fish = ${0}`;
      let errorObj: Error | undefined;
      await t.assert.rejects(async () => {
        try {
          await getSql(connection, query);
        } catch (error) {
          if (error instanceof Error) {
            errorObj = error;
          }
          throw error;
        }
      });
      t.assert.equal(logger.mock.callCount(), 1);
      t.assert.deepEqual(logger.mock.calls[0].arguments, [
        errorObj,
        query.sql,
        query.values,
      ]);

      setSqlErrorLogger(undefined);
    });
    test('Should retrieve an array', async (t: test.TestContext) => {
      const result = await getSql<Book>(connection, selectBooks);
      t.assert.deepEqual(result, seedBooks);
    });
    test('Should work without sql templates', async (t: test.TestContext) => {
      t.assert.deepEqual(
        await getSql(connection, `${selectBooks.sql} where id = :id`, {
          id: seedBooks[0].ID,
        }),
        [seedBooks[0]],
      );
    });
    test('Should support connectionString in addition to connectString', async (t: test.TestContext) => {
      const { connectString, ...config } = dbConfig;
      const newConfig = { ...config, connectionString: connectString };
      const result = await getSql<Book>(newConfig, selectBooks);
      t.assert.deepEqual(result, seedBooks);
    });
    test('Should call the callback for each item', async (t: test.TestContext) => {
      const books: Book[] = [];
      await getSql<Book>(connection, selectBooks, {}, (book) => {
        books.push(book);
      });
      t.assert.deepEqual(books, seedBooks);
    });
    test('Should successfully use a new connection when passed config', async (t: test.TestContext) => {
      const result = await getSql<Book>(dbConfig, selectBooks);
      t.assert.deepEqual(result, seedBooks);
    });
    test('Should successfully bind a value', async (t: test.TestContext) => {
      const seedBook = seedBooks[1];
      t.assert.deepEqual(
        await getSql<Book>(
          connection,
          sql`${selectBooks} WHERE ID = ${seedBook.ID}`,
        ),
        [seedBook],
      );
    });
    test('Should prevent sql injection', async (t: test.TestContext) => {
      const injection = `' OR ''='`;
      const results = await getSql(
        connection,
        sql`${selectBooks} WHERE TITLE = ${injection}`,
      );
      t.assert.deepEqual(results, []);
    });
    test('Should error when attempting to bind arrays', async (t: test.TestContext) => {
      await t.assert.rejects(
        getSql(
          connection,
          sql`${selectBooks} WHERE ID = ${seedBooks.map(({ ID }) => ID)}`,
        ),

        new TypeError('Cannot bind array values outside mutateManySql'),
      );
    });
    test("Should release the connection on error if there's an error", async (t: test.TestContext) => {
      // Note: It's nearly impossible to actually determine if the connection that was created in
      // the function was *in fact* released, it'll show in the code coverage...
      await t.assert.rejects(getSql(dbConfig, ''), /(ORA|NJS)-/);
    });
  });
  describe('mutateSql', () => {
    test('Should throw when sending an array binding parameter', async (t: test.TestContext) => {
      await t.assert.rejects(
        mutateSql(connection, '', [] as BindParameters[]),

        new TypeError('Cannot bind array values outside mutateManySql'),
      );
    });
    test("Should log when there's an error", async (t: test.TestContext) => {
      const logger = test.mock.fn<Logger>();
      setSqlErrorLogger(logger);
      const query = sql`select '5' from dual where fish = ${0}`;
      let errorObj: Error | undefined;
      await t.assert.rejects(async () => {
        try {
          await mutateSql(connection, query);
        } catch (error) {
          if (error instanceof Error) {
            errorObj = error;
          }
          throw error;
        }
      });

      t.assert.equal(logger.mock.callCount(), 1);
      t.assert.deepEqual(logger.mock.calls[0].arguments, [
        errorObj,
        query.sql,
        query.values,
      ]);

      setSqlErrorLogger(undefined);
    });
    test('Should allow updating a row', async (t: test.TestContext) => {
      const book = { ...seedBooks[3] };
      book.TITLE = 'Sequel Cookbook';
      const result = await mutateSql(
        connection,
        sql`Update ${table} set TITLE= ${book.TITLE} WHERE ID = ${book.ID}`,
      );
      t.assert.equal(result.rowsAffected, 1);
      const books = await getSql(connection, sql`${selectBooks}`);
      t.assert.deepEqual(
        books,
        seedBooks.map((seed) => (seed.ID === book.ID ? book : seed)),
      );
      await connection.rollback();
    });
    test('Should auto commit when using a dbConfig', async (t: test.TestContext) => {
      const book = extraBooks[0];
      const insertion = await mutateSql(
        dbConfig,
        sql`${insertBook}
                  (${book.ID}, ${book.TITLE}, ${book.AUTHOR}, ${book.PAGES})`,
      );
      t.assert.equal(insertion.rowsAffected, 1);
      const [newBook] = await getSql(
        connection,
        sql`${selectBooks} WHERE ID = ${book.ID}`,
      );
      t.assert.deepEqual(newBook, book);
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} WHERE ID = ${book.ID}`,
        { autoCommit: true },
      );
      t.assert.deepEqual(deletion.rowsAffected, 1);
    });
    test('Should not auto commit when using a connection', async (t: test.TestContext) => {
      const book = extraBooks[0];
      const insertion = await mutateSql(
        connection,
        sql`${insertBook}
          (${book.ID}, ${book.TITLE}, ${book.AUTHOR}, ${book.PAGES})`,
      );
      t.assert.equal(insertion.rowsAffected, 1);
      connection.rollback();
      const books = await getSql(
        connection,
        sql`${selectBooks} WHERE ID = ${book.ID}`,
      );
      t.assert.deepEqual(books, []);
    });
    test('Should support dynamic PL/SQL', async (t: test.TestContext) => {
      const query = sql`BEGIN
          ${join(
            extraBooks.map(
              ({ ID, TITLE, AUTHOR, PAGES }) =>
                sql`${insertBook} (${ID},${TITLE},${AUTHOR},${PAGES});`,
            ),
            '\n',
          )}
        END;
        `;
      await mutateSql(connection, query, { autoCommit: true });
      const whereClause = sql`WHERE ID in (${join(
        extraBooks.map(({ ID }) => ID),
      )})`;
      const newBooks = await getSql(
        connection,
        sql`${selectBooks} ${whereClause}`,
      );
      t.assert.deepEqual(newBooks, extraBooks);
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} ${whereClause}`,
      );
      t.assert.equal(deletion.rowsAffected, extraBooks.length);
    });
    test('Should error when attempting to bind arrays', async (t: test.TestContext) => {
      await t.assert.rejects(
        getSql(
          connection,
          sql`${selectBooks} WHERE ID = ${seedBooks.map(({ ID }) => ID)}`,
        ),

        new TypeError('Cannot bind array values outside mutateManySql'),
      );
    });
    test("Should release the connection on error if there's an error", async (t: test.TestContext) => {
      // Note: It's nearly impossible to actually determine if the connection that was created in
      // the function was *in fact* released, it'll show in the code coverage...
      await t.assert.rejects(getSql(dbConfig, ''), /(ORA|NJS)-/);
    });
  });
  describe('mutateManySql', () => {
    test('Should throw when sending a non-array parameter', async (t: test.TestContext) => {
      await t.assert.rejects(
        mutateManySql(connection, '', {} as BindParameters[]),

        new TypeError('Must bind array values in mutateManySql'),
      );
    });
    test("Should log when there's an error", async (t: test.TestContext) => {
      const logger = t.mock.fn<Logger>();
      setSqlErrorLogger(logger);
      const query = sql`select '5' from dual where fish = ${[0]}`;
      let errorObj: Error | undefined;
      await t.assert.rejects(async () => {
        try {
          await mutateManySql(connection, query);
        } catch (error) {
          if (error instanceof Error) {
            errorObj = error;
          }
          throw error;
        }
      });

      t.assert.equal(logger.mock.callCount(), 1);
      t.assert.deepEqual(logger.mock.calls[0].arguments, [
        errorObj,
        query.sql,
        query.values,
      ]);

      setSqlErrorLogger(undefined);
    });
    test('Should insert many rows and retrieve the IDs', async (t: test.TestContext) => {
      const query = sql`${insertBook}
      (${extraBooks.map(({ ID }) => ID)},
       ${extraBooks.map(({ TITLE }) => TITLE)},
       ${extraBooks.map(({ AUTHOR }) => AUTHOR)},
       ${extraBooks.map(({ PAGES }) => PAGES)})
       RETURNING ID, TITLE into :id, :title`;
      const result = await mutateManySql<{ id: [number]; title: [string] }>(
        connection,
        query,
        {
          bindDefs: toBindDefs(query.values, {
            id: { type: NUMBER, dir: BIND_OUT },
            title: { type: STRING, dir: BIND_OUT, maxSize: 400 },
          }),
          autoCommit: true,
        },
      );
      t.assert.equal(result.rowsAffected, extraBooks.length);
      t.assert.equal(result.outBinds?.length, extraBooks.length);
      t.assert.deepEqual(
        result.outBinds,
        extraBooks.map(({ ID, TITLE }) => ({ id: [ID], title: [TITLE] })),
      );
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} WHERE ID in (${join(
          extraBooks.map(({ ID }) => ID),
        )})`,
      );
      t.assert.equal(deletion.rowsAffected, extraBooks.length);
    });
    test('Should insert many rows and retrieve the IDs without the template tag', async (t: test.TestContext) => {
      const result = await mutateManySql<{ id: number; title: string }>(
        dbConfig,
        `${insertBook.sql} (:ID, :TITLE, :AUTHOR, :PAGES)
              RETURNING ID, TITLE into :idOut, :titleOut`,
        extraBooks as unknown as BindParameters[],
        {
          bindDefs: toBindDefs(
            extraBooks as unknown as Record<string, Value>[],
            {
              // Oracle bind parameters aren't case sensitive
              idOut: { type: NUMBER, dir: BIND_OUT },
              titleOut: { type: STRING, dir: BIND_OUT, maxSize: 400 },
            },
          ),
        },
      );
      t.assert.equal(result.rowsAffected, extraBooks.length);
      t.assert.equal(result.outBinds?.length, extraBooks.length);
      t.assert.deepEqual(
        result.outBinds,
        extraBooks.map(({ ID, TITLE }) => ({ idOut: [ID], titleOut: [TITLE] })),
      );
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} WHERE ID in (${join(
          extraBooks.map(({ ID }) => ID),
        )})`,
      );
      t.assert.equal(deletion.rowsAffected, extraBooks.length);
    });
    test('should insert row data when using toBindDefs with nulls', async (t: test.TestContext) => {
      const rows: Book[] = [
        {
          AUTHOR: 'test',
          ID: 20,
          PAGES: 5,
          TITLE: 'test',
          nullable: undefined,
        },
      ];
      const mutation = sql`insert into ${table}
      (ID, TITLE, AUTHOR, PAGES, NULLABLE) VALUES (${rows.map(
        (book) => book.ID,
      )}, ${rows.map((book) => book.TITLE)}, ${rows.map(
        (book) => book.AUTHOR,
      )}, ${rows.map((book) => book.PAGES)}, ${rows.map(
        (book) => book.nullable ?? null,
      )})`;
      const bindDefs = toBindDefs(mutation.values);
      const result = await mutateManySql(connection, mutation, { bindDefs });
      t.assert.equal(result.rowsAffected, rows.length);
      await connection.rollback();
    });
  });
});
