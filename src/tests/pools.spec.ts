/* eslint-disable @typescript-eslint/no-empty-function */
import {
  BindParameters,
  ConnectionAttributes,
  getConnection,
  POOL_STATUS_OPEN,
} from 'oracledb';
import {
  closePools,
  createPool,
  getPool,
  getPoolConnection,
  getPoolDefaults,
  setPoolDefaults,
  PoolOptions,
} from '../lib/pools';
import { join, sql } from '../lib/sql';
import {
  getSqlPool,
  mutateManySqlPool,
  mutateSql,
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

async function seedDatabase() {
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
}

describe('pools', () => {
  afterAll(async () => {
    try {
      await mutateSql(dbConfig, dropTable);
    } catch (err) {
      // Ignore does not exist errors
      if (err.errorNum !== 942) {
        throw err;
      }
    } finally {
      await closePools(0);
    }
  });
  describe('base', () => {
    afterEach(async () => {
      await closePools(0);
    });
    test('should create and get the same pool via the same config', async () => {
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'sameConfig',
      };
      const pools = await Promise.all([
        createPool(aliasedConfig, { poolMax: 1 }),
        createPool(aliasedConfig, { poolMax: 1 }),
      ]);
      expect(pools[0]).toBe(pools[1]);
      const [pool] = pools;
      expect(pool.status).toBe(POOL_STATUS_OPEN);
      expect(pool.poolMax).toBe(1);
      expect(pool.poolAlias).toBe(aliasedConfig.poolAlias);

      const pool2 = await createPool(aliasedConfig);
      expect(pool2).toBe(pool);
    });
    test('should support connectionString as well as connectString', async () => {
      const { connectString, ...config } = dbConfig;
      const pool = await createPool(dbConfig);
      const pool2 = await createPool({
        connectionString: connectString,
        ...config,
      });
      expect(pool2).toBe(pool);
    });
    test('setPoolDefaults should work', async () => {
      const options: PoolOptions = { poolMax: 1 };
      setPoolDefaults(dbConfig, options);
      expect(getPoolDefaults(dbConfig)).toEqual(options);
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'aliasedConfig',
      };
      const aliasedOptions: PoolOptions = { poolMax: 2 };
      setPoolDefaults(aliasedConfig, aliasedOptions);
      expect(getPoolDefaults(aliasedConfig)).toEqual(aliasedOptions);
      expect(getPoolDefaults(dbConfig)).not.toEqual(aliasedOptions);
      setPoolDefaults(dbConfig, undefined);
      expect(getPoolDefaults(dbConfig)).toEqual({});
      setPoolDefaults(aliasedConfig, undefined);
      expect(getPoolDefaults(aliasedConfig)).toEqual({});
    });
    test('should allow creating a connection', async () => {
      const connection = await getPoolConnection(dbConfig);
      try {
        await connection.ping();
      } finally {
        await connection.close().catch(() => {});
      }
    });
    test('should create a new pool after closing the old one', async () => {
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'poolClosing',
      };
      const pool = await createPool(aliasedConfig);
      await pool.close();
      const pool2 = await createPool(dbConfig);
      expect(pool2.status).toBe(POOL_STATUS_OPEN);
      expect(pool2).not.toBe(pool);
    });
    test('should throw on creating a pool without a connectString', async () => {
      expect(createPool({ connectString: '' })).rejects.toThrow(
        new Error('Invalid Connection'),
      );
      expect(createPool({ connectionString: '' })).rejects.toThrow(
        new Error('Invalid Connection'),
      );
    });
  });
  describe('getPool', () => {
    afterEach(async () => {
      await closePools(0);
    });
    test('should return a pool', async () => {
      const pool = await createPool(dbConfig);
      expect(pool).toBe(await getPool(dbConfig));
    });
    test('should return null if the pool is closed or does not exist', async () => {
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'getPoolNull',
      };
      expect(await getPool(aliasedConfig)).toBeNull();
    });
  });
  describe('closePools', () => {
    afterEach(async () => {
      await closePools(0);
    });
    test("should return pools that didn't close", async () => {
      const pool = await createPool(dbConfig);
      const connection = await getPoolConnection(dbConfig);
      const results = await closePools();
      expect(results?.[0]?.pool).toBe(pool);
      await connection.close();
    });
    test('should return an empty array if all pools closed successfully', async () => {
      await createPool(dbConfig);
      const results = await closePools();
      expect(results).toHaveLength(0);
    });
  });
  describe('sqlHelpers', () => {
    const aliasedConfig: ConnectionAttributes = {
      ...dbConfig,
      poolAlias: 'sqlHelpers',
    };
    afterAll(async () => {
      await closePools(0);
    });
    describe('getSqlPool', () => {
      test('Should work through a pool', async () => {
        await seedDatabase();
        await expect(getSqlPool(aliasedConfig, selectBooks)).resolves.toEqual(
          seedBooks,
        );
      });
    });
    describe('mutateManySqlPool', () => {
      test('Should work through a pool', async () => {
        await seedDatabase();
        const query = sql`${insertBook}
          (${extraBooks.map(({ ID }) => ID)},
           ${extraBooks.map(({ TITLE }) => TITLE)},
           ${extraBooks.map(({ AUTHOR }) => AUTHOR)},
           ${extraBooks.map(({ PAGES }) => PAGES)})`;
        const result = await mutateManySqlPool<{
          id: [number];
          title: [string];
        }>(aliasedConfig, query);
        expect(result.rowsAffected).toBe(extraBooks.length);
        expect(
          await getSqlPool(aliasedConfig, sql`${selectBooks} order by ID`),
        ).toEqual(allBooks);
        const deletion = await mutateSqlPool(
          aliasedConfig,
          sql`DELETE FROM ${table} WHERE ID in (${join(
            extraBooks.map(({ ID }) => ID),
          )})`,
        );
        expect(deletion.rowsAffected).toBe(extraBooks.length);
      });
    });
  });
});
