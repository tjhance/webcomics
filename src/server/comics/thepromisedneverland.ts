import {Webcomic, fetchHtmlPage} from '../common';

async function getBiggestChapter(): Promise<number> {
  const html = await fetchHtmlPage('https://www.mangareader.net/the-promised-neverland');
  const regex = /<a href="\/the-promised-neverland\/(\d+)"/g;
  let match: any;
  let biggestChap = -1;
  while (match = regex.exec(html)) {
    const chapNum = Number(match[1]);
    if (chapNum > biggestChap) {
      biggestChap = chapNum;
    }
  }
  if (!(biggestChap >= 129)) {
    throw new Error("couldn't get biggest chapter");
  }
  return biggestChap;
}

async function getBiggestPage(chapter: number): Promise<number> {
  const html = await fetchHtmlPage(
      'https://www.mangareader.net/the-promised-neverland/' + chapter);
  const regex = /<option value="\/the-promised-neverland\/\d+\/(\d+)"/g;
  let match: any;
  let biggestPage = -1;
  while (match = regex.exec(html)) {
    const pageNum = Number(match[1]);
    if (pageNum > biggestPage) {
      biggestPage = pageNum;
    }
  }
  if (biggestPage < 1) {
    throw new Error("couldn't get biggest page num");
  }
  return biggestPage;
}

async function getImage(chapter: number, page: number): Promise<string> {
  const html = await fetchHtmlPage(
      'https://www.mangareader.net/the-promised-neverland/' + chapter + '/' + page);
  //const regex = /document\['pu'\] = '([a-zA-Z0-9\.:\/-]+\.jpg)';/;
  const regex = /<img id="img" width="\d+" height="\d+" src="([a-zA-Z0-9\.:\/-]+\.jpg)"/;
  const match = regex.exec(html);
  if (match) {
    return match[1];
  } else {
    throw new Error("couldn't get image");
  }
}

function splitId(id: string): { chapter: number, page: number } {
  if (!/\d+-\d+/.exec(id)) {
    throw new Error("id isn't right");
  }
  const ids = id.split('-');
  const chapter = Number(ids[0]);
  const page = Number(ids[1]);
  if (!(chapter >= 1 && page >= 1)) {
    throw new Error("bad chapter or page");
  }
  return {chapter: chapter, page: page};
}

export class thepromisedneverland implements Webcomic {
  name = 'thepromisedneverland';
  domain = 'mangareader.net/the-promised-neverland';

  async startKey() {
    return '1-1';
  }

  async endKey() {
    const chapter = await getBiggestChapter();
    const page = await getBiggestPage(chapter);
    return chapter + '-' + page;
  }

  async urlToKey(url: string) {
    const match = /the-promised-neverland\/(\d+)\/(\d+)/.exec(url);
    if (match) {
      return match[1] + '-' + match[2];
    } else {
      const match = /the-promised-neverland\/(\d+)/.exec(url);
      if (match) {
        return match[1] + '-' + '1';
      } else {
        return (await this.endKey());
      }
    }
  }

  async keyToUrl(key: string) {
    const c = splitId(key);
    return 'https://www.mangareader.net/the-promised-neverland/' + c.chapter + '/' + c.page;
  }

  async keyToImgUrls(key: string) {
    const c = splitId(key);
    return [await getImage(c.chapter, c.page)];
  }

  async adjKey(key: string, next: boolean) {
    const c = splitId(key);
    if (!next) {
      if (c.page == 1) {
        if (c.chapter == 1) {
          return null;
        } else {
          return (c.chapter - 1) + '-' + (await getBiggestPage(c.chapter - 1));
        }
      } else {
        return c.chapter + '-' + (c.page - 1);
      }
    } else {
      const b = await getBiggestPage(c.chapter);
      if (c.page < b) {
        return c.chapter + '-' + (c.page + 1);
      } else {
        const b2 = await getBiggestChapter();
        if (c.chapter < b2) {
          return (c.chapter + 1) + '-1';
        } else {
          return null;
        }
      }
    }
  }
}
