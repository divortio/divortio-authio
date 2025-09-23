# 🛡️ Authio: Pluggable Authentication & Authorization for Cloudflare Workers

# 🛡️ Authio: Pluggable Authentication & Authorization for Cloudflare Workers

## 🚀 Full Documentation

This project is a standalone RPC service and is consumed by a parent worker. For complete information on features,
setup, configuration, and API usage, please see the comprehensive documentation in the `/docs` directory.

- **[Click here to get started with the full documentation.](./docs/index.md)**

## Companion Project: `AuthEllo`

User management (creating, updating, and deleting users and their route-based permissions) is handled by a separate
companion project, `AuthEllo`. This project follows a GitOps workflow, where changes to a `users.mjs` file in a
repository automatically trigger a secure hydration of your Cloudflare KV store.

- **Companion Project**: [divortio/divortio-authEllo](https://github.com/divortio/divortio-authEllo)

