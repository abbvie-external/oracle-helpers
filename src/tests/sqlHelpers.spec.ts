import {
  BindParameters,
  BIND_OUT,
  Connection,
  getConnection,
  NUMBER,
  STRING,
} from 'oracledb';
import { getSql, join, mutateManySql, mutateSql, sql, toBindDefs } from '../';
import {
  Book,
  dbConfig,
  dropTable,
  extraBooks,
  insertBook,
  seedBooks,
  selectBooks,
  table,
} from './dbconfig';

// setSqlErrorLogger((error, sql, params) => {
//   console.error(error, sql, params);
// });
let connection: Connection;
describe('sqlHelpers', () => {
  beforeAll(async () => {
    connection = await getConnection(dbConfig);
    try {
      await connection.execute(dropTable);
    } catch (error) {
      // Ignore does not exist errors
      if (error.errorNum !== 942) {
        throw error;
      }
    }
    await connection.execute(`CREATE TABLE ${table.sql}
      (
        ID      NUMBER           NOT NULL,
        title   VARCHAR2(400)    NOT NULL,
        author  VARCHAR2(400)    NOT NULL,
        pages   INTEGER          NOT NULL
      )`);
    await connection.executeMany(
      `INSERT INTO ${table.sql} (ID, TITLE, AUTHOR, PAGES)
                                                 VALUES (:ID, :TITLE, :AUTHOR, :PAGES)`,
      seedBooks as unknown as BindParameters[],
      { autoCommit: true },
    );
  });
  afterAll(async () => {
    // try {
    //   await connection.execute(dropTable);
    // } catch (error) {
    //   if (error.errorNum !== 942) {
    //     throw error;
    //   }
    // } finally {
    // }
    await connection.close();
  });
  describe('getSql', () => {
    test('Should throw an error when config is undefined', async () => {
      await expect(getSql(undefined as Connection, '')).rejects.toThrow(
        new TypeError('ConfigOrConnection must be defined'),
      );
    });
    test('Should retrieve an array', async () => {
      const result = await getSql<Book>(connection, selectBooks);
      expect(result).toEqual(seedBooks);
    });
    test('Should work without sql templates', async () => {
      await expect(
        getSql(connection, `${selectBooks.sql} where id = :id`, {
          id: seedBooks[0].ID,
        }),
      ).resolves.toEqual([seedBooks[0]]);
    });
    test('Should support connectionString in addition to connectString', async () => {
      const { connectString, ...config } = dbConfig;
      const newConfig = { ...config, connectionString: connectString };
      const result = await getSql<Book>(newConfig, selectBooks);
      expect(result).toEqual(seedBooks);
    });
    test('Should call the callback for each item', async () => {
      const books: Book[] = [];
      await getSql<Book>(connection, selectBooks, {}, (book) => {
        books.push(book);
      });
      expect(books).toEqual(seedBooks);
    });
    test('Should successfully use a new connection when passed config', async () => {
      const result = await getSql<Book>(dbConfig, selectBooks);
      expect(result).toEqual(seedBooks);
    });
    test('Should successfully bind a value', async () => {
      const seedBook = seedBooks[1];
      expect(
        await getSql<Book>(
          connection,
          sql`${selectBooks} WHERE ID = ${seedBook.ID}`,
        ),
      ).toEqual([seedBook]);
    });
    test('Should prevent sql injection', async () => {
      const injection = `' OR ''='`;
      const results = await getSql(
        connection,
        sql`${selectBooks} WHERE TITLE = ${injection}`,
      );
      expect(results).toHaveLength(0);
    });
    test('Should error when attempting to bind arrays', async () => {
      await expect(
        getSql(
          connection,
          sql`${selectBooks} WHERE ID = ${seedBooks.map(({ ID }) => ID)}`,
        ),
      ).rejects.toThrow(new TypeError('Cannot bind array values in getSql'));
    });
    test("Should release the connection on error if there's an error", async () => {
      // Note: It's nearly impossible to actually determine if the connection that was created in
      // the function was *infact* released, it'll show in the code coverage...
      await expect(getSql(dbConfig, '')).rejects.toThrow(
        'ORA-24373: invalid length specified for statement',
      );
    });
  });
  describe('mutateSql', () => {
    test('Should allow updating a row', async () => {
      const book = { ...seedBooks[3] };
      book.TITLE = 'Sequel Cookbook';
      const result = await mutateSql(
        connection,
        sql`Update ${table} set TITLE= ${book.TITLE} WHERE ID = ${book.ID}`,
      );
      expect(result.rowsAffected).toBe(1);
      const books = await getSql(connection, sql`${selectBooks}`);
      expect(books).toEqual(
        seedBooks.map((seed) => (seed.ID === book.ID ? book : seed)),
      );
      await connection.rollback();
    });
    test('Should auto commit when using a dbConfig', async () => {
      const book = extraBooks[0];
      const insertion = await mutateSql(
        dbConfig,
        sql`${insertBook}
                  (${book.ID}, ${book.TITLE}, ${book.AUTHOR}, ${book.PAGES})`,
      );
      expect(insertion.rowsAffected).toBe(1);
      const [newBook] = await getSql(
        connection,
        sql`${selectBooks} WHERE ID = ${book.ID}`,
      );
      expect(newBook).toEqual(book);
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} WHERE ID = ${book.ID}`,
        { autoCommit: true },
      );
      expect(deletion.rowsAffected).toEqual(1);
    });
    test('Should not auto commit when using a connection', async () => {
      const book = extraBooks[0];
      const insertion = await mutateSql(
        connection,
        sql`${insertBook}
          (${book.ID}, ${book.TITLE}, ${book.AUTHOR}, ${book.PAGES})`,
      );
      expect(insertion.rowsAffected).toBe(1);
      connection.rollback();
      const books = await getSql(
        connection,
        sql`${selectBooks} WHERE ID = ${book.ID}`,
      );
      expect(books).toHaveLength(0);
    });
    test('Should support dynamic PL/SQL', async () => {
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
      expect(newBooks).toEqual(extraBooks);
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} ${whereClause}`,
      );
      expect(deletion.rowsAffected).toBe(extraBooks.length);
    });
    test('Should error when attempting to bind arrays', async () => {
      await expect(
        getSql(
          connection,
          sql`${selectBooks} WHERE ID = ${seedBooks.map(({ ID }) => ID)}`,
        ),
      ).rejects.toThrow(new TypeError('Cannot bind array values in getSql'));
    });
    test("Should release the connection on error if there's an error", async () => {
      // Note: It's nearly impossible to actually determine if the connection that was created in
      // the function was *infact* released, it'll show in the code coverage...
      await expect(getSql(dbConfig, '')).rejects.toThrow(
        'ORA-24373: invalid length specified for statement',
      );
    });
  });
  describe('mutateManySql', () => {
    test('Should insert many rows and retrieve the IDs', async () => {
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
      expect(result.rowsAffected).toBe(extraBooks.length);
      expect(result.outBinds).toHaveLength(extraBooks.length);
      expect(result.outBinds).toEqual(
        extraBooks.map(({ ID, TITLE }) => ({ id: [ID], title: [TITLE] })),
      );
      const deletion = await mutateSql(
        connection,
        sql`DELETE FROM ${table} WHERE ID in (${join(
          extraBooks.map(({ ID }) => ID),
        )})`,
      );
      expect(deletion.rowsAffected).toBe(extraBooks.length);
    });
  });
});
