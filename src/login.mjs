/**
 * @file A high-level utility for handling the user login lifecycle event.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module exports a single function, `handleLogin`, that encapsulates the
 * entire logic for processing user credentials from a request and returning a
 * response that establishes a session by setting a JWT cookie.
 */

import {createAuthConfig} from './config.mjs';
import {CredentialStore} from './creds.mjs';
import {JWT} from './jwt.mjs';
import {Logger} from './logger.mjs';

/**
 * Processes a login request, validates credentials, and returns a Response.
 * On success, the Response will contain a Set-Cookie header with the session JWT.
 * On failure, it will return an appropriate HTTP error Response.
 *
 * @param {Request} request - The incoming request, expected to be a POST with a JSON body.
 * @param {object} env - The worker's environment object.
 * @param {ExecutionContext} ctx - The worker's execution context.
 * @param {object} [options={}] - Optional configuration.
 * @param {object} [options.config] - A pre-constructed auth config object to override env vars.
 * @returns {Promise<Response>} A promise that resolves to a Response object.
 */
export async function handleLogin(request, env, ctx, options = {}) {
    const config = options.config || createAuthConfig(env);
    const logger = new Logger({
        enabled: config.logEnabled,
        logLevel: config.logLevel
    }).withContext({requestId: request.headers.get('cf-ray')});

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({error: 'Method not allowed'}), {
            status: 405,
            headers: {'Content-Type': 'application/json'}
        });
    }

    try {
        const userStore = await CredentialStore.get(config.usersModulePath, logger);
        const {username, password, publicClaims, privateClaims} = await request.json();

        if (userStore[username] === password) {
            const token = await JWT.create({...config, username, publicClaims, privateClaims});
            const headers = new Headers({'Content-Type': 'application/json'});
            headers.set('Set-Cookie', `${config.authTokenName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${config.sessionTimeout}`);

            logger.info('User login successful', {username});
            return new Response(JSON.stringify({success: true}), {status: 200, headers});
        } else {
            logger.warn('User login failed: Invalid credentials', {
                username,
                ip: request.headers.get('cf-connecting-ip')
            });
            return new Response(JSON.stringify({error: 'Invalid credentials'}), {
                status: 401,
                headers: {'Content-Type': 'application/json'}
            });
        }
    } catch (e) {
        logger.error('Login API error', {error: e.message});
        return new Response(JSON.stringify({error: 'Invalid request body'}), {
            status: 400,
            headers: {'Content-Type': 'application/json'}
        });
    }
}