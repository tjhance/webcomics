import {Webcomic, fetchHtmlPage} from '../common';

export class everblue implements Webcomic {
  name = 'everblue';
  domain = 'everblue-comic.com';

  async startKey() {
    return "1";
  }

  async endKey() {
    const html = await fetchHtmlPage('http://www.everblue-comic.com/');
    const match = /<a class="prev navlink" href="\/comic\/(\d+)"/.exec(html);
    if (match) {
      return String(Number(match[1]) + 1);
    } else {
      throw new Error("endKey: match not found");
    }
  }

  async urlToKey(url: string) {
    const match = /everblue-comic.com\/comic\/(\d+)/.exec(url);
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
      return 'http://www.everblue-comic.com/comic/' + key;
    }
  }

  async keyToImgUrls(key: string) {
    const url = await this.keyToUrl(key);
    const html = await fetchHtmlPage(url);
    const match = /<img itemprop="image" src="\/([\/a-zA-Z0-9\-\.]+)"/.exec(html);
    if (match) {
      const url = 'http://www.everblue-comic.com/' + match[1];
      return [url];
    } else {
      throw new Error("keyToImgUrls: no match found");
    }
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
      const endKey = await this.endKey();
      const newKey = Number(key) + 1;
      const lastKey = Number(endKey);
      if (newKey > lastKey) {
        return null;
      } else {
        return String(newKey);
      }
    }
  }
}
