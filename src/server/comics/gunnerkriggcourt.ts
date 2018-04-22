import {Webcomic, fetchHtmlPage} from '../common';

export const gunnerkriggcourt: Webcomic = {
  name: 'gunnerkriggcourt',
  domain: 'gunnerkrigg.com',

  startKey: (cb, err) => {
    cb('1');
  },

  endKey: (cb, err) => {
    fetchHtmlPage('http://www.gunnerkrigg.com/', (html) => {
      const match = /<img class="comic_image" src="\/comics\/(\d+).jpg">/.exec(html);
      if (match) {
        cb(String(Number(match[1])));
      } else {
        err("endKey: match not found");
      }
    }, err);
  },

  urlToKey: (url: string, cb, err) => {
    const match = /\?p=(\d+)/.exec(url);
    if (match) {
      cb(match[1]);
    } else {
      gunnerkriggcourt.endKey(cb, err);
    }
  },

  keyToUrl: (key: string, cb, err) => {
    if (!key.match(/^\d+$/)) {
      err("invalid key: " + key);
    } else {
      cb('http://www.gunnerkrigg.com/?p=' + key);
    }
  },

  keyToImgUrls: (key, cb, err) => {
    while (key.length < 8) {
      key = "0" + key;
    }
    cb(['http://www.gunnerkrigg.com/comics/' + key + '.jpg']);
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
      gunnerkriggcourt.endKey((endKey) => {
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
