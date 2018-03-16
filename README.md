# shimo-request [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url] [![Coverage percentage][coveralls-image]][coveralls-url]
> Simple http request library based on request-promise


### Features

1. Retry
2. Throw error with request url
3. Backup URL
4. Restful API
5. Fallback response


## Installation

```sh
$ npm install --save shimo-request
```

## Usage

```js
const request = require('shimo-request');
const { Request } = request;

const requestInstance = new Request({
  baseUrl: 'http://baseurl.com',
  /*
    Will throw Error until retry 3 times
  */
  retry: 3,
  /*
    Will try backup url after base url fail 3(retry) times
  */
  backupUrl: 'http://baseurl-backup.com',

  /*
    Will return this if request error
  */
  fallbackResponse: { tom: true }
})


// As same as request-promise, you must provide `/` in url:
requestInstance.get('/users')

// Restful API:
requestInstance.get('user') // equal `requestInstance.get('/users')`
requestInstance.get('user', 1) // equal `requestInstance.get('/users/1')`
requestInstance.get('user', 1, 'file') // equal `requestInstance.get('/users/1/files')`
requestInstance.get('user', 1, 'file', 'abc') // equal `requestInstance.get('/users/1/files/abc')`
requestInstance.get('user', 1, '/file', '/abc') // equal `requestInstance.get('/users/1/file/abc')`

// Throw error
try {
  await requestInstance.get('user')
} catch (e) {
  /*
    opts: {"method":"get","url":"http://localhost:61925/backup","backupUrl":"http://localhost:61925/backup","baseUrl":"http://localhost:61925","retry":1}]
     origin stack:
     RequestError: ....
  */
  console.log(e.stack)
}

// Override options
requestInstance.get('file', 1, '/view_count', {
  fallbackResponse: { count: 0 },
  retry: 2
})

// Directly
request('http://google.com', 'user', 2);
```

## License

MIT © [TomWan](https://github.com/wanming)


[npm-image]: https://badge.fury.io/js/shimo-request.svg
[npm-url]: https://npmjs.org/package/shimo-request
[travis-image]: https://travis-ci.org/wanming/shimo-request.svg?branch=master
[travis-url]: https://travis-ci.org/wanming/shimo-request
[daviddm-image]: https://david-dm.org/wanming/shimo-request.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/wanming/shimo-request
[coveralls-image]: https://coveralls.io/repos/wanming/shimo-request/badge.svg
[coveralls-url]: https://coveralls.io/r/wanming/shimo-request
