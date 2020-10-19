import { inspect } from 'util';

import test from 'ava';

import { empty, join, raw, sql, Sql } from './sql';

test('should generate sql', (t) => {
  const query = sql`SELECT * FROM books`;

  t.is(query.sql, 'SELECT * FROM books');
  t.deepEqual(query.values, []);
});

test('should store values', (t) => {
  const name = 'Blake';
  const query = sql`SELECT * FROM books WHERE author = ${name}`;

  t.is(query.sql, 'SELECT * FROM books WHERE author = :1');
  t.deepEqual(query.values, [name]);
});

test('should build sql with child sql statements', (t) => {
  const subquery = sql`SELECT id FROM authors WHERE name = ${'Blake'}`;
  const query = sql`SELECT * FROM books WHERE author_id IN (${subquery})`;

  t.is(
    query.sql,
    'SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = :1)'
  );
  t.deepEqual(query.values, ['Blake']);
});

test('should not cache values for mysql compatibility', (t) => {
  const ids = [1, 2, 3];
  const query = sql`SELECT * FROM books WHERE id IN (${join(
    ids
  )}) OR author_id IN (${join(ids)})`;

  t.is(
    query.sql,
    'SELECT * FROM books WHERE id IN (:1,:2,:3) OR author_id IN (:4,:5,:6)'
  );

  t.deepEqual(query.values, [1, 2, 3, 1, 2, 3]);
});

test('should provide "empty" helper', (t) => {
  const query = sql`SELECT * FROM books ${empty}`;

  t.is(query.sql, 'SELECT * FROM books ');

  t.deepEqual(query.values, []);
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
  t.deepEqual(query.values, [1, 2, 3]);
});

test('should error joining an empty list', (t) => {
  t.throws(() => join([]), { instanceOf: TypeError });
});
// test('join', (t) => {
// });

test('should accept any string', (t) => {
  const value = Math.random().toString();
  const query = raw(value);

  t.is(query.sql, value);
  t.deepEqual(query.values, []);
});
// test('raw', (t) => {
// });

test('should format arrays correctly for mutateMany', (t) => {
  const query = sql`INSERT INTO books (author, genre) values(${[
    'bob',
    'joe',
    'bill',
  ]}, ${['fantasy', 'historical', 'romance']})`;
  t.is(query.sql, 'INSERT INTO books (author, genre) values(:1, :2)');
  t.deepEqual(query.values, [
    ['bob', 'fantasy'],
    ['joe', 'historical'],
    ['bill', 'romance'],
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
    ['bob', 'fantasy'],
    ['joe', 'fantasy'],
    ['bill', 'fantasy'],
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
