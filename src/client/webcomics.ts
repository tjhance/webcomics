type Callback<T> = () => T;

type Info =
  {type: 'endmarker'} |
  {type: 'startmarker'} |
  {
    type: 'comic',
    url: string,
    key: string,
    imgUrl: string,
    image: Image,
    width: number,
    height: number,
  };

class ComicPage {
  const buffer: Info[] = [];
  const cur = -1;

  constructor(
      public comic: Webcomic,
      public startKey: string) {
    this.attempt();
  }

  attemptNum = 0;

  attempt() {
    let dir = null;
    let key = null;
    if (this.buffer.length === 0) {
      key = this.startKey;
      dir = 'self';
    } else {
      let needsAtEnd = buffer[buffer.length - 1].type === 'comic' && (this.cur > this.buffer.length - 10);
      let needsAtFront = buffer[0].type === 'comic' && this.cur < 10;
      if (needsAtEnd || needsAtFront) {
        const useFront = needsAtFront && (!needsAtEnd || cur * 2 < this.buffer.length);
        if (useFront) {
          dir = 'prev';
          key = buffer[buffer.length - 1].key;
        } else {
          dir = 'next';
          key = buffer[0].key;
        }
      }
    }

    if (key === null) {
      setTimeout(this.attempt.bind(this), 1000);
      return;
    }

    this.attemptNum++; 
    const curAttempt = this.attemptNum;
    const timeout = setTimeout(this.attempt.bind(this), 5000);

    this.getInfo(dir, key, (result: Info) => {
      clearTimeout(timeout);
      if (this.attemptNum !== curAttempt) {
        return;
      }

      if (dir == 'self' || dir == 'next') {
        this.addNext(result);
      } else {
        this.addPrev(result);
      }

      setTimeout(() => this.attempt(), 0);
    });
  }

  getInfo(dir: string, origKey: string, cb: Callback<Info>) {
    const withRealKey = (key: string | null) => {
      if (realKey === null) {
        let info: Info;
        if (dir === 'prev') {
          info = {type: 'startmarker'};
        } else {
          info = {type: 'endmarker'};
        }
        cb(info);
      } else {
        const url = this.comic.keyToUrl(key);
        this.comic.keyToImgUrl(key, (imgUrl) => {
          // preload the image
          this.preloadImage(imgUrl, (image) => {
            if (!image.width || !image.height) {
              throw new Error("width and height not present for some reason");
            }
            cb({
              type: 'comic',
              url: url,
              key: key,
              imgUrl: imgUrl,
              image: image,
              width: image.width,
              height: image.height,
            });
          });
        });
      }
    };

    if (dir === 'self') withRealKey(origKey);
    else  this.comic.getAdjKey(origKey, dir === 'next', withRealKey);
  }

  preloadImage(imgUrl: string, cb: Callback<Image>) {
    const img = new Image();
    img.src = imgUrl;

    let complete = false;

    img.onload = () => {
      if (!complete) {
        complete = true;
        cb(img);
      }
    };

    if (img.complete) {
      if (!complete) {
        complete = true;
        cb(img);
      }
    }
  }
}

new ComicPage(girlgenius, 'LAST');
