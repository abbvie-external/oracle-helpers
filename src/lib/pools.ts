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
  /**
   * The number of ms between the sending of keepalive probes. If this property is set to a value greater than zero, it enables the keepalive probes
   *
   * set to `undefined` to remove this behavior
   * @deprecated For thin mode with oracledb v6+, use `setPoolDefaults` to set `expireTime` instead.
   *
   * For thick mode with oracle 19c+, use an Easy Connect string or a Connect Descriptor string. the property is `EXPIRE_TIME`
   *
   * @default 60_000
   */
  pingTime?: number;
  /**
   * The timeout duration in ms for an application to establish an Oracle Net connection.
   *
   * set to `undefined` to remove this behavior
   * @deprecated For thin mode with oracledb v6+, use `setPoolDefaults` to set `connectTimeout` instead.
   *
   * For thick mode with oracle 19c+, use an Easy Connect string or a Connect Descriptor string. the property is `CONNECT_TIMEOUT`
   * @default 1_000
   */
  connectionTimeout?: number;
  /**
   * No longer does anything.
   *
   * @deprecated There is no equivalent for this.
   */
  pingTimeout?: number;
}
const SECOND = 1000;
const MINUTE = SECOND * 60;
/**
 * Various Configurations to customize the way the pools works.
 * @deprecated Will be removed in the next major version. use pool defaults instead.
 * For thin mode, use pool defaults instead. If using oracledb@^5 or thick-mode, use an Easy Connect string or a Connect Descriptor string.
 *
 * If you use the Easy Connect or Connect Description setup, disable these configurations by setting them all to undefined
 */
export const configuration: Configuration = {
  pingTime: MINUTE,
  connectionTimeout: 10 * SECOND,
  pingTimeout: 3 * SECOND,
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
    connectTimeout: configuration.connectionTimeout / SECOND,
    expireTime: configuration.pingTime / MINUTE,
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
 * @returns an oracle connection object
 */
export async function getPoolConnection(
  dbConfig: ConnectionAttributes,
): Promise<Connection> {
  const pool = await createPool(dbConfig);
  return await pool.getConnection();
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

function getConnectString(dbConfig: ConnectionAttributes): string {
  return dbConfig.connectString || dbConfig.connectionString;
}

function getConfigKey(dbConfig: ConnectionAttributes): string {
  return `${getConnectString(dbConfig)}|${dbConfig.user}|${dbConfig.poolAlias}`;
}
