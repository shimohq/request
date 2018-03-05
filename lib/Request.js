/* eslint no-await-in-loop: "off" */

const _ = require('lodash');
const assert = require('assert');
const plural = require('plural');
const EventEmitter = require('events');
const request = require('request-promise');
const methods = require('methods');
const urlJoin = require('url-join');

class Request extends EventEmitter {
  /**
   * Constructor
   *
   * @param {object}  opts
   * @param {string}  opts.baseUrl
   * @param {number}  opts.retry retry times, backupUrl retry time is only ONE.
   * @param {string}  opts.backupUrl
   * @param {number}  opts.timeout, ms
   * @param {any}     opts.fallbackResponse, return this value if request error
   */
  constructor(opts = {}) {
    super();
    this.opts = _.defaults(opts, {
      retry: 1
    });
    assert(this.opts.baseUrl, 'opts.baseUrl missing');
    this._createMethods();
  }

  _createMethods() {
    methods.forEach(method => {
      this[method] = (...params) => {
        const opts = this._generalOptions(...params);
        return this._request(_.assign({ method }, opts));
      };
    });
  }

  _generalOptions(...params) {
    const urlMembers = ['/'];
    const requestOptions = _.isObject(_.last(params)) ? _.last(params) : {};

    let tempIndex = 0;
    params.forEach(p => {
      if (_.isObject(p)) {
        return;
      }

      if (this._isUrl(p)) {
        urlMembers.push(p);
        tempIndex = 0;
        return;
      }

      if (tempIndex % 2 === 0) {
        urlMembers.push(String(plural(p)));
      } else {
        urlMembers.push(String(p));
      }

      tempIndex++;
    });

    const url = urlJoin(...urlMembers);
    return _.assign({ url }, requestOptions);
  }

  async _request(opts) {
    opts = _.defaults(opts, this.opts);
    const { timeout, fallbackResponse, backupUrl } = opts;
    let error;

    try {
      const req = this.__request(opts);

      if (timeout) {
        req.timeout(timeout);
      }

      return await req;
    } catch (e) {
      error = e;
      if (backupUrl) {
        try {
          return await request(_.assign(opts, { url: backupUrl }));
        } catch (e) {
          error = e;
        }
      }

      error = this._modifyError(error, opts);
      this.emit('error', error);

      if (fallbackResponse) {
        return fallbackResponse;
      }

      throw error;
    }
  }

  /**
   * Send request-promise request
   *
   * @param {object} opts rquest-promise opts
   */
  async __request(opts) {
    const { retry } = opts;

    let error;

    for (let i = 0; i < retry; i++) {
      try {
        return await request(opts);
      } catch (e) {
        error = e;
      }
    }

    throw error;
  }

  _modifyError(error, opts) {
    error.stack =
      `method: ${opts.method.toUpperCase()} \n` +
      `url: ${opts.url}\n` +
      `opts: ${JSON.stringify(opts)}]\n` +
      `origin stack:\n` +
      error.stack;

    return error;
  }

  _isUrl(str = '/') {
    return String(str).indexOf('/') > -1;
  }
}

module.exports = Request;
