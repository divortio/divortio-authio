# Core Features

Authio is built with a focus on performance, security, and developer experience. Here are its key features:

### Decoupled User Management

- **Cloudflare KV Integration**: User data, including credentials and permissions, is stored in a Cloudflare KV
  namespace, allowing you to manage users and routes without redeploying your main application worker.
- **GitOps Workflow**: Designed to work with a separate service (like the provided `authEllo` project) that follows a
  GitOps workflow, where changes to a user file in a repository automatically trigger a secure hydration of your KV
  store.

### High-Performance Caching

- **In-Memory Caches**: Authio employs multiple layers of in-memory caching to minimize latency. JWT validation results
  and user route permissions are cached, meaning that for most requests, no cryptographic operations or KV lookups are
  necessary.
- **Lazy-Loading User Store**: The system only fetches user data from KV when it's absolutely needed (during a login or
  a programmatic header-based authentication attempt), ensuring that anonymous and JWT-authenticated traffic experience
  zero added latency.
- **"High Water Mark" Eviction**: All caches are self-regulating and memory-safe, using a high-performance "High Water
  Mark" eviction strategy that is ideal for the Cloudflare Workers environment.

### Robust Authentication & Authorization

- **Dual Authentication Methods**: Supports both traditional session-based authentication via JWTs in secure cookies and
  programmatic access via a custom HTTP header.
- **Route-Based Authorization**: Permissions are defined as an array of Cloudflare-style route
  patterns (`example.com/admin/*`) for each user. These permissions are embedded directly into the JWT, keeping the
  system stateless.
- **Enriched Request Context**: Authio augments every incoming request with a detailed `authio` object, providing a
  clear and consistent context about the user's authentication and authorization status.

### Developer Experience

- **Flexible Integration**: Use the all-in-one `createAuthHandler` for turnkey application security, or use the modular,
  composable functions (`authenticate`, `handleLogin`, etc.) for more granular control.
- **Structured JSON Logging**: Includes a configurable, machine-readable logger that provides detailed insights into
  authentication and authorization events.