import oracledb from 'oracledb';
import type {
  BindParameters,
  Connection,
  ConnectionAttributes,
  ExecuteManyOptions,
  ExecuteOptions,
  Result,
  Results,
  DBError,
} from 'oracledb';
import { getPoolConnection } from './pools.js';
import { Sql } from './sql.js';

oracledb.fetchAsBuffer = [oracledb.BLOB];
oracledb.fetchAsString = [oracledb.CLOB];

/**
 * Convenience function for duck-typing if an error is an Oracle DBError as node-oracledb doesn't expose one
 *
 * Note: when using thick-client, the Error may be cross-realm, so `instanceof Error` won't work
 * @param error
 */
export function isDBError(error: unknown): error is DBError {
  if (
    error != null &&
    typeof error === 'object' &&
    'errorNum' in error &&
    'offset' in error &&
    'message' in error
  ) {
    return true;
  }
  return false;
}

/**
 * Change a type into what would be returned from the database
 *
 * e.g. any object or array will be returned as a JSON string, except Date which is returned from the Database by default.
 *
 * To convert dates to strings as well, pass `true` into the second template parameter
 *
 * To convert objects/arrays into something other than strings, use the third template parameter to set what they will be returned as
 * @example
 * ```ts
 * type Foo = {
 *   a: number;
 *   b?: string[];
 *   c: { id: number, value: string };
 *   d: Date;
 * }
 * type FooDB = ToDBType<Foo>;
 * //=> {
 * // 	a: number;
 * // 	b: string | null;
 * // 	c: string;
 * // 	d: Date;
 * //}
 * ```
 */
export type ToDBType<
  T extends object,
  DateString extends boolean = false,
  ObjectType = string,
> = {
  [P in keyof T]-?: NonNullable<T[P]> extends Date
    ? T[P] extends NonNullable<T[P]>
      ? DateString extends false
        ? Date
        : string
      : (DateString extends false ? Date : string) | null
    : NonNullable<T[P]> extends object | Array<unknown>
    ? T[P] extends NonNullable<T[P]>
      ? ObjectType
      : ObjectType | null
    : T[P] extends NonNullable<T[P]>
    ? T[P]
    : NonNullable<T[P]> | null;
};

/**
 * A function called when an error occurs
 */
export type Logger = (
  error: Error,
  sql: string,
  params: BindParameters,
) => void;

let logger: Logger | undefined;
/**
 * In order to help combat how bad Oracle's actual Error messages are, this will let you make your own output messages when there's an error
 *
 * @param newLoggerFn The new function to run when an error occurs in a oracle-helper function
 *
 */
export function setSqlErrorLogger(newLoggerFn: Logger | undefined) {
  logger = newLoggerFn;
}

const log: Logger = (error, sql, params) => {
  logger?.(error, sql, params);
};

/**
 * Either a Connection or the attributes to create one
 */
export type ConfigOrConnection = Connection | ConnectionAttributes;
function isConnection(
  connection: ConfigOrConnection,
): connection is Connection {
  if (!connection) {
    throw new TypeError('ConfigOrConnection must be defined');
  }
  return (connection as Connection).execute !== undefined;
}

/**
 * Transform non-array properties on an object to arrays, as Oracle's `outBinds` is always an array
 */
export type ToOutBinds<T> = T extends object
  ? {
      [key in keyof T]: T[key] extends Array<unknown> ? T[key] : T[key][];
    }
  : T;

