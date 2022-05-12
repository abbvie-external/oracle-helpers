import { Connection } from 'oracledb';
import { getSql } from './sqlHelpers';

describe('sqlHelpers', () => {
  test('Should throw an error when config is undefined', async () => {
    await expect(getSql(undefined as Connection, '')).rejects.toThrow(
      new TypeError('ConfigOrConnection must be defined'),
    );
  });
});
