# @budarin/result-or-error

Типы TypeScript для представления результата операции в виде объединения успешного значения `ResultOrErrorResult<T>` и ошибки `ResultOrErrorError<E>` без использования `try/catch`. Пакет также содержит хелпер `$try`, преобразующий синхронные и асинхронные исключения в значение типа `ResultOrError`.

## Установка

```bash
npm install @budarin/result-or-error
```

## Зачем это нужно

Классический подход, пришедший из эпохи ООП — при любой неудаче бросать исключение. Такой стиль приводит к **try/catch hell**: вложенные `try/catch`, размазанная по коду обработка ошибок, неочевидный поток выполнения и трудночитаемый код. В функциональном стиле бросать исключения «по любому поводу» — плохая практика: код становится шумным, сложным для понимания и источником лишних багов.

Современный функциональный подход для функций, которые могут вернуть ошибку вместо результата: возвращать **один объект**, в котором есть либо поле `result` с данными, либо поле `error` с описанием ошибки. Оба варианта явно типизированы, поток данных линейный, ошибки обрабатываются там же, где вызывается функция — без исключений и вложенных `try/catch`.

Типы из этого пакета гарантируют ровно один вариант в ответе, все поля только для чтения (`DeepReadonly`), а в каждой ветке «чужое» поле помечено как `never` для удобного сужения типов.

### Было: try/catch hell

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

// Вызов — исключения размазаны, поток неочевиден
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

### Стало: один объект result | error

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

// Вызов — деструктуризация и простая проверка
const { result, error } = parseUserId(getInput());

if (error) {
    console.error(error.message);
    user = getDefaultUser();
} else {
    const userResult = loadUser(result);

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

Успешный результат. Содержит поле `result: T`. Поле `error` в этой ветке отсутствует (тип `never`).

```ts
interface ResultOrErrorResult<T> {
    result: T;
    error?: never;
}
```

### `ResultOrErrorError<E>`

Ошибка. Содержит поле `error` типа `Error & { data?: E }` (стандартная ошибка с опциональными дополнительными данными). Поле `result` в этой ветке отсутствует (тип `never`).

```ts
interface ResultOrErrorError<E> {
    result?: never;
    error: Error & { data?: E };
}
```

### `ResultOrError<T, E>`

Тип «ровно один из двух»: `DeepReadonly<ResultOrErrorResult<T> | ResultOrErrorError<E>>`. Все поля и вложенные объекты только для чтения.

- Чтобы оставить только успех: `ResultOrError<T, never>`.
- Чтобы оставить только ошибку: `ResultOrError<never, E>`.

### `DeepReadonly<T>`

Утилитарный тип: рекурсивно делает все поля типа `T` только для чтения (`readonly`). Функции не изменяются.

### `Хэлпер-функция $try`

`$try` — небольшой хелпер который, помогает перейти от стиля «бросай исключения» к стилю `ResultOrError`: вместо выбрасывания исключения результат работы функции упаковывается в значение типа `ResultOrError`.

- Синхронная функция:

```ts
function $try<T, E = Error>(fn: () => T): ResultOrError<T, E>;
```

- Асинхронная функция или промис:

```ts
function $try<T, E = Error>(fn: () => Promise<T>): Promise<ResultOrError<T, E>>;

function $try<T, E = Error>(promise: Promise<T>): Promise<ResultOrError<T, E>>;
```

При выполнении `$try` получает либо функцию, либо `Promise` и возвращает объект, в котором есть либо `result`, либо `error`.

## Примеры

### Базовое использование

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

### Сужение типа

После деструктуризации проверка `if (error)` сужает тип: в ветке с ошибкой доступен только `error`, в ветке без — только `result`.

### Только результат или только ошибка

```ts
import type { ResultOrError } from '@budarin/result-or-error';

// Функция возвращает только успех (ошибка не используется)
type OnlySuccess = ResultOrError<{ id: number }, never>;

// Функция возвращает только ошибку (успех не используется)
type OnlyError = ResultOrError<never, { code: string }>;
```

### Использование `$try`

`$try` удобен в трёх типичных сценариях. Во всех случаях он импортируется из этого пакета:

- **Промис напрямую** — например, `fetch`:
    - `const { result, error } = await $try(fetch('/api/user'));`
- **Синхронный код, который может кинуть** (вроде `JSON.parse`) — **обязательно оборачиваем в функцию**, иначе исключение вылетит до `$try`:
    - `const { result, error } = $try<User>(() => JSON.parse(json));`
- **Функция, возвращающая промис**:
    - `const { result, error } = await $try(() => fetch('/api/user'));`

Пример:

```ts
import { $try } from '@budarin/result-or-error';

// 1) JSON.parse с подсказкой типа
const { result: user, error: parseError } = $try<User>(() => JSON.parse(json));

if (parseError) {
    console.error(parseError.message);
} else {
    // user: User
}

// 2) fetch как промис
const { result: response, error: fetchError } = await $try(fetch('/api/user'));

if (fetchError) {
    console.error(fetchError.message);
} else {
    console.log(await response.json());
}
```

## Лицензия

MIT
