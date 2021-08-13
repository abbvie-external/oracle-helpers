import { inspect } from 'util';

import test from 'ava';
import OracleDB from 'oracledb';

import { empty, join, raw, sql, Sql } from './sql';
import { toBindDefs } from './sqlHelpers';

test('should generate sql', (t) => {
  const query = sql`SELECT * FROM books`;

  t.is(query.sql, 'SELECT * FROM books');
  t.deepEqual(query.values, {});
});

test('should store values', (t) => {
  const name = 'Blake';
  const query = sql`SELECT * FROM books WHERE author = ${name}`;

  t.is(query.sql, 'SELECT * FROM books WHERE author = :1');
  t.deepEqual(query.values, { 1: name });
});

test('should build sql with child sql statements', (t) => {
  const subquery = sql`SELECT id FROM authors WHERE name = ${'Blake'}`;
  const query = sql`SELECT * FROM books WHERE author_id IN (${subquery})`;

  t.is(
    query.sql,
    'SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = :1)'
  );
  t.deepEqual(query.values, { 1: 'Blake' });
});

test('should cache values because oracle supports it', (t) => {
  const ids = [1, 2, 3];
  const query = sql`SELECT * FROM books WHERE id IN (${join(
    ids
  )}) OR author_id IN (${join(ids)})`;

  t.is(
    query.sql,
    'SELECT * FROM books WHERE id IN (:1,:2,:3) OR author_id IN (:1,:2,:3)'
  );

  t.deepEqual(query.values, { 1: 1, 2: 2, 3: 3 });
});

test('should dedupe values correctly when there are values after the deduped ones', (t) => {
  const query = sql`update ARS_FIELDS
  set GROUP = ${1},
      LABEL = ${2},
      TYPE = ${1},
      IS_UPDATABLE = ${3}`;
  t.is(
    query.sql,
    'update ARS_FIELDS\nset GROUP = :1,\nLABEL = :2,\nTYPE = :1,\nIS_UPDATABLE = :4'
  );

  t.deepEqual(query.values, { 1: 1, 2: 2, 4: 3 });
});

test('should dedupe values correctly with a bunch of deduping', (t) => {
  const fieldGroup = 'Initiate',
    fieldLabel = 'Approval Completed',
    fieldType = 'v-select',
    colWidth = 3,
    isUpdatable = 0,
    requiredField = 1,
    valueType = null,
    columnId = null,
    groupOrder = 1,
    fieldOrder = 130,
    fieldId = 52;
  const query = sql`update ARS_FIELDS
  set FIELD_GROUP = ${fieldGroup},
      FIELD_LABEL = ${fieldLabel},
      FIELD_TYPE  = ${fieldType},
      COL_WIDTH   = ${colWidth},
      IS_UPDATABLE = ${isUpdatable},
      REQUIRED_FIELD = ${requiredField},
      VALUE_TYPE = ${valueType},
      COLUMN_ID = ${columnId},
      GROUP_ORDER = ${groupOrder},
      FIELD_ORDER = ${fieldOrder}
  where FIELD_ID = ${fieldId}`;
  t.is(
    query.sql,
    'update ARS_FIELDS\n' +
      'set FIELD_GROUP = :1,\n' +
      'FIELD_LABEL = :2,\n' +
      'FIELD_TYPE  = :3,\n' +
      'COL_WIDTH   = :4,\n' +
      'IS_UPDATABLE = :5,\n' +
      'REQUIRED_FIELD = :6,\n' +
      'VALUE_TYPE = :7,\n' +
      'COLUMN_ID = :7,\n' +
      'GROUP_ORDER = :6,\n' +
      'FIELD_ORDER = :10\n' +
      'where FIELD_ID = :11'
  );

  t.deepEqual(query.values, {
    '1': 'Initiate',
    '2': 'Approval Completed',
    '3': 'v-select',
    '4': 3,
    '5': 0,
    '6': 1,
    '7': null,
    '10': 130,
    '11': 52,
  });
});

test('should separate strings from numbers when caching', (t) => {
  const ids = [1, '1'];
  const query = sql`SELECT * FROM books WHERE id IN (${join(
    ids
  )}) OR author_id IN (${join(ids)})`;

  t.is(
    query.sql,
    'SELECT * FROM books WHERE id IN (:1,:2) OR author_id IN (:1,:2)'
  );
  t.deepEqual(query.values, { 1: 1, 2: '1' });
});

