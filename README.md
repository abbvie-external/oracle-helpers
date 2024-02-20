# Oracle Helpers

A collection of helpers for alleviating boilerplate in OracleDB projects

[Usage](#usage)
[SQL Template Tag](#SQL-Template-Tag)
[Typescript](#typescript)

## Note:

This package sets `fetchAsBuffer` and `fetchAsString` automatically. This will be changed in the next major version to avoid unexpected side-effects!

```js
oracledb.fetchAsBuffer = [oracledb.BLOB];
oracledb.fetchAsString = [oracledb.CLOB];
```

# Installation

Install using

```
npm install oracle-helpers
```

### API Page

https://abbvie-external.github.io/oracle-helpers/

# Options

## Pools

### Pool Defaults

Pool Defaults lets you set the behavior of the generated pools. These will not automatically reconfigure the pools when changed unless you close the pool first to re-create it. If you want to change the pool settings after the initial creation of the pool without closing and re-making the pool, use `getPool` and the `Pool#reconfigure` method.

To set the defaults for all future pools, use `setPoolDefaults` with `undefined` as the first parameter

```js
import { setPoolDefaults } from 'oracle-helpers';

setPoolDefaults(undefined, {
  expireTime: 1,
  connectTimeout: 10,
  poolMin: 12,
  poolMax: 20,
  poolTimeout: 120,
});
const globalDefaults = getPoolDefaults(undefined);

export const dbConfig = {
  /* ... */
};

setPoolDefaults(dbConfig, {
  poolMin: 12,
  poolMax: 20,
  poolTimeout: 120,
});

const curDefaults = getPoolDefaults(dbConfig);
```

### Pool `configuration` - Deprecated

Configuration lets you set up certain behaviors to customize how the pools work outside of oracle

This is deprecated and will be removed in the future! Use [Pool Defaults](#pool-defaults) instead

```js
import { configuration } from 'oracle-helpers';
/**
 * The number of ms between the sending of keep alive probes. If this property is set to a value greater than zero, it enables the keep alive probes
 *
 * set to `undefined` to ignore these settings
 * @deprecated For thin mode with oracledb v6+, use `setPoolDefaults` to set `expireTime` instead.
 *
 * For thick mode with oracle 19c+, use an Easy Connect string or a Connect Descriptor string. the property is `EXPIRE_TIME`
 */
configuration.pingTime = 60000; // 1 minute
/**
 * The timeout duration in ms for an application to establish an Oracle Net connection.
 *
 * set to `undefined` to ignore these settings
 * @deprecated For thin mode with oracledb v6+, use `setPoolDefaults` to set `connectTimeout` instead.
 *
 * For thick mode with oracle 19c+, use an Easy Connect string or a Connect Descriptor string. the property is `CONNECT_TIMEOUT`
 */
configuration.connectionTimeout = 10000; // 10 seconds
```

## Debug Logging

For improved debugging, you can set up a function to log the errors from oracle with the sql and parameters

```js
import { setSqlErrorLogger } from 'oracle-helpers';

if (process.env.NODE_ENV === 'development') {
  setSqlErrorLogger((error, sql, params) => {
    console.error(error, sql, params);
  });
}
```

# Usage

## `sql` Tagged Template Vs Sql Text + Params:

```ts
import { sql, getSql, getSqlPool } from 'oracle-helpers';

const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};

// sql tagged template!
const query = sql`SELECT * FROM TABLE where ID=${5}`;

getSql<{ ID: number; NAME: string }[]>(dbConfig, query).then((rows) => {
  console.log(rows);
});

// sql text + params:
const sqlText = `SELECT * FROM TABLE where ID=:id`;

getSql<{ ID: number; NAME: string }[]>(dbConfig, sqlText, { id: 5 }).then(
  (rows) => {
    console.log(rows);
  },
);

// sql tagged template with params (for syntax highlighting only):
const query2 = sql`SELECT * FROM TABLE where ID=:id`;

getSql<{ ID: number; NAME: string }[]>(dbConfig, query2.sql, { id: 5 }).then(
  (rows) => {
    console.log(rows);
  },
);
```

## Getters

```ts
import { sql, getSql, getSqlPool } from 'oracle-helpers';

const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};
const query = sql`SELECT * FROM TABLE where ID=${5}`;

getSql<{ ID: number; NAME: string }[]>(dbConfig, query).then((rows) => {
  console.log(rows);
});

getSqlPool<{ ID: number; NAME: string }[]>(dbConfig, query).then((rows) => {
  console.log(rows);
});
```

## Mutations

```ts
import {
  sql,
  mutateSql,
  mutateSqlPool,
  mutateManySql,
  mutateManySqlPool,
} from 'oracle-helpers';

const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};

const runSql = async () => {
  const query = `INSERT INTO TABLE (ID, NAME) VALUES (:id, :name)`;

  await mutateSql(dbConfig, query, { id: 5, name: 'test' });

  await mutateSqlPool(dbConfig, query, { id: 6, name: 'test2' });

  await mutateManySql(dbConfig, query, [
    { id: 7, name: 'test3' },
    { id: 8, name: 'test4' },
  ]);

  await mutateManySqlPool(dbConfig, query, [
    { id: 8, name: 'test5' },
    { id: 9, name: 'test6' },
  ]);
};

// Using the full tagged template query with different values than what was started with doesn't work, so use mutateMany if you need multiple values at once:

const runSql = async () => {
  const query = sql`INSERT INTO TABLE (ID, NAME)
                    VALUES (${[7, 8, 9, 10]},
                            ${['test', 'test2', 'test3', 'test4']}
                          )`;
  await mutateManySql(dbConfig, query);
};
```

## toBindDefs

You can use `toBindDefs` to automatically set up bind definitions from the values from the Sql template tag result.

This is especially important in `mutateMany` in which you can't include the bind definitions as part of the parameters (due to how Node Oracledb works).

This means that if you want to use `returning` in mutateMany, you need to set up the whole bind definitions object yourself. And that's what `toBindDefs` helps solve.

```ts
import OracleDB from 'oracledb';
import { mutateManySqlPool, toBindDefs } from 'oracle-helpers';
const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};

const runSql = async () => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${'fantasy'}) RETURNING id into :id`;
  // Important to pull values out of query ahead of time to avoid extra calculations.
  const { values, sql: sqlQuery } = query;
  const result = await mutateManySqlPool<{ id: [number] }>(
    dbConfig,
    sqlQuery,
    values,
    {
      bindDefs: toBindDefs(values, {
        id: {
          dir: OracleDB.BIND_OUT,
          type: OracleDB.NUMBER,
        },
      }),
    },
  );
  const ids = results.outBinds.map(({ id }) => id[0]);
  console.log('newIds:', ids);
};
```

## Advanced

Run multiple mutations with a get inbetween in a single all-or-nothing transaction including returning a value from an insert.

```ts
import { STRING, NUMBER, BIND_OUT, BIND_IN } from 'oracledb';
import { getPoolConnection, getSql, mutateSql } from 'oracle-helpers';
const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};
const sql = `INSERT INTO TABLE (ID, NAME) VALUES (ID_SEQ.NEXT_VAL, :name) returning ID into :id`;
const selectSql = `SELECT * FROM TABLE where ID=:id`;

const runSql = async () => {
  const connection = await getPoolConnection(dbConfig);

  try {
    const result = await mutateSql<{ id: number[] }>(
      connection,
      sql,
      {
        name: 'test',
      },
      {
        bindDefs: {
          name: { type: STRING, dir: BIND_IN },
          id: { type: NUMBER, dir: BIND_OUT },
        },
      },
    );

    const id = result.outBinds.id[0];

    const row = await getSql(connection, selectSql, { id })[0];

    const insertMultipleSql = `INSERT INTO TABLE_TERM (TABLE_ID, TERM_ID, TERM) VALUES (:tableId, ID_SEQ.NEXT_VAL, :term)`;

    const terms = [
      'Yes',
      'No',
      'Maybe',
      'Y',
      'N',
      'M',
      'Yeah',
      'Nah',
      'Aye',
      'Nay',
    ];

    await mutateManySql(
      connection,
      insertMultipleSql,
      terms.map((term) => ({ tableId: id, term })),
      {
        autoCommit: true, // Make it commit upon success.
      },
    );
  } finally {
    // Close the connection. This should only be necessary on success, as if there's an error it'll automatically rollback/close the connection before propagating the error
    connection.close();
  }
};
```

### Advanced with the tagged template:

```ts
import { STRING, NUMBER, BIND_IN, BIND_OUT } from 'oracledb';
import {
  sql,
  getPoolConnection,
  getSql,
  mutateSql,
  toBindDefs,
} from 'oracle-helpers';
const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};

const runSql = async () => {
  const connection = await getPoolConnection(dbConfig);

  try {
    const value = 'test';

    const result = await mutateSql<{ id: number[] }>(
      connection,
      sql`INSERT INTO TABLE (ID, NAME)
        VALUES (ID_SEQ.NEXT_VAL,${value})
        returning ID into ${{
          dir: BIND_OUT,
          type: NUMBER,
          name: 'id',
        }}`,
    );

    const id = result.outBinds.id[0];

    const selectSql = sql`SELECT * FROM TABLE where ID=${id}`;

    const row = await getSql(connection, selectSql)[0];

    const terms = [
      'Yes',
      'No',
      'Maybe',
      'Y',
      'N',
      'M',
      'Yeah',
      'Nah',
      'Aye',
      'Nay',
    ];

    const insertMultipleSql = sql`INSERT INTO TABLE_TERM
           (TABLE_ID, TERM_ID, TERM)
    VALUES (${id}, ID_SEQ.NEXT_VAL, ${terms}) returning TERM_ID into :termId`;
    const results = await mutateManySql<{ termId: [number] }>(
      connection,
      insertMultipleSql,
      {
        autoCommit: true, // Make it commit upon success.
        bindDefs: toBindDefs(values, {
          termId: { dir: BIND_OUT, type: NUMBER },
        }),
      },
    );
    const termIds = results.outBinds.map(({ termId }) => termId[0]);
    return termIds;
  } finally {
    // Close the connection - Very important!
    connection.close();
  }
};
```

# SQL Template Tag

> ES2015 tagged template string for preparing SQL statements, works for this oracle helpers library without any issues.

### Modified from:

https://github.com/blakeembrey/sql-template-tag

## Extension for syntax highlighting (basic):

https://marketplace.visualstudio.com/items?itemName=thebearingedge.vscode-sql-lit

This one has more issues in my experience:

https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals-syntax-only

## Usage

```ts
import { sql, empty, join, raw, getSql, mutateManySql } from 'oracle-helpers';

const query = sql`SELECT * FROM books WHERE id = ${id}`;

query.sql; //=> "SELECT * FROM books WHERE id = $1"
query.values; //=> {1: id}

getSql(dbConfig, query.sql, query.values);

// Embed SQL instances inside SQL instances.
const nested = sql`SELECT id FROM authors WHERE name = ${'Blake'}`;
const query = sql`SELECT * FROM books WHERE author_id IN (${nested})`;

// Join and "empty" helpers (useful for nested queries).
sql`SELECT * FROM books ${hasIds ? sql`WHERE ids IN (${join(ids)})` : empty}`;

// Mutate Many
const mutation = sql`INSERT INTO books (author, genre) values(${[
  'bob',
  'joe',
  'bill',
]}, ${['fantasy', 'historical', 'romance']})`;
mutateManySql(dbConfig, mutation.sql, mutation.values);
```

### Join

Accepts an array of values and returns an `Sql` instance with the values joined by a separator.

#### `Sql#join` method

In `Sql#join`, the separator is the `Sql` instance that the method is called on.

```js
const query = sql`,`.join([1, 2, 3]);

query.sql; //=> ":1, :2, :3"
query.values; //=> {1: 1, 2: 2, 3: 3}
```

It can also be used to create dynamic SQL by joining multiple values together.

```js
const queries = [sql`one = ${1}`, sql`two = ${2}`, sql`three = ${3}`];
const filters = sql` AND `.join(queries);
const result = sql`select * from table ${
  queries.length ? sql`WHERE ${filters}` : empty
} ORDER BY two`;
result.sql; //=> "select * from table WHERE one = :1 AND two = :2 AND three = :3 ORDER BY two"
result.values; //=> {1: 1, 2: 2, 3: 3}
```

By making a quick helper, you can simplify this use case:

```js
function joinWhere(filters, useAndAfter = false) {
  if (useAndAfter) {
    filters = filters.concat(empty);
  }
  if (filters.length) {
    return `WHERE ${join(filters.concat(empty), ' AND ')}`;
  }
}
const queries = [sql`one = ${1}`, sql`two = ${2}`, sql`three = ${3}`];
const result = sql`select * from table ${joinWhere(queries)} ORDER BY two`;
```

#### `join` Function

The standalone `join` function takes the separator as the second argument, with `,` as the default separator

```js
import { join } from 'oracle-helpers';

const query = join([1, 2, 3]);

query.sql; //=> ":1, :2, :3"
query.values; //=> {1: 1, 2: 2, 3: 3}
```

It can also be used to create dynamic SQL by joining multiple values together.

```js
const queries = [sql`one = ${1}`, sql`two = ${2}`, sql`three = ${3}`];
const filters = join(queries, ' AND ');
const result = sql`select * from table ${
  filters === empty ? empty : sql`WHERE ${filters}`
} ORDER BY two`;
result.sql; //=> "select * from table WHERE one = :1 AND two = :2 AND three = :3 ORDER BY two"
result.values; //=> {1: 1, 2: 2, 3: 3}
```

By making a quick helper, you can simplify this use case:

```js
function joinWhere(filters, useAndAfter = false) {
  if (useAndAfter) {
    filters = filters.concat(empty);
  }
  if (filters.length) {
    return `WHERE ${sql` AND `.join(filters.concat(empty))}`;
  }
}
const queries = [sql`one = ${1}`, sql`two = ${2}`, sql`three = ${3}`];
const result = sql`select * from table ${joinWhere(queries)} ORDER BY two`;
```

### Raw

Accepts a string and returns a SQL instance, useful if you want some part of the SQL to be dynamic.

**Do not** accept raw user input to `raw`, this will create a SQL injection vulnerability!

```js
raw('SELECT'); // equivalent to: sql`SELECT`
```

```js
const input = 'devUsers';
const TABLES = new Map([
  ['users', 'ENV.USERS'],
  ['devUsers', 'DEV_ENV.USERS'],
]);
sql`SELECT * FROM ${raw(TABLES.get(input))}`; // equivalent to sql`SELECT * FROM DEV_ENV.USERS`
```

### Empty

Simple placeholder value for an empty SQL string. Equivalent to `raw('')`.

You can use this to great effect when creating dynamic SQL.

```ts
/**
 * if the value passed in is a boolean, treat it as empty
 *
 * great for ensuring short-circuiting behavior while still being more readable than nested ternaries directly
 */
function sqlBool(sql: boolean | RawValue) {
  return typeof sql === 'boolean' ? empty : sql;
}

const isUpdate = false;
sql`${sqlBool(isUpdate && sql`UPDATE Test WHERE ...`)}`;
```

## Related

Some other modules exist that do something similar but for the wrong form of sql! Every flavour does variables differently:

- [`sql-template-tag`](https://github.com/blakeembrey/sql-template-tag): The origin for this part of the module. - supports postgres, mysql, and oracledb. - not as integrated with oracle
- [`node-sql-template-strings`](https://github.com/felixfbecker/node-sql-template-strings): promotes mutation via chained methods and lacks nesting SQL statements. - supports postgres and mysql
- [`pg-template-tag`](https://github.com/XeCycle/pg-template-tag): missing TypeScript and MySQL support. By supporting `pg` only, it has the ability to [dedupe `values`](https://github.com/XeCycle/pg-template-tag/issues/5#issuecomment-386875336). - That's where I got the idea to dedupe values in this fork.

# Typescript

All the sql helper functions have generics for type definitions of the return values. The generics don't affect the actual return values, so it is up to you to keep them accurate for your returns.

## Utility types

### `ToDBType`

The `ToDBType` utility type will convert an object to a representation of it that would be returned from the database. It changes any objects/arrays to `string`s. If you want to convert them to something else, you can use the third template parameter (`ObjectType`) to change the behavior. `Date`s will remain `Date` objects as Oracledb does return dates as dates. That is configurable by passing in `true` for the `DateString` argument which will also convert `Date`s to `string`s.

```ts
type Foo = {
  a: number;
  b?: string[];
  c: { id: number; value: string };
  d: Date;
};
type FooDB = ToDBType<Foo>;
//=> {
// 	a: number;
// 	b: string | null;
// 	c: string;
// 	d: Date;
//}
type FooDBNoDate = ToDBType<Foo, true>;
//=> {
// 	a: number;
// 	b: string | null;
// 	c: string;
// 	d: string;
//}
type FooDBBufferNoDate = ToDBType<Foo, true, Buffer>;
//=> {
// 	a: number;
// 	b: Buffer | null;
// 	c: Buffer;
// 	d: string;
//}
```

## Type Guards

### `isDBError`

The `isDBError` is a convenience function for duck-typing if an error is an Oracle DBError as node-oracledb doesn't expose one.

```ts
try {
} catch (error) {
  if (isDBError(error)) {
    // TS knows that this is a DBError type from node-oracledb
  }
}
```

# Development

## Environment

This package has tests (src/tests/sqlHelpers.spec.ts) which are reliant on a OracleDB instance existing. However, it doesn't create the instance, so in order to run the tests fully, there are 3 environment variables needed to connect to the DB for running the tests:

```env
NODE_ORACLEDB_CONNECTION_STRING
NODE_ORACLEDB_USER
NODE_ORACLEDB_PASSWORD
```

## Commits

Commits need to be in the Conventional Commit form for automatic changelog generation

## Publishing

In order to publish, run `npm run prepare-release` then run `git push --follow-tags origin main && npm publish` to publish.
