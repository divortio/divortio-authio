/**
 * @file Manages and strictly validates the configuration for the Authio module.
 * @version 2.0.0 (authio)
 *
 * @description
 * This module exports a single function, `createAuthConfig`, which is responsible for
 * reading all auth-related variables from a parent worker's environment (`env`).
 * It enforces a strict contract: if any required variable is missing or insecure,
 * it will throw an error, preventing the auth system from running in an unsafe state.
 */

/**
 * @typedef {object} AuthConfig
 * @property {string} usersModulePath - The path to the user credential store.
 * @property {string} loginApiPath - The path for the user login API endpoint.
 * @property {string} logoutApiPath - The path for the user logout API endpoint.
 * @property {string} loginUrlPath - The public-facing URL path for the login page.
 * @property {string} loginAssetPath - The internal path to the login.html file within static assets.
 * @property {string} authRedirectPath - The path to redirect to after a successful login.
 * @property {string} jwtSecret - The secret key for signing JWTs.
 * @property {number} sessionTimeout - The session duration in seconds.
 * @property {string} authTokenName - The name of the authentication cookie.
 * @property {string} agentHeaderName - The name of the HTTP header for programmatic access.
 * @property {string} jwtIssuer - The "iss" (Issuer) claim for the JWT.
 * @property {string} jwtAudience - The "aud" (Audience) claim for the JWT.
 * @property {boolean} logEnabled - A master switch for logging.
 * @property {string} logLevel - The minimum level to log ('info', 'warn', 'error').
 */

/**
 * Validates a required environment variable and throws an error if it's missing.
 * @private
 * @param {object} env - The worker's environment object.
 * @param {string} key - The environment variable key to check.
 */
function requireEnv(env, key) {
    if (!env[key]) {
        throw new Error(`Configuration Error: Required environment variable "${key}" is not set in wrangler.toml.`);
    }
}

/**
 * Creates and returns a structured configuration object for the Authio module.
 * @param {object} env - The parent worker's environment object.
 * @returns {AuthConfig} A unified and type-safe configuration object.
 * @throws {Error} If a required environment variable is missing or insecure.
 */
export function createAuthConfig(env) {
    // --- Perform strict validation on required env vars ---
    requireEnv(env, 'AUTH_USERS_MODULE_PATH');
    requireEnv(env, 'JWT_SECRET');

    if (env.JWT_SECRET.length < 32 || env.JWT_SECRET === 'default-secret-please-change') {
        throw new Error("Configuration Error: JWT_SECRET must be a unique, random string of at least 32 characters.");
    }

    // --- Return the final, complete configuration object ---
    return {
        usersModulePath: env.AUTH_USERS_MODULE_PATH,
        loginApiPath: env.LOGIN_API_PATH || '/api/auth/login',
        logoutApiPath: env.LOGOUT_API_PATH || '/api/auth/logout',
        loginUrlPath: env.LOGIN_URL_PATH || '/login',
        loginAssetPath: env.LOGIN_ASSET_PATH || './login.html',
        authRedirectPath: env.AUTH_REDIRECT_PATH || '/',
        jwtSecret: env.JWT_SECRET,
        sessionTimeout: Number(env.SESSION_TIMEOUT) || 3600,
        authTokenName: env.AUTH_COOKIE_NAME || '__authio_jwt',
        agentHeaderName: env.AGENT_HEADER_NAME || 'X-Authio-Token',
        jwtIssuer: env.JWT_ISSUER || 'Authio',
        jwtAudience: env.JWT_AUDIENCE || 'AuthioUsers',
        logEnabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
        logLevel: env.AUTH_LOG_LEVEL || 'warn',
    };
}