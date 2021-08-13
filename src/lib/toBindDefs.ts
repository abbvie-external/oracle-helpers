import OracleDB, { BindDefinition } from 'oracledb';
import { Value } from './sql';

function getTypeFromValue(value?: Value) {
  if (typeof value === 'string') {
    return OracleDB.STRING;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return OracleDB.NUMBER;
  }
  if (value instanceof Date) {
    return OracleDB.DATE;
  }
  if (value instanceof Buffer) {
    return OracleDB.BUFFER;
  }
  return OracleDB.DEFAULT;
}

function getMaxSize(
  key: string,
  type: number,
  values: Record<string, Value>[]
): number | undefined {
  switch (type) {
    case OracleDB.BUFFER:
      return Math.max(
        ...values.map((valueObj) => {
          return (valueObj[key] as Buffer)?.byteLength ?? null;
        })
      );
    case OracleDB.STRING:
      return Math.max(
        ...values.map((valueObj) => {
          return Buffer.byteLength((valueObj[key] as string) ?? '', 'utf-8');
        })
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
  overrides: Record<string, BindDefinition> = {}
): Record<string, BindDefinition> {
  if (
    Array.isArray(valueOrValues)
      ? !valueOrValues.length
      : !Object.keys(valueOrValues)?.length
  ) {
    return overrides;
  }
  const defs: Record<string, BindDefinition> = overrides;
  const valuesArr = Array.isArray(valueOrValues)
    ? valueOrValues
    : [valueOrValues];
  const firstValue = valuesArr[0];
  for (const key of Object.keys(firstValue)) {
    const type = overrides[key]?.type ?? getTypeFromValue(firstValue[key]);
    defs[key] = {
      ...overrides[key],
      dir: overrides[key]?.dir ?? OracleDB.BIND_IN,
      type,
      maxSize: overrides[key]?.maxSize ?? getMaxSize(key, type, valuesArr),
    };
  }

  return defs;
}
