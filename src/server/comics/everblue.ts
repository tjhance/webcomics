import {Webcomic, fetchHtmlPage} from '../common';

export const everblue: Webcomic = {
  name: 'everblue',
  domain: 'everblue-comic.com',

  startKey: (cb, err) => {
    cb('1');
  },

  endKey: (cb, err) => {
    fetchHtmlPage('http://www.everblue-comic.com/', (html) => {
      const match = /<a class="prev navlink" href="\/comic\/(\d+)"/.exec(html);
      if (match) {
        cb(String(Number(match[1]) + 1));
      } else {
        err("endKey: match not found");
      }
    }, err);
  },

  urlToKey: (url: string, cb, err) => {
    const match = /everblue-comic.com\/comic\/(\d+)/.exec(url);
    if (match) {
      cb(match[1]);
    } else {
      everblue.endKey(cb, err);
    }
  },

  keyToUrl: (key: string, cb, err) => {
    if (!key.match(/^\d+$/)) {
      err("invalid key: " + key);
    } else {
      cb('http://www.everblue-comic.com/comic/' + key);
    }
  },

  keyToImgUrls: (key, cb, err) => {
    everblue.keyToUrl(key, (url) => {
      fetchHtmlPage(url, (html) => {
        const match = /<img itemprop="image" src="\/([\/a-zA-Z0-9\-\.]+)"/.exec(html);
        if (match) {
          const url = 'http://www.everblue-comic.com/' + match[1];
          cb([url]);
        } else {
          err("keyToImgUrls: no match found");
        }
      }, err);
    }, err);
  },

  adjKey: (key: string, next: boolean, cb, err) => {
    if (!key.match(/^\d+$/)) {
      err("invalid key: " + key);
      return;
    }

    if (!next) {
      const newKey = Number(key) - 1;
      if (newKey <= 0) {
        cb(null);
      } else {
        cb(String(newKey));
      }
    } else {
      everblue.endKey((endKey) => {
        const newKey = Number(key) + 1;
        const lastKey = Number(endKey);
        if (newKey > lastKey) {
          cb(null);
        } else {
          cb(String(newKey));
        }
      }, err);
    }
  }
}
