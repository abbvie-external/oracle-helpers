# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [3.2.1](https://github.com/abbvie-external/oracle-helpers/compare/v3.2.0...v3.2.1) (2022-04-19)


### Bug Fixes

* **sqlHelpers:** make default poolMin 0 for resource savings ([2c40637](https://github.com/abbvie-external/oracle-helpers/commit/2c40637fc70ad37d87b16a2b13ff5223ebe73cae))

## [3.2.0](https://github.com/abbvie-external/oracle-helpers/compare/v3.1.0...v3.2.0) (2021-08-16)


### Features

* **Logging:** Add ability to set up logging ([5f1d18f](https://github.com/abbvie-external/oracle-helpers/commit/5f1d18faafeade0a6880ef62999722a3a0856ca3))
* make `raw` able to work with Sql instances ([7b970c7](https://github.com/abbvie-external/oracle-helpers/commit/7b970c701e23d24f7903189f004201b5ca449600)), closes [#1](https://github.com/abbvie-external/oracle-helpers/issues/1)


### Bug Fixes

* `toBindDefs` failed on non-array entry ([b46f4d7](https://github.com/abbvie-external/oracle-helpers/commit/b46f4d7f1e33954eb49cf59225cbc5777156b864))
* `toBindDefs` to work with unicode inputs ([2d52151](https://github.com/abbvie-external/oracle-helpers/commit/2d521517ab4c28f770029e1e9919df3075ab33a4))
* `toBindDefs` will now look through all rows for the type ([5b9e74d](https://github.com/abbvie-external/oracle-helpers/commit/5b9e74d58d2f028b4bbe4275f166865f9d131976)), closes [#4](https://github.com/abbvie-external/oracle-helpers/issues/4)
* **sqlHelpers:** Don't automatically release passed in connections ([5ba33bb](https://github.com/abbvie-external/oracle-helpers/commit/5ba33bb820db1d99145adb455ae0597df024f671))
* **sqlHelpers:** Improve error message when config is undefined ([b8debfc](https://github.com/abbvie-external/oracle-helpers/commit/b8debfc10636228876f431319b9011006c4d2433))

## [3.1.0](https://github.com/abbvie-external/oracle-helpers/compare/v3.0.1...v3.1.0) (2021-02-17)

### Features

- Add ability to bind values with a name to be used ([b943883](https://github.com/abbvie-external/oracle-helpers/commit/b943883454c3f8b5667eb5edfb17acd18f8cb82f))

- Add toBindDefs ([1e13b5b](https://github.com/abbvie-external/oracle-helpers/commit/09eca01e54af132f734e8de98679b6b24b711a3f))

  This will assist with using `returning` in mutateManySql

### Bug Fixes

- possible failure in deduping ([0a0a2f0](https://github.com/abbvie-external/oracle-helpers/commit/0a0a2f05cf5853aa30747a476e0769fb7f6f7bcb))

### [3.0.1](https://github.com/abbvie-external/oracle-helpers/compare/v3.0.0...v3.0.1) (2020-11-16)

### Bug Fixes

- **tag:** deduping now works correctly in more complicated cases ([2132789](https://github.com/abbvie-external/oracle-helpers/commit/2132789614363a41ddf052ece69c3b63625139db))

## [3.0.0](https://github.com/abbvie-external/oracle-helpers/compare/v2.1.1...v3.0.0) (2020-11-06)

### ⚠ BREAKING CHANGES

- Requires newer versions of Node and OracleDb. Won't support older versions due to changes in constants

- move support to OracleDb 5 ([f5f3973](https://github.com/abbvie-external/oracle-helpers/commit/f5f39732d25a143aeff319a66370ddb5b8946ed2))

### [2.1.1](https://github.com/abbvie-external/oracle-helpers/compare/v2.1.0...v2.1.1) (2020-10-20)

### Bug Fixes

- **tag:** Make tags work using named parameters ([c4e61af](https://github.com/abbvie-external/oracle-helpers/commit/c4e61afcff5b75d4c9bcb64c8b553c0a9bd53bcd))

## [2.1.0](https://github.com/abbvie-external/oracle-helpers/compare/v2.0.1...v2.1.0) (2020-10-19)

### Features

- **helpers:** Add support for the sql tagged templates in the sql helpers ([2d104bc](https://github.com/abbvie-external/oracle-helpers/commit/2d104bc51dc73c7df9cb6ef3f1e1524432c1085b))

### Bug Fixes

- **docs:** Add words to the tests so that they are recognized in the docs ([995c159](https://github.com/abbvie-external/oracle-helpers/commit/995c15926e680daffb7a35413af5f313ff7756db))

### [2.0.1](https://github.com/abbvie-external/oracle-helpers/compare/v2.0.0...v2.0.1) (2020-09-22)

### Bug Fixes

- **pools:** Prevents lockdown when there are a lot of errors all at once (e.g. internet down) ([97f9df0](https://github.com/abbvie-external/oracle-helpers/commit/97f9df04c64be99d8633b0382bafe8dafcc3a218))

## [2.0.0](https://github.com/abbvie-external/oracle-helpers/compare/v1.1.1...v2.0.0) (2020-09-21)

### ⚠ BREAKING CHANGES

- Rename all helper functions `SQL`/`SQLPool` variants to `Sql`/`SqlPool`. E.g. `getSQL` to `getSql`
  fix(pools): Make `connectionTimeout` default to 10s from 3s. As 3s is a bit too quick for heavy usage

- Rename a bunch of properties ([9c1c40a](https://github.com/abbvie-external/oracle-helpers/commit/9c1c40ae5047b93d97c507af64504fb7ccb992e4))

### [1.1.1](https://github.com/abbvie-external/oracle-helpers/compare/v1.1.0...v1.1.1) (2020-09-21)

## [1.1.0](https://github.com/abbvie-external/oracle-helpers/compare/v1.0.1...v1.1.0) (2020-09-21)

### Features

- **pools:** Add pingTime and connectionTimeout ([d5e3fcd](https://github.com/abbvie-external/oracle-helpers/commit/d5e3fcde05e1cc2fe5bed8fa583b906916cd8b9b))

### 1.0.1 (2020-09-21)
