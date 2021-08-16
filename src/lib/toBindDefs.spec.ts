import OracleDB from 'oracledb';
import { sql } from './sql';
import { toBindDefs } from './toBindDefs';

describe('toBindDefs', () => {
  test('Should work with a non-array input', () => {
    const bindDefs = toBindDefs({ 1: 5 });
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.NUMBER, maxSize: undefined },
    });
  });
  test('Should work with Sql', () => {
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

  test('Should work with a null', () => {
    const bindDefs = toBindDefs([{ 1: null }]);
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.DEFAULT, maxSize: undefined },
    });
  });
  test('Should work with a null in first row', () => {
    const str = 'test';
    const bindDefs = toBindDefs([{ 1: null }, { 1: str }]);
    expect(bindDefs).toEqual({
      1: { dir: OracleDB.BIND_IN, type: OracleDB.STRING, maxSize: str.length },
    });
  });
  test('Should have the right length with unicode characters', () => {
    const str = 'ЭЭХ! Naïve?';
    const bindDefs = toBindDefs([{ 1: str }]);
    expect(bindDefs).toEqual({
      1: {
        dir: OracleDB.BIND_IN,
        type: OracleDB.STRING,
        maxSize: Buffer.byteLength(str, 'utf-8'),
      },
    });
  });

  test('should work with an out bind override', () => {
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
});
