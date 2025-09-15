# 🛡️ Authio

Authio is a self-contained, zero-dependency authentication module designed to be plugged into a parent Cloudflare
Worker. It provides a comprehensive solution for managing user sessions with JSON Web Tokens (JWTs) and securing API
endpoints through a flexible, configuration-driven architecture.

The module is designed for both simplicity and extensibility, offering two primary integration patterns: a singular,
all-encompassing wrapper for turnkey application security, and a suite of composable, high-level utilities for
implementing granular, custom authentication logic.

## Features

- **Flexible Integration Models:** All-in-one wrapper or composable utilities.
- **Dual Authentication Methods:** Supports session-based (JWT) and programmatic (header) access.
- **Configuration-Driven:** All operational parameters are managed via `wrangler.toml` with strict validation.
- **Request Enrichment:** Augments the `Request` object with detailed authentication context.
- **Structured JSON Logging:** Provides configurable, machine-readable logging for monitoring and debugging.

## Installation & Setup

### 1. Module Integration

Authio is intended to be used as a pluggable module isolated from the parent worker's primary codebase. It is assumed
the Authio repository will be cloned into a dedicated directory within the parent worker project.

**Example Structure:**
```text 
my-worker-project/
└── src/
|   ├── modules/
|   |   └── authio/      <-- Clone the Authio repository here
|   |       ├── src/
|   |       └── ...
|   └── worker.mjs       <-- Your parent worker
└── _users.mjs           <-- Your user credentials file
```

### 2. Configuration

#### **User Store**

To provide user credentials, create a `_users.mjs` file in the **root** of your project. This file is automatically
processed by a build script, keeping your sensitive user data separate from the core Authio module.

**`_users.mjs` (in your project root):**

```javascript 
/**
* @namespace UserStore
* @note For production, use a secure database and hashed passwords.
*/ 
export const UserStore = {
"admin": "a_very_strong_password",
"api-user": "a_long_and_secret_api_token"
};
```

#### **`wrangler.toml`**

All operational parameters are defined in `wrangler.toml`. The `AUTH_USERS_MODULE_PATH` should point to the location
where the build script places the final credentials file. The default path is already configured and typically does not
need to be changed.

#### Required Parameters

| Variable                 | Required | Description                                                                | Default             |
| :----------------------- | :------- | :------------------------------------------------------------------------- | :------------------ |
| `AUTH_USERS_MODULE_PATH` | **Yes** | Path to the generated user credentials file. **(
Default: `./src/creds/users.mjs`)** | ` `                 |
| `JWT_SECRET`             | **
Yes** | A unique, random string of at least 32 characters.                         | ` `                 |

#### All Parameters

| Variable                 | Required | Description                                                                | Default             |
| :----------------------- | :------- | :------------------------------------------------------------------------- | :------------------ |
| `AUTH_USERS_MODULE_PATH` | **Yes** | Path to the generated user credentials file. **(
Default: `./src/creds/users.mjs`)** | ` `                 |
| `JWT_SECRET`             | **
Yes** | A unique, random string of at least 32 characters.                         | ` `                 |
| `LOGIN_URL_PATH`         | No       | The public URL for the login page.                                         | `/login`            |
| `LOGIN_ASSET_PATH`       | No       | The path to the `login.html` asset within the `/public` directory.         | `./login.html`      |
| `AUTH_REDIRECT_PATH`     | No       | Path to redirect to after a successful login.                              | `/`                 |
| `LOGIN_API_PATH`         | No       | The API endpoint for handling logins.                                      | `/api/auth/login`   |
| `LOGOUT_API_PATH`        | No       | The API endpoint for handling logouts.                                     | `/api/auth/logout`  |
| `AUTH_COOKIE_NAME`       | No       | The name of the session cookie.                                            | `__authio_jwt`      |
| `COOKIE_DOMAIN`          | No       | Optional domain for the cookie (e.g., `.example.com`).                     | Host-only           |
| `AGENT_HEADER_NAME`      | No       | HTTP header for programmatic access.                                       | `X-Authio-Token`    |
| `JWT_ISSUER`             | No       | **(
Recommended)** Unique URL identifying the authentication service.       | `Authio`            |
| `JWT_AUDIENCE`           | No       | **(
Recommended)** Unique URL identifying the API this token is valid for.  | `AuthioUsers`       |
| `SESSION_TIMEOUT`        | No       | Session duration in seconds.                                               | `3600` (1 hour)     |
| `AUTH_LOG_ENABLED`       | No       | A boolean flag to enable or disable structured logging.                    | `false`             |
| `AUTH_LOG_LEVEL`         | No       | The minimum logging level (`error`, `warn`, `info`, `debug`).              | `warn`              |

## The Enriched Request Object

The `authenticate` function (and by extension, `createAuthHandler`) enriches the standard `Request` object with two
properties to provide downstream logic with a consistent and detailed authentication context.

- **`isAuthed`**: `boolean`
  A top-level boolean property for quick access control checks. It is `true` if the request is successfully
  authenticated, otherwise `false`.

- **`authio`**: `object`
  A detailed object containing the full result of the authentication attempt.

#### **`request.authio` Object Structure**

