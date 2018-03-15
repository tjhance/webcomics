import {Webcomic, fetchHtmlPage} from '../common';

export const girlgenius: Webcomic = {
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

