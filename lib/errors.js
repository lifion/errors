/**
 * A module that helps in the generation of standardized error response objects.
 *
 * @module errors
 */

'use strict';

const dcopy = require('deep-copy');
const stringify = require('fast-safe-stringify');
const util = require('util');

const FOUR_SPACES = ' '.repeat(4);
const NINE_SPACES = ' '.repeat(9);
const PROPS = ['message', 'code', 'source', 'status', 'details', 'links'];

function clone(obj) {
  if (obj === undefined) return undefined;
  return dcopy(obj);
}

function safeGetData(obj, includeStack, source) {
  const data = {};
  if (obj.statusCode !== undefined) {
    data.status = Number(obj.statusCode);
  }
  PROPS.forEach((prop) => {
    if (obj[prop] !== undefined) {
      if (prop === 'details' || prop === 'links') {
        data[prop] = clone(obj[prop]);
      } else {
        data[prop] = obj[prop];
      }
    }
  });
  if (includeStack && obj.stack) {
    data.stack = obj.stack.toString();
  }
  if (source !== undefined && data.source === undefined) {
    data.source = source;
  }
  return data;
}

/**
 * Returns a string representation of the data of an error instance.
 *
 * @private
 * @param   {object} obj - The error object.
 * @returns {string} A string representation of the error data.
 */
function getDataString(obj) {
  const data = safeGetData(obj);
  const lines = stringify(data, null, 2).split(/r?\n/);
  return `\n${FOUR_SPACES}with ${lines.join(`\n${NINE_SPACES}`)}`;
}

/**
 * Returns a string representation of the stack trace for the specified object.
 *
 * @private
 * @param   {object} obj - The error object.
 * @returns {string} A string representation of the stack trace for the error.
 */
function getStackString(obj) {
  if (!obj.stack) return '';
  const atRegExp = /^\s{4}at /;
  const stack = obj.stack.toString();
  const stackLines = stack.split(/\r?\n/);
  const atLines = stackLines.filter((line) => atRegExp.test(line));
  return `\n${atLines.join('\n')}`;
}

/**
 *
 * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
 *        summary of the problem that should not change from occurrence to occurrence of the
 *        problem, except for purposes of localization. **If not provided, the error will still
 *        be created with an empty message**.
 * @param {string} [code] - A descriptive, application-specific error code expressed
 *        as a string value (e.g., `UNEXPECTED_ERROR`)
 * @param {string} [source] - The name of the service or module that originated the problem.
 * @param {*} [details] - An object or array of objects containing non-standard meta-information
 *        about the error.
 * @param {number} status - The status number of the error
 * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
 *        that leads to further details about this particular occurence of the problem.
 * @returns {Errors} a newly built Errors object
 */
function buildError(msgOrOpts, code, source, details, status, links) {
  const isOptionsDefined = typeof msgOrOpts === 'object' && msgOrOpts !== null;
  const options = isOptionsDefined ? { ...msgOrOpts, status } : msgOrOpts;
  if (isOptionsDefined && !options.code) options.code = code;
  // eslint-disable-next-line no-use-before-define
  return new Errors(options, code, source, details, status, links);
}

/**
 * Implementation of the OHCM standardized error structure as a throwable specialization of Error.<br />
 * http://stash.es.ad.adp.com/projects/OHCM/repos/lifion-proposals/browse/standardized-error-messages.md
 *
 * @alias module:errors
 */
