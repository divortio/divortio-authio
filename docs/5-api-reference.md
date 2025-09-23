# API Reference

Authio exports a set of high-level functions that can be imported from the main module entry point (`/src/index.mjs`).


----

### `createAuthHandler(appFetchHandler)`

Wraps a standard worker fetch handler to provide a complete, all-in-one authentication and authorization solution. It
manages redirects, API endpoints, and acts as a gatekeeper for your application.

- **Parameters:**
    - `appFetchHandler`: `(request: Request, env: object, ctx: ExecutionContext) => Promise<Response>` - The main
      application fetch handler to protect.
- **Returns:**
    - `(request: Request, env: object, ctx: ExecutionContext) => Promise<Response>` - A new fetch handler that
      incorporates the full Authio system.

---

### `authenticate(request, env, ctx, options)`

A pure function that inspects a request and returns a cloned, enriched `Request` object. This is the core of the
selective protection pattern. It does not block or redirect, allowing your code to make its own decisions based on the
result.

- **Parameters:**
    - `request`: `Request` - The original incoming request.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - (Optional) A pre-constructed auth config object.
- **Returns:**
    - `Promise<Request>` - A promise that resolves to a cloned `Request` object augmented with `isAuthed`
      , `isAuthorized`, and `authio` properties.

---

### `handleLogin(request, env, ctx, options)`

Processes a `POST` login request and returns a `Response` that establishes a user session by setting the JWT cookie.
Expects a JSON body with `username` and `password`.

- **Parameters:**
    - `request`: `Request` - The incoming `POST` request.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - (Optional) A pre-constructed auth config object.
- **Returns:**
    - `Promise<Response>` - A `Response` object. On success, the status is `200` and it includes a `Set-Cookie` header.
      On failure, the status is `401` or `400`.

### `handleLogin(request, env, ctx, options)`

Processes a `POST` login request and returns a `Response` that establishes a user session by setting the JWT cookie.
Expects a JSON body with `username` and `password`.

- **Parameters:**
    - `request`: `Request` - The incoming `POST` request.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - (Optional) A pre-constructed auth config object.
- **Returns:**
    - `Promise<Response>` - A `Response` object. On success, the status is `200` and it includes a `Set-Cookie` header.
      On failure, the status is `401` or `400`.

---

### `handleLogout(request, env, ctx, options)`

Processes a logout request and returns a `Response` that clears the session cookie, effectively logging the user out.

- **Parameters:**
    - `request`: `Request` - The incoming request.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - (Optional) A pre-constructed auth config object.
- **Returns:**
    - `Promise<Response>` - A `Response` object with a `Set-Cookie` header that expires the session cookie.

---

## The Enriched Request Object

The `authenticate` function (and by extension, `createAuthHandler`) enriches the standard `Request` object with three
properties to provide downstream logic with a consistent and detailed context.

- **`isAuthed`**: `boolean`
  A boolean property indicating if the user's identity was successfully verified.

- **`isAuthorized`**: `boolean`
  A boolean property indicating if the authenticated user has permission to access the requested URL based on their
  assigned routes.

- **`authio`**: `object`
  A detailed object containing the full result of the authentication and authorization attempt.

  | Property       | Type      | Description                                                               |
          | :------------- | :-------- | :------------------------------------------------------------------------ |
  | `isAuthed`     | `boolean` | `true` if the user's identity was successfully verified.                  |
  | `isAuthorized` | `boolean` | `true` if the user is authorized for the requested route.                 |
  | `method`       | `string`  | The method of authentication (`jwt`, `header`, `jwt-cache`, or `error`).    |
  | `username`     | `string`  | The name of the authenticated user, if available.                         |
  | `payload`      | `object`  | The full JWT payload if the authentication method was `jwt` or `jwt-cache`. |
  | `matchedRoute` | `string`  | The specific route pattern that authorized the request, if a match was found. |
  | `error`        | `string`  | A description of the error if an authentication or authorization attempt failed. |
  | `timestamp`    | `number`  | A UTC timestamp indicating when the check was performed.                    |