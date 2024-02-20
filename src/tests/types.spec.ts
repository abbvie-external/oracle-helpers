/* eslint-disable @typescript-eslint/no-unused-vars */
import { Lob } from 'oracledb';
import { ToDBType, ToOutBinds } from '../lib/sqlHelpers.js';

type Expect<T extends true> = T;

/**
 * @link https://github.com/sindresorhus/type-fest
 */
type IsEqual<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B
  ? 1
  : 2
  ? true
  : false;

describe('types', () => {
  describe('ToOutBinds', () => {
    it('performs the correct manipulations', () => {
      type test = Expect<
        IsEqual<
          ToOutBinds<{ num: number; string: string }>,
          { num: number[]; string: string[] }
        >
      >;
      type test2 = Expect<
        IsEqual<
          ToOutBinds<{ numArr: number[]; stringArr: string[] }>,
          { numArr: number[]; stringArr: string[] }
        >
      >;
      type test3 = Expect<
        IsEqual<
          ToOutBinds<{ numArr: [number]; stringArr: string[] }>,
          { numArr: [number]; stringArr: string[] }
        >
      >;
      type test4 = Expect<
        IsEqual<
          ToOutBinds<{
            numArr: [number];
            stringArr: string[];
            string: string;
            union: string | number;
            unionArr: (string | number)[];
          }>,
          {
            numArr: [number];
            stringArr: string[];
            string: string[];
            union: (string | number)[];
            unionArr: (string | number)[];
          }
        >
      >;
      type test5 = Expect<
        IsEqual<
          ToOutBinds<[number, string, number[], [number]]>,
          [number[], string[], number[], [number]]
        >
      >;
    });
  });
  describe('ToDBType', () => {
    type test = Expect<IsEqual<ToDBType<{ a: string }>, { a: string }>>;
    type test2 = Expect<IsEqual<ToDBType<{ a: string[] }>, { a: string }>>;
    type test3 = Expect<
      IsEqual<ToDBType<{ a?: string }>, { a: string | null }>
    >;
    type test4 = Expect<
      IsEqual<ToDBType<{ a: string | null }>, { a: string | null }>
    >;
    type test5 = Expect<IsEqual<ToDBType<{ a: { id: 5 } }>, { a: string }>>;
    type test6 = Expect<
      IsEqual<ToDBType<{ a: { id: 5 } | null }>, { a: string | null }>
    >;
    type date1 = Expect<IsEqual<ToDBType<{ a: Date }>, { a: Date }>>;
    type date2 = Expect<
      IsEqual<ToDBType<{ a: Date | null }>, { a: Date | null }>
    >;
    type date3 = Expect<IsEqual<ToDBType<{ a?: Date }>, { a: Date | null }>>;
  });
  describe('ToDBType', () => {
    type test = Expect<IsEqual<ToDBType<{ a: string }>, { a: string }>>;
    type test2 = Expect<IsEqual<ToDBType<{ a: string[] }>, { a: string }>>;
    type test3 = Expect<
      IsEqual<ToDBType<{ a?: string }>, { a: string | null }>
    >;
    type test4 = Expect<
      IsEqual<ToDBType<{ a: string | null }>, { a: string | null }>
    >;
    type test5 = Expect<IsEqual<ToDBType<{ a: { id: 5 } }>, { a: string }>>;
    type test6 = Expect<
      IsEqual<ToDBType<{ a: { id: 5 } | null }>, { a: string | null }>
    >;
    type date1 = Expect<IsEqual<ToDBType<{ a: Date }>, { a: Date }>>;
    type date2 = Expect<
      IsEqual<ToDBType<{ a: Date | null }>, { a: Date | null }>
    >;
    type date3 = Expect<IsEqual<ToDBType<{ a?: Date }>, { a: Date | null }>>;

    type dateString1 = Expect<
      IsEqual<ToDBType<{ a: Date }, true>, { a: string }>
    >;
    type dateString2 = Expect<
      IsEqual<ToDBType<{ a: Date | null }, true>, { a: string | null }>
    >;
    type dateString3 = Expect<
      IsEqual<ToDBType<{ a?: Date }, true>, { a: string | null }>
    >;

    type ObjectType1 = Expect<
      IsEqual<ToDBType<{ a: string[] }, true, Buffer>, { a: Buffer }>
    >;
    type ObjectType2 = Expect<
      IsEqual<
        ToDBType<{ a: { test: 3 } | null; b: string; d: Date }, false, Lob>,
        { a: Lob | null; b: string; d: Date }
      >
    >;
  });
});
