import { Pool, POOL_STATUS_OPEN } from 'oracledb';
import { createPool, getPoolConnection } from '../lib/pools';
import { getSqlPool } from '../lib/sqlHelpers';
import { dbConfig, seedBooks, selectBooks } from './dbconfig';

describe('pools', () => {
  let pool: Pool;
  afterAll(async () => {
    await pool.terminate();
  });
  test('should create and get the same pool via the same config', async () => {
    pool = await createPool(dbConfig, { poolMax: 1 });
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
});
