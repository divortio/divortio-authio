/**
 * @file Handles all authentication-related user interface routing and rendering.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module is responsible for the user-facing parts of the authentication flow.
 * It manages redirects for authenticated and unauthenticated users and handles serving
 * the `login.html` asset with its server-side templating and graceful fallback.
 */

import {JWT} from '../jwt.mjs';
import {fallbackLoginPage} from '../loginFallback.mjs';

/**
 * @namespace UiHandler
 * @description A handler for authentication UI routes.
 */
export const UiHandler = {
    /**
     * Checks if a request is for a UI route (like the login page) and handles it.
     * @param {Request} request - The incoming request.
     * @param {object} env - The worker's environment, containing the ASSETS binding.
     * @param {object} config - The application's auth configuration object.
     * @param {import('../logger.mjs').Logger} logger - The logger instance.
     * @returns {Promise<Response|null>} A Response if the route is matched, otherwise null.
     */
    async handleRequest(request, env, config, logger) {
        const url = new URL(request.url);
        const payload = await JWT.validate({...config, request});
        const isLoginPageRoute = url.pathname === config.loginUrlPath;

        // --- Redirect Logic ---
        if (payload && isLoginPageRoute) {
            // User is ALREADY logged in but is visiting the login page. Redirect them.
            return Response.redirect(new URL(config.authRedirectPath, url).href, 302);
        }

        const isProgrammaticRequest = request.headers.has(config.agentHeaderName);

        if (!payload && !isLoginPageRoute && !isProgrammaticRequest) {
            const isBrowserRequest = request.headers.get('Accept')?.includes('text/html');
            if (isBrowserRequest) {
                // User is NOT logged in and is trying to access a protected page. Redirect them.
                return Response.redirect(new URL(config.loginUrlPath, url).href, 302);
            }
        }

        // --- Login Page Serving Logic ---
        if (isLoginPageRoute) {
            try {
                if (!env.ASSETS) throw new Error("ASSETS binding not found.");
                const loginPageResponse = await env.ASSETS.fetch(new Request(new URL(config.loginAssetPath, url).href));
                if (!loginPageResponse.ok) throw new Error(`Asset not found: ${loginPageResponse.status}`);

                let html = await loginPageResponse.text();
                // Simple server-side templating to inject the correct API path into the form action.
                html = html.replace(/"\/api\/auth\/login"/g, `"${config.loginApiPath}"`);
                return new Response(html, {headers: {'Content-Type': 'text/html'}});
            } catch (e) {
                logger.error('Could not serve custom login.html asset, serving fallback.', {error: e.message});
                return new Response(fallbackLoginPage(config.loginApiPath), {
                    status: 500,
                    headers: {'Content-Type': 'text/html'}
                });
            }
        }

        return null; // Not a UI route
    }
};