import OracleDB from 'oracledb';
import { sql, toBindDefs } from '../';

describe('toBindDefs', () => {
  test.concurrent('Should work with a non-array input', () => {
    const bindDefs = toBindDefs({ 1: 5 });
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.NUMBER, maxSize: undefined },
    });
  });
  test.concurrent('Should work with Sql', () => {
    const str = 'fantasy';
    const query = sql`INSERT INTO books (author, genre) values(${[
      'bob',
      'joe',
      'bill',
    ]}, ${str})`;
    const { values } = query;
    const bindDefs = toBindDefs(values);
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
      2: {
        dir: OracleDB.BIND_IN,
        type: OracleDB.STRING,
        maxSize: str.length,
      },
    });
  });
  test.concurrent('Should return overrides for empty values', () => {
    expect(toBindDefs(sql`blah`.values)).toEqual({});
    expect(toBindDefs({})).toEqual({});
    expect(toBindDefs([])).toEqual({});
    const override = {
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
    };
    expect(toBindDefs([], override)).toEqual(override);
  });

  test.concurrent('Should work with a null', () => {
    const bindDefs = toBindDefs([{ 1: null }]);
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 1 },
    });
  });
  test.concurrent('Should work with a null in first row', () => {
    const str = 'test';
    const bindDefs = toBindDefs([{ 1: null }, { 1: str }]);
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: str.length },
    });
  });
  test.concurrent('Should work with a Date', () => {
    const bindDefs = toBindDefs([{ 1: new Date() }]);
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.DATE },
    });
  });
  test.concurrent('Should work with Buffers', () => {
    const buffer = Buffer.from('test string');
    const buffer2 = Buffer.from('test string 2');
    const bindDefs = toBindDefs([{ 1: buffer }, { 1: buffer2 }, { 1: null }]);
    expect(bindDefs).toEqual({
      1: {
        dir: OracleDB.BIND_IN,
        type: OracleDB.BUFFER,
        maxSize: Math.max(buffer.byteLength, buffer2.byteLength),
      },
    });
  });
  test.concurrent(
    'Should have the right length with unicode characters',
    () => {
      const str = 'ЭЭХ! Naïve?';
      const bindDefs = toBindDefs([{ 1: str }]);
      expect(bindDefs).toEqual({
        1: {
          dir: OracleDB.BIND_IN,
          type: OracleDB.STRING,
          maxSize: Buffer.byteLength(str, 'utf-8'),
        },
      });
    },
  );

  test.concurrent('should work with an out bind override', () => {
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
    expect(bindDefs).toEqual({
      ...overrides,
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
      2: {
        dir: OracleDB.BIND_IN,
        type: OracleDB.STRING,
        maxSize: 100,
      },
    });
  });
  test.concurrent('override should take priority', () => {
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
    expect(bindDefs).toEqual({
      ...overrides,
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: 4 },
    });
  });
});
