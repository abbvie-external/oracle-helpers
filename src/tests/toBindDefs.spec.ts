import test, { describe } from 'node:test';
import OracleDB from 'oracledb';
import { sql, toBindDefs } from '../index.js';

describe('toBindDefs', () => {
  test(
    'Should work with a non-array input',
    { concurrency: true },
    (t: test.TestContext) => {
      const bindDefs = toBindDefs({ 1: 5 });
      t.assert.deepEqual(bindDefs, {
        1: { dir: OracleDB.BIND_IN, type: OracleDB.NUMBER, maxSize: undefined },
      });
    },
  );
  test('Should work with Sql', { concurrency: true }, (t: test.TestContext) => {
    const str = 'fantasy';
    const query = sql`INSERT INTO books (author, genre) values(${[
      'bob',
      'joe',
      'bill',
    ]}, ${str})`;
    const { values } = query;
    const bindDefs = toBindDefs(values);
    t.assert.deepEqual(bindDefs, {
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
      2: {
        dir: OracleDB.BIND_IN,
        type: OracleDB.STRING,
        maxSize: str.length,
      },
    });
  });
  test(
    'Should return overrides for empty values',
    { concurrency: true },
    (t: test.TestContext) => {
      t.assert.deepEqual(toBindDefs(sql`blah`.values), {});
      t.assert.deepEqual(toBindDefs({}), {});
      t.assert.deepEqual(toBindDefs([]), {});
      const override = {
        1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
      };
      t.assert.deepEqual(toBindDefs([], override), override);
    },
  );

  test(
    'Should work with a null',
    { concurrency: true },
    (t: test.TestContext) => {
      const bindDefs = toBindDefs([{ 1: null }]);
      t.assert.deepEqual(bindDefs, {
        1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 1 },
      });
    },
  );
  test(
    'Should work with a null in first row',
    { concurrency: true },
    (t: test.TestContext) => {
      const str = 'test';
      const bindDefs = toBindDefs([{ 1: null }, { 1: str }]);
      t.assert.deepEqual(bindDefs, {
        1: {
          dir: OracleDB.BIND_IN,
          type: OracleDB.STRING,
          maxSize: str.length,
        },
      });
    },
  );
  test(
    'Should work with a Date',
    { concurrency: true },
    (t: test.TestContext) => {
      const bindDefs = toBindDefs([{ 1: new Date() }]);
      t.assert.deepEqual(bindDefs, {
        1: { dir: OracleDB.BIND_IN, type: OracleDB.DATE, maxSize: undefined },
      });
    },
  );
  test(
    'Should work with Buffers',
    { concurrency: true },
    (t: test.TestContext) => {
      const buffer = Buffer.from('test string');
      const buffer2 = Buffer.from('test string 2');
      const bindDefs = toBindDefs([{ 1: buffer }, { 1: buffer2 }, { 1: null }]);
      t.assert.deepEqual(bindDefs, {
        1: {
          dir: OracleDB.BIND_IN,
          type: OracleDB.BUFFER,
          maxSize: Math.max(buffer.byteLength, buffer2.byteLength),
        },
      });
    },
  );
  test(
    'Should have the right length with unicode characters',
    { concurrency: true },
    (t: test.TestContext) => {
      const str = 'ЭЭХ! Naïve?';
      const bindDefs = toBindDefs([{ 1: str }]);
      t.assert.deepEqual(bindDefs, {
        1: {
          dir: OracleDB.BIND_IN,
          type: OracleDB.STRING,
          maxSize: Buffer.byteLength(str, 'utf-8'),
        },
      });
    },
  );

  test(
    'should work with an out bind override',
    { concurrency: true },
    (t: test.TestContext) => {
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
      t.assert.deepEqual(bindDefs, {
        ...overrides,
        1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
        2: {
          dir: OracleDB.BIND_IN,
          type: OracleDB.STRING,
          maxSize: 100,
        },
      });
    },
  );
  test(
    'override should take priority',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`INSERT INTO books (author, genre) values(${[
        'bob',
        'joe',
        'bill',
      ]}, ${'fantasy'})`;
      const { values } = query;
      const overrides = {
        id: {
          dir: OracleDB.BIND_OUT,
          type: OracleDB.NUMBER,
        },
        2: {
          maxSize: 100,
          type: OracleDB.STRING,
          dir: OracleDB.BIND_IN,
        },
      };
      const bindDefs = toBindDefs(values, overrides);
      t.assert.deepEqual(bindDefs, {
        ...overrides,
        1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
      });
    },
  );
});