| Property    | Type     | Description                                                              |
| :---------- | :------- | :----------------------------------------------------------------------- |
| `isAuthed`  | `boolean`| Evaluates to `true` if the request is successfully authenticated.        |
| `method`    | `string` | The method of authentication (`jwt`, `header`, `error`, or `null`).      |
| `username`  | `string` | The name of the authenticated user, if available.                        |
| `payload`   | `object` | The full JWT payload if the authentication method was `jwt`.             |
| `error`     | `string` | A description of the error if an authentication attempt failed.          |
| `timestamp` | `number` | A UTC timestamp indicating when the authentication check was performed.  |

## Usage Patterns

### Comprehensive Application Protection

This method represents the most direct approach to implementation. The `createAuthHandler` function encapsulates the
application, automating all authentication logic.

```javascript
// Example: /src/worker.mjs import { createAuthHandler } from './modules/authio/src/index.mjs';

async function myApp(request, env, ctx) { return new Response(`Authenticated as: ${request.authio.username}`); }

export default createAuthHandler(myApp);
```

### Selective Route Protection

For applications with more complex requirements, the modular functions can be utilized to construct custom routing
logic.

```javascript 
// Example: /src/worker.mjs import { authenticate, handleLogin, handleLogout } from '
./modules/authio/src/index.mjs';

export default { async fetch(request, env, ctx) { const url = new URL(request.url);
    if (url.pathname === '/api/login') return handleLogin(request, env, ctx);
    if (url.pathname === '/api/logout') return handleLogout(request, env, ctx);
    if (url.pathname.startsWith('/admin')) {
        const authedRequest = await authenticate(request, env, ctx);
        if (!authedRequest.isAuthed) {
            return new Response('Unauthorized', { status: 401 });
        }
        return new Response(`Admin access granted to: ${authedRequest.authio.username}`);
    }
    return new Response('Public Route');
    }
};
```

## API Reference

<details>
<summary>
<strong>createAuthHandler(appFetchHandler)</strong>
<br>
<span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span>
Wraps a fetch handler to provide a complete, all-in-one authentication solution.</summary>

- **Parameters:**
    - `appFetchHandler`: `(request: Request, env: object, ctx: ExecutionContext) => Promise<Response>` - The main
      application fetch handler to protect.
- **Returns:**
    - `(request: Request, env: object, ctx: ExecutionContext) => Promise<Response>` - A new fetch handler that
      incorporates the authentication system.
  </details>

<details>
<summary>
<strong>authenticate(request, env, ctx, options)</strong>
<br>
<span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span>
A pure function that inspects a request and returns a cloned, enriched `Request` object.
</summary>

- **Parameters:**
    - `request`: `Request` - The original incoming request.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - Optional configuration object.
- **Returns:**
    - `Promise<Request>` - A promise that resolves to a cloned `Request` object augmented with `isAuthed` and `authio`
      properties.
  </details>

<details>
<summary>
<strong>handleLogin(request, env, ctx, options)</strong>
<br>
<span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span>
Processes a `POST` login request and returns a `Response` that establishes a user session.
</summary>

- **Parameters:**
    - `request`: `Request` - The incoming `POST` request with a JSON body.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - Optional configuration object.
- **Returns:**
    - `Promise<Response>` - A `Response` object.
  </details>

<details>
<summary>
<strong>handleLogout(request, env, ctx, options)</strong>
<br>
<span>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;</span>
Processes a logout request and returns a `Response` that clears the session cookie.
</summary>

- **Parameters:**
    - `request`: `Request` - The incoming `POST` request with a JSON body.
    - `env`: `object` - The worker's environment object.
    - `ctx`: `ExecutionContext` - The worker's execution context.
    - `options`: `{ config?: AuthConfig }` - Optional configuration object.
- **Returns:**
    - `Promise<Response>` - A `Response` object.
  </details>

## Project Structure

```text src/ ├── handlers/ │ ├── api.mjs # Dispatches API requests to login/logout handlers. │ ├── login.mjs #
Implements the handleLogin lifecycle utility. │ ├── logout.mjs # Implements the handleLogout lifecycle utility. │ └──
ui.mjs # Handles login page rendering and user redirection. │ ├── utils/ │ ├── creds.mjs # Manages the loading and
caching of the UserStore. │ ├── jwt.mjs # Core logic for creating and validating JWTs. │ ├── logger.mjs # A structured
JSON logger for the module. │ └── loginFallback.mjs # Provides a self-contained, unstyled HTML login page. │ ├──
auth.mjs # Core authenticate utility for request enrichment. ├── config.mjs # Manages loading and validation of all
configuration. ├── index.mjs # The main public entry point for the module. └── router.mjs # Implements the
createAuthHandler all-in-one wrapper.
```

## Security Considerations

- **Password Hashing**: For production systems, it is imperative to store and compare cryptographically hashed passwords
  using a strong algorithm (e.g., Argon2, bcrypt, PBKDF2). The example `UserStore` uses plaintext for simplicity only.
- **JWT Secret Management**: The `JWT_SECRET` must be a long, high-entropy string stored securely as a secret in the
  Cloudflare Worker environment.
- **Cookie Security**: By default, Authio configures cookies with the `HttpOnly`, `Secure`, and `SameSite=Strict` flags
  to provide robust protection against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attacks.

## License

This project is licensed under the terms of the **MIT License**.