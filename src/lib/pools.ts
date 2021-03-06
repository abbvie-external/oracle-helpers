import oracledb, {
  Connection,
  ConnectionAttributes,
  Pool,
  PoolAttributes,
} from 'oracledb';

/**
 * Customize the way the pools works.
 */
export interface Configuration {
  /** Amount of time (in ms) between pings to check on connection behavior. */
  pingTime: number;
  /** Amount of time to wait (in ms) for getting a connection before deciding that there's a problem with the pool */
  connectionTimeout: number;
  /** Amount of time to wait (in ms) for the ping to complete before deciding that there's a problem with the pool */
  pingTimeout: number;
}
/**
 * Various Configurations to customize the way the pools works.
 */
export const configuration: Configuration = {
  pingTime: 1000 * 60,
  connectionTimeout: 10000,
  pingTimeout: 3000,
};

/**
 * Use this to set the options for the pool based on the connect string
 *
 */
export const poolOptions: Record<string, PoolAttributes> = {};

const pools: Record<string, Pool> = {};
const poolPromises: Record<string, Promise<Pool>> = {};
const pings: Record<string, Date> = {};
/**
 * Create/Get a connection pool
 *
 * Will be synchronous if the pool was already created
 *
 * @returns A connection pool.
 */
export async function createPool(
  dbConfig: ConnectionAttributes,
  options: PoolAttributes = {},
): Promise<Pool> {
  const connectString = dbConfig.connectString || dbConfig.connectionString;
  if (!connectString) {
    throw Error('Invalid Connection');
  }
  if (pools[connectString]) {
    return pools[connectString];
  }
  if (poolPromises[connectString] !== undefined) {
    return await poolPromises[connectString];
  }
  const promise = oracledb.createPool({
    poolMin: 0,
    poolMax: 12,
    ...options,
    ...(poolOptions[connectString] ?? {}),
    user: dbConfig.user,
    password: dbConfig.password,
    connectString: connectString,
  });
  poolPromises[connectString] = promise;
  try {
    pools[connectString] = await promise;
  } catch (error) {
    delete poolPromises[connectString];
    delete pools[connectString];
    throw error;
  }
  pings[connectString] = new Date();
  delete poolPromises[connectString];
  return pools[connectString];
}
/**
 * Gets a connection from a pool. Will run createPool automatically
 *
 * Has a 3 seconds timeout before it abandons the currently extant pool and tries again.
 * This is in order to make the application able to recover.
 *
 * Will also run a ping on a connection at least every `configuration.pingTime` miliseconds.
 * This is set to 1 minute by default as it can be slower.
 *
 * @returns an oracle connection object
 */
export async function getPoolConnection(
  dbConfig: ConnectionAttributes,
): Promise<Connection> {
  const connectString = dbConfig.connectString || dbConfig.connectionString;
  if (!connectString) {
    throw Error('Invalid Connection');
  }
  // let pool = pools[connectString];
  let pool = await createPool(dbConfig);
  try {
    const connection = await promiseOrTimeout(
      pool.getConnection(),
      configuration.connectionTimeout,
    );
    if (
      new Date().valueOf() >
      pings[connectString].valueOf() + configuration.pingTime
    ) {
      pings[connectString] = new Date();
      await promiseOrTimeout(connection.ping(), configuration.pingTimeout);
    }
    return connection;
  } catch (error) {
    pool = await recreatePool(dbConfig, pool);
    return await pool.getConnection();
  }
}

async function promiseOrTimeout<T>(
  promise: Promise<T>,
  timeout = 3000,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  return await Promise.race([
    promise,
    new Promise<never>((_resolve, reject) => {
      timeoutId = setTimeout(() => {
        reject('Timeout');
      }, timeout);
    }),
  ]).finally(() => clearTimeout(timeoutId));
}

async function recreatePool(
  dbConfig: ConnectionAttributes,
  pool: Pool,
): Promise<Pool> {
  const connectString = dbConfig.connectString || dbConfig.connectionString;
  if (!connectString) {
    throw Error('Invalid Connection');
  }
  try {
    await pool.close(1000);
    // eslint-disable-next-line no-empty
  } catch {}
  delete pools[connectString];
  delete poolPromises[connectString];
  pool = await createPool(dbConfig);
  return pool;
}
