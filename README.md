# @budarin/result-or-error

[Русская версия](https://github.com/budarin/result-or-error/blob/master/README.ru.md)

TypeScript types for returning **either** a successful `ResultOrErrorResult<T>` **or** an `ResultOrErrorError<E>` — without `try/catch`.

[![npm](https://img.shields.io/npm/v/@budarin/result-or-error?color=cb0000)](https://www.npmjs.com/package/@budarin/result-or-error)
[![npm](https://img.shields.io/npm/dt/@budarin/result-or-error)](https://www.npmjs.com/package/@budarin/result-or-error)
[![GitHub](https://img.shields.io/github/license/budarin/result-or-error)](https://github.com/budarin/result-or-error)

## Installation

```bash
npm install @budarin/result-or-error
```

## Why use it

The classic OOP-style approach is to throw an exception on any failure. That leads to **try/catch hell**: nested try/catch blocks, error handling scattered across the code, unclear control flow, and hard-to-follow code. In a functional style, throwing on every failure is a bad fit: it makes code noisy, hard to reason about, and prone to bugs.

The modern functional approach for functions that may return an error instead of a result is to return **a single object** that has either a `result` field with data or an `error` field with the failure. Both cases are explicitly typed, control flow stays linear, and errors are handled right where the function is called — no exceptions and no nested try/catch.

This package provides types that guarantee exactly one variant in the return value, make all fields read-only (`DeepReadonly`), and mark the "other" field as `never` in each branch for reliable type narrowing.

### Before: try/catch hell

```ts
function parseUserId(input: string): number {
    const n = parseInt(input, 10);

    if (Number.isNaN(n)) {
        throw new Error('Invalid number');
    }

    return n;
}

function loadUser(id: number): User {
    const raw = fetchSync(`/users/${id}`);

    if (!raw.ok) {
        throw new Error('Network error');
    }

    const data = JSON.parse(raw.body);

    if (!validateUser(data)) {
        throw new Error('Invalid data');
    }

    return data;
}

// Call site — exceptions scattered, flow hard to follow
let user: User;
try {
    const id = parseUserId(getInput());

    try {
        user = loadUser(id);
    } catch (e) {
        if (e instanceof SyntaxError) {
            console.error('Bad JSON');
        } else {
            throw e;
        }
    }
} catch (e) {
    console.error('Failed:', e);
    user = getDefaultUser();
}
```

### After: a single result | error object

```ts
import type { ResultOrError } from '@budarin/result-or-error';

function parseUserId(input: string): ResultOrError<number> {
    const n = parseInt(input, 10);

    if (Number.isNaN(n)) {
        return { error: new Error('Invalid number') };
    }

    return { result: n };
}

function loadUser(id: number): ResultOrError<User> {
    const raw = fetchSync(`/users/${id}`);

    if (!raw.ok) {
        return { error: new Error('Request failed') };
    }

    const data = JSON.parse(raw.body);

    if (!validateUser(data)) {
        return { error: new Error('Invalid data') };
    }

    return { result: data };
}

let user: User;

// Call site — destructure and a simple check
const { result: id, error: idError } = parseUserId(getInput());

if (idError) {
    console.error(idError.message);
    user = getDefaultUser();
} else {
    const userResult = loadUser(id);
    if (userResult.error) {
        console.error(userResult.error.message);
        user = getDefaultUser();
    } else {
        user = userResult.result;
    }
}
```

## API

### `ResultOrErrorResult<T>`

Success branch. Has `result: T`. The `error` field is absent in this branch (typed as `never`).

```ts
interface ResultOrErrorResult<T> {
    result: T;
    error?: never;
}
```

### `ResultOrErrorError<E>`

Error branch. Has `error` of type `Error & { data?: E }` (standard `Error` with optional extra data). The `result` field is absent in this branch (typed as `never`).

```ts
interface ResultOrErrorError<E> {
    result?: never;
    error: Error & { data?: E };
}
```

### `ResultOrError<T, E>`

Union of the two: `DeepReadonly<ResultOrErrorResult<T> | ResultOrErrorError<E>>`. All fields and nested objects are read-only.

- Success only: `ResultOrError<T, never>`.
- Error only: `ResultOrError<never, E>`.

### `DeepReadonly<T>`

Utility type that makes every property of `T` recursively `readonly`. Functions are left unchanged.

### Helper `$try`

`$try` is a small helper bridges the \"throw exceptions\" style and the `ResultOrError` style: instead of throwing, it converts a computation into a value of type `ResultOrError`.

- Synchronous function:

```ts
function $try<T, E = Error>(fn: () => T): ResultOrError<T, E>;
```

- Asynchronous function or promise:

```ts
function $try<T, E = Error>(fn: () => Promise<T>): Promise<ResultOrError<T, E>>;

function $try<T, E = Error>(promise: Promise<T>): Promise<ResultOrError<T, E>>;
```

At runtime, `$try` accepts either a function or a `Promise` and returns an object with either `result` or `error`.

## Examples

### Basic usage

```ts
import type { ResultOrError } from '@budarin/result-or-error';

function parseId(input: string): ResultOrError<number, string> {
    const n = parseInt(input, 10);

    if (Number.isNaN(n)) {
        return {
            error: { ...new Error('Invalid number'), data: input },
        };
    }
    return { result: n };
}

const { result, error } = parseId('42');

if (error) {
    console.log(error.message, error.data); // Error & { data?: string }
} else {
    console.log(result); // number
}
```

### Type narrowing

After destructuring, the `if (error)` check narrows the type: in the error branch only `error` is in scope, in the success branch only `result`.

### Success-only or error-only

```ts
import type { ResultOrError } from '@budarin/result-or-error';

// Function returns only success (error branch unused)
type OnlySuccess = ResultOrError<{ id: number }, never>;

// Function returns only error (success branch unused)
type OnlyError = ResultOrError<never, { code: string }>;
```

### Using `$try`

`$try` is useful in three common scenarios. In all cases it comes from this package:

```ts
import { $try } from '@budarin/result-or-error';
```

- **Promise directly** — e.g. `fetch`:
    - `const { result, error } = await $try(fetch('/api/user'));`
- **Synchronous code that may throw** (like `JSON.parse`) — you **must wrap it in a function**, otherwise the exception happens before `$try`:
    - `const { result, error } = $try<User>(() => JSON.parse(json));`
- **Function that returns a promise**:
    - `const { result, error } = await $try(() => fetch('/api/user'));`

Example:

```ts
import { $try } from '@budarin/result-or-error';

// 1) JSON.parse with type hint
const { result: user, error: parseError } = $try<User>(() => JSON.parse(json));

if (parseError) {
    console.error(parseError.message);
} else {
    // user: User
}

// 2) fetch as a promise
const { result: response, error: fetchError } = await $try(fetch('/api/user'));

if (fetchError) {
    console.error(fetchError.message);
} else {
    console.log(await response.json());
}
```

## License

MIT
