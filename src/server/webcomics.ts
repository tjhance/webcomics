type Callback<T> = () => T;

type Webcomic = {
  name: string;

  urlToKey: (url: string) => string | null;
  keyToUrl: (key: string) => string;

  keyToImgUrl: (key: string, cb: Callback<string>) => void;
  adjKey: (key: string, next: boolean, cb: Callback<string | null>) => void;
};

const girlgenius: Webcomic = {
  name: 'girlgenius',
  urlToKey: (url: string) => {
    const prefix = 'girlgeniusonline.com/comic.php?date=';
    const index = url.indexOf(prefix);
    if (index !== -1) {
      const start = index + prefix.length;
      let end = start;
      while (end < url.length && (url[end] >= '0' && url[end] <= '9')) {
        end++;
      }
      return url.substring(start, end) || null;
    } else if (url.indexOf('girlgeniusonline.com/comic.php') !== -1) {
      return 'LAST';
    } else {
      return null;
    }
  },

  keyToUrl: (key: string) => {
    if (key === 'LAST') {
      return 'http://www.girlgeniusonline.com/comic.php';
    } else {
      return 'http://www.girlgeniusonline.com/comic.php?data=' + key;
    }
  },

  keyToImgUrl: (key, cb) => {
    if (key === 'LAST') {
      fetchHtmlPage(girlgenius.keyToUrl(key), (html) => {
        const start = html.indexOf('http://www.girlgeniusonline.com/ggmain/strips/ggmain');
        if (start === -1) throw new Error('comic url not found');
        const end = html.indexOf('jpg', start) + 3;
        if (end === -1) throw new Error('comic url not found');
        cb(html.substring(start, end));
      });
    } else {
      setTimout(() => cb('http://www.girlgeniusonline.com/ggmain/strips/ggmain' + key + '.jpg'), 0);
    }
  },

  adjKey: (key: string, next: boolean, cb: Callback<string | null>) => {
    if (key === 'LAST') {
      setTimeout(() => cb(null), 0);
    } else {
      const url = girlgenius.keyToUrl(key);
      fetchHtmlPage(url, (html) => {
        const getUrl = (next: boolean) => {
          const index = html.indexOf(next ? 'title="The Next Comic"' : 'title="The Previous Comic"');
          if (index === -1) return null;
          const hrefStart = html.lastIndexOf('href="', index);
          if (hrefStart === -1) return null;
          const urlStart = hrefStart + hrefStart + ('href="'.length);
          const urlEnd = html.indexOf('"', urlStart);
          if (urlEnd === -1) return null;
          return html.substring(urlStart, urlEnd);
        };
        const nextUrl = getUrl(true);
        const lastUrl = getUrl(false);
        if (!nextUrl && !lastUrl) {
          throw new Error('something was wrong with the page - neither next or last was found');
        }
        cb(next ? nextUrl : lastUrl);
      });
    }
  },
};
