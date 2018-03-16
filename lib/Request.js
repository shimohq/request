/* eslint no-await-in-loop: "off" */

const _ = require('lodash');
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
   * @param {any}     opts.fallbackResponse, return this value if request error
   */
  constructor(opts = {}) {
    super();
    this.opts = _.defaults(opts, {
      retry: 1
    });
    this._createMethods();
  }

  _createMethods() {
    methods.forEach(method => {
      this[method] = (...params) => {
        const opts = this._generalOptions(...params);
        return this._request(_.assign({ method, transform: autoJSONParse }, opts));
      };
    });
  }

  _generalOptions(...params) {
    const urlMembers = this.opts.baseUrl ? ['/'] : [];
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
    const { fallbackResponse, backupUrl } = opts;
    let error;

    try {
      const result = await this.__request(opts);
      return result;
    } catch (e) {
      error = e;
      if (backupUrl) {
        if (backupUrl.indexOf('http') === -1) {
          throw new Error('backupUrl must start with `http`');
        }
        try {
          return await request(
            _.assign(
              { transform: autoJSONParse },
              opts,
              { url: backupUrl },
              { baseUrl: null }
            )
          );
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
        return await request(_.assign({ transform: autoJSONParse }, opts));
      } catch (e) {
        error = e;
      }
    }

    throw error;
  }

  _modifyError(error, opts) {
    error.stack = `opts: ${JSON.stringify(opts)}]\n origin stack:\n ${error.stack}`;

    return error;
  }

  _isUrl(str = '/') {
    return String(str).indexOf('/') > -1;
  }
}

function autoJSONParse(body, response) {
  if (response.headers['content-type'].indexOf('application/json') > -1) {
    return JSON.parse(body);
  }

  return body;
}

module.exports = Request;
