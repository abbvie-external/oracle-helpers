import {
  BindParameters,
  getConnection,
  Pool,
  POOL_STATUS_OPEN,
} from 'oracledb';
import { createPool, getPoolConnection } from '../lib/pools';
import { join, sql } from '../lib/sql';
import {
  getSqlPool,
  mutateManySqlPool,
  mutateSqlPool,
} from '../lib/sqlHelpers';
import {
  allBooks,
  dbConfig,
  extraBooks,
  getDropTable,
  getInsertBook,
  getSelectBooks,
  getTable,
  getTableCreation,
  seedBooks,
} from './dbConfig';

const table = getTable('pools');
const insertBook = getInsertBook(table);
const selectBooks = getSelectBooks(table);
const dropTable = getDropTable(table);

describe('pools', () => {
  let pool: Pool;
  beforeAll(async () => {
    try {
      const connection = await getConnection(dbConfig);
      try {
        try {
          await connection.execute(dropTable);
        } catch (error) {
          // Ignore does not exist errors
          if (error.errorNum !== 942) {
            throw error;
          }
        }
        await connection.execute(getTableCreation(table));
        await connection.executeMany(
          `${insertBook.sql} (:ID, :TITLE, :AUTHOR, :PAGES)`,
          seedBooks as unknown as BindParameters[],
          { autoCommit: true },
        );
      } finally {
        await connection.close();
      }
    } catch (error) {
      console.error(`Failed Creating/Seeding ${table.sql}`);
      throw error;
    }
  });
  afterAll(async () => {
    try {
      await mutateSqlPool(dbConfig, dropTable);
    } finally {
      await pool.terminate();
    }
  });
  test('should create and get the same pool via the same config', async () => {
    const pools = await Promise.all([
      createPool(dbConfig, { poolMax: 1 }),
      createPool(dbConfig, { poolMax: 1 }),
    ]);
    expect(pools[0]).toBe(pools[1]);
    [pool] = pools;
    expect(pool.status).toBe(POOL_STATUS_OPEN);

    const pool2 = await createPool(dbConfig);
    try {
      expect(pool2).toBe(pool);
    } catch (error) {
      await pool2.terminate();
      throw error;
    }
  });
  test('should support connectionString as well as connectString', async () => {
    const { connectString, ...config } = dbConfig;
    const pool2 = await createPool({
      connectionString: connectString,
      ...config,
    });
    try {
      expect(pool2).toBe(pool);
    } catch (error) {
      await pool2.terminate();
      throw error;
    }
  });
  test('should allow creating a connection', async () => {
    const connection = await getPoolConnection(dbConfig);
    try {
      await connection.ping();
    } finally {
      await connection.close();
    }
  });
  test('should throw on creating a pool without a connectString', async () => {
    expect(createPool({ connectString: '' })).rejects.toThrow(
      new Error('Invalid Connection'),
    );
    expect(createPool({ connectionString: '' })).rejects.toThrow(
      new Error('Invalid Connection'),
    );
  });
  describe('getSqlPool', () => {
    test('Should work through a pool', async () => {
      await expect(getSqlPool(dbConfig, selectBooks)).resolves.toEqual(
        seedBooks,
      );
    });
  });
  describe('mutateManySqlPool', () => {
    test('Should work through a pool', async () => {
      const query = sql`${insertBook}
        (${extraBooks.map(({ ID }) => ID)},
         ${extraBooks.map(({ TITLE }) => TITLE)},
         ${extraBooks.map(({ AUTHOR }) => AUTHOR)},
         ${extraBooks.map(({ PAGES }) => PAGES)})`;
      const result = await mutateManySqlPool<{ id: [number]; title: [string] }>(
        dbConfig,
        query,
      );
      expect(result.rowsAffected).toBe(extraBooks.length);
      expect(await getSqlPool(dbConfig, selectBooks)).toEqual(allBooks);
      const deletion = await mutateSqlPool(
        dbConfig,
        sql`DELETE FROM ${table} WHERE ID in (${join(
          extraBooks.map(({ ID }) => ID),
        )})`,
      );
      expect(deletion.rowsAffected).toBe(extraBooks.length);
    });
  });
});
