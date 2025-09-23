/**
 * @file Manages and strictly validates the configuration for the Authio module.
 * @version 4.1.0 (authio)
 * @description This module is responsible for parsing environment variables from `wrangler.toml`,
 * validating their format, providing sensible defaults, and constructing a single, immutable
 * configuration object that the application can use at runtime.
 */

import {CredentialStore} from './utils/creds.mjs';

/**
 * @typedef {object} AuthConfig
 * @property {CredentialStore} userStore - The class instance for accessing user credentials from KV.
 * @property {string} jwtSecret - The secret key for signing and verifying JWTs.
 * @property {number} sessionTimeout - The session duration in seconds.
 * @property {string} loginUrlPath - The public-facing URL path for the login page.
 * @property {string|null} cookieDomain - The domain to set for the session cookie, if any.
 * @property {number} userCacheTtl - The TTL for the in-memory cache of user objects from KV, in seconds.
 * @property {string} loginApiPath - The API endpoint for handling logins.
 * @property {string} logoutApiPath - The API endpoint for handling logouts.
 * @property {string} loginAssetPath - The internal path to the login.html asset.
 * @property {string} authRedirectPath - The path to redirect to after a successful login.
 * @property {string} authTokenName - The name of the session cookie.
 * @property {string} agentHeaderName - The HTTP header used for programmatic access.
 * @property {string} jwtIssuer - The "iss" (Issuer) claim for the JWT.
 * @property {string} jwtAudience - The "aud" (Audience) claim for the JWT.
 * @property {boolean} logEnabled - A master switch for enabling or disabling logging.
 * @property {string} logLevel - The minimum level to log ('info', 'warn', 'error').
 * @property {number} cacheTtlMs - The TTL for the in-memory JWT validation cache in milliseconds.
 * @property {number} maxCacheSize - The maximum number of items in the JWT and route caches.
 * @property {number} cacheEvictionBatchSize - The number of oldest entries to evict when a cache is full.
 */

/**
 * A private helper function to retrieve and validate an environment variable.
 * @param {object} env - The worker's environment object.
 * @param {string} key - The environment variable key to validate.
 * @param {function(any): boolean} validator - A function that returns true if the value is valid.
 * @param {string} message - The error message to display if validation fails.
 * @returns {any} The validated environment variable.
 * @throws {Error} If the variable is missing or fails validation.
 */
function requireAndValidate(env, key, validator, message) {
    const value = env[key];
    if (value === undefined || value === null) {
        throw new Error(`Configuration Error: Required environment variable "${key}" is not set.`);
    }
    if (!validator(value)) {
        throw new Error(`Configuration Error: Invalid value for "${key}". ${message}`);
    }
    return value;
}

const isPath = (val) => typeof val === 'string' && val.startsWith('/');
const isInteger = (val) => !isNaN(parseInt(val, 10)) && Number.isInteger(Number(val));
const isDomain = (val) => typeof val === 'string' && /^\.?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(val);

/**
 * Creates a validated configuration object from environment variables.
 * This function is designed to be called once upon worker initialization.
 * @param {object} env - The worker's environment object from `wrangler.toml`.
 * @param {import('./utils/logger.mjs').Logger} logger - The logger instance.
 * @returns {AuthConfig} A frozen configuration object.
 */
export function createAuthConfig(env, logger) {
    const jwtSecret = requireAndValidate(env, 'JWT_SECRET', (val) => typeof val === 'string' && val.length >= 32 && val !== 'default-secret-please-change', 'Must be a unique, random string of at least 32 characters.');
    const sessionTimeout = env.SESSION_TIMEOUT ? Number(requireAndValidate(env, 'SESSION_TIMEOUT', isInteger, 'Must be a whole number (integer).')) : 3600;
    const loginUrlPath = env.LOGIN_URL_PATH || '/login';
    if (!isPath(loginUrlPath)) throw new Error('Configuration Error: LOGIN_URL_PATH must be a valid path (e.g., "/login").');
    const cookieDomain = env.COOKIE_DOMAIN ? requireAndValidate(env, 'COOKIE_DOMAIN', isDomain, 'Must be a valid domain name, optionally preceded by a dot (e.g., ".example.com").') : null;
    const userCacheTtl = env.USER_CACHE_TTL ? Number(requireAndValidate(env, 'USER_CACHE_TTL', isInteger, 'Must be a whole number (integer).')) : 60;

    const userStore = new CredentialStore(env.AUTH_USERS_KV, logger, userCacheTtl * 1000);

    const config = {
        userStore,
        jwtSecret,
        sessionTimeout,
        loginUrlPath,
        cookieDomain,
        userCacheTtl,
        loginApiPath: env.LOGIN_API_PATH || '/api/auth/login',
        logoutApiPath: env.LOGOUT_API_PATH || '/api/auth/logout',
        loginAssetPath: env.LOGIN_ASSET_PATH || './login.html',
        authRedirectPath: env.AUTH_REDIRECT_PATH || '/',
        authTokenName: env.AUTH_COOKIE_NAME || '__authio_jwt',
        agentHeaderName: env.AGENT_HEADER_NAME || 'X-Authio-Token',
        jwtIssuer: env.JWT_ISSUER || 'Authio',
        jwtAudience: env.JWT_AUDIENCE || 'AuthioUsers',
        logEnabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
        logLevel: env.AUTH_LOG_LEVEL || 'warn',
        cacheTtlMs: env.CACHE_TTL_MS ? Number(requireAndValidate(env, 'CACHE_TTL_MS', isInteger, 'Must be a whole number (integer).')) : 60000,
        maxCacheSize: env.MAX_CACHE_SIZE ? Number(requireAndValidate(env, 'MAX_CACHE_SIZE', isInteger, 'Must be a whole number (integer).')) : 50000,
        cacheEvictionBatchSize: env.CACHE_EVICTION_BATCH_SIZE ? Number(requireAndValidate(env, 'CACHE_EVICTION_BATCH_SIZE', isInteger, 'Must be a whole number (integer).')) : 100,
    };

    // Freeze the object to prevent mutation at runtime.
    return Object.freeze(config);
}