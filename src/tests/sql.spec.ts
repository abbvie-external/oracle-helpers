import test, { describe } from 'node:test';
import { inspect } from 'node:util';
import oracledb from 'oracledb';
import { empty, join, raw, sql, Sql } from '../lib/sql.js';

const { BIND_OUT, NUMBER } = oracledb;

describe('sql', () => {
  test('should generate sql', { concurrency: true }, (t: test.TestContext) => {
    const query = sql`SELECT * FROM books`;
    t.assert.equal(query.sql, 'SELECT * FROM books');
    t.assert.deepStrictEqual(query.values, {});
  });

  test('should store values', { concurrency: true }, (t: test.TestContext) => {
    const name = 'Blake';
    const query = sql`SELECT * FROM books WHERE author = ${name}`;

    t.assert.equal(query.sql, 'SELECT * FROM books WHERE author = :1');
    t.assert.deepStrictEqual(query.values, { 1: name });
  });

  test(
    'should build sql with child sql statements',
    { concurrency: true },
    (t: test.TestContext) => {
      const subquery = sql`SELECT id FROM authors WHERE name = ${'Blake'}`;
      const query = sql`SELECT * FROM books WHERE author_id IN (${subquery})`;

      t.assert.equal(
        query.sql,
        'SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = :1)',
      );
      t.assert.deepStrictEqual(query.values, { 1: 'Blake' });
    },
  );

  test(
    'should support binding with a name',
    { concurrency: true },
    (t: test.TestContext) => {
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
      t.assert.equal(
        query.sql,
        `INSERT INTO books (TITLE, AUTHOR, PAGES)\nVALUES (:1, :2, :3)\nRETURNING ID into :id`,
      );
      t.assert.deepStrictEqual(query.values, {
        1: title,
        2: author,
        3: pages,
        id: bind,
      });
    },
  );

  test(
    'should support multiple binding with a name',
    { concurrency: true },
    (t: test.TestContext) => {
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
      t.assert.equal(
        query.sql,
        `INSERT INTO books (TITLE, AUTHOR, PAGES)\nVALUES (:1, :2, :3)\nRETURNING ID into :id`,
      );
      t.assert.deepStrictEqual(query.values, [
        { 1: title[0], 2: author[0], 3: pages[0], id: bind },
        { 1: title[1], 2: author[1], 3: pages[1], id: bind },
      ]);
    },
  );

  test(
    'should cache values because oracle supports it',
    { concurrency: true },
    (t: test.TestContext) => {
      const ids = [1, 2, 3];
      const query = sql`SELECT * FROM books WHERE id IN (${join(
        ids,
      )}) OR author_id IN (${join(ids)})`;

      t.assert.equal(
        query.sql,
        'SELECT * FROM books WHERE id IN (:1,:2,:3) OR author_id IN (:1,:2,:3)',
      );

      t.assert.deepStrictEqual(query.values, { 1: 1, 2: 2, 3: 3 });
    },
  );

  test(
    'should dedupe values correctly when there are values after the deduped ones',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`update ARS_FIELDS
set GROUP = ${1},
LABEL = ${2},
TYPE = ${1},
IS_UPDATABLE = ${3}`;
      t.assert.equal(
        query.sql,
        'update ARS_FIELDS\nset GROUP = :1,\nLABEL = :2,\nTYPE = :1,\nIS_UPDATABLE = :4',
      );

      t.assert.deepStrictEqual(query.values, { 1: 1, 2: 2, 4: 3 });
    },
  );

  test(
    'should dedupe values correctly with a bunch of deduping',
    { concurrency: true },
    (t: test.TestContext) => {
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
      t.assert.equal(
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
          'where FIELD_ID = :11',
      );

      t.assert.deepStrictEqual(query.values, {
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

  test(
    'should separate strings from numbers when caching',
    { concurrency: true },
    (t: test.TestContext) => {
      const ids = [1, '1'];
      const query = sql`SELECT * FROM books WHERE id IN (${join(
        ids,
      )}) OR author_id IN (${join(ids)})`;

      t.assert.equal(
        query.sql,
        'SELECT * FROM books WHERE id IN (:1,:2) OR author_id IN (:1,:2)',
      );
      t.assert.deepStrictEqual(query.values, { 1: 1, 2: '1' });
    },
  );

  test(
    'should throw in constructor with no strings',
    { concurrency: true },
    (t: test.TestContext) => {
      t.assert.throws(
        () => new Sql([], []),
        new TypeError('Expected at least 1 string'),
      );
    },
  );

  test(
    'should throw when values is less than expected',
    { concurrency: true },
    (t: test.TestContext) => {
      t.assert.throws(
        () => new Sql(['', ''], []),
        new TypeError('Expected 2 strings to have 1 values'),
      );
    },
  );

  test(
    'should inspect sql instance',
    { concurrency: true },
    (t: test.TestContext) => {
      t.assert.ok(
        inspect(sql`SELECT * FROM test`).includes(`'SELECT * FROM test'`),
      );
    },
  );

  test(
    'should have enumerable keys',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`SELECT COUNT(1)`;
      const keys: string[] = [];

      for (const key in query) keys.push(key);

      t.assert.deepStrictEqual(keys, ['strings', 'sql', 'values']);
    },
  );

  test(
    'should handle escaped back ticks',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`UPDATE user SET \`name\` = 'Taylor'`;

      t.assert.equal(query.sql, "UPDATE user SET `name` = 'Taylor'");
    },
  );

  describe('method Join', () => {
    test('should join a list', { concurrency: true }, (t: test.TestContext) => {
      const query = sql`,`.join([1, 2, 3]);

      t.assert.equal(query.sql, ':1,:2,:3');
      t.assert.deepStrictEqual(query.values, { 1: 1, 2: 2, 3: 3 });
    });

    test(
      'should equal empty when joining an empty array',
      { concurrency: true },
      (t: test.TestContext) => {
        t.assert.deepStrictEqual(sql`,`.join([]), empty);
      },
    );

    test(
      'should allow joining multiple sql queries together',
      { concurrency: true },
      (t: test.TestContext) => {
        const queries = [
          `select * from table_1;`,
          `select * from table_2;`,
          `select * from table_3;`,
        ];
        const result = sql`; `.join(queries.map((query) => raw(query)));
        t.assert.equal(result.sql, queries.join('; '));
      },
    );

    test(
      'should join multiple sql strings together with variables',
      { concurrency: true },
      (t: test.TestContext) => {
        const statements = [
          sql`one = ${1}`,
          sql`two = ${2}`,
          sql`three = ${3}`,
        ];
        const query = sql`, `.join(statements);
        t.assert.equal(query.sql, 'one = :1, two = :2, three = :3');
        t.assert.deepStrictEqual(query.values, { 1: 1, 2: 2, 3: 3 });

        const query2 = sql` (${1}) `.join(statements);
        t.assert.equal(query2.sql, 'one = :1 (:1) two = :3 (:1) three = :5');
        t.assert.deepStrictEqual(query2.values, { 1: 1, 3: 2, 5: 3 });
      },
    );
  });

  describe('join', () => {
    test('should join a list', { concurrency: true }, (t: test.TestContext) => {
      const query = join([1, 2, 3]);

      t.assert.equal(query.sql, ':1,:2,:3');
      t.assert.deepStrictEqual(query.values, { 1: 1, 2: 2, 3: 3 });
    });

    test(
      'should equal empty when joining an empty array',
      { concurrency: true },
      (t: test.TestContext) => {
        t.assert.deepStrictEqual(join([]), empty);
      },
    );

    test(
      'should allow joining multiple sql queries together',
      { concurrency: true },
      (t: test.TestContext) => {
        const queries = [
          `select * from table_1;`,
          `select * from table_2;`,
          `select * from table_3;`,
        ];
        const result = join(
          queries.map((query) => raw(query)),
          '\n',
        );
        t.assert.equal(result.sql, queries.join('\n'));
      },
    );

    test(
      'should join multiple sql strings together with variables',
      { concurrency: true },
      (t: test.TestContext) => {
        const query = join(
          [sql`one = ${1}`, sql`two = ${2}`, sql`three = ${3}`],
          ', ',
        );
        t.assert.equal(query.sql, 'one = :1, two = :2, three = :3');
        t.assert.deepStrictEqual(query.values, { 1: 1, 2: 2, 3: 3 });
      },
    );
  });

  describe('raw', () => {
    test(
      'should accept any string',
      { concurrency: true },
      (t: test.TestContext) => {
        const value = Math.random().toString();
        const query = raw(value);

        t.assert.equal(query.sql, value);
        t.assert.deepStrictEqual(query.values, {});
      },
    );

    test(
      'should no-op on Sql instance',
      { concurrency: true },
      (t: test.TestContext) => {
        const query = sql`test`;
        const rawQuery = raw(query);
        t.assert.deepStrictEqual(query, rawQuery);
      },
    );
  });

  describe('empty', () => {
    test(
      'should result in an empty string',
      { concurrency: true },
      (t: test.TestContext) => {
        // t.assert.equal(empty.strings.length,1);
        t.assert.deepStrictEqual(empty.strings, ['']);
      },
    );
    test(
      'should not alter resulting sql',
      { concurrency: true },
      (t: test.TestContext) => {
        const query = sql`SELECT * FROM books ${empty}`;

        t.assert.equal(query.sql, 'SELECT * FROM books ');

        t.assert.deepStrictEqual(query.values, {});
      },
    );
  });

  test(
    'should format arrays correctly for mutateMany',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`INSERT INTO books (author, genre) values(${[
        'bob',
        'joe',
        'bill',
      ]}, ${['fantasy', 'historical', 'romance']})`;
      t.assert.equal(
        query.sql,
        'INSERT INTO books (author, genre) values(:1, :2)',
      );
      t.assert.deepStrictEqual(query.values, [
        { 1: 'bob', 2: 'fantasy' },
        { 1: 'joe', 2: 'historical' },
        { 1: 'bill', 2: 'romance' },
      ]);
    },
  );
  test(
    'should format arrays + single values correctly for mutateMany',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`INSERT INTO books (author, genre) values(${[
        'bob',
        'joe',
        'bill',
      ]}, ${'fantasy'})`;
      t.assert.equal(
        query.sql,
        'INSERT INTO books (author, genre) values(:1, :2)',
      );
      t.assert.deepStrictEqual(query.values, [
        { 1: 'bob', 2: 'fantasy' },
        { 1: 'joe', 2: 'fantasy' },
        { 1: 'bill', 2: 'fantasy' },
      ]);
    },
  );
  test(
    'should throw when arrays are different lengths',
    { concurrency: true },
    (t: test.TestContext) => {
      const query = sql`INSERT INTO books (author, genre) values(${[
        'bob',
        'joe',
        'bill',
      ]}, ${['fantasy', 'historical']})`;
      t.assert.equal(
        query.sql,
        'INSERT INTO books (author, genre) values(:1, :2)',
      );
      t.assert.throws(() => query.values, TypeError);
    },
  );
});
