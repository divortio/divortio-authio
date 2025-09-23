# Usage Patterns

Authio is designed to be flexible, offering two primary integration patterns to suit different needs.

## 1. Comprehensive Application Protection

This is the simplest and most direct way to use Authio. The `createAuthHandler` function wraps your entire application,
automatically handling all authentication and authorization logic. It will manage login page redirects for
unauthenticated users and enforce route permissions for authenticated users, acting as a complete gatekeeper.

This pattern is ideal for applications where all or most routes need to be protected.

### Example

```javascript
// file: src/index.mjs

import { createAuthHandler } from './modules/authio/src/index.mjs';

/**
 * This is your main application logic. It is only reachable if a user
 * is successfully authenticated and authorized for the requested route.
 */
async function mySimpleApp(request, env, ctx) {
    // The request object is automatically enriched with the auth context.
    const username = request.authio.username;

    return new Response(`<h1>Welcome to the protected app, ${username}!</h1>`, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// The `createAuthHandler` wraps the application, providing a complete auth solution.
const protectedApp = createAuthHandler(mySimpleApp);

// Export the protected application as your worker's default handler.
export default {
    async fetch(request, env, ctx) {
        return protectedApp(request, env, ctx);
    }
};

```

## 2. Selective Route Protection

For applications with more complex requirements, such as those with a mix of public and private routes, you can use
Authio's modular functions directly to build custom routing and protection logic.

The core of this pattern is the `authenticate` function, which inspects a request and returns a cloned, enriched request
object without blocking or redirecting. Your code can then inspect the `request.isAuthed` and `request.isAuthorized`
properties to make its own decisions.

### Example

```javascript
// file: src/index.mjs

import { authenticate, handleLogin, handleLogout } from './modules/authio/src/index.mjs';

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- Public Route ---
        if (url.pathname === '/') {
            return new Response('This is the public homepage. Anyone can see this.');
        }

        // --- API Lifecycle Routes ---
        if (url.pathname === '/api/login') {
            return handleLogin(request, env, ctx);
        }
        if (url.pathname === '/api/logout') {
            return handleLogout(request, env, ctx);
        }

        // --- Protected Route ---
        if (url.pathname.startsWith('/admin')) {
            // 1. Authenticate and authorize the request
            const authedRequest = await authenticate(request, env, ctx);

            // 2. Check the result and act accordingly
            if (!authedRequest.isAuthorized) {
                // You decide what to do. Return a 403, a 404, or redirect.
                return new Response('Forbidden. You are not authorized to see this.', { status: 403 });
            }

            // 3. Proceed with the application logic, using the auth context
            const username = authedRequest.authio.username;
            return new Response(`Welcome to the admin panel, ${username}!`);
        }

        return new Response('Not Found', { status: 404 });
    }
};
```