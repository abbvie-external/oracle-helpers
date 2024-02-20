import oracledb from 'oracledb';
import type { BindDefinition } from 'oracledb';
import { Value } from './sql.js';

const { BIND_IN, BUFFER, DATE, NUMBER, STRING } = oracledb;

type Values = Record<string, Value>[];

function getTypeFromValue(key: string, values: Values): number | undefined {
  for (let i = 0; i < values.length; ++i) {
    const value = values[i][key];
    if (value == null) {
      continue;
    }
    const type = typeof value;
    if (type === 'string') {
      return STRING;
    }
    if (type === 'number' || type === 'bigint') {
      return NUMBER;
    }
    if (value instanceof Date) {
      return DATE;
    }
    if (value instanceof Buffer) {
      return BUFFER;
    }
  }
  // If it reached here, it's nulls throughout
  return undefined;
}

function getMaxSize(
  key: string,
  type: number | undefined,
  values: Record<string, Value>[],
): number | undefined {
  switch (type) {
    case BUFFER:
    case STRING:
      return Math.max(
        ...values.map((valueObj) => {
          return valueObj[key] != null
            ? Buffer.byteLength(valueObj[key] as string | Buffer, 'utf-8')
            : 1;
        }),
      );
    default:
      return undefined;
  }
}

/**
 *  Convert Sql values to the relevant bind definitions.
 *  This is important because inline BindDefs don't work in mutateMany
 * @param valueOrValues Sql.values property
 * @param overrides Overrides to add into the generated definitions
 * @returns Oracle Bind Definitions
 */
export function toBindDefs(
  valueOrValues: Record<string, Value> | Record<string, Value>[],
  overrides: Record<string, BindDefinition> = {},
): Record<string, BindDefinition> {
  const isArray = Array.isArray(valueOrValues);
  if (isArray ? !valueOrValues.length : !Object.keys(valueOrValues).length) {
    return overrides;
  }
  const defs: Record<string, BindDefinition> = overrides;
  const valuesArr = isArray ? valueOrValues : [valueOrValues];
  for (const key of Object.keys(valuesArr[0])) {
    const type = overrides[key]?.type ?? getTypeFromValue(key, valuesArr);
    defs[key] = {
      ...overrides[key],
      dir: overrides[key]?.dir ?? BIND_IN,
      type,
      maxSize: overrides[key]?.maxSize ?? getMaxSize(key, type, valuesArr),
    };
    if (type == null) {
      // Oracle requires a type for all bind params
      // if any bind params are included.
      // If there's no sane type available,
      // use STRING since it has the broadest compatibility
      // oracle requires a maxSize>0 for STRING binds
      defs[key].type = STRING;
      defs[key].maxSize = defs[key].maxSize ?? 1;
    }
  }

  return defs;
}
