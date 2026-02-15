export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
    ? T
    : T extends object
      ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
      : T;

export interface ResultOrErrorResult<T> {
    result: T;
    error?: never;
}

export interface ResultOrErrorError<E> {
    result?: never;
    error: Error & { data?: E };
}

export type ResultOrError<T, E> = DeepReadonly<
    ResultOrErrorResult<T> | ResultOrErrorError<E>
>;
