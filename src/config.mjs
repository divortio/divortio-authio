/**
 * @file Manages and strictly validates the configuration for the Authio module.
 * @version 3.0.0 (authio)
 *
 * @description
 * This module exports a single async function, `createAuthConfig`, which is responsible for
 * reading, validating, and type-casting all auth-related environment variables. It now
 * also preloads the user credential store to provide a single, complete, and ready-to-use
 * configuration object, preventing downstream boilerplate.
 */

import {CredentialStore} from './utils/creds.mjs';
import {Logger} from './utils/logger.mjs';

/**
 * @typedef {object} AuthConfig
 * @property {object} userStore - The preloaded user credential store.
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

// --- Validation Helpers ---

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

const isPath = (val) => typeof val === 'string' && val.includes('/');
const isNonEmptyString = (val) => typeof val === 'string' && val.length > 0;
const isInteger = (val) => !isNaN(parseInt(val, 10)) && Number.isInteger(Number(val));

/**
 * Creates and returns a structured configuration object for the Authio module.
 * @param {object} env - The parent worker's environment object.
 * @param {Logger} logger - A logger instance for internal operations.
 * @returns {Promise<AuthConfig>} A promise resolving to a unified and type-safe configuration object.
 * @throws {Error} If a required environment variable is missing, insecure, or invalid.
 */
export async function createAuthConfig(env, logger) {
    // --- Perform strict validation on required and optional env vars ---
    const usersModulePath = requireAndValidate(env, 'AUTH_USERS_MODULE_PATH', isPath, 'Must be a valid module path.');
    const jwtSecret = requireAndValidate(env, 'JWT_SECRET', (val) => val.length >= 32 && val !== 'default-secret-please-change', 'Must be a unique, random string of at least 32 characters.');

    const sessionTimeout = env.SESSION_TIMEOUT ? Number(requireAndValidate(env, 'SESSION_TIMEOUT', isInteger, 'Must be a whole number (integer).')) : 3600;
    const loginUrlPath = env.LOGIN_URL_PATH || '/login';
    if (!isPath(loginUrlPath)) throw new Error('Configuration Error: LOGIN_URL_PATH must be a valid path (e.g., "/login").');

    // --- Preload the UserStore ---
    const userStore = await CredentialStore.get(usersModulePath, logger);

    // --- Return the final, complete configuration object ---
    return {
        userStore,
        usersModulePath,
        jwtSecret,
        sessionTimeout,
        loginUrlPath,
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
    };
}