/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 *
 * @returns The response data as an array
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: Sql,
  options?: ExecuteOptions,
): Promise<T[]>;
/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns Nothing if there is a callback
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: Sql,
  options: ExecuteOptions,
  cb: (record: T) => void,
): Promise<void>;
/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - Should be a SELECT type for this
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution
 *
 * @returns The response data as an array
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string,
  params?: BindParameters,
  options?: ExecuteOptions,
): Promise<T[]>;
/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - Should be a SELECT type for this
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns Nothing if there is a callback
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string,
  params: BindParameters,
  options: ExecuteOptions,
  cb: (record: T) => void,
): Promise<void>;
async function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  optionsOrCb:
    | ExecuteOptions
    | ((record: T) => void)
    | undefined = sql instanceof Sql ? undefined : {},
  cb?: (record: T) => void,
): Promise<void | T[]> {
  const args = getSqlParameters(sql, paramsOrOptions, optionsOrCb, cb);
  const isConfig = !isConnection(configOrConnection);
  const connection: Connection = !isConfig
    ? configOrConnection
    : await oracledb.getConnection(configOrConnection);

  try {
    return await getSqlInner(connection, ...args);
  } finally {
    if (isConfig) {
      await connection.close();
    }
  }
}
function getSqlParameters<T>(
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  optionsOrCb?: ExecuteOptions | ((record: T) => void),
  cb?: (record: T) => void,
): [
  string,
  oracledb.BindParameters,
  oracledb.ExecuteOptions,
  ((record: T) => void) | undefined,
] {
  let text = '';
  let params: BindParameters;
  let options: ExecuteOptions;
  if (sql instanceof Sql) {
    text = sql.sql;
    params = sql.values;
    if (Array.isArray(params)) {
      throw new TypeError('Cannot bind array values outside mutateManySql');
    }
    options = paramsOrOptions as ExecuteOptions;
    cb = optionsOrCb as (record: T) => void;
  } else {
    text = sql;
    params = paramsOrOptions as BindParameters;
    options = optionsOrCb as ExecuteOptions;
  }
  return [text, params, options, cb];
}
async function getSqlInner<T>(
  connection: Connection,
  sql: string,
  params: BindParameters,
  options: ExecuteOptions,
  cb: ((record: T) => void) | undefined,
): Promise<void | T[]> {
  let sqlResult: Result<T>;
  try {
    sqlResult = await connection.execute(sql, params, {
      ...options,
      outFormat: oracledb.OUT_FORMAT_OBJECT, // return as json object
      resultSet: cb ? true : false,
    });
  } catch (error) {
    if (error instanceof Error) log(error, sql, params);
    throw error;
  }
  if (!cb) {
    return sqlResult.rows;
  }
  let row: T;
  while ((row = await sqlResult.resultSet!.getRow())) {
    cb(row);
  }
  sqlResult.resultSet!.close();
}

/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 *
 * @returns The response data as an array
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: Sql,
  options?: ExecuteOptions,
): Promise<T[]>;
/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns Nothing if there is a callback
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: Sql,
  options: ExecuteOptions,
  cb: (record: T) => void,
): Promise<void>;
/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - Should be a SELECT type for this
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution
 *
 * @returns The response data as an array
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: string,
  params?: BindParameters,
  options?: ExecuteOptions,
): Promise<T[]>;
/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - Should be a SELECT type for this
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns Nothing if there is a callback instead
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: string,
  params: BindParameters,
  options: ExecuteOptions,
  cb: (record: T) => void,
): Promise<void>;
async function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: string | Sql,
  paramsOrOptions?: BindParameters | ExecuteOptions,
  optionsOrCb?: ExecuteOptions | ((record: T) => void),
  cb?: (record: T) => void,
): Promise<void | T[]> {
  const args = getSqlParameters(sql, paramsOrOptions, optionsOrCb, cb);
  const connection: Connection = await getPoolConnection(config);
  try {
    return await getSqlInner(connection, ...args);
  } finally {
    await connection.close();
  }
}

function mutateSqlParameters(
  sql: string | Sql,
  paramsOrOptions?: BindParameters | ExecuteOptions,
  options?: ExecuteOptions,
  isMany?: false,
): [string, BindParameters, ExecuteOptions];
function mutateSqlParameters(
  sql: string | Sql,
  paramsOrOptions?: BindParameters[] | ExecuteManyOptions,
  options?: ExecuteManyOptions,
  isMany?: true,
): [string, BindParameters[], ExecuteManyOptions];
function mutateSqlParameters(
  sql: string | Sql,
  paramsOrOptions?: BindParameters | ExecuteOptions,
  options?: ExecuteOptions,
  isMany = false,
): [
  string,
  BindParameters | BindParameters[],
  ExecuteOptions | ExecuteManyOptions | undefined,
] {
  let text = '';
  let params: BindParameters;
  if (sql instanceof Sql) {
    text = sql.sql;
    params = sql.values;
    options = paramsOrOptions as ExecuteOptions;
  } else {
    text = sql;
    params = paramsOrOptions as BindParameters;
  }
  if (isMany && !Array.isArray(params)) {
    throw new TypeError('Must bind array values in mutateManySql');
  } else if (!isMany && Array.isArray(params)) {
    throw new TypeError('Cannot bind array values outside mutateManySql');
  }
  return [text, params, options];
}

