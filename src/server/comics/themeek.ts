import {Webcomic, Callback, fetchHtmlPage} from '../common';

let themeek_cache: string[];
function themeek_refresh(cb: Callback<string[]>, err: Callback<string>) {
  fetchHtmlPage('http://www.meekcomic.com/archives/', (html) => {
    const results: string[] = [];
    let index = 0;
    while (true) {
      const curIndex = html.indexOf('class="comic-archive-thumb"', index);
      if (curIndex === -1) {
        break;
      }
      const nextIndex = html.indexOf('http://www.meekcomic.com/comic/', curIndex);
      if (nextIndex === -1) { err("nextIndex is -1"); break; }
      const start = nextIndex + 'http://www.meekcomic.com/comic/'.length;
      if (start === -1) { err("start is -1"); break; }
      const end = html.indexOf('/', start);
      if (end === -1) { err("end is -1"); break; }
      const key = html.substring(start, end);
      results.push(key);
      index = end;
    }
    if (results.length < 5) {
      err("Not enough results: " + results.length);
      return;
    }
    themeek_cache = results;
    cb(results);
  }, err);
}

export const themeek: Webcomic = {
  name: 'themeek',
  domain: 'www.meekcomic.com',

  startKey: (cb, err) => {
    cb('chapter-1-cover');
  },

  endKey: (cb, err) => {
    themeek_refresh((keys) => {
      cb(keys[keys.length - 1]);
    }, err);
  },

  urlToKey: (url, cb, err) => {
    const prefix = 'http://www.meekcomic.com/comic/';
    const index = url.indexOf(prefix);
    if (index !== -1) {
      const start = index + prefix.length;
      let end = url.indexOf('/', start);
      if (end === -1) {
        end = url.length;
      }
      cb(url.substring(start, end) || null);
    } else {
      cb(null);
    }
  },

  keyToUrl: (key: string, cb, err) => {
    if (!key.match(/^[0-9a-zA-Z_\-]+$/)) {
      err("invalid key: " + key);
    } else {
      cb('http://www.meekcomic.com/comic/' + key + '/');
    }
  },

  keyToImgUrls: (key, cb, err) => {
    themeek.keyToUrl(key, (url) => {
      fetchHtmlPage(url, (html) => {
        const regex = /<meta property="og:image" content="(http:\/\/www\.meekcomic\.com\/comics\/[0-9a-zA-Z\-_\.]+)['"]/g;
        const match1 = regex.exec(html);
        if (match1) {
          cb([match1[1]]);
        } else {
          err('img src no match');
        }
      }, err);
    }, err);
  },

  adjKey: (key, next: boolean, cb, err) => {
    if (themeek_cache) {
      const res = themeek_next(themeek_cache, key, next);
      if (res == null) {
        themeek_refresh((keys) => {
          cb(themeek_next(keys, key, next));
        }, err);
      } else {
        cb(res);
      }
    } else {
      themeek_refresh((keys) => {
        cb(themeek_next(keys, key, next));
      }, err);
    }
  },
};

function themeek_next(keys: string[], key: string, next: boolean): string | null {
  let index = keys.indexOf(key);
  if (index === -1) {
    return null;
  }
  index += next ? 1 : -1;
  if (index < 0) {
    return null;
  }
  if (index >= keys.length) {
    return null;
  }
  return keys[index];
}

