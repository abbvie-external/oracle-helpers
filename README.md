# Oracle Helpers

A collection of helpers for alleviating boilerplate in OracleDB projects

# Installation

Create `.npmrc` file in the project with this in order to install from the @abv internal nexus

```
@abv:registry=***REMOVED***/repository/npm-internal/
```

Install using

```
npm install @abv/oracle-helpers
```

### API Page

***REMOVED***/oracle-helpers/

# Options

Configuration lets you set up certain behaviors to customize how the pools work outside of oracle

```js
import { configuration } from '@abv/oracle-helpers';
/** Amount of time (in ms) between pings to check on connection behavior. */
configuration.pingTime = 60000; // 1 minute
/** Amount of time to wait (in ms) for getting a connection before deciding that there's a problem with the pool */
configuration.connectionTimeout = 10000; // 10 seconds
/** Amount of time to wait (in ms) for the ping to complete before deciding that there's a problem with the pool */
configuration.pingTimeout = 3000; // 3 seconds
```

poolOptions lets you set the behavior of the pools within oracle

```js
import { poolOptions } from '@abv/oracle-helpers';

poolOptions['oracle db connection string'] = {
  poolMin: 12,
  poolMax: 20,
  poolTimeout: 120,
};
```

# Usage

## Getters

```ts
import { getSql, getSqlPool } from '@abv/oracle-helpers';

const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};
const sql = `SELECT * FROM TABLE where ID=:id`;

getSql<{ ID: number; NAME: string }[]>(dbConfig, sql, { id: 5 }).then(
  (rows) => {
    console.log(rows);
  }
);

getSqlPool<{ ID: number; NAME: string }[]>(dbConfig, sql, {
  id: 5,
}).then((rows) => {
  console.log(rows);
});
```

## Mutations

```ts
import {
  mutateSql,
  mutateSqlPool,
  mutateManySql,
  mutateManySqlPool,
} from '@abv/oracle-helpers';

const dbConfig = {
  user: 'username',
  password: 'password',
  connectString: 'oracle db connection string',
};

const sql = `INSERT INTO TABLE (ID, NAME) VALUES (:id, :name)`;
const runSql = async () => {
  await mutateSql(dbConfig, sql, { id: 5, name: 'test' });

  await mutateSqlPool(dbConfig, sql, { id: 6, name: 'test2' });

  await mutateManySql(dbConfig, sql, [
    { id: 7, name: 'test3' },
    { id: 8, name: 'test4' },
  ]);

  await mutateManySqlPool(dbConfig, sql, [
    { id: 8, name: 'test5' },
    { id: 9, name: 'test6' },
  ]);
};
```

## Advanced

Run multiple mutations with a get inbetween in a single all-or-nothing transaction including returning a value from an insert.

```ts
import { NUMBER, BIND_OUT } from 'oracledb';
import { getPoolConnection, getSql, mutateSql } from '@abv/oracle-helpers';
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
    const result = await mutateSql(connection, sql, {
      name: 'test',
      id: { type: NUMBER, dir: BIND_OUT },
    });

    const id = (result.outBinds as { id: number[] }).id[0];

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
