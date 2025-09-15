/**
 * @file A composable function for authenticating a request and enriching it with auth context.
 * @version 1.4.0 (authio)
 * @exports authenticate
 */

import {createAuthConfig} from './config.mjs';
import {JWT} from './utils/jwt.mjs';
import {Logger} from './utils/logger.mjs';

/**
 * @typedef {import('./config.mjs').AuthConfig} AuthConfig
 */

/**
 * Represents the detailed result of an authentication attempt. This object is
 * attached to the enriched Request object as `request.authio`.
 *
 * @typedef {object} AuthioContext
 * @property {boolean} isAuthed - Evaluates to `true` if the request is successfully authenticated.
 * @property {string|null} method - The method of authentication ('jwt', 'header', 'error', or null if no attempt was made).
 * @property {string|null} username - The name of the authenticated user, if available.
 * @property {object|null} payload - The full decoded JWT payload if the authentication method was 'jwt'.
 * @property {string|null} error - A description of the error if an authentication attempt failed.
 * @property {number} timestamp - A UTC timestamp (from Date.now()) indicating when the authentication check was performed.
 */

/**
 * An enriched Cloudflare Worker Request object. It is a clone of the original
 * request, augmented with the authentication context.
 *
 * @typedef {Request & {isAuthed: boolean, authio: AuthioContext}} AuthenticatedRequest
 */

/**
 * Optional configuration for the authenticate function.
 *
 * @typedef {object} AuthenticateOptions
 * @property {AuthConfig} [config] - A pre-constructed auth config object. If not provided, one will be created from the environment variables.
 */

/**
 * Inspects a Cloudflare Worker request, determines the authentication status based on
 * a JWT cookie or a programmatic header, and returns a new, enriched request object.
 * This function is pure; it does not modify the original request.
 *
 * @param {Request} request - The original incoming request from the Cloudflare Worker runtime.
 * @param {object} env - The worker's environment object, containing configuration and bindings.
 * @param {object} ctx - The worker's execution context.
 * @param {AuthenticateOptions} [options={}] - Optional configuration to override environment variables.
 * @returns {Promise<AuthenticatedRequest>} A promise that resolves to a cloned `Request` object augmented with `isAuthed` and `authio` properties.
 */
export async function authenticate(request, env, ctx, options = {}) {
    const clonedRequest = request.clone();

    // Use the provided config or create one from the environment as a fallback.
    const logger = new Logger({
        enabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
        logLevel: env.AUTH_LOG_LEVEL || 'warn'
    }).withContext({requestId: request.headers.get('cf-ray')});
    const config = options.config || await createAuthConfig(env, logger);

    /** @type {AuthioContext} */
    const authResult = {
        isAuthed: false,
        method: null,
        username: null,
        payload: null,
        error: null,
        timestamp: Date.now()
    };

    try {
        const {userStore} = config;
        let firstError = null;

        // 1. Check for programmatic access via header first.
        const programmaticAuthHeader = clonedRequest.headers.get(config.agentHeaderName);
        if (programmaticAuthHeader) {
            try {
                const decoded = atob(programmaticAuthHeader);

                // Split on the first colon only to allow colons in the password.
                const firstColonIndex = decoded.indexOf(':');
                if (firstColonIndex === -1) {
                    throw new Error('Header credentials are not in the format "username:password"');
                }

                const username = decoded.substring(0, firstColonIndex);
                const password = decoded.substring(firstColonIndex + 1);

                if (username && password && userStore[username] === password) {
                    authResult.isAuthed = true;
                    authResult.method = 'header';
                    authResult.username = username;
                } else {
                    throw new Error('Invalid credentials provided in header');
                }
            } catch (e) {
                logger.warn('Failed programmatic auth header validation.', {error: e.message});
                firstError = 'Malformed or invalid header credentials.';
            }
        }

        // 2. If not authorized by header, fall back to checking for a valid JWT.
        if (!authResult.isAuthed) {
            const payload = await JWT.validate({
                request: clonedRequest,
                jwtSecret: config.jwtSecret,
                authTokenName: config.authTokenName,
                issuer: config.jwtIssuer,
                audience: config.jwtAudience,
            });

            if (payload) {
                authResult.isAuthed = true;
                authResult.method = 'jwt';
                authResult.username = payload.sub;
                authResult.payload = payload;
                authResult.error = null; // Clear any error from a failed header attempt.
            } else {
                let jwtError = null;
                const cookieHeader = clonedRequest.headers.get('Cookie') || '';
                if (cookieHeader.includes(`${config.authTokenName}=`)) {
                    logger.warn('Request contained an invalid, expired, or malformed JWT.');
                    jwtError = 'Invalid or expired token.';
                }

                // Set final error state, prioritizing a JWT error over a header error.
                const finalError = jwtError || firstError;
                if (finalError) {
                    authResult.method = 'error';
                    authResult.error = finalError;
                }
            }
        }
    } catch (e) {
        logger.error('A fatal error occurred during authentication.', {error: e.message});
        authResult.method = 'error';
        authResult.error = 'Internal authentication service error.';
    }

    // Enrich the cloned request with the authentication context.
    clonedRequest.isAuthed = authResult.isAuthed;
    clonedRequest.authio = authResult;

    return clonedRequest;
}