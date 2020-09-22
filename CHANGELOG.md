# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [2.0.1](***REMOVED***/oracle-helpers/compare/v2.0.0...v2.0.1) (2020-09-22)


### Bug Fixes

* **pools:** Prevents lockdown when there are a lot of errors all at once (e.g. internet down) ([97f9df0](***REMOVED***/oracle-helpers/commit/97f9df04c64be99d8633b0382bafe8dafcc3a218))

## [2.0.0](***REMOVED***/oracle-helpers/compare/v1.1.1...v2.0.0) (2020-09-21)


### ⚠ BREAKING CHANGES

* Rename all helper functions `SQL`/`SQLPool` variants to `Sql`/`SqlPool`. E.g. `getSQL` to `getSql`
fix(pools): Make `connectionTimeout` default to 10s from 3s. As 3s is a bit too quick for heavy usage

* Rename a bunch of properties ([9c1c40a](***REMOVED***/oracle-helpers/commit/9c1c40ae5047b93d97c507af64504fb7ccb992e4))

### [1.1.1](***REMOVED***/oracle-helpers/compare/v1.1.0...v1.1.1) (2020-09-21)

## [1.1.0](***REMOVED***/oracle-helpers/compare/v1.0.1...v1.1.0) (2020-09-21)


### Features

* **pools:** Add pingTime and connectionTimeout ([d5e3fcd](***REMOVED***/oracle-helpers/commit/d5e3fcde05e1cc2fe5bed8fa583b906916cd8b9b))

### 1.0.1 (2020-09-21)
