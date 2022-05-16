import { inspect } from 'node:util';
import { BindParameter } from 'oracledb';

/**
 * Provides the ability to Bind a parameter with a name that will be used
 *
 * This is very useful for the output values
 * @example
 * ```js
 * const title = 'Good Omens';
 * const author = 'Terry Pratchett & Neil Gaiman';
 * const pages = 288;
 * const bind = {
 *   name: 'id',
 *   dir: BIND_OUT,
 *   type: NUMBER,
 * };
 * const query = sql`INSERT INTO books (TITLE, AUTHOR, PAGES)
 *                              VALUES (${title}, ${author}, ${pages})
 *                   RETURNING ID into (${bind})`;
 * ```
 */
export type BindWithName = BindParameter & { name: string };
export type Value =
  // | Record<string, unknown>
  BindParameter | BindWithName | string | number | Date | Buffer | null;
export type ValueArray = Value[] | Value;
export type RawValue = Value | Sql | Value[];

/**
 * A SQL instance can be nested within each other to build SQL strings.
 *
 * Extension: https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals-syntax-only
 *
 * @author Adapted for Oracle from https://github.com/blakeembrey/sql-template-tag
 *
 */
export class Sql {
  #values: ValueArray[];
  #valueMap: Map<ValueArray, number> = new Map();
  strings: string[];
  constructor(
    rawStrings: ReadonlyArray<string>,
    rawValues: ReadonlyArray<RawValue>,
  ) {
    let valuesLength = rawValues.length;
    let stringsLength = rawStrings.length;

    if (stringsLength === 0) {
      throw new TypeError('Expected at least 1 string');
    }

    if (stringsLength - 1 !== valuesLength) {
      throw new TypeError(
        `Expected ${stringsLength} strings to have ${stringsLength - 1} values`,
      );
    }

    for (const child of rawValues) {
      if (child instanceof Sql) {
        valuesLength += child.#values.length - 1;
        stringsLength += child.strings.length - 2;
      }
    }

    this.#values = new Array(valuesLength);
    this.strings = new Array(stringsLength);

    this.strings[0] = rawStrings[0];

    // Iterate over raw values, strings, and children. The value is always
    // positioned between two strings, e.g. `index + 1`.
    let index = 1;
    let position = 0;
    while (index < rawStrings.length) {
      const child = rawValues[index - 1];
      const rawString = rawStrings[index++];

      // Check for nested `sql` queries.
      if (child instanceof Sql) {
        // Append child prefix text to current string.
        this.strings[position] += child.strings[0];

        let childIndex = 0;
        while (childIndex < child.#values.length) {
          const value = child.#values[childIndex++];
          this.#values[position++] = value;
          // if (!this.#valueMap.has(value)) {
          //   this.#valueMap.set(value, position - 1);
          // }
          this.strings[position] = child.strings[childIndex];
        }

        // Append raw string to current string.
        this.strings[position] += rawString;
      } else {
        this.#values[position++] = child;
        // if (!this.#valueMap.has(child)) {
        //   this.#valueMap.set(child, position - 1);
        // }
        this.strings[position] = rawString;
      }
    }
  }
  private updateMap() {
    if (this.#valueMap.size) {
      return;
    }
    this.#values.forEach((value, index) => {
      if (!this.#valueMap.has(value)) {
        this.#valueMap.set(value, index);
      }
    });
  }
  get sql() {
    this.updateMap();
    return this.strings
      .reduce((text, part, index) => {
        const value = this.#values[index - 1];
        const position = this.#valueMap.get(value);
        let name: string | number = position + 1;
        if (value && typeof value === 'object' && 'name' in value) {
          name = value.name;
        }
        return `${text}:${name}${part}`;
      })
      .replace(/\n\s*/g, '\n');
  }

  get values(): Record<string, Value> | Record<string, Value>[] {
    this.updateMap();
    let numRows = 0;

    const uniqueValues = this.#values
      .map<[ValueArray, number | string]>((values, index) => {
        const position = this.#valueMap.get(values);
        let name: number | string = position + 1;
        if (values && typeof values === 'object' && 'name' in values) {
          name = values.name;
        }
        if (position !== index) {
          return null;
        }
        return [values, name];
      })
      .filter((val) => val);

    this.#values.forEach((value) => {
      if (Array.isArray(value)) {
        if (numRows && numRows !== value.length) {
          throw new TypeError(`All array values must be the same length`);
        }
        numRows = value.length;
      }
    });

    if (numRows) {
      return uniqueValues.reduce<Record<number | string, Value>[]>(
        (rows, [values, position]) => {
          if (Array.isArray(values)) {
            // values is an array of column values
            values.forEach((value, index) => (rows[index][position] = value));
            // rows.forEach((row,index))
          } else {
            rows.forEach((row) => (row[position] = values));
          }
          return rows;
        },
        new Array(numRows).fill(null).map(() => ({})),
      );
    } else {
      return uniqueValues.reduce<Record<number | string, Value>>(
        (row, [value, position]) => {
          // This isn't an array - checked earlier!
          if (Array.isArray(value)) {
            throw new TypeError("value shouldn't be array here");
          }
          row[position] = value;
          return row;
        },
        {},
      );
    }
  }

  [inspect.custom]() {
    return {
      sql: this.sql,
      values: this.values,
    };
  }
}

// Work around MySQL enumerable keys in issue #2.
// Object.defineProperty(Sql.prototype, '_values', {
//   enumerable: false,
//   writable: true,
// });
Object.defineProperty(Sql.prototype, 'values', { enumerable: true });
Object.defineProperty(Sql.prototype, 'sql', { enumerable: true });

/**
 * Create a SQL query for a list of values.
 */
export function join(values: RawValue[], separator = ',') {
  if (!Array.isArray(values) || !values.length) {
    return empty;
  }

  return new Sql(['', ...Array(values.length - 1).fill(separator), ''], values);
}

/**
 * Create raw SQL statement.
 */
export function raw(value: string | Sql) {
  if (typeof value === 'string') {
    return new Sql([value], []);
  }
  return value;
}

/**
 * Placeholder value for "no text".
 */
export const empty = raw('');

/**
 * Create a SQL object from a template string.
 */
export function sql(strings: ReadonlyArray<string>, ...values: RawValue[]) {
  return new Sql(strings, values);
}
