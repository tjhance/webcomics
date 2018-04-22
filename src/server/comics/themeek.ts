import {Webcomic, fetchHtmlPage} from '../common';

let themeek_cache: string[];
async function themeek_refresh(): Promise<string[]> {
  const html = await fetchHtmlPage('http://www.meekcomic.com/archives/');
  const results: string[] = [];
  let index = 0;
  while (true) {
    const curIndex = html.indexOf('class="comic-archive-thumb"', index);
    if (curIndex === -1) {
      break;
    }
    const nextIndex = html.indexOf('http://www.meekcomic.com/comic/', curIndex);
    if (nextIndex === -1) { throw new Error("nextIndex is -1"); }
    const start = nextIndex + 'http://www.meekcomic.com/comic/'.length;
    if (start === -1) { throw new Error("start is -1"); }
    const end = html.indexOf('/', start);
    if (end === -1) { throw new Error("end is -1"); }
    const key = html.substring(start, end);
    results.push(key);
    index = end;
  }
  if (results.length < 5) {
    throw new Error("Not enough results: " + results.length);
  }
  themeek_cache = results;
  return results;
}

export class themeek implements Webcomic {
  name = 'themeek';
  domain = 'www.meekcomic.com';

  async startKey() {
    return 'chapter-1-cover';
  }

  async endKey() {
    const keys = await themeek_refresh();
    return keys[keys.length - 1];
  }

  async urlToKey(url: string) {
    const prefix = 'meekcomic.com/comic/';
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
      return 'http://www.meekcomic.com/comic/' + key + '/';
    }
  }

  async keyToImgUrls(key: string) {
    const url = await this.keyToUrl(key);
    const html = await fetchHtmlPage(url);
    const regex = /<meta property="og:image" content="(http:\/\/www\.meekcomic\.com\/comics\/[0-9a-zA-Z\-_\.]+)['"]/g;
    const match1 = regex.exec(html);
    if (match1) {
      return [match1[1]];
    } else {
      throw new Error('img src no match');
    }
  }

  async adjKey(key: string, next: boolean) {
    if (themeek_cache) {
      const res = themeek_next(themeek_cache, key, next);
      if (res == null) {
        const keys = await themeek_refresh();
        return themeek_next(keys, key, next);
      } else {
        return res;
      }
    } else {
      const keys = await themeek_refresh();
      return themeek_next(keys, key, next);
    }
  }
}

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
