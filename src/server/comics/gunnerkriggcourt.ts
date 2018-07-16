import {Webcomic, fetchHtmlPage} from '../common';

let endKeyCached: number | null = null;

export class gunnerkriggcourt implements Webcomic {
  name = 'gunnerkriggcourt';
  domain = 'gunnerkrigg.com';

  async startKey() {
    return '1';
  }

  async endKey() {
    const html = await fetchHtmlPage('https://www.gunnerkrigg.com/');
    const match = /<img class="comic_image" src="\/comics\/(\d+).jpg">/.exec(html);
    if (match) {
      return String(Number(match[1]));
    } else {
      throw new Error("endKey: match not found");
    }
  }

  async urlToKey(url: string) {
    const match = /\?p=(\d+)/.exec(url);
    if (match) {
      return match[1];
    } else {
      return (await this.endKey());
    }
  }

  async keyToUrl(key: string) {
    if (!key.match(/^\d+$/)) {
      throw new Error("invalid key: " + key);
    } else {
      return 'http://www.gunnerkrigg.com/?p=' + key;
    }
  }

  async keyToImgUrls(key: string) {
    while (key.length < 8) {
      key = "0" + key;
    }
    return ['http://www.gunnerkrigg.com/comics/' + key + '.jpg'];
  }

  async adjKey(key: string, next: boolean) {
    if (!key.match(/^\d+$/)) {
      throw new Error("invalid key: " + key);
    }

    if (!next) {
      const newKey = Number(key) - 1;
      if (newKey <= 0) {
        return null;
      } else {
        return String(newKey);
      }
    } else {
      const newKey = Number(key) + 1;

      if (endKeyCached !== null && newKey <= endKeyCached) {
        return String(newKey);
      }

      const endKey = await this.endKey();
      const lastKey = Number(endKey);

      endKeyCached = lastKey;

      if (newKey > lastKey) {
        return null;
      } else {
        return String(newKey);
      }
    }
  }
}
