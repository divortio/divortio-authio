# Security Considerations

Authio is designed with security as a primary concern. However, the overall security of your application depends on
correct configuration and management.

## Secret Management

- **`JWT_SECRET`**: This is the most critical secret in the `authio` module. It is used to sign and verify all session
  tokens. It **MUST** be a high-entropy, random string of at least 32 characters. It should be stored as a secret in
  your Cloudflare Worker's settings, not in plaintext in `wrangler.toml`.

- **API Tokens**: The `authEllo` project requires a Cloudflare API token to write to your KV namespace. This token
  should also be stored as a secure environment variable in your CI/CD platform's settings.

## Password Security

- **Password Hashing**: The current implementation stores plaintext passwords in the `users.mjs` file for simplicity.
  For production systems, it is **imperative** to store and compare cryptographically hashed passwords using a strong,
  modern algorithm (e.g., Argon2, bcrypt, or PBKDF2). This would require modifying the `authEllo` hydration script and
  the `authio` login/header authentication logic to perform hashing and comparison.

## Cookie Security

By default, Authio configures session cookies with the strongest possible security flags to provide robust protection
against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF) attacks:

- `HttpOnly`: Prevents the cookie from being accessed by client-side JavaScript.
- `Secure`: Ensures the cookie is only sent over HTTPS connections.
- `SameSite=Strict`: Prevents the browser from sending the cookie along with cross-site requests.

## Rate Limiting

The API handler for logins includes rate limiting based on a combination of the user's IP address and the username they
are attempting to use. This helps to mitigate brute-force and credential-stuffing attacks against your login endpoint.