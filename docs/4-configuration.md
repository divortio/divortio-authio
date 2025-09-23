# Configuration Reference

All of Authio's configuration is managed through your worker's `wrangler.toml` file. This includes a KV namespace
binding and a `[vars]` section for customizing behavior.

## KV Namespace Binding (Required)

You must bind a Cloudflare KV namespace to the worker. Authio uses this to read the user data managed by the `authEllo`
service.

```toml
[[kv_namespaces]]
binding = "AUTH_USERS_KV"
id = "your_kv_namespace_id_here"
```

## Environment Variables (`[vars]`)

All variables are optional, but it is **highly recommended** to set a unique `JWT_SECRET`.

| Variable                  | Required | Description                                                                 | Default                      |
| :------------------------ | :------- | :-------------------------------------------------------------------------- | :--------------------------- |
| `JWT_SECRET`              | **
Yes** | A unique, random string of at least 32 characters for signing tokens.       | ` `                          |
| `SESSION_TIMEOUT`         | No       | Session duration in seconds.                                                | `3600` (1 hour)              |
| `LOGIN_URL_PATH`          | No       | The public URL for the login page.                                          | `/login`                     |
| `LOGIN_ASSET_PATH`        | No       | The path to the `login.html` asset within the `/public` directory.          | `./login.html`               |
| `AUTH_REDIRECT_PATH`      | No       | Path to redirect to after a successful login.                               | `/`                          |
| `LOGIN_API_PATH`          | No       | The API endpoint for handling logins.                                       | `/api/auth/login`            |
| `LOGOUT_API_PATH`         | No       | The API endpoint for handling logouts.                                      | `/api/auth/logout`           |
| `AUTH_COOKIE_NAME`        | No       | The name of the session cookie.                                             | `__authio_jwt`               |
| `COOKIE_DOMAIN`           | No       | Optional domain for the cookie (e.g., `.example.com`).                      | Host-only                    |
| `AGENT_HEADER_NAME`       | No       | HTTP header for programmatic access.                                        | `X-Authio-Token`             |
| `JWT_ISSUER`              | No       | **(
Recommended)** Unique URL identifying the authentication service.        | `Authio`                     |
| `JWT_AUDIENCE`            | No       | **(
Recommended)** Unique URL identifying the API this token is valid for.   | `AuthioUsers`                |
| `AUTH_LOG_ENABLED`        | No       | A boolean flag (`true`/`false`) to enable or disable structured logging.      | `false`                      |
| `AUTH_LOG_LEVEL`          | No       | The minimum logging level (`error`, `warn`, `info`, `debug`).               | `warn`                       |
| `CACHE_TTL_MS`            | No       | The TTL in milliseconds for the in-memory JWT validation cache.             | `60000` (60 seconds)         |
| `MAX_CACHE_SIZE`          | No       | The max number of items in the JWT validation and route authorization caches. | `50000`                      |
| `CACHE_EVICTION_BATCH_SIZE` | No       | The number of oldest items to evict when a cache is full.                 | `100`                        |
| `USER_CACHE_TTL`          | No       | The TTL in seconds for the in-memory cache of user objects from KV.         | `60`                         |