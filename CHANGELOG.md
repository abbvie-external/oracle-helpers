# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.2.4](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.3...v3.2.4) (2022-05-12)


### Bug Fixes

* **docs:** remove references to AbbVie internals ([964796f](https://github.com/abbvie-external/oracle-helpers/commit/964796fa61e8a7065ab8c486cb0c460cf88abf49))

### [3.2.3](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.2...v3.2.3) (2022-04-25)

### Bug Fixes

- make `join` be empty for undefined values, and it will ignore non array values ([7561f2a](https://github.com/abbvie-external/oracle-helpers/commit/7561f2a6915b777a5ed005d0a024e279c5246122))

### [3.2.2](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.1...v3.2.2) (2022-04-22)

### Bug Fixes

- make `join` not throw on empty arrays ([5fc06e2](https://github.com/abbvie-external/oracle-helpers/commit/5fc06e283e45b90a846849bab9ab74281e783029))

### [3.2.1](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.0...v3.2.1) (2022-04-19)

### Bug Fixes

- **sqlHelpers:** make default poolMin 0 for resource savings ([f8e5b3c](https://github.com/abbvie-external/oracle-helpers/commit/f8e5b3cee6993c8c78ffa1d68cd37298c3b643e2))

## [3.2.0](https://github.com/abbvie-external/oracle-helpers/compare/v3.1.0...v3.2.0) (2021-08-16)

### Features

- **Logging:** Add ability to set up logging ([f252b23](https://github.com/abbvie-external/oracle-helpers/commit/f252b23a267ff32a1fa54343c48fcd98962621d8))
- make `raw` able to work with Sql instances ([e38c3aa](https://github.com/abbvie-external/oracle-helpers/commit/e38c3aa78a7e77d1d6dba9c7ad1132ddb8e90c9b))

### Bug Fixes

- `toBindDefs` failed on non-array entry ([1f0c8bc](https://github.com/abbvie-external/oracle-helpers/commit/1f0c8bc6337ac83b7764f61c18a8d419a5271a54))
- `toBindDefs` to work with unicode inputs ([6dced61](https://github.com/abbvie-external/oracle-helpers/commit/6dced61ea00fee398cabadba47f553acf7a40482))
- `toBindDefs` will now look through all rows for the type ([a8b8e8f](https://github.com/abbvie-external/oracle-helpers/commit/a8b8e8fbbb6ebb929ae28fd8ce7eb56078dc6145))
- **sqlHelpers:** Don't automatically release passed in connections ([d93f7cf](https://github.com/abbvie-external/oracle-helpers/commit/d93f7cff81476729032678a9a4619d0b30d198ff))
- **sqlHelpers:** Improve error message when config is undefined ([cb36957](https://github.com/abbvie-external/oracle-helpers/commit/cb369579cb4feb30840eb76df1a46c033b0a55e9))

## [3.1.0](https://github.com/abbvie-external/oracle-helpers/compare/v3.0.1...v3.1.0) (2021-02-17)

### Features

- Add ability to bind values with a name to be used ([c88ce86](https://github.com/abbvie-external/oracle-helpers/commit/c88ce861463254beea6a3b8c266c34cbe9c71f82))

- Add toBindDefs ([b377e9c](https://github.com/abbvie-external/oracle-helpers/commit/b377e9c905df812393f64946abb1948aa902627e))

  This will assist with using `returning` in mutateManySql

### Bug Fixes

- possible failure in deduping ([5479b13](https://github.com/abbvie-external/oracle-helpers/commit/5479b1390b1b557fc560a44450c83a64082e267a))

### [3.0.1](https://github.com/abbvie-external/oracle-helpers/compare/v3.0.0...v3.0.1) (2020-11-16)

### Bug Fixes

- **tag:** deduping now works correctly in more complicated cases ([f128be0](https://github.com/abbvie-external/oracle-helpers/commit/f128be07ea596754054ad7ce2c3a21c6268b41cb))

## [3.0.0](https://github.com/abbvie-external/oracle-helpers/compare/v2.1.1...v3.0.0) (2020-11-06)

### ⚠ BREAKING CHANGES

- Requires newer versions of Node and OracleDb. Won't support older versions due to changes in constants

- move support to OracleDb 5 ([bd3d6a1](https://github.com/abbvie-external/oracle-helpers/commit/bd3d6a1414f089844411cc1c3bd7df2fe9b8537b))

### [2.1.1](https://github.com/abbvie-external/oracle-helpers/compare/v2.1.0...v2.1.1) (2020-10-20)

### Bug Fixes

- **tag:** Make tags work using named parameters ([6c7c85f](https://github.com/abbvie-external/oracle-helpers/commit/6c7c85fa37a419cc5813ebd7a91bf88e7aa59ce6))

## [2.1.0](https://github.com/abbvie-external/oracle-helpers/compare/v2.0.1...v2.1.0) (2020-10-19)

### Features

- **helpers:** Add support for the sql tagged templates in the sql helpers ([46e68c6](https://github.com/abbvie-external/oracle-helpers/commit/46e68c6bbb3524f451ca34d9f9f67b161501eabb))

### Bug Fixes

- **docs:** Add words to the tests so that they are recognized in the docs ([6bd3639](https://github.com/abbvie-external/oracle-helpers/commit/6bd363907b12e08556324aa19e483c9cd086bf3d))

### [2.0.1](https://github.com/abbvie-external/oracle-helpers/compare/v2.0.0...v2.0.1) (2020-09-22)

### Bug Fixes

- **pools:** Prevents lockdown when there are a lot of errors all at once (e.g. internet down) ([13c37ec](https://github.com/abbvie-external/oracle-helpers/commit/13c37ec638ea909f5414928584d2aba9f93db262))

## [2.0.0](https://github.com/abbvie-external/oracle-helpers/compare/v1.1.1...v2.0.0) (2020-09-21)

### ⚠ BREAKING CHANGES

- Rename all helper functions `SQL`/`SQLPool` variants to `Sql`/`SqlPool`. E.g. `getSQL` to `getSql`
  fix(pools): Make `connectionTimeout` default to 10s from 3s. As 3s is a bit too quick for heavy usage

- Rename a bunch of properties ([7df8a99](https://github.com/abbvie-external/oracle-helpers/commit/7df8a99a9b0af0c50da075c2bbea05fb434c01ab))

### [1.1.1](https://github.com/abbvie-external/oracle-helpers/compare/v1.1.0...v1.1.1) (2020-09-21)

## [1.1.0](https://github.com/abbvie-external/oracle-helpers/compare/v1.0.1...v1.1.0) (2020-09-21)

### Features

- **pools:** Add pingTime and connectionTimeout ([44d0f71](https://github.com/abbvie-external/oracle-helpers/commit/44d0f71981ad233d255507ae389dd86c6cecbc23))

### 1.0.1 (2020-09-21)
