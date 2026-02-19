import type { ResultOrError } from './index.js';

type AnyPromise<T = unknown> = Promise<T>;

type Thunk<T> = () => T;

/**
 * Wraps a synchronous or asynchronous computation and returns a ResultOrError.
 *
 * Usage:
 *   const { result, error } = $try(() => mightThrow());
 *   const { result, error } = await $try(fetch(url));
 *   const { result, error } = $try<User>(() => JSON.parse(json));
 */
export function $try<T, E = Error>(
    fn: Thunk<AnyPromise<T>>
): AnyPromise<ResultOrError<T, E>>;

export function $try<T, E = Error>(fn: Thunk<T>): ResultOrError<T, E>;

export function $try<T, E = Error>(
    promise: AnyPromise<T>
): AnyPromise<ResultOrError<T, E>>;

export function $try(arg: unknown): unknown {
    // Promise directly: $try(fetch(url))
    if (arg && typeof (arg as AnyPromise).then === 'function') {
        return (arg as AnyPromise)
            .then((value) => ({ result: value }))
            .catch((error: unknown) => ({ error }));
    }

    if (typeof arg !== 'function') {
        throw new TypeError('$try expects a function or a Promise');
    }

    const fn = arg as Thunk<unknown>;

    try {
        const value = fn();

        // Thunk that returns a Promise: $try(() => fetch(url))
        if (value && typeof (value as AnyPromise).then === 'function') {
            return (value as AnyPromise)
                .then((result) => ({ result }))
                .catch((error: unknown) => ({ error }));
        }

        // Synchronous success
        return { result: value };
    } catch (error) {
        // Synchronous error
        return { error };
    }
}