async function mutateSqlInner<T>(
  connection: Connection,
  sql: string,
  params: BindParameters,
  options: ExecuteOptions,
  isConfig: boolean,
): Promise<Result<T>> {
  try {
    return await connection.execute(sql, params, {
      autoCommit: isConfig,
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options,
    });
  } catch (error) {
    if (error instanceof Error) log(error, sql, params);
    throw error;
  } finally {
    if (isConfig) {
      await connection?.close();
    }
  }
}

/**
 * Executes SQL mutate the database
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - the result of the sql template tag - Should be some sort of mutation
 * @param options The oracle options for the SQL execution. `options.autoCommit` is set by default based on if `configOrConnection` is config.
 * @returns The result object for the execution
 */
function mutateSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: Sql,
  options?: ExecuteOptions,
): Promise<Result<ToOutBinds<T>>>;
/**
 * Executes SQL mutate the database
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - Should be some sort of mutation
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution. `options.autoCommit` is set by default based on if `configOrConnection` is config.
 * @returns The result object for the execution
 */
function mutateSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string,
  params?: BindParameters,
  options?: ExecuteOptions,
): Promise<Result<ToOutBinds<T>>>;
async function mutateSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  options: ExecuteOptions = {},
): Promise<Result<ToOutBinds<T>>> {
  const args = mutateSqlParameters(sql, paramsOrOptions, options);
  const isConfig = !isConnection(configOrConnection);
  const connection: Connection = isConnection(configOrConnection)
    ? configOrConnection
    : await oracledb.getConnection(configOrConnection);
  return await mutateSqlInner(connection, ...args, isConfig);
}

/**
 * Uses a connection from a connection pool to execute SQL to mutate the database
 *
 * If you need to run multiple mutations in a single transaction use `mutateSQL` with a connection from the pool instead.
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - the result of the sql template tag - Should be some sort of mutation
 * @param options The oracle options for the SQL execution. `options.autoCommit` is forced to true, as the connection is automatically closed afterwards
 * @returns The result object for the execution
 */
function mutateSqlPool<T>(
  config: ConnectionAttributes,
  sql: Sql,
  options?: ExecuteOptions,
): Promise<Result<ToOutBinds<T>>>;
/**
 * Uses a connection from a connection pool to execute SQL to mutate the database
 *
 * If you need to run multiple mutations in a single transaction use `mutateSQL` with a connection from the pool instead.
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - Should be some sort of mutation
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution. `options.autoCommit` is forced to true, as the connection is automatically closed afterwards
 *
 * @returns The result object for the execution
 */
function mutateSqlPool<T>(
  config: ConnectionAttributes,
  sql: string,
  params?: BindParameters,
  options?: ExecuteOptions,
): Promise<Result<ToOutBinds<T>>>;
async function mutateSqlPool<T>(
  config: ConnectionAttributes,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  options: ExecuteOptions = {},
): Promise<Result<ToOutBinds<T>>> {
  const args = mutateSqlParameters(sql, paramsOrOptions, options);
  const connection: Connection = await getPoolConnection(config);
  return await mutateSqlInner(connection, ...args, true);
}

async function mutateManySqlInner<T>(
  connection: Connection,
  sql: string,
  binds: BindParameters[],
  options: ExecuteManyOptions,
  isConfig: boolean,
): Promise<Results<T>> {
  try {
    return await connection.executeMany(sql, binds, {
      autoCommit: isConfig,
      ...options,
    });
  } catch (error) {
    if (error instanceof Error) log(error, sql, binds);
    throw error;
  } finally {
    if (isConfig) {
      await connection.close();
    }
  }
}

