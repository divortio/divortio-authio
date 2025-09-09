/**
 * @file Handles all authentication-related user interface routing and rendering.
 * @version 2.0.0 (authio)
 */

import {fallbackLoginPage} from '../utils/loginFallback.mjs';

/**
 * @namespace UiHandler
 * @description A handler for authentication UI routes.
 */
export const UiHandler = {
    /**
     * Checks if a request is for a UI route and handles it based on auth context.
     * @param {Request} authedRequest - The incoming request, pre-processed by the authenticate utility.
     * @param {object} env - The worker's environment, containing the ASSETS binding.
     * @param {object} config - The application's auth configuration object.
     * @param {import('../utils/logger.mjs').Logger} logger - The logger instance.
     * @returns {Promise<Response|null>} A Response if the route is matched, otherwise null.
     */
    async handleRequest(authedRequest, env, config, logger) {
        const url = new URL(authedRequest.url);
        const isLoginPageRoute = url.pathname === config.loginUrlPath;
        const {isAuthed, method} = authedRequest.authio;

        // --- Redirect Logic ---
        if (isAuthed && isLoginPageRoute) {
            // User is ALREADY logged in but is visiting the login page. Redirect them.
            return Response.redirect(new URL(config.authRedirectPath, url).href, 302);
        }

        // Programmatic requests (e.g., cURL) should not be redirected. They will be handled by the gatekeeper.
        const isProgrammaticRequest = method === 'header';

        if (!isAuthed && !isLoginPageRoute && !isProgrammaticRequest) {
            const isBrowserRequest = authedRequest.headers.get('Accept')?.includes('text/html');
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