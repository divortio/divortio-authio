/**
 * @file The main public entry point and RPC service for the Authio module.
 * @version 4.0.0 (authio)
 * @description This worker acts as a standalone authentication and authorization service,
 * exposing its functionality via a JavaScript-native RPC interface.
 */

import {WorkerEntrypoint} from 'cloudflare:workers';
import {authenticate as coreAuthenticate} from './auth.mjs';
import {handleLogin as coreHandleLogin} from './handlers/login.mjs';
import {handleLogout as coreHandleLogout} from './handlers/logout.mjs';
import {createAuthConfig} from './config.mjs';
import {Logger} from './utils/logger.mjs';
import {ApiHandler} from './handlers/api.mjs';
import {UiHandler} from './handlers/ui.mjs';

/**
 * The Authio RPC Service.
 * This class exposes the core functionality of the Authio module to be called
 * from other workers via Service Bindings.
 */
export default class AuthioService extends WorkerEntrypoint {
    /**
     * A high-level handler that provides a complete, boilerplate-free solution for
     * protecting application logic. It performs all checks and only calls back to the
     * provided application logic if the user is fully authenticated and authorized.
     *
     * @param {Request} request - The original incoming request.
     * @param {Function} appLogic - A function stub for the core application logic.
     * @returns {Promise<Response>}
     */
    async handleRequest(request, appLogic) {
        const logger = new Logger({
            enabled: String(this.env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
            logLevel: this.env.AUTH_LOG_LEVEL || 'warn'
        }).withContext({requestId: request.headers.get('cf-ray')});

        const authConfig = await createAuthConfig(this.env, logger);
        const authedRequest = await coreAuthenticate(request, this.env, this.ctx, {config: authConfig});

        authedRequest.parsedUrl = new URL(authedRequest.url);

        // Handle Auth API Routes (Login/Logout) first
        const apiResponse = await ApiHandler.handleRequest(authedRequest, this.env, this.ctx, authConfig);
        if (apiResponse) {
            return apiResponse;
        }

        // Handle Login Page UI and Redirects
        const uiResponse = await UiHandler.handleRequest(authedRequest, this.env, authConfig, logger);
        if (uiResponse) {
            return uiResponse;
        }

        // Enforce Authorization
        if (!authedRequest.isAuthorized) {
            const reason = !authedRequest.isAuthed ? 'Request Unauthenticated' : 'User Not Authorized';
            const status = !authedRequest.isAuthed ? 401 : 403;
            logger.warn(reason, {
                path: authedRequest.parsedUrl.pathname,
                ip: request.headers.get('cf-connecting-ip'),
                user: authedRequest.authio?.username
            });
            return new Response(reason, {status});
        }

        // If all checks pass, call the application logic
        return appLogic(authedRequest);
    }

    /**
     * A pure function that inspects a request and returns a cloned, enriched Request
     * object with the full authentication and authorization context.
     *
     * @param {Request} request - The original incoming request.
     * @returns {Promise<Request>} The enriched request object.
     */
    async authenticate(request) {
        return coreAuthenticate(request, this.env, this.ctx);
    }

    /**
     * Processes a POST login request.
     * @param {Request} request - The incoming POST request.
     * @returns {Promise<Response>}
     */
    async handleLogin(request) {
        return coreHandleLogin(request, this.env, this.ctx);
    }

    /**
     * Processes a logout request.
     * @param {Request} request - The incoming request.
     * @returns {Promise<Response>}
     */
    async handleLogout(request) {
        return coreHandleLogout(request, this.env, this.ctx);
    }

    /**
     * The default fetch handler for the worker. Since this worker is RPC-only,
     * it does not respond to standard HTTP requests.
     */
    async fetch(request) {
        return new Response("Authio RPC Service is operational. It does not respond to direct HTTP requests.", {
            status: 404,
            headers: {'Content-Type': 'text/plain'}
        });
    }
}