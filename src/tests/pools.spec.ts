import test, { after, afterEach, describe } from 'node:test';
import OracleDB, {
  type BindParameters,
  type ConnectionAttributes,
} from 'oracledb';
import {
  closePools,
  createPool,
  getPool,
  getPoolConnection,
  getPoolDefaults,
  PoolOptions,
  setPoolDefaults,
} from '../lib/pools.js';
import { join, sql } from '../lib/sql.js';
import {
  getSqlPool,
  mutateManySqlPool,
  mutateSql,
  mutateSqlPool,
} from '../lib/sqlHelpers.js';
import {
  allBooks,
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

const table = getTable('pools');
const insertBook = getInsertBook(table);
const selectBooks = getSelectBooks(table);
const dropTable = getDropTable(table);

async function seedDatabase() {
  try {
    const connection = await OracleDB.getConnection(dbConfig);
    try {
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
    } finally {
      await connection.close();
    }
  } catch (error) {
    console.error(`Failed Creating/Seeding ${table.sql}`);
    throw error;
  }
}

describe('pools', () => {
  after(async () => {
    try {
      await mutateSql(dbConfig, dropTable);
    } catch (err) {
      // Ignore does not exist errors
      if (!isNotExistError(err)) {
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
    test('should create and get the same pool via the same config', async (t) => {
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'sameConfig',
      };
      const pools = await Promise.all([
        createPool(aliasedConfig, { poolMax: 1 }),
        createPool(aliasedConfig, { poolMax: 1 }),
      ]);
      t.assert.equal(pools[0], pools[1]);
      const [pool] = pools;
      t.assert.equal(pool.status, OracleDB.POOL_STATUS_OPEN);
      t.assert.equal(pool.poolMax, 1);
      t.assert.equal(pool.poolAlias, aliasedConfig.poolAlias);

      const pool2 = await createPool(aliasedConfig);
      t.assert.equal(pool2, pool);
    });
    test('should support connectionString as well as connectString', async (t) => {
      const { connectString, ...config } = dbConfig;
      const pool = await createPool(dbConfig);
      const pool2 = await createPool({
        connectionString: connectString,
        ...config,
      });
      t.assert.equal(pool2, pool);
    });
    test('setPoolDefaults should work', async (t) => {
      const options: PoolOptions = { poolMax: 1 };
      setPoolDefaults(dbConfig, options);
      t.assert.deepEqual(getPoolDefaults(dbConfig), options);
      let pool = await createPool(dbConfig);
      t.assert.equal(pool.poolMax, options.poolMax);
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'aliasedConfig',
      };
      const aliasedOptions: PoolOptions = { poolMax: 2 };
      setPoolDefaults(aliasedConfig, aliasedOptions);
      t.assert.deepEqual(getPoolDefaults(aliasedConfig), aliasedOptions);
      t.assert.notDeepEqual(getPoolDefaults(dbConfig), aliasedOptions);
      let aliasedPool = await createPool(aliasedConfig);
      t.assert.notDeepEqual(pool, aliasedPool);
      t.assert.equal(aliasedPool.poolMax, aliasedOptions.poolMax);

      // clear default for db config.
      // ensure that the existing pool's value didn't change
      // ensure that the aliasedConfig's defaults didn't change
      setPoolDefaults(dbConfig, undefined);
      t.assert.deepEqual(getPoolDefaults(dbConfig), {});
      t.assert.equal(pool.poolMax, options.poolMax);
      t.assert.deepEqual(getPoolDefaults(aliasedConfig), aliasedOptions);

      await closePools(0);
      // re-create the pool, and make sure the original defaults didn't apply
      pool = await createPool(dbConfig);
      t.assert.notEqual(pool.poolMax, options.poolMax);

      // Set some global options, make sure that they are applied as well as the config specific options
      const globalOptions: PoolOptions = { poolPingInterval: 30, poolMax: 3 };
      setPoolDefaults(undefined, globalOptions);
      t.assert.deepEqual(getPoolDefaults(), globalOptions);
      aliasedPool = await createPool(aliasedConfig);
      t.assert.equal(
        aliasedPool.poolPingInterval,
        globalOptions.poolPingInterval,
      );
      t.assert.equal(aliasedPool.poolMax, aliasedOptions.poolMax);

      setPoolDefaults(undefined, undefined);
      t.assert.deepEqual(getPoolDefaults(), {});
    });
    test('should allow creating a connection', async (t) => {
      const connection = await getPoolConnection(dbConfig);
      try {
        await t.assert.doesNotReject(connection.ping());
      } finally {
        await connection.close().catch(() => {});
      }
    });

    test('should create a new pool after closing the old one', async (t) => {
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'poolClosing',
      };
      const pool = await createPool(aliasedConfig);
      await pool.close();
      const pool2 = await createPool(dbConfig);
      t.assert.equal(pool2.status, OracleDB.POOL_STATUS_OPEN);
      t.assert.notDeepEqual(pool2, pool);
    });
    test('should throw on creating a pool without a connectString', async (t) => {
      t.assert.rejects(
        createPool({ connectString: '' }),
        new Error('Invalid Connection'),
      );
      t.assert.rejects(
        createPool({ connectionString: '' }),
        new Error('Invalid Connection'),
      );
    });
  });
  describe('getPool', () => {
    afterEach(async () => {
      await closePools(0);
    });
    test('should return a pool', async (t) => {
      const pool = await createPool(dbConfig);
      t.assert.deepEqual(pool, await getPool(dbConfig));
    });
    test('should return null if the pool is closed or does not exist', async (t) => {
      const aliasedConfig: ConnectionAttributes = {
        ...dbConfig,
        poolAlias: 'getPoolNull',
      };
      t.assert.deepEqual(await getPool(aliasedConfig), null);
    });
  });
  describe('closePools', () => {
    afterEach(async () => {
      await closePools(0);
    });
    test("should return pools that didn't close", async (t) => {
      const pool = await createPool(dbConfig);
      const connection = await getPoolConnection(dbConfig);
      const results = await closePools();
      t.assert.deepEqual(results?.[0]?.pool, pool);
      await connection.close();
    });
    test('should return an empty array if all pools closed successfully', async (t) => {
      await createPool(dbConfig);
      const results = await closePools();
      t.assert.equal(results.length, 0);
    });
  });
  describe('sqlHelpers', () => {
    const aliasedConfig: ConnectionAttributes = {
      ...dbConfig,
      poolAlias: 'sqlHelpers',
    };
    after(async () => {
      await closePools(0);
    });
    describe('getSqlPool', () => {
      test('Should work through a pool', async (t) => {
        await seedDatabase();
        t.assert.deepEqual(
          await getSqlPool(aliasedConfig, selectBooks),
          seedBooks,
        );
      });
    });
    describe('mutateManySqlPool', () => {
      test('Should work through a pool', async (t) => {
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
        t.assert.equal(result.rowsAffected, extraBooks.length);
        t.assert.deepEqual(
          await getSqlPool(aliasedConfig, sql`${selectBooks} order by ID`),
          allBooks,
        );
        const deletion = await mutateSqlPool(
          aliasedConfig,
          sql`DELETE FROM ${table} WHERE ID in (${join(
            extraBooks.map(({ ID }) => ID),
          )})`,
        );
        t.assert.equal(deletion.rowsAffected, extraBooks.length);
      });
    });
  });
});
