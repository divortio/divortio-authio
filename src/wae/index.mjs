/*
 * =============================================================================
 * FILE: src/wae/index.mjs
 *
 * DESCRIPTION:
 * The main service module for handling Workers Analytics Engine (WAE) events
 * for the Authio module. It exports a single function, `sendAuthAnalytics`,
 * which implements the multi-dataset strategy for authentication events.
 * =============================================================================
 */

import './schema.mjs'; // Imports the JSDoc type definitions for clarity.
import {buildGeoId} from './geoID.mjs';

/**
 * Prepares and sends a structured data point to the appropriate Workers
 * Analytics Engine dataset(s) for an authentication event.
 *
 * @param {Request} request - The original incoming request object.
 * @param {object} env - The worker's environment object with analytics bindings.
 * @param {object} authContext - The `authio` context object from the enriched request.
 * @param {object} [options={}] - Optional parameters.
 * @param {boolean} [options.isRateLimited=false] - A flag to indicate a rate-limited event.
 * @returns {void}
 */
export function sendAuthAnalytics(request, env, authContext, options = {}) {
    // Gracefully exit if no analytics bindings are configured.
    if (!env || (!env.AUTH_EVENTS && !env.AUTH_SUCCESS && !env.AUTH_FAILURES)) {
        return;
    }

    try {
        const url = new URL(request.url);
        const ipAddress = request.headers.get("CF-Connecting-IP") || 'unknown-ip';
        const username = authContext.username || 'unknown-user';

        // --- Human-Readable Log Object ---
        const logObject = {
            timestamp: new Date().toISOString(),
            ipAddress,
            username,
            authMethod: authContext.method,
            path: url.pathname,
            isSuccess: authContext.isAuthed,
            isCached: authContext.method === 'jwt-cache',
            isRateLimited: options.isRateLimited || false,
            error: authContext.error,
            geo: {
                country: request.cf?.country,
                colo: request.cf?.colo,
                asn: request.cf?.asn,
                asnOrg: request.cf?.asOrganization,
            }
        };
        console.log(JSON.stringify(logObject, null, 2));


        /** @type {AuthEventBlobs} */
        const blobs = [
            ipAddress,
            username,
            buildGeoId(request.cf) || 'unknown',
            request.cf?.country || 'unknown',
            request.cf?.colo || 'unknown',
            String(request.cf?.asn || 'unknown'),
            request.cf?.asOrganization || 'unknown',
            url.hostname,
            url.pathname,
            request.method,
            authContext.method || 'none',
            authContext.error || '',
        ];

        /** @type {AuthEventDoubles} */
        const doubles = [
            authContext.isAuthed ? 1 : 0, // isSuccess
            !authContext.isAuthed ? 1 : 0, // isFailure
            authContext.method === 'jwt-cache' ? 1 : 0, // isCached
            options.isRateLimited ? 1 : 0, // isRateLimited
            authContext.method === 'header' ? 1 : 0, // isProgrammatic
        ];

        /** @type {AnalyticsDataPoint} */
        const dataPoint = {
            indexes: [`${ipAddress}:${username}`],
            blobs,
            doubles,
        };

        // --- Multi-Dataset Write Logic ---

        // Always write every event to the main firehose dataset.
        if (env.AUTH_EVENTS) {
            env.AUTH_EVENTS.writeDataPoint(dataPoint);
        }

        // If it was a successful event, write to the success dataset.
        if (authContext.isAuthed && env.AUTH_SUCCESS) {
            env.AUTH_SUCCESS.writeDataPoint(dataPoint);
        }

        // If it was a failure event, write to the failures dataset.
        if (!authContext.isAuthed && env.AUTH_FAILURES) {
            env.AUTH_FAILURES.writeDataPoint(dataPoint);
        }

    } catch (error) {
        console.error("Failed to send auth analytics data point:", error);
    }
}