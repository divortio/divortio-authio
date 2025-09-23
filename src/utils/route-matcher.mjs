/*
 * =============================================================================
 * FILE: src/utils/route-matcher.mjs
 *
 * DESCRIPTION:
 * A dedicated utility for parsing and matching Cloudflare-style route patterns
 * against request URLs. This module abstracts the logic for route-based
 * authorization checks.
 * =============================================================================
 */

import {pathToRegexp} from 'path-to-regexp';

/**
 * @typedef {object} RouteMatchResult
 * @property {boolean} isAuthorized - True if the URL matches any of the provided route patterns.
 * @property {string|null} matchedRoute - The specific route pattern that was successfully matched.
 */

/**
 * A cache to store compiled regular expressions for each route pattern.
 * This prevents the expensive operation of compiling the regex on every request.
 * @type {Map<string, RegExp>}
 */
const compiledRouteCache = new Map();

/**
 * Compiles a Cloudflare-style route pattern into a regular expression.
 * Caches the compiled regex for future use.
 * @param {string} routePattern - The route pattern (e.g., "example.com/api/*").
 * @returns {RegExp} The compiled regular expression.
 */
function getCompiledRoute(routePattern) {
    if (compiledRouteCache.has(routePattern)) {
        return compiledRouteCache.get(routePattern);
    }

    // Convert Cloudflare wildcard (*) to a version that path-to-regexp understands.
    // Replace it with a named parameter regex `(.*)`.
    const pattern = routePattern.replace(/\*/g, ':splat(.*)');

    // path-to-regexp will handle escaping and compiling.
    const regex = pathToRegexp(pattern);
    compiledRouteCache.set(routePattern, regex);
    return regex;
}

/**
 * Checks if a given request URL matches any of the provided route patterns.
 *
 * @param {URL} url - The parsed URL object from the incoming request.
 * @param {string[]} authorizedRoutes - An array of route patterns authorized for the user.
 * @returns {RouteMatchResult} An object indicating the result of the authorization check.
 */
export function matchRoute(url, authorizedRoutes) {
    if (!authorizedRoutes || authorizedRoutes.length === 0) {
        return {isAuthorized: false, matchedRoute: null};
    }

    // The string to test against is the hostname followed by the pathname.
    const urlString = `${url.hostname}${url.pathname}`;

    for (const routePattern of authorizedRoutes) {
        const regex = getCompiledRoute(routePattern);
        if (regex.test(urlString)) {
            // A match was found.
            return {isAuthorized: true, matchedRoute: routePattern};
        }
    }

    // No match was found after checking all patterns.
    return {isAuthorized: false, matchedRoute: null};
}