---

# User Management with AuthEllo

A core architectural principle of Authio is the decoupling of user management from the core authentication and
authorization logic. This allows you to update, add, or remove users and their permissions without needing to redeploy
the main `authio` worker.

This is achieved by storing all user data in a Cloudflare KV namespace and using a separate, dedicated service to manage
that data.

## The `AuthEllo` Project

We provide a companion project, `AuthEllo`, which serves as a reference implementation for a GitOps-based user
management workflow. The complete project and setup instructions are available on GitHub.

- **Companion Project**: [divortio/divortio-authEllo](https://github.com/divortio/divortio-authEllo)

### How It Works

- **Source of Truth**: In `AuthEllo`, a single file, `users.mjs`, is the source of truth for all user data.
- **CI/CD Hydration**: When changes are pushed to the `AuthEllo` repository's `main` branch, a CI/CD pipeline (e.g.,
  GitHub Actions or Cloudflare's own Git integration) runs a Node.js script.
- **Strict Validation**: This script performs strict validation on every user object and their route patterns. If any
  data is malformed, the pipeline fails, preventing bad data from ever reaching production.
- **KV Update**: If validation succeeds, the script performs a bulk update to the `AUTH_USERS_KV` namespace, securely
  populating it with the latest user data.

## User Object Schema

All user data is stored as an array of objects in `users.mjs` within the `AuthEllo` project. Each object must conform to
the following schema:

```json
{
"username": "admin",
"password": "a_very_strong_password_or_token",
    "routes":[
    "*[.example.com/admin/](https://.example.com/admin/)*",
    "[api.example.com/v1/users/](https://api.example.com/v1/users/)*"
    ]
}
```

- `username`: (string, required) - The user's unique identifier.
- `password`: (string, required) - The user's password or API token.
- `routes`: (array of strings, required) - An array of Cloudflare-style route patterns. An empty array (`[]`) means the
  user has no permissions.