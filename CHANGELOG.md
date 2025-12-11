# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.4.3](https://github.com/abbvie-external/oracle-helpers/compare/v3.4.2...v3.4.3) (2025-12-11)


### Bug Fixes

* **commonjs:** tell node that the build/main directory is actually commonjs ([46d5c44](https://github.com/abbvie-external/oracle-helpers/commit/46d5c4456e22aa58be71ad29bcf6f2f75d584c03))

### [3.4.2](https://github.com/abbvie-external/oracle-helpers/compare/v3.4.1...v3.4.2) (2025-04-07)


### Bug Fixes

* **dbError:** fix an oversight with the isDBError function ([71d1867](https://github.com/abbvie-external/oracle-helpers/commit/71d18672d321eb8ac705537e473fc60d2dd82f1f))
* **toBindDefs:** Make it compatible with latest oracledb types ([50dcfdc](https://github.com/abbvie-external/oracle-helpers/commit/50dcfdc70646a8d6f4039d7739350db8134298c1))

### [3.4.1](https://github.com/abbvie-external/oracle-helpers/compare/v3.4.0...v3.4.1) (2024-02-27)


### Bug Fixes

* **types:** `ToOutBinds` had incorrect types when dealing with optional properties ([6bed6d4](https://github.com/abbvie-external/oracle-helpers/commit/6bed6d4ea29bba565584a35dc4c4dff2422ca017))

## [3.4.0](https://github.com/abbvie-external/oracle-helpers/compare/v3.3.1...v3.4.0) (2024-02-20)


### Features

* deprecate the `configuration` settings ([78b47b8](https://github.com/abbvie-external/oracle-helpers/commit/78b47b882e7c1f976554bf6f1d8d6382ce18fc47))
* **pools:** add ability to set global defaults  using `setPoolDefaults` ([b7f22cd](https://github.com/abbvie-external/oracle-helpers/commit/b7f22cd792b7d6dc5e35d8de039a7ae72d00de26))
* properly export an es module build ([dd81c5b](https://github.com/abbvie-external/oracle-helpers/commit/dd81c5b1591f842aacf1f6f07ab8bc79affd1e4d))
* **sql:** add `Sql#join` instance method ([8a9cbde](https://github.com/abbvie-external/oracle-helpers/commit/8a9cbde6f9bdf744205a47cf462907696fb90789))
* **sql:** add `sql` as a separate export for use without the rest of the helpers ([d801b7a](https://github.com/abbvie-external/oracle-helpers/commit/d801b7a2fb8561cfe70e7f969c34eeb703a37c1f))
* **types:** add `toDBType` utility type ([8f7f20c](https://github.com/abbvie-external/oracle-helpers/commit/8f7f20c9129cbd3a5e2e18825a1a7492bd331807))
* **types:** make the outbind types automatically convert objects to the correct format. ([3f31ae2](https://github.com/abbvie-external/oracle-helpers/commit/3f31ae28b6d475fd0e610ad406f78af7dd775f6d))


### Bug Fixes

* **sql:** remove unexpected dedent behavior ([735db78](https://github.com/abbvie-external/oracle-helpers/commit/735db782394419e0a855cea4c3d9dfb640ae873d))

### [3.3.1](https://github.com/abbvie-external/oracle-helpers/compare/v3.3.0...v3.3.1) (2024-01-09)


### Bug Fixes

* **toBindDefs:** prevent confusing error when only nulls exist ([6f93997](https://github.com/abbvie-external/oracle-helpers/commit/6f93997a70223be4bf9dc1c4f5dbc7a07a764d80))

## [3.3.0](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.5...v3.3.0) (2023-08-09)


### Features

* **pools:** add `closePools` to close all pools that oracle-helpers manages ([3dced36](https://github.com/abbvie-external/oracle-helpers/commit/3dced36040aaf7a4a7890a3c0b404b82d528cc31))
* **pools:** add `getPool` to get the pool object created by the helpers ([99189e8](https://github.com/abbvie-external/oracle-helpers/commit/99189e8960328b89c941e5fc92627a2a1567dd22))
* **pools:** add `setPoolDefaults` and `getPoolDefaults` ([198765e](https://github.com/abbvie-external/oracle-helpers/commit/198765e542eafed41629dd6318b5cc8317778b4f))
* **pools:** if a pool is closed, a new pool will be created ([eb42540](https://github.com/abbvie-external/oracle-helpers/commit/eb425407e70442315ee55daf658cecb27062a4ea))
* **sqlHelpers:** Add `isDBError` to typeguard DBError type from oracledb ([f827ec6](https://github.com/abbvie-external/oracle-helpers/commit/f827ec6356958ca5a31955daada5d3645ccbaf23))


### Bug Fixes

* **pools:** pool keys are connectString and user ([8a0ba25](https://github.com/abbvie-external/oracle-helpers/commit/8a0ba253a8b14a38c5d286b2f7135a8c4e62dd42))
* **pools:** specify exclude unused pool attributes ([41bd671](https://github.com/abbvie-external/oracle-helpers/commit/41bd67156994e3c34c10b42cd522ae8b9dc65d71))
* **pools:** use more of the dbConfig settings for the pool by default ([6b34ecf](https://github.com/abbvie-external/oracle-helpers/commit/6b34ecfc8972d6b2c5317af0f93eb447903724f1))
* **raw:** allow number inputs to `raw` and convert to string ([42a5251](https://github.com/abbvie-external/oracle-helpers/commit/42a52515faa5eda6ad74162d37712782fe6db98e))
* setSqlErrorLogger should accept undefined to unset it ([d571714](https://github.com/abbvie-external/oracle-helpers/commit/d57171419bcbc8a8158bd6a2234a410023510ae3))

### [3.2.5](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.3...v3.2.5) (2022-05-17)


### Bug Fixes

* **docs:** remove references to AbbVie internals ([964796f](https://github.com/abbvie-external/oracle-helpers/commit/964796fa61e8a7065ab8c486cb0c460cf88abf49))
* **pools:** clear timeouts when the promise finishes ([3384166](https://github.com/abbvie-external/oracle-helpers/commit/33841663aaaf2ddcba474d96e1abed3bb1d81428))
* **sqlHelpers:** Pass entire connection argument through ([9cc7f74](https://github.com/abbvie-external/oracle-helpers/commit/9cc7f74e6a51e7244cbfd599891fd0172829cbf2))
* **sql:** make sql's inspect setup use a symbol ([87922aa](https://github.com/abbvie-external/oracle-helpers/commit/87922aa72fcab926f873ea00e30e425ce7cfe0da))
* **sql:** Remove extra useless handling for arrays with bind names ([2ada9f4](https://github.com/abbvie-external/oracle-helpers/commit/2ada9f4dd8c0491efd14bf63dc7f7762b179031b))
* **toBindDefs:** consolidate Buffer/String handling and remove an uneeded `?.` ([cf8293f](https://github.com/abbvie-external/oracle-helpers/commit/cf8293f9533d4a668fa3f475b2881ffad1ced6b3))

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
