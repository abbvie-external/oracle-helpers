import {
  BIND_IN,
  BindDefinition,
  BUFFER,
  DATE,
  DEFAULT,
  NUMBER,
  STRING,
} from 'oracledb';
import { Value } from './sql';

type Values = Record<string, Value>[];

function getTypeFromValue(key: string, values: Values): number {
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
  return DEFAULT;
}

function getMaxSize(
  key: string,
  type: number,
  values: Record<string, Value>[],
): number | undefined {
  switch (type) {
    case BUFFER:
    case STRING:
      return Math.max(
        ...values.map((valueObj) => {
          return valueObj[key] != null
            ? Buffer.byteLength(valueObj[key] as string | Buffer, 'utf-8')
            : 0;
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
  if (
    Array.isArray(valueOrValues)
      ? !valueOrValues.length
      : !Object.keys(valueOrValues).length
  ) {
    return overrides;
  }
  const defs: Record<string, BindDefinition> = overrides;
  const valuesArr = Array.isArray(valueOrValues)
    ? valueOrValues
    : [valueOrValues];
  for (const key of Object.keys(valuesArr[0])) {
    const type = overrides[key]?.type ?? getTypeFromValue(key, valuesArr);
    defs[key] = {
      ...overrides[key],
      dir: overrides[key]?.dir ?? BIND_IN,
      type,
      maxSize: overrides[key]?.maxSize ?? getMaxSize(key, type, valuesArr),
    };
  }

  return defs;
}