/**
 * Executes SQL mutate the database via the `executeMany` command.
 *
 * This takes an array of bindParameters and loops over them.
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - the result of the sql template tag - Should be some sort of mutation
 * @param options The oracle options for the SQL execution. `options.autoCommit` is set by default based on if `configOrConnection` is config.
 * @returns The result object for the execution. There are many results as there are many executions.
 */
function mutateManySql<T>(
  configOrConnection: ConfigOrConnection,
  sql: Sql,
  options?: ExecuteManyOptions,
): Promise<Results<ToOutBinds<T>>>;
/**
 * Executes SQL mutate the database via the `executeMany` command.
 *
 * This takes an array of bindParameters and loops over them.
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - Should be some sort of mutation
 * @param params An array of the Parameters to pass into the SQL execution. `executeMany` loops over them in a single transaction
 * @param options The oracle options for the SQL execution. `options.autoCommit` is set by default based on if `configOrConnection` is config.
 * @returns The result object for the execution. There are many results as there are many executions.
 */
function mutateManySql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string,
  params: BindParameters[],
  options?: ExecuteManyOptions,
): Promise<Results<ToOutBinds<T>>>;
async function mutateManySql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string | Sql,
  paramsOrOptions?: BindParameters[] | ExecuteManyOptions,
  options?: ExecuteManyOptions,
): Promise<Results<ToOutBinds<T>>> {
  const args = mutateSqlParameters(sql, paramsOrOptions, options, true);
  const isConfig = !isConnection(configOrConnection);
  const connection: Connection = isConnection(configOrConnection)
    ? configOrConnection
    : await oracledb.getConnection(configOrConnection);
  return await mutateManySqlInner(connection, ...args, isConfig);
}

/**
 * Uses a connection from a connection pool to execute SQL to mutate the database via the `executeMany` command.
 *
 * This takes an array of bindParameters and loops over them.
 *
 * If you need to run multiple different SQL mutations in a single transaction use `mutateManySQL` with a connection from the pool instead.
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - the result of the sql template tag - Should be some sort of mutation
 * @param options The oracle options for the SQL execution. `options.autoCommit` is set by default based on if `configOrConnection` is config.
 * @returns The result object for the execution. There are many results as there are many executions.
 */
function mutateManySqlPool<T>(
  config: ConnectionAttributes,
  sql: Sql,
  options?: ExecuteManyOptions,
): Promise<Results<ToOutBinds<T>>>;
/**
 * Uses a connection from a connection pool to execute SQL to mutate the database via the `executeMany` command.
 *
 * This takes an array of bindParameters and loops over them.
 *
 * If you need to run multiple different SQL mutations in a single transaction use `mutateManySQL` with a connection from the pool instead.
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - Should be some sort of mutation
 * @param params An array of the Parameters to pass into the SQL execution. `executeMany` loops over them in a single transaction
 * @param options The oracle options for the SQL execution. `options.autoCommit` is set by default based on if `configOrConnection` is config.
 * @returns The result object for the execution. There are many results as there are many executions.
 */
function mutateManySqlPool<T>(
  config: ConnectionAttributes,
  sql: string,
  params: BindParameters[],
  options?: ExecuteManyOptions,
): Promise<Results<ToOutBinds<T>>>;
async function mutateManySqlPool<T>(
  config: ConnectionAttributes,
  sql: string | Sql,
  paramsOrOptions?: BindParameters[] | ExecuteOptions,
  options?: ExecuteManyOptions,
): Promise<Results<ToOutBinds<T>>> {
  const args = mutateSqlParameters(sql, paramsOrOptions, options, true);
  const connection: Connection = await getPoolConnection(config);
  return await mutateManySqlInner(connection, ...args, true);
}

export {
  getSql,
  mutateSql,
  mutateSqlPool,
  getSqlPool,
  mutateManySql,
  mutateManySqlPool,
};
