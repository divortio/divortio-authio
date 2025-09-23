# Usage Patterns

Authio is designed to be flexible. While the `handleRequest` RPC method is recommended for most use cases, you can also
use the granular RPC methods for more complex scenarios.

## 1. Recommended Pattern: `handleRequest`

The `handleRequest(request, appLogic)` method provides a complete, boilerplate-free solution. It intelligently handles
all authentication, authorization, redirects, and error responses, and only calls back to your application logic if the
user is fully permitted to access the resource.

This pattern is ideal for applications where all or most routes need to be protected.

### Example

```javascript
// In your PARENT application's src/index.mjs

async function myProtectedApp(request) {
    const username = request.authio.username;
    return new Response(`<h1>Welcome to the protected app, ${username}!</h1>`);
}

export default {
    async fetch(request, env, ctx) {
        return env.AUTH_SERVICE.handleRequest(request, myProtectedApp);
    }
};
```

## 2. Advanced Pattern: Custom Routing

For applications with a mix of public and protected routes, you can use the `authenticate`, `handleLogin`,
and `handleLogout` methods directly. The core of this pattern is the `authenticate` function, which returns the enriched
request object, allowing your code to make its own routing decisions.

### Example

```javascript
// In your PARENT application's src/index.mjs

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- Public Route (No RPC call needed) ---
        if (url.pathname === '/') {
            return new Response('This is the public homepage.');
        }

        // --- Auth API Routes (Forwarded to Authio) ---
        if (url.pathname === '/api/login') {
            return env.AUTH_SERVICE.handleLogin(request);
        }
        if (url.pathname === '/api/logout') {
            return env.AUTH_SERVICE.handleLogout(request);
        }

        // --- Protected Route (Requires RPC call to `authenticate`) ---
        if (url.pathname.startsWith('/admin')) {
            const authedRequest = await env.AUTH_SERVICE.authenticate(request);

            if (!authedRequest.isAuthorized) {
                return new Response("Forbidden", { status: 403 });
            }

            const username = authedRequest.authio.username;
            return new Response(`Welcome to the admin panel, ${username}!`);
        }

        return new Response('Not Found', { status: 404 });
    }
};
```
