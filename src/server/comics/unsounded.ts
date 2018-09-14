import {Webcomic, fetchHtmlPage} from '../common';

let unsounded_cache: string[];
async function unsounded_refresh(): Promise<string[]> {
  const html = await fetchHtmlPage('http://www.casualvillain.com/Unsounded/comic+index/');
  const results: string[] = [];

  let r = /(ch\d\d+_\d\d+)\.html/g;
  let match;
  while (match = r.exec(html)) {
    let key = match[1];
    results.push(key);
  }

  results.sort(function(a, b) {
    let j = valid_key(a);
    let k = valid_key(b);

    if (!j || !k) {
      throw new Error("unsounded_refresh: bad key??");
    }

    const ch0 = Number(j.chapter_part.substring(2));
    const ch1 = Number(k.chapter_part.substring(2));
    const p0 = Number(j.page_part);
    const p1 = Number(k.page_part);
    if (ch0 < ch1) return -1;
    if (ch0 > ch1) return 1;
    if (p0 < p1) return -1;
    if (p0 > p1) return 1;
    return 0;
  });

  const results_uniq: string[] = [];
  for (let i = 0; i < results.length; i++) {
    if (i == 0 || results[i] != results[i-1]) {
      results_uniq.push(results[i]);
    }
  }
  unsounded_cache = results_uniq;
  return results_uniq;
}

type KeyObj = { chapter_part: string, page_part: string };

function valid_key(key: string): KeyObj | null {
  const match = /^(ch\d\d+)_(\d\d+)$/.exec(key);
  if (match) {
    return { chapter_part: match[1], page_part: match[2] };
  } else {
    return null;
  }
}

export class unsounded implements Webcomic {
  name = 'unsounded';
  domain = 'www.casualvillain.com';

  async startKey() {
    return 'ch01_01';
  }

  async endKey() {
    const keys = await unsounded_refresh();
    return keys[keys.length - 1];
  }

  async urlToKey(url: string) {
    const prefix = 'casualvillain.com/Unsounded/comic/'
    const index = url.indexOf(prefix);
    if (index !== -1) {
      let start = index + prefix.length;
      start = url.indexOf('/', start) + 1;
      let end = url.indexOf('.', start);
      if (end === -1) {
        end = url.length;
      }
      let key = url.substring(start, end);
      return valid_key(key) ? key : null;
    } else {
      return null;
    }
  }

  async keyToUrl(key: string) {
    let k = valid_key(key);
    if (k) {
      return 'http://www.casualvillain.com/Unsounded/comic/' + k.chapter_part + '/' + key + '.html';
    } else {
      throw new Error("invalid key: " + key);
    }
  }

  async keyToImgUrls(key: string) {
    let k = valid_key(key);
    if (k) {
      return ['http://www.casualvillain.com/Unsounded/comic/' + k.chapter_part + '/pageart/' + key + '.jpg'];
    } else {
      throw new Error("invalid key: " + key);
    }
  }

  async adjKey(key: string, next: boolean) {
    if (unsounded_cache) {
      const res = unsounded_next(unsounded_cache, key, next);
      if (res == null && next) {
        const keys = await unsounded_refresh();
        return unsounded_next(keys, key, next);
      } else {
        return res;
      }
    } else {
      const keys = await unsounded_refresh();
      return unsounded_next(keys, key, next);
    }
  }
}

function unsounded_next(keys: string[], key: string, next: boolean): string | null {
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
