# Consuming Authio as an RPC Service

With the new architecture, Authio is no longer a module you clone into your project. 

Instead, it runs as its own standalone worker, and you interact with it from your main application worker via a **Service Binding**. This creates a
clean, decoupled microservice architecture.

## 1. Configuration in Your Parent Worker

In your main application worker's `wrangler.toml` file, you need to add a `[[services]]` binding. This tells the
Cloudflare runtime how to connect to your deployed `authio` worker.

```toml
# In your PARENT application's wrangler.toml

# The name of your parent worker
name = "my-application-worker"
main = "src/index.mjs"

# ... other configurations ...

# Add a service binding to the deployed Authio worker
[[services]]
binding = "AUTH_SERVICE" # This creates `env.AUTH_SERVICE` in your worker
service = "authio"       # This is the `name` of your deployed Authio worker


## 2. Recommended Usage: The `handleRequest` Method

The easiest and most efficient way to use the Authio service is with the `handleRequest` RPC method. This high-level
function provides a complete, boilerplate-free solution for protecting your application logic.

It intelligently handles all authentication and authorization checks, manages redirects and error responses, and only
calls back to your application logic if the user is fully permitted to access the resource.

### Example Parent Worker

This is all the code you need in your parent worker to fully protect it using Authio.



```javascript
// In your PARENT application's src/index.mjs

/**
 * This is your main application logic. It will only be executed if a user
 * is successfully authenticated and authorized by the Authio service.
 * @param {Request} request - The request object, now enriched with the `authio` context.
 * @returns {Promise<Response>}
 */
async function myProtectedApp(request) {
    const username = request.authio.username;
    return new Response(`Hello from the main application, ${username}!`);
}


export default {
    /**
     * @param {Request} request
     * @param {object} env - Contains the AUTH_SERVICE binding.
     * @param {object} ctx
     */
    async fetch(request, env, ctx) {
        // This single line handles everything.
        // It calls the remote Authio service, passing a stub of your application logic.
        // Authio will only call your appLogic if the user is fully authorized.
        return env.AUTH_SERVICE.handleRequest(request, myProtectedApp);
    }
};
```


## Advanced Usage

For more complex routing scenarios, you can still use the other RPC methods directly.

- `authenticate(request)`: Returns the enriched request object without blocking or responding.
- `handleLogin(request)`: For forwarding requests to your login API endpoint.
- `handleLogout(request)`: For forwarding requests to your logout API endpoint.

### Example of Advanced Routing

```javascript
// In your PARENT application's src/index.mjs

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        if (url.pathname === '/api/login') {
            return env.AUTH_SERVICE.handleLogin(request);
        }

        if (url.pathname.startsWith('/admin')) {
            const authedRequest = await env.AUTH_SERVICE.authenticate(request);
            if (!authedRequest.isAuthorized) {
                return new Response("Forbidden", { status: 403 });
            }
            // ... admin logic here ...
            return new Response(`Welcome, ${authedRequest.authio.username}`);
        }

        // Public route
        return new Response("Public content");
    }
};






