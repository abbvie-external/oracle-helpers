# Oracle Helpers

A collection of helpers for alleviating boilerplate in OracleDB projects

[SQL Template Tag](#SQL-Template-Tag)

# Installation

Install using

```
npm install oracle-helpers
```

### API Page

https://abbvie-external.github.io/oracle-helpers/

# Options

Configuration lets you set up certain behaviors to customize how the pools work outside of oracle

```js
import { configuration } from 'oracle-helpers';
/** Amount of time (in ms) between pings to check on connection behavior. */
configuration.pingTime = 60000; // 1 minute
/** Amount of time to wait (in ms) for getting a connection before deciding that there's a problem with the pool */
configuration.connectionTimeout = 10000; // 10 seconds
/** Amount of time to wait (in ms) for the ping to complete before deciding that there's a problem with the pool */
configuration.pingTimeout = 3000; // 3 seconds
```

poolOptions lets you set the behavior of the pools within oracle

```js
import { poolOptions } from 'oracle-helpers';

poolOptions['oracle db connection string'] = {
  poolMin: 12,
  poolMax: 20,
  poolTimeout: 120,
};
```

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

## sql tagged template vs sql text + params:

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
  }
);

// sql tagged template with params (for syntax highlighting only):
const query2 = sql`SELECT * FROM TABLE where ID=:id`;

getSql<{ ID: number; NAME: string }[]>(dbConfig, query2.sql, { id: 5 }).then(
  (rows) => {
    console.log(rows);
  }
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
    }
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
      }
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
      }
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
        }}`
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
      }
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

> ES2015 tagged template string for preparing SQL statements, works for this oracle helpers library.

### Modified from:

https://github.com/blakeembrey/sql-template-tag

## Installation

```
npm install sql-template-tag --save
```

## Extension for syntax highlighting (basic):

https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals-syntax-only

## Usage

```ts
import { sql, empty, join, raw, getSql, mutateManySql } from 'sql-template-tag';

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

Accepts an array of values and returns a SQL instance with the values joined by the separator. E.g.

```js
const query = join([1, 2, 3]);

query.sql; //=> "$1, $2, $3"
query.values; //=> {1: $1, 2: $2, 3: $3}
```

### Raw

Accepts a string and returns a SQL instance, useful if you want some part of the SQL to be dynamic.

```js
raw('SELECT'); // == sql`SELECT`
```

**Do not** accept user input to `raw`, this will create a SQL injection vulnerability.

### Empty

Simple placeholder value for an empty SQL string. Equivalent to `raw("")`.

## Related

Some other modules exist that do something similar but for the wrong form of sql! Every flavour does variables differently:

- [`sql-template-tag`](https://github.com/blakeembrey/sql-template-tag): The origin for this part of the module. - supports postgres and mysql
- [`node-sql-template-strings`](https://github.com/felixfbecker/node-sql-template-strings): promotes mutation via chained methods and lacks nesting SQL statements. - supports postgres and mysql
- [`pg-template-tag`](https://github.com/XeCycle/pg-template-tag): missing TypeScript and MySQL support. By supporting `pg` only it has the ability to [dedupe `values`](https://github.com/XeCycle/pg-template-tag/issues/5#issuecomment-386875336). - That's where I got the idea to dedupe values in this fork.

<!--
## License

MIT

[npm-image]: https://img.shields.io/npm/v/sql-template-tag.svg?style=flat
[npm-url]: https://npmjs.org/package/sql-template-tag
[downloads-image]: https://img.shields.io/npm/dm/sql-template-tag.svg?style=flat
[downloads-url]: https://npmjs.org/package/sql-template-tag
[travis-image]: https://img.shields.io/travis/blakeembrey/sql-template-tag.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/sql-template-tag
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/sql-template-tag.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/sql-template-tag?branch=master -->
