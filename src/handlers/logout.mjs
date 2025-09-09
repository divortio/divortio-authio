/**
 * @file A high-level utility for handling the user logout lifecycle event.
 * @version 1.2.0 (authio)
 *
 * @description
 * This module exports a single function, `handleLogout`, that returns a response
 * which clears the session JWT cookie, effectively logging the user out.
 */

import {createAuthConfig} from '../config.mjs';
import {Logger} from '../utils/logger.mjs';

/**
 * Processes a logout request and returns a Response that clears the auth cookie.
 *
 * @param {Request} request - The incoming request.
 * @param {object} env - The worker's environment object.
 * @param {ExecutionContext} ctx - The worker's execution context.
 * @param {object} [options={}] - Optional configuration.
 * @param {object} [options.config] - A pre-constructed auth config object to override env vars.
 * @returns {Promise<Response>} A promise that resolves to a Response object.
 */
export async function handleLogout(request, env, ctx, options = {}) {
    // Use the provided config or create one from the environment as a fallback.
    const logger = new Logger({
        enabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
        logLevel: env.AUTH_LOG_LEVEL || 'warn'
    }).withContext({requestId: request.headers.get('cf-ray')});
    const config = options.config || await createAuthConfig(env, logger);

    let cookieString = `${config.authTokenName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
    if (config.cookieDomain) {
        cookieString += `; Domain=${config.cookieDomain}`;
    }

    const headers = new Headers({'Content-Type': 'application/json'});
    headers.set('Set-Cookie', cookieString);

    logger.info('User logout successful');
    return new Response(JSON.stringify({success: true}), {status: 200, headers});
}