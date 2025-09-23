/**
 * @file A high-level utility for handling the user login lifecycle event.
 * @version 3.0.0 (authio)
 */

import {createAuthConfig} from '../config.mjs';
import {JWT} from '../utils/jwt.mjs';
import {Logger} from '../utils/logger.mjs';

/**
 * Processes a login request, validates credentials against the KV store, and returns a Response.
 * On success, the Response will contain a Set-Cookie header with the session JWT.
 */
export async function handleLogin(request, env, ctx, options = {}) {
    const logger = new Logger({
        enabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
        logLevel: env.AUTH_LOG_LEVEL || 'warn'
    }).withContext({requestId: request.headers.get('cf-ray')});
    const config = options.config || await createAuthConfig(env, logger);

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({error: 'Method not allowed'}), {
            status: 405,
            headers: {'Content-Type': 'application/json'}
        });
    }

    try {
        const {userStore} = config; // Now a CredentialStore instance
        const {username, password, publicClaims, privateClaims} = await request.json();

        // Fetch the user from the CredentialStore (which uses KV).
        const user = await userStore.getUser(username);

        if (user && user.password === password) {
            const token = await JWT.create({
                ...config,
                username: user.username,
                routes: user.routes,
                publicClaims,
                privateClaims
            });

            let cookieString = `${config.authTokenName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${config.sessionTimeout}`;
            if (config.cookieDomain) {
                cookieString += `; Domain=${config.cookieDomain}`;
            }

            const headers = new Headers({'Content-Type': 'application/json'});
            headers.set('Set-Cookie', cookieString);

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