test('should provide "empty" helper', (t) => {
  const query = sql`SELECT * FROM books ${empty}`;

  t.is(query.sql, 'SELECT * FROM books ');

  t.deepEqual(query.values, {});
});

test('should throw in constructor with no strings', (t) => {
  t.throws(() => new Sql([], []), { message: 'Expected at least 1 string' });
});

test('should throw when values is less than expected', (t) => {
  t.throws(() => new Sql(['', ''], []), {
    message: 'Expected 2 strings to have 1 values',
  });
});

test('should inspect sql instance', (t) => {
  t.assert(inspect(sql`SELECT * FROM test`).includes(`'SELECT * FROM test'`));
});

test('should have enumerable keys', (t) => {
  const query = sql`SELECT COUNT(1)`;
  const keys = [];

  for (const key in query) keys.push(key);

  t.deepEqual(keys, ['strings', 'sql', 'values']);
});

test('should handle escaped back ticks', (t) => {
  const query = sql`UPDATE user SET \`name\` = 'Taylor'`;

  t.is(query.sql, "UPDATE user SET `name` = 'Taylor'");
});

test('should join list', (t) => {
  const query = join([1, 2, 3]);

  t.is(query.sql, ':1,:2,:3');
  t.deepEqual(query.values, { 1: 1, 2: 2, 3: 3 });
});

test('should error joining an empty list', (t) => {
  t.throws(() => join([]), { instanceOf: TypeError });
});

test('should accept any string', (t) => {
  const value = Math.random().toString();
  const query = raw(value);

  t.is(query.sql, value);
  t.deepEqual(query.values, {});
});

test('raw should no-op on Sql instance', (t) => {
  const query = sql`test`;
  const rawQuery = raw(query);
  t.deepEqual(query, rawQuery);
});

test('should format arrays correctly for mutateMany', (t) => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${['fantasy', 'historical', 'romance']})`;
  t.is(query.sql, 'INSERT INTO books (author, genre) values(:1, :2)');
  t.deepEqual(query.values, [
    { 1: 'bob', 2: 'fantasy' },
    { 1: 'joe', 2: 'historical' },
    { 1: 'bill', 2: 'romance' },
  ]);
});
test('should format arrays + single values correctly for mutateMany', (t) => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${'fantasy'})`;
  t.is(query.sql, 'INSERT INTO books (author, genre) values(:1, :2)');
  t.deepEqual(query.values, [
    { 1: 'bob', 2: 'fantasy' },
    { 1: 'joe', 2: 'fantasy' },
    { 1: 'bill', 2: 'fantasy' },
  ]);
});
test('should throw when arrays are different lengths', (t) => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${['fantasy', 'historical']})`;
  t.is(query.sql, 'INSERT INTO books (author, genre) values(:1, :2)');
  t.throws(() => query.values, { instanceOf: TypeError });
});

test('should clean up extra new lines', (t) => {
  const query = sql`Hi
                I'm
                A
                Long string
                And
                I have
                lot's of spaces and new lines!
                    `;

  t.is(
    query.sql,
    `Hi\nI'm\nA\nLong string\nAnd\nI have\nlot's of spaces and new lines!\n`
  );
  t.deepEqual(query.values, {});
});

test('Should work with toBindDefs', (t) => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${'fantasy'})`;
  const { values } = query;
  const bindDefs = toBindDefs(values);
  t.deepEqual(bindDefs, {
    1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
    2: {
      dir: OracleDB.BIND_IN,
      type: OracleDB.STRING,
      maxSize: 'fantasy'.length,
    },
  });
});

test('toBindDefs should work with an out bind override', (t) => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${'fantasy'}) RETURNING id into :id`;
  const { values } = query;
  const overrides = {
    id: {
      dir: OracleDB.BIND_OUT,
      type: OracleDB.NUMBER,
    },
    2: {
      maxSize: 100,
    },
  };
  const bindDefs = toBindDefs(values, overrides);
  t.deepEqual(bindDefs, {
    ...overrides,
    1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
    2: {
      dir: OracleDB.BIND_IN,
      type: OracleDB.STRING,
      maxSize: 100,
    },
  });
});
