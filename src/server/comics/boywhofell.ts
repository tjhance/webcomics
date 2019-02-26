import {Webcomic, fetchHtmlPage} from '../common';

let cache: string[];
async function refresh(): Promise<string[]> {
  const html = await fetchHtmlPage('https://www.boywhofell.com/comic/archive');
  const results: string[] = [];

  const regex = /<option value="comic\/([0-9a-zA-Z_\-]+)">/g;
  let m: any;
  while (m = regex.exec(html)) {
    results.push(m[1]);
  }

  if (results.length < 5) {
    throw new Error("Not enough results: " + results.length);
  }
  cache = results;
  return results;
}

export class boywhofell implements Webcomic {
  name = 'boywhofell';
  domain = 'www.boywhofell.com';

  async startKey() {
    return 'ch00p00';
  }

  async endKey() {
    const keys = await refresh();
    return keys[keys.length - 1];
  }

  async urlToKey(url: string) {
    const prefix = 'boywhofell.com/comic/';
    const index = url.indexOf(prefix);
    if (index !== -1) {
      const start = index + prefix.length;
      let end = url.indexOf('/', start);
      if (end === -1) {
        end = url.length;
      }
      return url.substring(start, end) || null;
    } else {
      return null;
    }
  }

  async keyToUrl(key: string) {
    if (!key.match(/^[0-9a-zA-Z_\-]+$/)) {
      throw new Error("invalid key: " + key);
    } else {
      return 'http://www.boywhofell.com/comic/' + key;
    }
  }

  async keyToImgUrls(key: string) {
    const url = await this.keyToUrl(key);
    const html = await fetchHtmlPage(url);
    const regex = /<img title="[^"]+" src="(http:\/\/www\.boywhofell\.com\/comics\/[0-9a-zA-Z\-_\.]+)" id="cc-comic"/;
    const match1 = regex.exec(html);
    if (match1) {
      return [match1[1]];
    } else {
      throw new Error('img src no match');
    }
  }

  async adjKey(key: string, next: boolean) {
    if (cache) {
      const res = do_next(cache, key, next);
      if (res == null) {
        const keys = await refresh();
        return do_next(keys, key, next);
      } else {
        return res;
      }
    } else {
      const keys = await refresh();
      return do_next(keys, key, next);
    }
  }
}

function do_next(keys: string[], key: string, next: boolean): string | null {
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
