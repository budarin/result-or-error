type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type Builtin =
    | Primitive
    | Date
    | RegExp
    | Error
    | Promise<unknown>
    | ((...args: unknown[]) => unknown);

export type DeepReadonly<T> =
    // 1) Built-ins and primitives stay as-is
    T extends Builtin
        ? T
        : // 2) Tuples (preserve length and readonly per element)
          T extends readonly [infer A, ...infer R]
          ? readonly [DeepReadonly<A>, ...DeepReadonlyTuple<R>]
          : // 3) Readonly arrays
            T extends readonly (infer U)[]
            ? readonly DeepReadonly<U>[]
            : // 4) Mutable arrays
              T extends (infer U)[]
              ? readonly DeepReadonly<U>[]
              : // 5) Map
                T extends Map<infer K, infer V>
                ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
                : // 6) ReadonlyMap
                  T extends ReadonlyMap<infer K, infer V>
                  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
                  : // 7) Set
                    T extends Set<infer U>
                    ? ReadonlySet<DeepReadonly<U>>
                    : // 8) ReadonlySet
                      T extends ReadonlySet<infer U>
                      ? ReadonlySet<DeepReadonly<U>>
                      : // 9) Object
                        T extends object
                        ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
                        : // 10) Fallback
                          T;

type DeepReadonlyTuple<T extends readonly unknown[]> = T extends readonly [
    infer A,
    ...infer R
]
    ? readonly [DeepReadonly<A>, ...DeepReadonlyTuple<R>]
    : readonly [];

export interface ResultOrErrorResult<T> {
    result: T;
    error?: never;
}

export interface ResultOrErrorError<E> {
    result?: never;
    error: Error & { data?: E };
}

export type ResultOrError<T, E = never> = DeepReadonly<
    ResultOrErrorResult<T> | ResultOrErrorError<E>
>;

export { $try } from './try.js';
