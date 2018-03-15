import { Webcomic } from './common';

import { girlgenius } from './comics/girlgenius';
import { drmcninja } from './comics/drmcninja';
import { themeek } from './comics/themeek';
import { everblue } from './comics/everblue';

const comics: {[comicName: string]: Webcomic} = {
  girlgenius,
  drmcninja,
  themeek,
  everblue,
};

export function get_info(req: any, res: any) {
  const { dir, origKey } = req.query;
  const comicName = req.query.comic;

  if (typeof(comicName) !== 'string' ||
      typeof(dir) !== 'string' ||
      typeof(origKey) !== 'string') {
    res.statusCode = 400;
    res.send('invalid args');
  }

  const comic = comics[comicName];
  if (!comic || !(dir === 'self' || dir === 'prev' || dir === 'next')) {
    res.statusCode = 400;
    res.send('invalid args');
  }

  const err = (msg: string) => {
    res.statusCode = 500;
    res.send(msg);
  }

  const withKey = (key: string | null) => {
    if (key) {
      comic.keyToUrl(key, (url: string) => {
        comic.keyToImgUrls(key, (imgUrls: string[]) => {
          comic.startKey((startKey: string) => {
            res.send({ key, url, imgUrls, isStart: key === startKey, success: true });
          }, err);
        }, err);
      }, err);
    } else {
      res.send({ atEnd: true, success: true });
    }
  };

  if (dir === 'self') {
    withKey(origKey);
  } else {
    comic.adjKey(origKey, dir === 'next', withKey, err);;
  }
}

export function process_form(req: any, res: any) {
  const comic_url: string = req.body.comic_url;
  if (typeof(comic_url) !== 'string') {
    res.statusCode = 400;
    res.send("url not given");
    return;
  }

  let comic: Webcomic | null = null;
  for (const key in comics) {
    const _comic = comics[key];
    if (comic_url.indexOf(_comic.domain) !== -1) {
      comic = _comic;
    }
  }

  if (!comic) {
    res.statusCode = 400;
    res.send("bad url");
    return;
  }

  const err = (message: string) => {
    res.statusCode = 500;
    res.send(message);
  };

  comic.urlToKey(comic_url, (key: string | null) => {
    if (!key) {
      res.statusCode = 400;
      res.send("bad url for " + comic!.name);
    } else {
      res.redirect("/comicview?comic=" + encodeURIComponent(comic!.name) + "&index=" +
          encodeURIComponent(key));
    }
  }, err);
}
