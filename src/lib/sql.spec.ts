import { inspect } from 'util';

import test from 'ava';

import { empty, join, raw, sql, Sql } from './sql';

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
// test('join', (t) => {
// });

test('should accept any string', (t) => {
  const value = Math.random().toString();
  const query = raw(value);

  t.is(query.sql, value);
  t.deepEqual(query.values, {});
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
