import type { BindParameter } from 'oracledb';
import OracleDB from 'oracledb';

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
  | BindParameter
  | BindWithName
  | string
  | number
  | bigint
  | Date
  | Buffer
  | null;
export type ValueArray = Value[] | Value;
export type RawValue = Value | Sql | Value[];

/**
 * A SQL instance can be nested within each other to build SQL strings.
 *
 * Extension: https://marketplace.visualstudio.com/items?itemName=thebearingedge.vscode-sql-lit
 *
 * Extension: https://marketplace.visualstudio.com/items?itemName=frigus02.vscode-sql-tagged-template-literals-syntax-only
 *
 * Adapted for Oracle from https://github.com/blakeembrey/sql-template-tag
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
  /**
   * Join together multiple values into a single `Sql` instance
   * @param values The values to join together
   * @returns an `Sql` instance with the values joined by the separator (the `this` Sql instance)
   */
  join(values: RawValue[]): Sql {
    if (!Array.isArray(values) || !values.length) {
      return empty;
    }
    const toAdd: RawValue[] = [];
    for (let i = 0; i < values.length; ++i) {
      toAdd.push(values[i]);
      if (i !== values.length - 1) {
        toAdd.push(this);
      }
    }
    return new Sql(Array(toAdd.length + 1).fill(''), toAdd);
  }
  get sql() {
    this.updateMap();
    return this.strings.reduce((text, part, index) => {
      const value = this.#values[index - 1];
      const position = this.#valueMap.get(value);
      if (position == null) {
        throw new TypeError('position cannot be null');
      }
      let name: string | number = position + 1;
      if (value && typeof value === 'object' && 'name' in value) {
        name = value.name;
      }
      return `${text}:${name}${part}`;
    });
  }

  get values(): Record<string, Value> | Record<string, Value>[] {
    this.updateMap();
    let numRows = 0;

    const uniqueValues = this.#values
      .map<[ValueArray, number | string] | null>((values, index) => {
        const position = this.#valueMap.get(values);
        if (position == null) {
          throw new TypeError('position cannot be null');
        }
        let name: number | string = position + 1;
        if (values && typeof values === 'object' && 'name' in values) {
          name = values.name;
        }
        if (position !== index) {
          return null;
        }
        return [values, name];
      })
      .filter((val): val is NonNullable<typeof val> => !!val);

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
      return (uniqueValues as [Value, string | number][]).reduce<
        Record<number | string, Value>
      >((row, [value, position]) => {
        row[position] = value;
        return row;
      }, {});
    }
  }

  [Symbol.for('nodejs.util.inspect.custom')]() {
    return {
      sql: this.sql,
      values: this.values,
    };
  }
  /**
   * This synchronous method returns the input value as a string that can safely be included in a SQL statement as a string literal.
   *
   * Embedded single quote characters are doubled. Non-string, non number values fail standard parameter validation.
   *
   * **NOTE** Requires > OracleDB@v7
   * @param value — The value to be converted to a SQL string literal.
   */
  static literal(value: number | bigint | string | Sql): Sql {
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'bigint'
    ) {
      if ('enquoteLiteral' in OracleDB) {
        return raw(OracleDB.enquoteLiteral(`${value}`));
      } else {
        throw new TypeError('OracleDB.enquoteLiteral is not available');
      }
    }
    return value;
  }
  /**
   * This synchronous method returns the input string as Sql validated to be a valid SQL identifier. If needed, it will be enclosed in double quotes to make it valid.
   *
   * Values will be enquoted if `alwaysEnquote` is `true`, or if its a simpleSqlName with `capitalize` `false` that doesn't include quotes. If a non quoted value is input with `capitalize` `false`, then even if its already a simpleSqlName, it will be enquoted to preserve the intended case.
   *
   * The default value of `capitalize` is `true`, so the input is converted to uppercase using locale-independent Unicode rules before quoting. Set capitalize to false to preserve case. Any input containing a double quote character is rejected.
   *
   * Uppercasing is done in the Node.js client and can differ from Oracle Database DBMS_ASSERT.ENQUOTE_NAME() behavior for some characters.
   *
   * **NOTE** Requires > OracleDB@v7
   *
   * @param name — The string to be quoted for identifier use.
   */
  static name(
    name: string | Sql,
    { capitalize = true, alwaysEnquote = false }: EnquoteNameOptions = {},
  ): Sql {
    if (typeof name === 'string') {
      if ('enquoteName' in OracleDB) {
        if (!alwaysEnquote) {
          if (name.includes('.') && OracleDB.isQualifiedSqlName(name)) {
            return raw(name);
          }
          if (
            (capitalize || name.includes('"')) &&
            OracleDB.isSimpleSqlName(name)
          ) {
            return raw(name);
          }
        }
        return raw(OracleDB.enquoteName(`${name}`, capitalize));
      } else {
        throw new TypeError('OracleDB.enquoteName is not available');
      }
    }
    return name;
  }
  /**
   * Create raw SQL statement.
   *
   * This allows you to turn a variable directly into sql without making it a bind parameter.
   *
   * **Warning** This is dangerous and should only be used with trusted input or escaped input.
   *
   * Use `Sql.name` or `Sql.literal` instead whenever possible to ensure proper quoting and escaping.
   */
  static raw(value: number | bigint | string | Sql): Sql {
    return raw(value);
  }
}

Object.defineProperty(Sql.prototype, 'values', { enumerable: true });
Object.defineProperty(Sql.prototype, 'sql', { enumerable: true });

/**
 * Join together multiple values into a single `Sql` instance
 * @param values The values to join together
 * @param separator The string to use in joining the values together. Defaults to '`,`'.
 *
 * Note: Does not get sanitized! Never let user controlled values be used as the separator!
 * @returns an `Sql` instance with the values joined by the separator
 */
export function join(values: RawValue[], separator = ',') {
  if (!Array.isArray(values) || !values.length) {
    return empty;
  }

  return new Sql(['', ...Array(values.length - 1).fill(separator), ''], values);
}

/**
 * Create raw SQL statement.
 *
 * This allows you to turn a variable directly into sql without making it a bind parameter.
 *
 * **Warning** This is dangerous and should only be used with trusted input or escaped input.
 *
 * Use `Sql.name` or `Sql.literal` instead whenever possible to ensure proper quoting and escaping.
 */
export function raw(value: number | bigint | string | Sql): Sql {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint'
  ) {
    return new Sql([`${value}`], []);
  }
  return value;
}

export interface EnquoteNameOptions {
  /**
   * Indicates whether the input string is converted to uppercase before quoting. The default is true.
   * @default true
   */
  capitalize?: boolean;
  /**
   * If true, the input string will always be run through `oracledb.enquoteName` instead of checking if its a valid SQL identifier (simple or complex) first
   * @default false
   */
  alwaysEnquote?: boolean;
}

/**
 * Convenience value for an empty `Sql` instance.
 *
 * Shortcut for `raw('')`.
 *
 * note that `raw('') != empty` and `sql != empty` due to object references,
 * so it is often better to just use this whenever you are dealing with an empty `Sql` value
 */
export const empty = raw('');

/**
 * Create a SQL object from a template string.
 */
export function sql(strings: ReadonlyArray<string>, ...values: RawValue[]) {
  return new Sql(strings, values);
}
