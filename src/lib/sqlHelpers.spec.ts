import OracleDB from 'oracledb';
import { toBindDefs } from '..';
import { sql } from './sql';

describe('toBindDefs', () => {
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
