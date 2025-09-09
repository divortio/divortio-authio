/**
 * @file Handles all authentication API endpoints.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module is a dedicated "mini-router" responsible for handling all API requests
 * related to authentication, such as user login and logout. It is designed to be
 * a self-contained unit that can be called from the main router.
 */

import {JWT} from '../jwt.mjs';
import {CredentialStore} from '../creds.mjs';

/**
 * @namespace ApiHandler
 * @description A handler for authentication API routes.
 */
export const ApiHandler = {
    /**
     * Checks if a request matches an API route and handles it.
     * @param {Request} request - The incoming request.
     * @param {object} config - The application's auth configuration object.
     * @param {import('../logger.mjs').Logger} logger - The logger instance.
     * @returns {Promise<Response|null>} A Response if the route is matched, otherwise null.
     */
    async handleRequest(request, config, logger) {
        const url = new URL(request.url);

        // --- Login Endpoint ---
        if (url.pathname === config.loginApiPath && request.method === 'POST') {
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

        // --- Logout Endpoint ---
        if (url.pathname === config.logoutApiPath && request.method === 'POST') {
            const headers = new Headers({'Content-Type': 'application/json'});
            headers.set('Set-Cookie', `${config.authTokenName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
            logger.info('User logout successful');
            return new Response(JSON.stringify({success: true}), {status: 200, headers});
        }

        return null; // Not an API route
    }
};