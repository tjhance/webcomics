import {Webcomic, fetchHtmlPage} from '../common';

export class girlgenius implements Webcomic {
  name = 'girlgenius';
  domain = 'girlgeniusonline.com';

  async startKey() {
    return '20021104';
  }

  async endKey() {
    const html = await fetchHtmlPage('https://www.girlgeniusonline.com/comic.php');
    const url = 'https://www.girlgeniusonline.com/ggmain/strips/ggmain';
    const start = html.indexOf(url);
    if (start === -1) {
      throw new Error('comic url not found');
    }
    const idStart = start + url.length;
    let idEnd = idStart;
    while (idEnd < html.length && html[idEnd] >= '0' && html[idEnd] <= '9') {
      idEnd++;
    }
    if (idEnd > idStart) {
      return html.substring(idStart, idEnd);
    } else {
      throw new Error("could not find id");
    }
  }

  async urlToKey(url: string) {
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
      const key = await this.endKey();
      return key;
    } else {
      return null;
    }
  }

  async keyToUrl(key: string) {
    if (!key.match(/^\d+$/)) {
      throw new Error("invalid key: " + key);
    } else {
      return 'https://www.girlgeniusonline.com/comic.php?date=' + key;
    }
  }

  async keyToImgUrls(key: string) {
    const html = await fetchHtmlPage('https://www.girlgeniusonline.com/comic.php?date=' + key);
    const regex =
        /[Ss][Rr][Cc]=['"](http:\/\/www\.girlgeniusonline\.com\/ggmain\/strips\/ggmain[0-9a-zA-Z]+.jpg)['"]/g;
    const match1 = regex.exec(html);
    if (match1) {
      const match2 = regex.exec(html);
      if (match2) {
        return [match1[1], match2[1]];
      } else {
        return [match1[1]];
      }
    } else {
      throw new Error("no match found");
    }
  }

  async adjKey(key: string, next: boolean) {
    // special case to skip advertisement
    if (key === '20091026' && next) {
      return '20091028';
    }
    if (key === '20091028' && !next) {
      return '20091026';
    }

    const url = await this.keyToUrl(key);
    const html = await fetchHtmlPage(url);

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
      throw new Error('something was wrong with the page - neither next or last was found');
    }
    return next ? nextUrl : lastUrl;
  }
}
