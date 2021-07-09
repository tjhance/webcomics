const http = require('http');
const https = require('https');

export interface Webcomic {
  name: string;
  domain: string;

  startKey: () => Promise<string>;
  endKey: () => Promise<string>;

  urlToKey: (url: string) => Promise<string | null>;
  keyToUrl: (key: string) => Promise<string>;

  keyToImgUrls: (key: string) => Promise<string[]>;
  adjKey: (key: string, next: boolean) => Promise<string | null>;
};

export function fetchHtmlPage(url: string): Promise<string> {
  console.log(url);
  return new Promise<string>((resolve, reject) => {
    const use_https = (url.substring(0, 5) == 'https');
    (use_https ? https : http).get(url, (res: any) => {
      const { statusCode } = res;
      console.log(statusCode);
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
        reject(error.message);
        return;
      }

      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk: string) => { rawData += chunk; });
      res.on('end', () => {
        resolve(rawData);
      });
    }).on('error', (e: any) => {
      console.error(`Got error for url ${url} --- ${e.message}`);
      reject(e.message);
    });
  });
}

