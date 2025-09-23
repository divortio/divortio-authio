/**
 * @file The internal, core JWT logic for the authentication module.
 * @version 2.1.0
 * @description This file contains the "engine" of the JWT system, including all
 * cryptographic functions for creating and validating tokens. It is designed to be
 * entirely self-contained and have no knowledge of the parent application.
 */

/**
 * @typedef {object} JwtClaims
 * @property {string} [iss] - Issuer
 * @property {string} [sub] - Subject (username)
 * @property {string} [aud] - Audience
 * @property {number} [exp] - Expiration Time
 * @property {number} [nbf] - Not Before
 * @property {number} [iat] - Issued At
 * @property {string} [jti] - JWT ID
 * @property {string[]} [routes] - Array of authorized route patterns.
 */

/**
 * @namespace JWT
 * @description A self-contained module for creating and validating JSON Web Tokens.
 */
export const JWT = {
    _cryptoKey: null,

    async getCryptoKey(jwtSecret) {
        if (!jwtSecret || jwtSecret === 'default-secret-please-change') {
            throw new Error("A strong, non-default JWT_SECRET must be provided for authentication.");
        }
        if (this._cryptoKey) return this._cryptoKey;

        const encoder = new TextEncoder();
        this._cryptoKey = await crypto.subtle.importKey(
            "raw", encoder.encode(jwtSecret),
            {name: "HMAC", hash: "SHA-256"},
            false, ["sign", "verify"]
        );
        return this._cryptoKey;
    },

    async create({
                     username,
                     routes = [],
                     jwtSecret,
                     sessionTimeout,
                     issuer,
                     audience,
                     publicClaims = {},
                     privateClaims = {}
                 }) {
        const key = await this.getCryptoKey(jwtSecret);
        const now = Math.floor(Date.now() / 1000);

        const payload = {
            iss: issuer,
            aud: audience,
            sub: username,
            routes: routes, // CORRECTLY ADDED: Embed the routes into the JWT payload
            jti: crypto.randomUUID(),
            iat: now,
            nbf: now,
            exp: now + sessionTimeout,
            ...publicClaims,
            ...privateClaims,
        };

        const header = {alg: "HS256", typ: "JWT"};
        const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
        const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
        const dataToSign = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
        const signature = await crypto.subtle.sign("HMAC", key, dataToSign);
        return `${encodedHeader}.${encodedPayload}.${this.base64UrlEncode(signature)}`;
    },

    async validate({request, jwtSecret, authTokenName, issuer, audience}) {
        const cookieHeader = request.headers.get('Cookie') || '';
        const cookies = Object.fromEntries(cookieHeader.split(';').map(c => c.trim().split('=')));
        const token = cookies[authTokenName];

        if (!token) return null;

        try {
            const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
            if (!encodedHeader || !encodedPayload || !encodedSignature) return null;

            const key = await this.getCryptoKey(jwtSecret);
            const dataToVerify = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
            const signature = this.base64UrlDecode(encodedSignature);

            const isValid = await crypto.subtle.verify("HMAC", key, signature, dataToVerify);
            if (!isValid) return null;

            const payload = JSON.parse(new TextDecoder().decode(this.base64UrlDecode(encodedPayload)));
            if (payload.exp < Math.floor(Date.now() / 1000)) return null;
            if (payload.nbf > Math.floor(Date.now() / 1000)) return null;
            if (payload.iss !== issuer) return null;
            if (payload.aud !== audience) return null;
            // CORRECTLY ADDED: Validate that the routes claim exists and is an array
            if (!Array.isArray(payload.routes)) return null;

            return payload;
        } catch (e) {
            return null;
        }
    },

    base64UrlEncode(data) {
        const str = typeof data === 'string' ? data : String.fromCharCode(...new Uint8Array(data));
        return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    },

    base64UrlDecode(str) {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const binaryStr = atob(base64);
        const len = binaryStr.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
        }
        return bytes.buffer;
    }
};