/* eslint-disable no-async-promise-executor */

import oracledb, {
  BindParameters,
  Connection,
  ConnectionAttributes,
  ExecuteManyOptions,
  ExecuteOptions,
  Result,
  Results,
} from 'oracledb';

import { getPoolConnection } from './pools';
import { Sql } from './sql';

oracledb.fetchAsBuffer = [oracledb.BLOB];
oracledb.fetchAsString = [oracledb.CLOB];

type ConfigOrConnection = Connection | ConnectionAttributes;
function isConnection(
  connection: ConfigOrConnection
): connection is Connection {
  return (connection as Connection).execute !== undefined;
}
function doRelease(connection: oracledb.Connection): void {
  connection.close(function (err) {
    if (err) {
      console.error(err.message);
    }
  });
}

/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 *
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: Sql,
  options?: ExecuteOptions
): Promise<T[]>;
/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: Sql,
  options: ExecuteOptions,
  cb: (record: T) => void
): Promise<void>;
/**
 * Runs SQL to get values
 *
 * @param configOrConnection Either a dbConfig object or the connection to execute with
 * @param sql The SQL to execute - Should be a SELECT type for this
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string,
  params?: BindParameters,
  options?: ExecuteOptions
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
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string,
  params: BindParameters,
  options: ExecuteOptions,
  cb: (record: T) => void
): Promise<void>;
function getSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  optionsOrCb: ExecuteOptions | ((record: T) => void) = sql instanceof Sql
    ? undefined
    : {},
  cb?: (record: T) => void
): Promise<void | T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const isConfig = !isConnection(configOrConnection);
      const connection: Connection = isConnection(configOrConnection)
        ? configOrConnection
        : await oracledb.getConnection({
            user: configOrConnection.user,
            password: configOrConnection.password,
            connectString: configOrConnection.connectString,
          });
      let sqlResult: Result<T>;
      let text = '';
      let params: BindParameters = {};
      let options: ExecuteOptions = {};
      try {
        if (sql instanceof Sql) {
          text = sql.sql;
          const values = sql.values;
          if (Array.isArray(values)) {
            throw new TypeError('Cannot bind array values in getSql');
          }
          params = values;
          options = paramsOrOptions as ExecuteOptions;
          if (typeof optionsOrCb === 'function') {
            cb = optionsOrCb;
          }
        } else {
          text = sql;
          params = paramsOrOptions as BindParameters;
          options = optionsOrCb as ExecuteOptions;
        }
        sqlResult = await connection.execute(
          // The statement to execute
          text,
          // ex: The "bind value" 180 for the "bind variable" :id
          params,
          // query options
          {
            ...options,
            outFormat: oracledb.OUT_FORMAT_OBJECT, // return as json object
            extendedMetaData: false, // return additional metadata
            resultSet: true,
          }
        );
      } catch (error) {
        if (connection) {
          doRelease(connection);
        }
        reject(error);
        return;
      }
      const stream = sqlResult.resultSet.toQueryStream();
      const result: T[] = [];
      const dataCallback = cb || result.push.bind(result);
      stream.on('data', dataCallback);
      stream.on('error', function (err) {
        // handle any error...
        doRelease(connection);
        console.error(err);
        return reject(err);
      });
      stream.on('close', function () {
        if (isConfig) doRelease(connection);
        resolve(cb ? undefined : result);
      });
    } catch (error) {
      reject(error);
    }
  });
}
/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: Sql,
  options?: ExecuteOptions
): Promise<T[]>;
/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - the result of the sql template tag - Should be a SELECT type for this
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: Sql,
  options: ExecuteOptions,
  cb: (record: T) => void
): Promise<void>;
/**
 * Uses a connection from a connection pool to run SQL to get values
 *
 * @param config The DBConfig object to get the connection from
 * @param sql The SQL to execute - Should be a SELECT type for this
 * @param params The Parameters to pass into the SQL execution
 * @param options The oracle options for the SQL execution
 * @param cb A callback method to allow you to take the return from the sql and transform the object. This is in lieu of returning an array of data.
 *
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: string,
  params?: BindParameters,
  options?: ExecuteOptions
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
 * @returns The values as an array by default or nothing if there is a callback instead
 */
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: string,
  params: BindParameters,
  options: ExecuteOptions,
  cb: (record: T) => void
): Promise<void>;
function getSqlPool<T>(
  config: ConnectionAttributes,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  optionsOrCb: ExecuteOptions | ((record: T) => void) = sql instanceof Sql
    ? undefined
    : {},
  cb?: (record: T) => void
): Promise<void | T[]> {
  return new Promise(async (resolve, reject) => {
    try {
      const connection: Connection = await getPoolConnection(config);
      let sqlResult: Result<T>;
      let text = '';
      let params: BindParameters = {};
      let options: ExecuteOptions = {};
      try {
        if (sql instanceof Sql) {
          text = sql.sql;
          const values = sql.values;
          if (Array.isArray(values)) {
            throw new TypeError('Cannot bind array values in getSql');
          }
          params = values;
          options = paramsOrOptions as ExecuteOptions;
          if (typeof optionsOrCb === 'function') {
            cb = optionsOrCb;
          }
        } else {
          text = sql;
          params = paramsOrOptions as BindParameters;
          options = optionsOrCb as ExecuteOptions;
        }
        sqlResult = await connection.execute(text, params, {
          ...options,
          outFormat: oracledb.OUT_FORMAT_OBJECT, // return as json object
          extendedMetaData: false, // return additional metadata
          resultSet: true,
        });
      } catch (error) {
        if (connection) {
          doRelease(connection);
        }
        reject(error);
        return;
      }
      const stream = sqlResult.resultSet.toQueryStream();
      const result: T[] = [];
      const dataCallback = cb || result.push.bind(result);
      stream.on('data', dataCallback);
      stream.on('error', function (err) {
        // handle any error...
        doRelease(connection);
        console.error(err);
        return reject(err);
      });
      stream.on('close', function () {
        doRelease(connection);
        resolve(cb ? undefined : result);
      });
    } catch (error) {
      reject(error);
    }
  });
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
  options?: ExecuteOptions
): Promise<Result<T>>;
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
  options?: ExecuteOptions
): Promise<Result<T>>;
async function mutateSql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  options: ExecuteOptions = {}
): Promise<Result<T>> {
  const isConfig = !isConnection(configOrConnection);
  const connection: Connection = isConnection(configOrConnection)
    ? configOrConnection
    : await oracledb.getConnection({
        user: configOrConnection.user,
        password: configOrConnection.password,
        connectString: configOrConnection.connectString,
      });
  let sqlResult: Result<T>;
  let text = '';
  let params: BindParameters = {};
  try {
    if (sql instanceof Sql) {
      text = sql.sql;
      const values = sql.values;
      if (Array.isArray(values)) {
        throw new TypeError('Cannot bind array values in mutateSql');
      }
      params = values;
      options = paramsOrOptions as ExecuteOptions;
    } else {
      text = sql;
      params = paramsOrOptions as BindParameters;
    }
    sqlResult = await connection.execute(
      // The statement to execute
      text,
      // ex: The "bind value" 180 for the "bind variable" :id
      params,
      // query options
      {
        autoCommit: isConfig,
        ...options,
        outFormat: oracledb.OUT_FORMAT_OBJECT, // return as json object
        extendedMetaData: false, // return additional metadata
        // resultSet: true,
      }
    );
  } catch (error) {
    if (connection) {
      doRelease(connection);
    }
    throw error;
  }
  if (connection && isConfig) doRelease(connection);
  return sqlResult;
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
  options?: ExecuteOptions
): Promise<Result<T>>;
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
  options?: ExecuteOptions
): Promise<Result<T>>;
async function mutateSqlPool<T>(
  config: ConnectionAttributes,
  sql: string | Sql,
  paramsOrOptions: BindParameters | ExecuteOptions = {},
  options: ExecuteOptions = {}
): Promise<Result<T>> {
  const connection: Connection = await getPoolConnection(config);
  let sqlResult: Result<T>;
  let text = '';
  let params: BindParameters = {};
  try {
    if (sql instanceof Sql) {
      text = sql.sql;
      const values = sql.values;
      if (Array.isArray(values)) {
        throw new TypeError('Cannot bind array values in mutateSql');
      }
      params = values;
      options = paramsOrOptions as ExecuteOptions;
    } else {
      text = sql;
      params = paramsOrOptions as BindParameters;
    }
    sqlResult = await connection.execute(
      // The statement to execute
      text,
      // ex: The "bind value" 180 for the "bind variable" :id
      params,
      // query options
      {
        ...options,
        outFormat: oracledb.OUT_FORMAT_OBJECT, // return as json object
        extendedMetaData: false, // return additional metadata
        autoCommit: true,
        // resultSet: true,
      }
    );
  } catch (error) {
    if (connection) {
      doRelease(connection);
    }
    throw error;
  }
  if (connection) doRelease(connection);
  return sqlResult;
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
  options?: ExecuteManyOptions
): Promise<Results<T>>;
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
  params?: BindParameters[],
  options?: ExecuteManyOptions
): Promise<Results<T>>;
async function mutateManySql<T>(
  configOrConnection: ConfigOrConnection,
  sql: string | Sql,
  paramsOrOptions: BindParameters[] | ExecuteManyOptions = sql instanceof Sql
    ? {}
    : [],
  options: ExecuteManyOptions = {}
): Promise<Results<T>> {
  const isConfig = !isConnection(configOrConnection);
  const connection: Connection = isConnection(configOrConnection)
    ? configOrConnection
    : await oracledb.getConnection({
        user: configOrConnection.user,
        password: configOrConnection.password,
        connectString: configOrConnection.connectString,
      });
  // if (!isConfig) connection = configOrConnection;
  let sqlResult: Results<T>;
  let text = '';
  let params: BindParameters[] = [];
  try {
    if (sql instanceof Sql) {
      text = sql.sql;
      const values = sql.values;
      if (!Array.isArray(values)) {
        throw new TypeError('Sql must be using array values for mutateMany');
      }
      params = values; // as Value[][];
      options = paramsOrOptions as ExecuteManyOptions;
    } else {
      text = sql;
      params = paramsOrOptions as BindParameters[];
    }
    // if (isConfig) {
    //   connection = await oracledb.getConnection({
    //     user: configOrConnection.user,
    //     password: configOrConnection.password,
    //     connectString: configOrConnection.connectString,
    //   });
    // }
    sqlResult = await connection.executeMany(
      // The statement to execute
      text,
      // ex: The "bind value" 180 for the "bind variable" :id
      params,
      // query options
      {
        autoCommit: isConfig,
        ...options,
      }
    );
  } catch (error) {
    if (connection) {
      doRelease(connection);
    }
    throw error;
  }
  if (connection && isConfig) doRelease(connection);
  return sqlResult;
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
  options?: ExecuteManyOptions
): Promise<Results<T>>;
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
  params?: BindParameters[],
  options?: ExecuteManyOptions
): Promise<Results<T>>;
async function mutateManySqlPool<T>(
  config: ConnectionAttributes,
  sql: string | Sql,
  paramsOrOptions: BindParameters[] | ExecuteOptions = sql instanceof Sql
    ? {}
    : [],
  options: ExecuteManyOptions = {}
): Promise<Results<T>> {
  const connection: Connection = await getPoolConnection(config);
  let sqlResult: Results<T>;
  let text = '';
  let params: BindParameters[] = [];
  try {
    if (sql instanceof Sql) {
      text = sql.sql;
      const values = sql.values;
      if (!Array.isArray(values)) {
        throw new TypeError('Sql must be using array values for mutateMany');
      }
      params = values;
      options = paramsOrOptions as ExecuteManyOptions;
    } else {
      text = sql;
      params = paramsOrOptions as BindParameters[];
    }
    sqlResult = await connection.executeMany(
      // The statement to execute
      text,
      // ex: The "bind value" 180 for the "bind variable" :id
      params,
      // query options
      {
        ...options,
        autoCommit: true,
      }
    );
  } catch (error) {
    if (connection) {
      doRelease(connection);
    }
    throw error;
  }
  if (connection) doRelease(connection);
  return sqlResult;
}

export {
  getSql,
  mutateSql,
  mutateSqlPool,
  getSqlPool,
  mutateManySql,
  mutateManySqlPool,
};
