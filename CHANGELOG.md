# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-03-26

### Changed

- `ResultOrError<T, E>` is now deeply readonly via `DeepReadonly`, making nested structures immutable at the type level.

## [1.1.4] - 2025-03-22

### Changed

- `ResultOrError<T, E>`: the second type parameter `E` now defaults to `never`, so you can write `ResultOrError<T>` when error payload typing is not needed.
