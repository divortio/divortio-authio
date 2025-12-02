/**
 * @file A professional, structured JSON logger for the Authio module.
 * @version 1.0.0 (authio)
 *
 * @description
 * This module provides a configurable, class-based logger that outputs structured JSON to the console.
 * This format is ideal for ingestion by modern logging platforms, including Cloudflare's
 * own logging service, allowing for easy searching, filtering, and alerting. It supports
 * log levels and request-specific context.
 */

/**
 * Defines the numerical hierarchy of log levels for filtering.
 * @private
 * @const {{string: number}}
 */
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

/**
 * The default transport, which writes structured JSON logs to the console.
 * This can be replaced with a custom transport for sending logs to a third-party service.
 * @private
 * @const {{log: function(object): void}}
 */
const CONSOLE_JSON_TRANSPORT = {
    log(logEntry) {
        console.log(JSON.stringify(logEntry));
    }
};

/**
 * @class Logger
 * @classdesc A professional, structured logger class that can be configured and extended.
 */
export class Logger {
    /**
     * Creates an instance of the Logger.
     * @param {object} options - Configuration options for the logger.
     * @param {boolean} [options.enabled=false] - Whether logging is active.
     * @param {string} [options.logLevel='warn'] - The minimum level to log ('info', 'warn', 'error', 'debug').
     * @param {object} [options.transport=CONSOLE_JSON_TRANSPORT] - The transport to use for outputting logs.
     * @param {object} [options.context={}] - An object of key-value pairs to include in every log message.
     */
    constructor({enabled = false, logLevel = 'warn', transport = CONSOLE_JSON_TRANSPORT, context = {}}) {
        this.enabled = enabled;
        this.level = logLevel;
        this.levelValue = LOG_LEVELS[logLevel] ?? LOG_LEVELS.warn;
        this.transport = transport;
        this.context = context;
    }

    /**
     * Returns a new logger instance with additional context.
     * This is useful for adding request-specific data like a request ID to all subsequent logs.
     * @param {object} newContext - An object of key-value pairs to add to the logger's context.
     * @returns {Logger} A new Logger instance with the merged context.
     */
    withContext(newContext) {
        return new Logger({
            enabled: this.enabled,
            logLevel: this.level,
            transport: this.transport,
            context: {...this.context, ...newContext},
        });
    }

    /**
     * Logs a message at the "info" level, if the configured level allows it.
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - Optional structured data specific to this log event.
     */
    info(message, metadata = {}) {
        if (this.enabled && this.levelValue >= LOG_LEVELS.info) {
            this._log('INFO', message, metadata);
        }
    }

    /**
     * Logs a message at the "warn" level, if the configured level allows it.
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - Optional structured data specific to this log event.
     */
    warn(message, metadata = {}) {
        if (this.enabled && this.levelValue >= LOG_LEVELS.warn) {
            this._log('WARN', message, metadata);
        }
    }

    /**
     * Logs a message at the "error" level, if the configured level allows it.
     * @param {string} message - The primary log message.
     * @param {object} [metadata={}] - Optional structured data specific to this log event.
     */
    error(message, metadata = {}) {
        if (this.enabled && this.levelValue >= LOG_LEVELS.error) {
            this._log('ERROR', message, metadata);
        }
    }

    /**
     * The internal log function that constructs the final JSON log entry and sends it to the transport.
     * @private
     * @param {string} level - The log level string ('INFO', 'WARN', 'ERROR').
     * @param {string} message - The primary log message.
     * @param {object} metadata - Additional structured data for this specific event.
     */
    _log(level, message, metadata) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            module: 'authio',
            ...this.context,
            ...metadata,
        };
        this.transport.log(logEntry);
    }
}