import { inspect } from 'util';
import oracledb from 'oracledb';
import { empty, join, raw, sql, Sql } from '../';

const { BIND_OUT, NUMBER } = oracledb;

describe('sql', () => {
  test.concurrent('should generate sql', () => {
    const query = sql`SELECT * FROM books`;
    expect(query.sql).toBe('SELECT * FROM books');
    expect(query.values).toEqual({});
  });

  test.concurrent('should store values', () => {
    const name = 'Blake';
    const query = sql`SELECT * FROM books WHERE author = ${name}`;

    expect(query.sql).toBe('SELECT * FROM books WHERE author = :1');
    expect(query.values).toEqual({ 1: name });
  });

  test.concurrent('should build sql with child sql statements', () => {
    const subquery = sql`SELECT id FROM authors WHERE name = ${'Blake'}`;
    const query = sql`SELECT * FROM books WHERE author_id IN (${subquery})`;

    expect(query.sql).toBe(
      'SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = :1)',
    );
    expect(query.values).toEqual({ 1: 'Blake' });
  });

  test.concurrent('should support binding with a name', () => {
    const title = 'Good Omens';
    const author = 'Terry Pratchett & Neil Gaiman';
    const pages = 288;
    const bind = {
      name: 'id',
      dir: BIND_OUT,
      type: NUMBER,
    };
    const query = sql`INSERT INTO books (TITLE, AUTHOR, PAGES)
                                 VALUES (${title}, ${author}, ${pages})
                      RETURNING ID into ${bind}`;
    expect(query.sql).toBe(
      `INSERT INTO books (TITLE, AUTHOR, PAGES)\nVALUES (:1, :2, :3)\nRETURNING ID into :id`,
    );
    expect(query.values).toEqual({ 1: title, 2: author, 3: pages, id: bind });
  });

  test.concurrent('should support multiple binding with a name', () => {
    // Note: though the sql template tag supports this... Oracle doesn't.
    // It's included to make it more possible to use it declaratively
    const title = ['Good Omens', 'Guards! Guards!'];
    const author = ['Terry Pratchett & Neil Gaiman', 'Terry Pratchett'];
    const pages = [288, 416];
    const bind = {
      name: 'id',
      dir: BIND_OUT,
      type: NUMBER,
    };
    const query = sql`INSERT INTO books (TITLE, AUTHOR, PAGES)
                                 VALUES (${title}, ${author}, ${pages})
                      RETURNING ID into ${bind}`;
    expect(query.sql).toBe(
      `INSERT INTO books (TITLE, AUTHOR, PAGES)\nVALUES (:1, :2, :3)\nRETURNING ID into :id`,
    );
    expect(query.values).toEqual([
      { 1: title[0], 2: author[0], 3: pages[0], id: bind },
      { 1: title[1], 2: author[1], 3: pages[1], id: bind },
    ]);
  });

  test.concurrent('should cache values because oracle supports it', () => {
    const ids = [1, 2, 3];
    const query = sql`SELECT * FROM books WHERE id IN (${join(
      ids,
    )}) OR author_id IN (${join(ids)})`;

    expect(query.sql).toBe(
      'SELECT * FROM books WHERE id IN (:1,:2,:3) OR author_id IN (:1,:2,:3)',
    );

    expect(query.values).toEqual({ 1: 1, 2: 2, 3: 3 });
  });

  test.concurrent(
    'should dedupe values correctly when there are values after the deduped ones',
    () => {
      const query = sql`update ARS_FIELDS
    set GROUP = ${1},
        LABEL = ${2},
        TYPE = ${1},
        IS_UPDATABLE = ${3}`;
      expect(query.sql).toBe(
        'update ARS_FIELDS\nset GROUP = :1,\nLABEL = :2,\nTYPE = :1,\nIS_UPDATABLE = :4',
      );

      expect(query.values).toEqual({ 1: 1, 2: 2, 4: 3 });
    },
  );

  test.concurrent(
    'should dedupe values correctly with a bunch of deduping',
    () => {
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
      expect(query.sql).toBe(
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
          'where FIELD_ID = :11',
      );

      expect(query.values).toEqual({
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
    },
  );

  test.concurrent('should separate strings from numbers when caching', () => {
    const ids = [1, '1'];
    const query = sql`SELECT * FROM books WHERE id IN (${join(
      ids,
    )}) OR author_id IN (${join(ids)})`;

    expect(query.sql).toBe(
      'SELECT * FROM books WHERE id IN (:1,:2) OR author_id IN (:1,:2)',
    );
    expect(query.values).toEqual({ 1: 1, 2: '1' });
  });

  test.concurrent('should throw in constructor with no strings', () => {
    expect(() => new Sql([], [])).toThrow('Expected at least 1 string');
  });

  test.concurrent('should throw when values is less than expected', () => {
    expect(() => new Sql(['', ''], [])).toThrow(
      'Expected 2 strings to have 1 values',
    );
  });

  test.concurrent('should inspect sql instance', () => {
    expect(inspect(sql`SELECT * FROM test`).includes(`'SELECT * FROM test'`))
      .toBeTruthy;
  });

  test.concurrent('should have enumerable keys', () => {
    const query = sql`SELECT COUNT(1)`;
    const keys = [];

    for (const key in query) keys.push(key);

    expect(keys).toEqual(['strings', 'sql', 'values']);
  });

  test.concurrent('should handle escaped back ticks', () => {
    const query = sql`UPDATE user SET \`name\` = 'Taylor'`;

    expect(query.sql).toBe("UPDATE user SET `name` = 'Taylor'");
  });

  describe('join', () => {
    test.concurrent('should join a list', () => {
      const query = join([1, 2, 3]);

      expect(query.sql).toBe(':1,:2,:3');
      expect(query.values).toEqual({ 1: 1, 2: 2, 3: 3 });
    });

    test.concurrent('should equal empty when joining an empty array', () => {
      expect(join([])).toEqual(empty);
    });

    test.concurrent(
      'should allow joining multiple sql queries together',
      () => {
        const queries = [
          `select * from table_1;`,
          `select * from table_2;`,
          `select * from table_3;`,
        ];
        const result = join(
          queries.map((query) => raw(query)),
          '\n',
        );
        expect(result.sql).toBe(queries.join('\n'));
      },
    );

    test.concurrent(
      'should join multiple sql strings together with variables',
      () => {
        const query = join(
          [sql`one = ${1}`, sql`two = ${2}`, sql`three = ${3}`],
          ', ',
        );
        expect(query.sql).toBe('one = :1, two = :2, three = :3');
        expect(query.values).toEqual({ 1: 1, 2: 2, 3: 3 });
      },
    );
  });

  describe('raw', () => {
    test.concurrent('should accept any string', () => {
      const value = Math.random().toString();
      const query = raw(value);

      expect(query.sql).toBe(value);
      expect(query.values).toEqual({});
    });

    test.concurrent('should no-op on Sql instance', () => {
      const query = sql`test`;
      const rawQuery = raw(query);
      expect(query).toEqual(rawQuery);
    });
  });

  describe('empty', () => {
    test.concurrent('should result in an empty string', () => {
      expect(empty.strings).toHaveLength(1);
      expect(empty.strings).toEqual(['']);
    });
    test.concurrent('should not alter resulting sql', () => {
      const query = sql`SELECT * FROM books ${empty}`;

      expect(query.sql).toBe('SELECT * FROM books ');

      expect(query.values).toEqual({});
    });
  });

  test.concurrent('should format arrays correctly for mutateMany', () => {
    const query = sql`INSERT INTO books (author, genre) values(${[
      'bob',
      'joe',
      'bill',
    ]}, ${['fantasy', 'historical', 'romance']})`;
    expect(query.sql).toBe('INSERT INTO books (author, genre) values(:1, :2)');
    expect(query.values).toEqual([
      { 1: 'bob', 2: 'fantasy' },
      { 1: 'joe', 2: 'historical' },
      { 1: 'bill', 2: 'romance' },
    ]);
  });
  test.concurrent(
    'should format arrays + single values correctly for mutateMany',
    () => {
      const query = sql`INSERT INTO books (author, genre) values(${[
        'bob',
        'joe',
        'bill',
      ]}, ${'fantasy'})`;
      expect(query.sql).toBe(
        'INSERT INTO books (author, genre) values(:1, :2)',
      );
      expect(query.values).toEqual([
        { 1: 'bob', 2: 'fantasy' },
        { 1: 'joe', 2: 'fantasy' },
        { 1: 'bill', 2: 'fantasy' },
      ]);
    },
  );
  test.concurrent('should throw when arrays are different lengths', () => {
    const query = sql`INSERT INTO books (author, genre) values(${[
      'bob',
      'joe',
      'bill',
    ]}, ${['fantasy', 'historical']})`;
    expect(query.sql).toBe('INSERT INTO books (author, genre) values(:1, :2)');
    expect(() => query.values).toThrow(TypeError);
  });

  test.concurrent('should clean up extra new lines', () => {
    const query = sql`Hi
                  I'm
                  A
                  Long string
                  And
                  I have
                  lot's of spaces and new lines!
                      `;

    expect(query.sql).toBe(
      `Hi\nI'm\nA\nLong string\nAnd\nI have\nlot's of spaces and new lines!\n`,
    );
    expect(query.values).toEqual({});
  });
});