class Errors extends Error {
  /**
   * Initializes the Errors instance using the provided message, object details,
   * or an entire standardized errors object.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code] - A descriptive, application-specific error code expressed as
   *        a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {number} [msgOrOpts.status] - The HTTP status code of the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code] - A descriptive, application-specific error code expressed as a string
   *        value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {number} [status] - The HTTP status code of the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   */
  constructor(msgOrOpts, code, source, details, status, links) {
    let message = '';

    if (typeof msgOrOpts === 'string') {
      message = msgOrOpts;
    } else if (msgOrOpts && typeof msgOrOpts.message === 'string') {
      ({ message } = msgOrOpts);
    }

    super(message);

    if (typeof msgOrOpts === 'string') {
      this.code = code;
      this.source = source;
      this.status = status;
      this.details = clone(details);
      this.links = clone(links);
    } else if (msgOrOpts) {
      this.code = msgOrOpts.code || code;
      this.source = msgOrOpts.source || source;
      this.status = msgOrOpts.status || status;
      this.details = clone(msgOrOpts.details || details);
      this.links = clone(msgOrOpts.links || links);
    }

    Object.defineProperties(this, {
      errors: { value: [this] },
      name: { value: this.constructor.name }
    });

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Appends an error to the instance using the provided, message, object details,
   * or an entire standardized errors object.
   *
   * @param {object|string} obj - The object to append.
   * @param {string} [source] - The source of the problem.
   * @returns {Errors} The errors intance, for chaining purposes.
   */
  append(obj, source) {
    if (obj !== undefined) {
      if (Errors.isError(obj)) {
        const { errors } = obj.toObject({ includeStack: true });
        if (Array.isArray(errors)) {
          this.errors.push(...errors.map((error) => safeGetData(error, true, source)));
        }
      } else if (obj !== this && Array.isArray(obj.errors)) {
        this.errors.push(...obj.errors.map((error) => safeGetData(error, true, source)));
      } else {
        this.errors.push(safeGetData(obj, true, source));
      }
    }
    return this;
  }

  /**
   * Returns the property with the specified key.
   *
   * @param   {string} key - The key of the property to retrieve.
   * @returns {object} The property value.
   */
  get(key) {
    if (key !== undefined) {
      return this[key];
    }
    return safeGetData(this);
  }

  /**
   * Sets the value of the property specified by the key. If the parameter is an object,
   * it will replace all the error properties.
   *
   * @param {object|string} keyOrObj - Either the key of the property to set or an object.
   * @param {object} [value] - The property value.
   * @returns {Errors} this
   */
  set(keyOrObj, value) {
    if (typeof keyOrObj === 'string' && PROPS.includes(keyOrObj)) {
      this[keyOrObj] = value;
    } else if (value === undefined) {
      PROPS.filter((prop) => keyOrObj[prop] !== undefined).forEach((prop) => {
        this[prop] = keyOrObj[prop];
      });
    }
    return this;
  }

  /**
   * Generates a standardized JSON representation.
   *
   * @param {string} [jsonStringifyArg] -
   * - If provided, the error will be returned as a regular JavaScript object instead of a string.
   *   The reason for this argument, is to provide compatibility with `JSON.stringify`.
   *
   *   When sending an instance of `Errors` to `JSON.stringify` this function will be called
   *   and the argument will be provided. `JSON.stringify` does this to request a "safe-object"
   *   with no circular-dependencies before the conversion to a string.
   *
   * - If not provided, the error instance will be stringified using the
   *   [fast-safe-stringify](https://github.com/davidmarkclements/fast-safe-stringify) module.
   * @returns {string} A JSON representation of the instance.
   */
  toJSON(jsonStringifyArg) {
    const obj = this.toObject();
    return jsonStringifyArg === undefined ? stringify(obj) : obj;
  }

  /**
   * Transforms the Error instance into an standarized simple object.
   *
   * @param {object} [options] - Transformation options.
   * @param {boolean} [options.includeStack=false] - Whether to include the error stack or not.
   * @returns {object} An object with all the error details of the instance.
   */
  toObject({ includeStack = false } = {}) {
    return { errors: this.errors.map((error) => safeGetData(error, includeStack)) };
  }

  /**
   * Generates a string representation containing all the details, including stack traces,
   * for the instance.
   *
   * @returns {string} A string representation of the instance.
   */
  toString() {
    const count = this.errors.length;
    return this.errors
      .map((error, index) => {
        const { code, message } = error;
        const descr = code ? `[${code}] ${message}` : message;
        const header = `Error ${index + 1} of ${count}: ${descr}`;
        return header + getStackString(error) + getDataString(error);
      })
      .join('\n\n');
  }

  [util.inspect.custom]() {
    return this.toString();
  }

  /**
   * Checks whether the input is an instance of Errors. This is more reliable
   * than an instanceof check, since it works across versions of the module.
   *
   * @param {*} obj - Something which may or may not be an Errors instance.
   * @returns {boolean} Whether or not the object is an Errors instance.
   */
  static isError(obj) {
    return Boolean(obj) && (obj instanceof Errors || typeof obj.toObject === 'function');
  }

  /**
   * Returns a standardized error for an unauthorized response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=UNAUTHORIZED] - A descriptive, application-specific error
   *        code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=UNAUTHORIZED] - A descriptive, application-specific error code expressed
   *        as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static unauthorized(msgOrOpts, code = 'UNAUTHORIZED', source, details, links) {
    const status = 401;
    return buildError(msgOrOpts, code, source, details, status, links);
  }

  /**
   * Returns a standardized error for a bad request response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=BAD_REQUEST] - A descriptive, application-specific error
   *        code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=BAD_REQUEST] - A descriptive, application-specific error code expressed
   *        as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static badRequest(msgOrOpts, code = 'BAD_REQUEST', source, details, links) {
    const status = 400;
    return buildError(msgOrOpts, code, source, details, status, links);
  }

  /**
   * Returns a standardized error for a forbidden response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=FORBIDDEN] - A descriptive, application-specific error
   *        code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=FORBIDDEN] - A descriptive, application-specific error code expressed
   *        as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static forbidden(msgOrOpts, code = 'FORBIDDEN', source, details, links) {
    const status = 403;
    return buildError(msgOrOpts, code, source, details, status, links);
  }

  /**
   * Returns a standardized error for a not found response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=NOT_FOUND] - A descriptive, application-specific error
   *        code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=NOT_FOUND] - A descriptive, application-specific error code expressed
   *        as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static notFound(msgOrOpts, code = 'NOT_FOUND', source, details, links) {
    const status = 404;
    return buildError(msgOrOpts, code, source, details, status, links);
  }

  /**
   * Returns a standardized error for an internal server error response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=INTERNAL_SERVER_ERROR] - A descriptive, application-specific
   *        error code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=INTERNAL_SERVER_ERROR] - A descriptive, application-specific error code
   *        expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static internalServerError(msgOrOpts, code = 'INTERNAL_SERVER_ERROR', source, details, links) {
    const status = 500;
    return buildError(msgOrOpts, code, source, details, status, links);
  }

  /**
   * Returns a standardized error for a method not allowed response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=METHOD_NOT_ALLOWED] - A descriptive, application-specific
   *        error code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=METHOD_NOT_ALLOWED] - A descriptive, application-specific error code
   *        expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static methodNotAllowed(msgOrOpts, code = 'METHOD_NOT_ALLOWED', source, details, links) {
    const status = 405;
    return buildError(msgOrOpts, code, source, details, status, links);
  }

  /**
   * Returns a standardized error for a service unavailable response.
   *
   * @param {object|string} [msgOrOpts] - Either an object with options or, a short, human-readable
   *        summary of the problem that should not change from occurrence to occurrence of the
   *        problem, except for purposes of localization. **If not provided, the error will still
   *        be created with an empty message**.
   * @param {string} [msgOrOpts.message] - A short, human-readable summary of the problem that
   *        should not change from occurrence to occurrence of the problem, except for purposes
   *        of localization.
   * @param {string} [msgOrOpts.code=SERVICE_UNAVAILABLE] - A descriptive, application-specific
   *        error code expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [msgOrOpts.source] - The name of the service or module that originated the
   *        problem.
   * @param {*} [msgOrOpts.details] - An object or array of objects containing non-standard
   *        meta-information about the error.
   * @param {Array<object>} [msgOrOpts.links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @param {string} [code=SERVICE_UNAVAILABLE] - A descriptive, application-specific error code
   *        expressed as a string value (e.g., `UNEXPECTED_ERROR`)
   * @param {string} [source] - The name of the service or module that originated the problem.
   * @param {*} [details] - An object or array of objects containing non-standard meta-information
   *        about the error.
   * @param {Array<object>} [links] - A [links object](http://jsonapi.org/format/#document-links)
   *        that leads to further details about this particular occurence of the problem.
   * @returns {Errors} A new error
   */
  static serviceUnavailable(msgOrOpts, code = 'SERVICE_UNAVAILABLE', source, details, links) {
    const status = 503;
    return buildError(msgOrOpts, code, source, details, status, links);
  }
}

module.exports = Errors;
