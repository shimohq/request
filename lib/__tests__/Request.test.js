const assert = require('assert');
const Bluebird = require('bluebird');
const Koa = require('koa');
const Request = require('../index.js');
const port = 61925;

let server;
let requested = {};

beforeAll(() => {
  const app = new Koa();
  app.use(async ctx => {
    const path = ctx.request.path;

    if (path === '/backup') {
      ctx.body = 'backup-url-response';
      return;
    }

    if (typeof requested[path] === 'undefined') {
      requested[path] = 0;
    }

    const stepIndex = requested[path];
    const steps = path.slice(1).split('-');
    const step = steps[stepIndex];
    requested[path]++;

    if (step === 'error') {
      ctx.status = 500;
      ctx.body = 'error';
    }

    if (step === 'success') {
      ctx.body = 'cool';
    }

    if (step === 'timeout') {
      await Bluebird.delay(50000);
      ctx.body = 'cool of timeout';
    }
  });
  server = app.listen(port);
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  requested = {};
});

describe('Request._generalOptions', () => {
  it('Get corrent url', () => {
    const request = new Request({ baseUrl: 'http://a.cn' });

    const { url } = request._generalOptions('/user/', '/tom');
    assert.equal(url, '/user/tom');

    const { url: url2 } = request._generalOptions('user');
    assert.equal(url2, '/users');

    const { url: url3 } = request._generalOptions('user', 1);
    assert.equal(url3, '/users/1');

    const { url: url4 } = request._generalOptions('user', 1, 'file');
    assert.equal(url4, '/users/1/files');

    const { url: url5 } = request._generalOptions('user', 1, 'file', 'a');
    assert.equal(url5, '/users/1/files/a');

    const { url: url6 } = request._generalOptions('/intra', 'user', 1);
    assert.equal(url6, '/intra/users/1');
  });
});

describe('Request retry', () => {
  beforeEach(() => {
    this.request = new Request({
      baseUrl: `http://localhost:${port}`
    });
  });

  it('Get correct response without retry', async () => {
    const result = await this.request.get('/success');
    expect(result).toBe('cool');
  });

  it('Get correct response with default retry', async () => {
    expect(this.request.get('/error-error-success')).rejects.toThrow(/error/);
  });

  it('Get correct response with override retry', async () => {
    const result = await this.request.get('/error-error-success', {
      retry: 3
    });
    expect(result).toBe('cool');
  });

  it('Get fallback value if provided', async () => {
    const request = new Request({
      baseUrl: `http://localhost:${port}`,
      fallbackResponse: 'default-backup'
    });
    const result = request.get('/error');
    const emitError = new Promise((resolve, reject) => {
      request.on('error', reject);
    });
    expect(await result).toBe('default-backup');
    expect(emitError).rejects.toThrow();
  });

  it('Get override fallback value if provided', async () => {
    const request = new Request({
      baseUrl: `http://localhost:${port}`,
      fallbackResponse: 'default-backup'
    });
    const result = request.get('/error', {
      fallbackResponse: 'backup'
    });
    const emitError = new Promise((resolve, reject) => {
      request.on('error', reject);
    });
    expect(await result).toBe('backup');
    expect(emitError).rejects.toThrow();
  });

  it('Throw error with url in stack', async () => {
    const result = this.request.get('/error');
    const emit = new Promise((resolve, reject) => {
      this.request.on('error', reject);
    });

    let requestError;
    let emitError;
    try {
      await result;
    } catch (e) {
      requestError = e;
    }

    try {
      await emit;
    } catch (e) {
      emitError = e;
    }

    expect(Boolean(requestError)).toBe(true);
    expect(Boolean(emitError)).toBe(true);

    expect(requestError.stack.indexOf('/error') > 0).toEqual(true);
    expect(emitError.stack.indexOf('/error') > 0).toEqual(true);
  });

  it('should use backup url', async () => {
    const request = new Request({
      baseUrl: `http://localhost:${port}`
    });
    const result = request.get('/error', {
      backupUrl: `http://localhost:${port}/backup`
    });

    const emitError = new Promise((resolve, reject) => {
      request.on('error', reject);
    });
    expect(await result).toBe('backup-url-response');
    expect(emitError).rejects.toThrow();
  });
});
