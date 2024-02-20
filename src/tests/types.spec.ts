/* eslint-disable @typescript-eslint/no-unused-vars */
import { ToOutBinds } from '../lib/sqlHelpers.js';

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
});
