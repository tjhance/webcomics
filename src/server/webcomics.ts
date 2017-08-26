const http = require('http');

type Callback<T> = (t: T) => void;

interface Webcomic {
  name: string;
  domain: string;

  startKey: (cb: Callback<string>, err: Callback<string>) => void;
  endKey: (cb: Callback<string>, err: Callback<string>) => void;

  urlToKey: (url: string, cb: Callback<string | null>, err: Callback<string>) => void;
  keyToUrl: (key: string, cb: Callback<string>, err: Callback<string>) => void;

  keyToImgUrls: (key: string, cb: Callback<string[]>, err: Callback<string>) => void;
  adjKey: (key: string, next: boolean, cb: Callback<string | null>, err: Callback<string>) => void;
};

const girlgenius: Webcomic = {
  name: 'girlgenius',
  domain: 'girlgeniusonline.com',

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

  keyToImgUrls: (key, cb, err) => {
    fetchHtmlPage('http://www.girlgeniusonline.com/comic.php?date=' + key, (html) => {
      const regex =
          /[Ss][Rr][Cc]=['"](http:\/\/www\.girlgeniusonline\.com\/ggmain\/strips\/ggmain[0-9a-zA-Z]+.jpg)['"]/g;
      const match1 = regex.exec(html);
      if (match1) {
        const match2 = regex.exec(html);
        if (match2) {
          cb([match1[1], match2[1]]);
        } else {
          cb([match1[1]]);
        }
      } else {
        err("no match found");
      }
    }, err);
  },

  adjKey: (key: string, next: boolean, cb, err) => {
    // special case to skip advertisement
    if (key === '20091026' && next) {
      cb('20091028');
      return;
    }
    if (key === '20091028' && !next) {
      cb('20091026');
      return;
    }

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

import drmcninja_module = require('./drmcninja');

const drmcninja: Webcomic = {
  name: 'drmcninja',
  domain: 'drmcninja.com',
  startKey: (cb, err) => {
    cb(drmcninja_module.entries[0].full);
  },
  endKey: (cb, err) => {
    cb(drmcninja_module.entries[drmcninja_module.entries.length - 1].full);
  },
  urlToKey: (url, cb, err) => {
    const spl = url.split('comic/');
    if (spl.length != 2) {
      err("bad url split");
      return;
    }
    const short_key = spl[1].split('/')[0];
    const entry = drmcninja_module.shortToEntry[short_key]
    if (!entry) {
      err("no entry found for " + short_key);
      return;
    }
    cb(entry.full);
  },

  keyToUrl: (key, cb, err) => {
    const entry = drmcninja_module.fullToEntry[key];
    if (!entry) {
      err("no entry found (2)");
      return;
    }
    cb('http://drmcninja.com/archives/comic/' + entry.short + '/');
  },

  keyToImgUrls: (key, cb, err) => {
    drmcninja.keyToUrl(key, (url) => {
      fetchHtmlPage(url, (html) => {
        const toFind = '<img src="http://drmcninja.com/comics/';
        const index = html.indexOf(toFind);
        if (index === -1) {
          err("not found");
          return;
        }
        const endIndex = html.indexOf('"', index + 12);
        if (endIndex === -1) {
          err("not found");
          return;
        }
        cb([html.substring(index + 10, endIndex)]);
      }, () => {
        fetchHtmlPage(url.substring(0, url.length - 1) + '-2/', (html) => {
          const toFind = '<img src="http://drmcninja.com/comics/';
          const index = html.indexOf(toFind);
          if (index === -1) {
            err("not found");
            return;
          }
          const endIndex = html.indexOf('"', index + 12);
          if (endIndex === -1) {
            err("not found");
            return;
          }
          cb([html.substring(index + 10, endIndex)]);
        }, err);
      });
    }, err);
  },

  adjKey: (key, next, cb, err) => {
    const entry = drmcninja_module.fullToEntry[key];
    if (!entry) {
      err("no entry found (3)");
      return;
    }
    let idx = entry.idx;
    idx += (next ? 1 : -1);
    if (idx < 0 || idx >= drmcninja_module.entries.length) {
      cb(null);
    } else {
      cb(drmcninja_module.entries[idx].full);
    }
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

const comics: {[comicName: string]: Webcomic} = { girlgenius, drmcninja };

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
        comic.keyToImgUrls(key, (imgUrls: string[]) => {
          comic.startKey((startKey: string) => {
            res.send({ key, url, imgUrls, isStart: key === startKey, success: true });
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

export function process_form(req: any, res: any) {
  const comic_url: string = req.body.comic_url;
  if (typeof(comic_url) !== 'string') {
    res.statusCode = 400;
    res.send("url not given");
    return;
  }

  let comic: Webcomic | null = null;
  for (const key in comics) {
    const _comic = comics[key];
    if (comic_url.indexOf(_comic.domain) !== -1) {
      comic = _comic;
    }
  }

  if (!comic) {
    res.statusCode = 400;
    res.send("bad url");
    return;
  }

  const err = (message: string) => {
    res.statusCode = 500;
    res.send(message);
  };

  comic.urlToKey(comic_url, (key: string | null) => {
    if (!key) {
      res.statusCode = 400;
      res.send("bad url for " + comic!.name);
    } else {
      res.redirect("/comicview?comic=" + encodeURIComponent(comic!.name) + "&index=" +
          encodeURIComponent(key));
    }
  }, err);
}
