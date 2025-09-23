# Getting Started

This guide will walk you through the process of integrating Authio into your own Cloudflare Worker project.

## Prerequisites

Before you begin, you must have the user management system set up and running.

1. **Deploy `AuthEllo`**: You need to have the `authEllo` project deployed and configured. Its job is to manage your
   user data by populating a Cloudflare KV namespace. The complete project and setup instructions are available on
   GitHub.

- **Companion Project**: [divortio/divortio-authEllo](https://github.com/divortio/divortio-authEllo)

2. **Cloudflare KV Namespace**: The `authEllo` service requires a Cloudflare KV namespace to store the user data. You
   must have its Namespace ID ready.

## 1. Configuration in Your Parent Worker (`wrangler.toml`)

All of Authio's operational parameters are defined in your **parent application worker's** `wrangler.toml` file. You
will need to add a service binding to the deployed `authio` worker and a KV namespace binding for Authio to use.

```toml
# In your PARENT application's wrangler.toml

# 1. Add the Service Binding to Authio
[[services]]
binding = "AUTH_SERVICE" # This creates `env.AUTH_SERVICE` in your worker
service = "authio"       # This is the `name` of your deployed Authio worker

# 2. Add the KV Namespace Binding for Authio to use
[[kv_namespaces]]
binding = "AUTH_USERS_KV"
id = "your_kv_namespace_id_here" # Must be the same ID used by AuthEllo

[vars]
# 3. Add the required JWT_SECRET
# This MUST be a unique, random string of at least 32 characters.
JWT_SECRET = "your-super-secret-key-that-is-at-least-32-characters-long"

# 4. (Optional) Customize other Authio settings
SESSION_TIMEOUT = 3600 # Session duration in seconds (Default: 1 hour)
```

## 2. Implement in Your Worker

You are now ready to use Authio. The recommended way to protect your application is with the `handleRequest` RPC method,
which removes all boilerplate from your code.

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
