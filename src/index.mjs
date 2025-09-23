/**
 * @file The main public entry point and RPC service for the Authio module.
 * @version 4.1.0 (authio)
 * @description This worker acts as a standalone authentication and authorization service,
 * exposing its functionality via a JavaScript-native RPC interface. It is designed to be
 * consumed by other Cloudflare Workers via Service Bindings.
 * @see {@link https://developers.cloudflare.com/workers/runtime-apis/rpc/|Cloudflare RPC Docs}
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
 * from other workers via Service Bindings. It is initialized once per worker isolate,
 * maximizing performance by reusing its configuration and logger instances.
 * @extends {WorkerEntrypoint}
 */
export default class AuthioService extends WorkerEntrypoint {
    /**
     * The constructor is called once when the worker isolate is initialized.
     * It creates long-lived instances of the logger and the configuration object
     * to be reused by all subsequent requests, which is a key performance optimization.
     * @param {ExecutionContext} ctx - The worker's execution context.
     * @param {object} env - The worker's environment object containing bindings and variables.
     */
    constructor(ctx, env) {
        super(ctx, env);
        /**
         * A long-lived, structured JSON logger instance.
         * @private
         * @type {Logger}
         */
        this.logger = new Logger({
            enabled: String(env.AUTH_LOG_ENABLED).toLowerCase() === 'true',
            logLevel: env.AUTH_LOG_LEVEL || 'warn'
        });
        /**
         * A long-lived, immutable configuration object.
         * @private
         * @type {import('./config.mjs').AuthConfig}
         */
        this.authConfig = createAuthConfig(env, this.logger);
    }

    /**
     * A high-level RPC method that provides a complete, boilerplate-free solution for
     * protecting application logic. It performs all checks and only calls back to the
     * provided application logic if the user is fully authenticated and authorized. This
     * is the recommended method for most use cases.
     *
     * @param {Request} request - The original incoming request from the parent worker.
     * @param {Function} appLogic - A function stub for the parent worker's core application logic.
     * This function will receive the enriched request object as its only argument.
     * @returns {Promise<Response>} A Response object, which could be from the `appLogic`,
     * a redirect, or an error (e.g., 401 Unauthorized, 403 Forbidden).
     */
    async handleRequest(request, appLogic) {
        const requestLogger = this.logger.withContext({requestId: request.headers.get('cf-ray')});
        const authedRequest = await coreAuthenticate(request, this.env, this.ctx, {config: this.authConfig});

        authedRequest.parsedUrl = new URL(authedRequest.url);

        const apiResponse = await ApiHandler.handleRequest(authedRequest, this.env, this.ctx, this.authConfig);
        if (apiResponse) return apiResponse;

        const uiResponse = await UiHandler.handleRequest(authedRequest, this.env, this.authConfig, requestLogger);
        if (uiResponse) return uiResponse;

        if (!authedRequest.isAuthorized) {
            const reason = !authedRequest.isAuthed ? 'Request Unauthenticated' : 'User Not Authorized';
            const status = !authedRequest.isAuthed ? 401 : 403;
            requestLogger.warn(reason, {
                path: authedRequest.parsedUrl.pathname,
                ip: request.headers.get('cf-connecting-ip'),
                user: authedRequest.authio?.username
            });
            return new Response(reason, {status});
        }

        // If all checks pass, call the application logic via an RPC callback.
        return appLogic(authedRequest);
    }

    /**
     * An advanced RPC method that inspects a request and returns a cloned, enriched Request
     * object with the full authentication and authorization context. It does not generate a
     * response, allowing the parent worker to implement its own custom logic.
     *
     * @param {Request} request - The original incoming request.
     * @returns {Promise<import('./auth.mjs').AuthenticatedRequest>} The enriched request object.
     */
    async authenticate(request) {
        return coreAuthenticate(request, this.env, this.ctx, {config: this.authConfig});
    }

    /**
     * An RPC method to process a POST login request.
     * @param {Request} request - The incoming POST request, expecting a JSON body.
     * @returns {Promise<Response>} A Response object with a `Set-Cookie` header on success.
     */
    async handleLogin(request) {
        return coreHandleLogin(request, this.env, this.ctx, {config: this.authConfig});
    }

    /**
     * An RPC method to process a logout request.
     * @param {Request} request - The incoming request.
     * @returns {Promise<Response>} A Response object that clears the session cookie.
     */
    async handleLogout(request) {
        return coreHandleLogout(request, this.env, this.ctx, {config: this.authConfig});
    }

    /**
     * The default fetch handler for the worker. As this worker is designed to be
     * RPC-only, it does not respond to standard HTTP requests.
     * @override
     */
    async fetch(request) {
        return new Response("Authio RPC Service is operational. It does not respond to direct HTTP requests.", {
            status: 404,
            headers: {'Content-Type': 'text/plain'}
        });
    }
}