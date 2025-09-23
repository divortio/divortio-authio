/*
 * =============================================================================
 * FILE: src/wae/schema.mjs
 *
 * DESCRIPTION:
 * Defines the formal schema for data points sent to the Workers Analytics
 * Engine (WAE) for the Authio module. This creates a clear "contract" for the
 * analytics data, ensuring consistency and making it easier to query.
 * =============================================================================
 */

/**
 * @typedef {object} AnalyticsDataPoint
 * @property {string[]} indexes - An array containing a single, high-cardinality
 * string used as the sampling key. For this schema, it is a composite key of
 * the format "ipAddress:username".
 * @property {string[]} blobs - An array of low-to-medium cardinality strings
 * used as dimensions for filtering and grouping.
 * @property {number[]} doubles - An array of numeric values representing the
 * metrics to be aggregated for this event.
 */

/**
 * Defines the specific structure and order of the `blobs` array for an
 * authentication event data point.
 *
 * @typedef {Array<string>} AuthEventBlobs
 * @property {string} 0 - The connecting client IP address (e.g., "198.51.100.1").
 * @property {string} 1 - The username associated with the event.
 * @property {string} 2 - The concatenated geographic ID (e.g., "NA-US-NY-New York-10001").
 * @property {string} 3 - The two-letter country code from the request (e.g., "US").
 * @property {string} 4 - The Cloudflare colo ID from the request (e.g., "MIA").
 * @property {string} 5 - The client's Autonomous System Number (e.g., "13335").
 * @property {string} 6 - The organization for the client's ASN (e.g., "Cloudflare, Inc.").
 * @property {string} 7 - The domain from the request URL.
 * @property {string} 8 - The path from the request URL.
 * @property {string} 9 - The HTTP method of the request.
 * @property {string} 10 - The authentication method used (`jwt`, `header`, `jwt-cache`, `error`).
 * @property {string} 11 - A description of the authentication error, if any.
 */

/**
 * Defines the specific structure and order of the `doubles` array for an
 * authentication event data point.
 *
 * @typedef {Array<number>} AuthEventDoubles
 * @property {number} 0 - A flag (1 or 0) indicating if the authentication was successful.
 * @property {number} 1 - A flag (1 or 0) indicating if the authentication failed.
 * @property {number} 2 - A flag (1 or 0) indicating if the request was served from the JWT cache.
 * @property {number} 3 - A flag (1 or 0) indicating if a login attempt was rate-limited.
 * @property {number} 4 - A flag (1 or 0) indicating if programmatic (header) authentication was used.
 */