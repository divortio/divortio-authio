# API Reference

Authio runs as a standalone RPC service that you interact with from your parent worker via a Service Binding. It exposes
the following public methods.

---

### `handleRequest(request, appLogic)`

**(Recommended)** A high-level handler that provides a complete, boilerplate-free solution for protecting application
logic. It performs all checks and only calls back to the provided `appLogic` function if the user is fully authenticated
and authorized.

- **Parameters:**
- `request`: `Request` - The original incoming request from the parent worker.
- `appLogic`: `(request: Request) => Promise<Response>` - A function stub for the parent worker's core application
  logic.
- **Returns:**
- `Promise<Response>` - A `Response` object. This could be the response from your `appLogic`, a redirect, or an error
  response (e.g., 401, 403).

---

### `authenticate(request)`

**(Advanced)** A pure function that inspects a request and returns a cloned, enriched `Request` object. This is the core
of the selective protection pattern. It does not block or redirect, allowing your code to make its own decisions.

- **Parameters:**
- `request`: `Request` - The original incoming request.
- **Returns:**
- `Promise<Request>` - A promise that resolves to a cloned `Request` object augmented with `isAuthed`, `isAuthorized`,
  and `authio` properties.

---

### `handleLogin(request)`

Processes a `POST` login request and returns a `Response` that establishes a user session by setting the JWT cookie.
Expects a JSON body with `username` and `password`.

- **Parameters:**
- `request`: `Request` - The incoming `POST` request.
- **Returns:**
- `Promise<Response>` - A `Response` object. On success, the status is `200` and it includes a `Set-Cookie` header. On
  failure, the status is `401` or `400`.

---

### `handleLogout(request)`

Processes a logout request and returns a `Response` that clears the session cookie, effectively logging the user out.

- **Parameters:**
- `request`: `Request` - The incoming request.
- **Returns:**
- `Promise<Response>` - A `Response` object with a `Set-Cookie` header that expires the session cookie.

---

## The Enriched Request Object

The `authenticate` and `handleRequest` methods return or pass an enriched `Request` object with three properties to
provide a consistent and detailed context.

- **`isAuthed`**: `boolean`
  A boolean property indicating if the user's identity was successfully verified.

- **`isAuthorized`**: `boolean`
  A boolean property indicating if the authenticated user has permission to access the requested URL based on their
  assigned routes.

- **`authio`**: `object`
  A detailed object containing the full result of the authentication and authorization attempt.

| Property       | Type     | Description                                                               |
| :------------- | :------- | :------------------------------------------------------------------------ |
| `isAuthed`     | `boolean`| `true` if the user's identity was successfully verified.                  |
| `isAuthorized` | `boolean`| `true` if the user is authorized for the requested route.                 |
| `method`       | `string` | The method of authentication (`jwt`, `header`, `jwt-cache`, or `error`).    |
| `username`     | `string` | The name of the authenticated user, if available.                         |
| `payload`      | `object` | The full JWT payload if the authentication method was `jwt` or `jwt-cache`. |
| `matchedRoute` | `string` | The specific route pattern that authorized the request, if a match was found. |
| `error`        | `string` | A description of the error if an authentication or authorization attempt failed. |
| `timestamp`    | `number` | A UTC timestamp indicating when the check was performed.                    |