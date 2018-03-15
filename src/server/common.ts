const http = require('http');

export type Callback<T> = (t: T) => void;

export interface Webcomic {
  name: string;
  domain: string;

  startKey: (cb: Callback<string>, err: Callback<string>) => void;
  endKey: (cb: Callback<string>, err: Callback<string>) => void;

  urlToKey: (url: string, cb: Callback<string | null>, err: Callback<string>) => void;
  keyToUrl: (key: string, cb: Callback<string>, err: Callback<string>) => void;

  keyToImgUrls: (key: string, cb: Callback<string[]>, err: Callback<string>) => void;
  adjKey: (key: string, next: boolean, cb: Callback<string | null>, err: Callback<string>) => void;
};

export function fetchHtmlPage(url: string, cb: Callback<string>, err: Callback<string>) {
  http.get(url, (res: any) => {
    const { statusCode } = res;
    const contentType = res.headers['content-type'];

    let error;
    if (statusCode !== 200) {
      error = new Error('Request Failed.\n' +
                        `Status Code: ${statusCode}`);
    } else if (!/^text\/html/.test(contentType)) {
      error = new Error('Invalid content-type.\n' +
                        `Expected text/html but received ${contentType}`);
    }
    if (error) {
      console.error(error.message);
      // consume response data to free up memory
      res.resume();
      err(error.message);
      return;
    }

    res.setEncoding('utf8');
    let rawData = '';
    res.on('data', (chunk: string) => { rawData += chunk; });
    res.on('end', () => {
      cb(rawData);
    });
  }).on('error', (e: any) => {
    console.error(`Got error for url ${url} --- ${e.message}`);
    err(e.message);
  });
}

