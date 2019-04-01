import { Webcomic } from './common';

import { girlgenius } from './comics/girlgenius';
import { drmcninja } from './comics/drmcninja';
import { themeek } from './comics/themeek';
import { everblue } from './comics/everblue';
import { gunnerkriggcourt } from './comics/gunnerkriggcourt';
import { ssss } from './comics/ssss';
import { unsounded } from './comics/unsounded';
import { boywhofell } from './comics/boywhofell';
import { thepromisedneverland } from './comics/thepromisedneverland';

const comics: {[comicName: string]: Webcomic} = {
  girlgenius: new girlgenius(),
  drmcninja: new drmcninja(),
  themeek: new themeek(),
  everblue: new everblue(),
  gunnerkriggcourt: new gunnerkriggcourt(),
  ssss: new ssss(),
  unsounded: new unsounded(),
  boywhofell: new boywhofell(),
  thepromisedneverland: new thepromisedneverland(),
};

export async function get_info(req: any, res: any) {
  const { dir, origKey } = req.query;
  const comicName = req.query.comic;

  if (typeof(comicName) !== 'string' ||
      typeof(dir) !== 'string' ||
      typeof(origKey) !== 'string') {
    res.statusCode = 400;
    res.send('invalid args');
    return;
  }

  const comic = comics[comicName];
  if (!comic || !(dir === 'self' || dir === 'prev' || dir === 'next')) {
    res.statusCode = 400;
    res.send('invalid args');
    return;
  }

  try {
    let key: string | null = null;
    if (dir === 'self') {
      key = origKey;
    } else {
      key = await comic.adjKey(origKey, dir === 'next');
    }

    if (key) {
      const url = await comic.keyToUrl(key);
      const imgUrls = await comic.keyToImgUrls(key);
      const startKey = await comic.startKey();
      res.send({ key, url, imgUrls, isStart: key === startKey, success: true });
    } else {
      res.send({ atEnd: true, success: true });
    }
  } catch (ex) {
    res.statusCode = 500;
    res.send(ex.message);
  }
}

export async function process_form(req: any, res: any) {
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

  try {
    const key = await comic.urlToKey(comic_url);
    if (!key) {
      res.statusCode = 400;
      res.send("bad url for " + comic.name);
    } else {
      res.redirect("/comicview?comic=" + encodeURIComponent(comic.name) + "&index=" +
          encodeURIComponent(key));
    }
  } catch(ex) {
    res.statusCode = 500;
    res.send(ex.message);
  }
}
