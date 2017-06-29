const http = require('http');

type Callback<T> = (t: T) => void;

interface Webcomic {
  name: string;

	startKey: (cb: Callback<string>, err: Callback<string>) => void;
	endKey: (cb: Callback<string>, err: Callback<string>) => void;

  urlToKey: (url: string, cb: Callback<string | null>, err: Callback<string>) => void;
  keyToUrl: (key: string, cb: Callback<string>, err: Callback<string>) => void;

  keyToImgUrl: (key: string, cb: Callback<string>, err: Callback<string>) => void;
  adjKey: (key: string, next: boolean, cb: Callback<string | null>, err: Callback<string>) => void;
};

const girlgenius: Webcomic = {
  name: 'girlgenius',

	startKey: (cb, err) => {
	  cb('20021104');
	},

	endKey: (cb, err) => {
    fetchHtmlPage('http://www.girlgenius.com/comic.php', (html) => {
      const url = 'http://www.girlgeniusonline.com/ggmain/strips/ggmain';
      const start = html.indexOf(url);
      if (start === -1) {
        err('comic url not found');
      }
      const idStart = start + url.length;
      let idEnd = idStart;
      while (idEnd < html.length && html[idEnd] >= '0' && html[idEnd] <= '9') {
        idEnd++;
      }
      if (idEnd > idStart) {
        cb(html.substring(idStart, idEnd));
      } else {
        err("could not find id");
      }
    }, err);
	},

  urlToKey: (url: string, cb, err) => {
    const prefix = 'girlgeniusonline.com/comic.php?date=';
    const index = url.indexOf(prefix);
    if (index !== -1) {
      const start = index + prefix.length;
      let end = start;
      while (end < url.length && (url[end] >= '0' && url[end] <= '9')) {
        end++;
      }
      cb(url.substring(start, end) || null);
    } else if (url.indexOf('girlgeniusonline.com/comic.php') !== -1) {
      girlgenius.endKey(cb, err);
    } else {
      cb(null);
    }
  },

  keyToUrl: (key: string, cb, err) => {
    if (!key.match(/^\d+$/)) {
      err("invalid key: " + key);
    } else {
      cb('http://www.girlgeniusonline.com/comic.php?date=' + key);
    }
  },

  keyToImgUrl: (key, cb, err) => {
     cb('http://www.girlgeniusonline.com/ggmain/strips/ggmain' + key + '.jpg');
  },

  adjKey: (key: string, next: boolean, cb, err) => {
    girlgenius.keyToUrl(key, (url) => {
      fetchHtmlPage(url, (html) => {
        const getUrl = (next: boolean) => {
          const index = html.indexOf(next ? 'title="The Next Comic"' : 'title="The Previous Comic"');
          if (index === -1) return null;
          const hrefStart = html.lastIndexOf('href="', index);
          if (hrefStart === -1) return null;
          const urlStart = hrefStart + ('href="'.length);

          const url = 'http://www.girlgeniusonline.com/comic.php?date=';
          if (html.substr(urlStart, url.length) !== url) {
            return null;
          }

          const idStart = urlStart + url.length;
          let end = idStart;
          while (end < html.length && (html[end] >= '0' && html[end] <= '9')) {
            end++;
          }

          return html.substring(idStart, end);
        };
        const nextUrl = getUrl(true);
        const lastUrl = getUrl(false);
        if (!nextUrl && !lastUrl) {
          err('something was wrong with the page - neither next or last was found');
        }
        cb(next ? nextUrl : lastUrl);
      }, err);
    }, err);
  },
};

function fetchHtmlPage(url: string, cb: Callback<string>, err: Callback<string>) {
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

const comics: {[comicName: string]: Webcomic} = { girlgenius };

export function get_info(req: any, res: any) {
  const { dir, origKey } = req.query;
  const comicName = req.query.comic;

  if (typeof(comicName) !== 'string' ||
      typeof(dir) !== 'string' ||
      typeof(origKey) !== 'string') {
    res.statusCode = 400;
    res.send('invalid args');
  }

  const comic = comics[comicName];
  if (!comic || !(dir === 'self' || dir === 'prev' || dir === 'next')) {
    res.statusCode = 400;
    res.send('invalid args');
  }

  const err = (msg: string) => {
    res.statusCode = 500;
    res.send(msg);
  }

  const withKey = (key: string | null) => {
    if (key) {
      comic.keyToUrl(key, (url: string) => {
        comic.keyToImgUrl(key, (imgUrl: string) => {
          comic.startKey((startKey: string) => {
            res.send({ key, url, imgUrl, isStart: key === startKey, success: true });
          }, err);
        }, err);
      }, err);
    } else {
      res.send({ atEnd: true, success: true });
    }
  };

  if (dir === 'self') {
    withKey(origKey);
  } else {
    comic.adjKey(origKey, dir === 'next', withKey, err);;
  }
}
