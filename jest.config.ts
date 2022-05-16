import type { Config } from '@jest/types';
const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/build/'],
  coverageProvider: 'v8',
  collectCoverageFrom: ['src/**/*.ts', '!tests/**/*.ts'],
};
module.exports = config;
