import oracledb from 'oracledb';
import type {
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

export type PoolOptions = Omit<
  PoolAttributes,
  'poolAlias' | 'user' | 'password' | 'connectString' | 'connectionString'
>;

/**
 * Use this to set the options for the pool based on the connect string
 * @deprecated Use setPoolDefaults instead
 *
 */
export const poolOptions: Record<string, PoolOptions> = {};

const internalPoolOptions = new Map<string, PoolOptions>();

export function setPoolDefaults(
  dbConfig: ConnectionAttributes,
  options: PoolOptions | undefined,
) {
  if (!options) {
    internalPoolOptions.delete(getConfigKey(dbConfig));
  } else {
    internalPoolOptions.set(getConfigKey(dbConfig), { ...options });
  }
}

export function getPoolDefaults(dbConfig: ConnectionAttributes) {
  return {
    ...poolOptions[getConnectString(dbConfig)],
    ...internalPoolOptions.get(getConfigKey(dbConfig)),
  };
}

const pools = new Map<string, Pool | Promise<Pool>>();
const pings = new Map<string, Date>();
/**
 * Create/Get a connection pool
 *
 * @returns A connection pool.
 */
export async function createPool(
  dbConfig: ConnectionAttributes,
  options: PoolOptions = {},
): Promise<Pool> {
  const connectString = getConnectString(dbConfig);
  if (!connectString) {
    throw Error('Invalid Connection');
  }
  const configKey = getConfigKey(dbConfig);
  const extantPool = pools.get(configKey);
  if (extantPool) {
    if (
      extantPool instanceof Promise ||
      extantPool.status !== oracledb.POOL_STATUS_CLOSED
    ) {
      return extantPool;
    }
  }
  const promise = oracledb.createPool({
    poolMin: 0,
    poolMax: 12,
    edition: dbConfig.edition,
    events: dbConfig.events,
    externalAuth: dbConfig.externalAuth,
    stmtCacheSize: dbConfig.stmtCacheSize,
    ...getPoolDefaults(dbConfig),
    ...options,
    poolAlias: dbConfig.poolAlias,
    user: dbConfig.user,
    password: dbConfig.password,
    connectString,
  });
  pools.set(configKey, promise);
  try {
    const pool = await promise;
    pools.set(configKey, pool);
    pings.set(configKey, new Date());
    return pool;
  } catch (error) {
    pools.delete(configKey);
    throw error;
  }
}

/**
 * Get a connection pool if it exists
 * @param dbConfig database connection configuration
 * @returns A connection pool or null
 */
export async function getPool(
  dbConfig: ConnectionAttributes,
): Promise<Pool | null> {
  const pool = await pools.get(getConfigKey(dbConfig));
  if (!pool || pool.status === oracledb.POOL_STATUS_CLOSED) {
    return null;
  }
  return pool;
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
  const configKey = getConfigKey(dbConfig);
  let pool = await createPool(dbConfig);
  try {
    const connection = await promiseOrTimeout(
      pool.getConnection(),
      configuration.connectionTimeout,
    );
    if (
      pings.has(configKey) &&
      new Date().valueOf() >
        pings.get(configKey).valueOf()! + configuration.pingTime
    ) {
      pings.set(configKey, new Date());
      await promiseOrTimeout(connection.ping(), configuration.pingTimeout);
    }
    return connection;
  } catch (error) {
    pool = await recreatePool(dbConfig, pool);
    return await pool.getConnection();
  }
}

/**
 * Close all connection pools managed by the oracle-helpers
 *
 * @param drainTime The number of seconds before the pool and connections are force closed.
 *
 * If drainTime is 0, the pool and its connections are closed immediately.
 *
 * @returns An array of pools that failed to close with the error thrown.
 */
export async function closePools(
  drainTime?: number,
): Promise<{ error: unknown; pool: Pool }[]> {
  return (
    await Promise.all(
      [...pools.entries()].map(async ([key, pool]) => {
        if (pool instanceof Promise) {
          try {
            pool = await pool;
          } catch (error) {
            // at this point, don't bother with a pool that failed to start!
            return undefined;
          }
        }
        try {
          if (pool.status === oracledb.POOL_STATUS_OPEN) {
            if (drainTime == null) {
              await pool.close();
            } else {
              await pool.close(drainTime);
            }
          }
          pools.delete(key);
          return undefined;
        } catch (error) {
          return { error, pool };
        }
      }),
    )
  ).filter((result): result is NonNullable<typeof result> => !!result);
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
  const configKey = getConfigKey(dbConfig);
  try {
    await pool.close(1000);
    // eslint-disable-next-line no-empty
  } catch {}
  pools.delete(configKey);
  pool = await createPool(dbConfig);
  return pool;
}

function getConnectString(dbConfig: ConnectionAttributes): string {
  return dbConfig.connectString || dbConfig.connectionString;
}

function getConfigKey(dbConfig: ConnectionAttributes): string {
  return `${getConnectString(dbConfig)}|${dbConfig.user}|${dbConfig.poolAlias}`;
}
