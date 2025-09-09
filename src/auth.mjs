/**
 * @file A composable function for authenticating a request and enriching it with auth context.
 * @version 1.1.0 (authio)
 *
 * @description
 * This module exports a single function, `authenticate`, that inspects a request
 * for valid credentials (either a programmatic header or a user session JWT). It does
 * not produce a response, but instead returns a cloned request object with an added
 * `authio` property containing the result of the authentication attempt. This allows
 * a parent worker to easily check authentication status and use the resulting context
 * to make its own decisions about how to proceed.
 */

import {createAuthConfig} from './config.mjs';
import {CredentialStore} from './utils/creds.mjs';
import {JWT} from './utils/jwt.mjs';
import {Logger} from './utils/logger.mjs';

/**
 * @typedef {object} AuthioContext
 * @property {boolean} isAuthed - True if the request is successfully authenticated.
 * @property {string|null} method - The method of authentication ('jwt', 'header', 'error', or null).
 * @property {string|null} username - The authenticated user's name, if available.
 * @property {object|null} payload - The full JWT payload, if the method was 'jwt'.
 * @property {string|null} error - A description of the error if authentication failed.
 * @property {number} timestamp - The UTC timestamp of when the authentication check was performed.
 */

/**
 * Inspects and authenticates a request, returning a cloned, enriched request object.
 *
 * @param {Request} request - The original incoming request.
 * @param {object} env - The worker's environment object.
 * @param {ExecutionContext} ctx - The worker's execution context.
 * @param {object} [options={}] - Optional configuration.
 * @param {object} [options.config] - A pre-constructed auth config object to override env vars.
 * @returns {Promise<Request>} A promise that resolves to a cloned Request object with `isAuthed` and `authio` properties.
 */
export async function authenticate(request, env, ctx, options = {}) {
    const clonedRequest = request.clone();
    const config = options.config || createAuthConfig(env);
    const logger = new Logger({
        enabled: config.logEnabled,
        logLevel: config.logLevel
    }).withContext({requestId: request.headers.get('cf-ray')});

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
        const userStore = await CredentialStore.get(config.usersModulePath, logger);
        let firstError = null;

        // 1. Check for programmatic access via header first.
        const programmaticAuthHeader = clonedRequest.headers.get(config.agentHeaderName);
        if (programmaticAuthHeader) {
            try {
                const decoded = atob(programmaticAuthHeader);
                const [username, password] = decoded.split(':');
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