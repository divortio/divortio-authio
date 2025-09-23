# Getting Started

## Prerequisites

Before you begin, you must have the user management system set up and running.

1. **Deploy `AuthEllo`**: You need to have the `authEllo` project deployed and configured. Its job is to manage your
   user data by populating a Cloudflare KV namespace. The complete project and setup instructions are available on
   GitHub.
    - **Companion Project**: [divortio/divortio-authEllo](https://github.com/divortio/divortio-authEllo)
2. **Cloudflare KV Namespace**: The `authEllo` service requires a Cloudflare KV namespace to store the user data. You
   must have its Namespace ID ready.

Of course. It's essential that the documentation reflects the final architecture and provides a clear link to the
companion `authEllo` project.

Here are the updated documentation files with the required changes.

## 1. Module Integration

Authio is intended to be used as a pluggable module, isolated from your parent worker's primary codebase. It is assumed the Authio repository will be cloned into a dedicated directory within your parent worker project.

**Example Project Structure:**

```text
my-worker-project/
|-- src/
|   |-- modules/
|   |   |-- authio/      <-- Clone the Authio repository here
|   |   |   |-- src/
|   |   |   |-- ...
|   |-- index.mjs        <-- Your parent worker
|-- package.json
|-- wrangler.toml
```

## 2. Configuration (`wrangler.toml`)

All of Authio's operational parameters are defined in your project's `wrangler.toml` file. You will need to add a KV namespace binding and can optionally add a `[vars]` section to customize Authio's behavior.

```toml
# In your project's wrangler.toml

# 1. Add the KV Namespace Binding
# This connects Authio to the user store managed by AuthEllo.
# The `id` must be the ID of the KV namespace you created.
[[kv_namespaces]]
binding = "AUTH_USERS_KV"
id = "your_kv_namespace_id_here"

[vars]
# 2. Add the required JWT_SECRET
# This MUST be a unique, random string of at least 32 characters.
JWT_SECRET = "your-super-secret-key-that-is-at-least-32-characters-long"

# 3. (Optional) Customize other Authio settings
SESSION_TIMEOUT = 3600 # Session duration in seconds (Default: 1 hour)
LOGIN_API_PATH = "/api/login"
# ... and so on. See the Configuration guide for all available options.
````

## 3. Implement in Your Worker

You are now ready to use Authio in your worker's code. The easiest way to protect your entire application is to use the `createAuthHandler` wrapper.

```javascript
// In your src/index.mjs

import { createAuthHandler } from './modules/authio/src/index.mjs';

// This is your main application logic.
// It will only be executed if a user is authenticated and authorized.
async function myProtectedApp(request, env, ctx) {
    // The request object is enriched with the user's auth context.
    const username = request.authio.username;
    const matchedRoute = request.authio.matchedRoute;

    return new Response(`Hello, ${username}! You accessed this via ${matchedRoute}.`);
}

// Wrap your application with the Authio handler.
export default createAuthHandler(myProtectedApp);
````



