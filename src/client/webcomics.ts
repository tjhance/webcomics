type Callback<T> = (t: T) => void;

type InfoEndMarker = {type: 'endmarker'};
type InfoStartMarker = {type: 'startmarker'};
type InfoComic = {
  type: 'comic',
  url: string,
  key: string,
  imgUrl: string,
  image: HTMLImageElement,
  width: number,
  height: number,
};
type Info = InfoEndMarker | InfoStartMarker | InfoComic;

class ComicPage {
  buffer: Info[] = [];
  cur = -1;
  root: HTMLElement;

  constructor(
      public comic: string,
      public startKey: string) {
    this.root = document.getElementsByClassName('view-container')[0] as HTMLElement;
    this.attempt();
    this.addScrollHandler();
  }

  attemptNum = 0;

  attempt() {
    let dir: 'self' | 'prev' | 'next' | null = null;
    let key = null;
    if (this.buffer.length === 0) {
      key = this.startKey;
      dir = 'self';
    } else {
      let needsAtEnd = this.buffer[this.buffer.length - 1].type === 'comic' && (this.cur > this.buffer.length - 10);
      let needsAtFront = this.buffer[0].type === 'comic' && this.cur < 10;
      if (needsAtEnd || needsAtFront) {
        const useFront = needsAtFront && (!needsAtEnd || this.cur * 2 < this.buffer.length);
        if (useFront) {
          dir = 'prev';
          key = (this.buffer[0] as InfoComic).key;
        } else {
          dir = 'next';
          key = (this.buffer[this.buffer.length - 1] as InfoComic).key;
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

    this.getInfo(dir as string, key, (result: Info) => {
      if (this.attemptNum !== curAttempt) {
        return;
      }
      clearTimeout(timeout);

			if (dir === 'self') {
				this.cur = 0;
			}
      if (dir === 'self' || dir === 'next') {
        this.addNext(result);
      } else {
        this.addPrev(result);
      }

      setTimeout(() => this.attempt(), 0);
    });
  }

  getInfo(dir: string, origKey: string, cb: Callback<Info>) {
    var oReq = new XMLHttpRequest();

    const reqListener = () => {
      if (oReq.status !== 200) {
        throw new Error("got request status " + oReq.status + " " + oReq.response);
      }
      const data = JSON.parse(oReq.response);
      if (!data.success) {
        throw new Error("endpoint got error " + oReq.response.error); 
      }
      const key = data.key;
      const url = data.url;
      const imgUrl = data.imgUrl;
      const atEnd = data.atEnd;

      if (atEnd) {
        if (dir === 'next') {
          cb({type: 'endmarker'});
        } else if (dir === 'prev') {
          cb({type: 'startmarker'});
        } else {
          throw new Error("do not expect atEnd for this case");
        }
      } else {
        if (typeof(key) !== 'string' ||
            typeof(url) !== 'string' ||
            typeof(imgUrl) !== 'string') {
          throw new Error('bad result from server');
        }

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
      }
    };

    oReq.addEventListener("load", reqListener);
    oReq.open("POST",
        "/get_info?comic=" + encodeURIComponent(this.comic) +
        "&dir=" + encodeURIComponent(dir) +
        "&origKey=" + encodeURIComponent(origKey));
    oReq.send();
  }

  preloadImage(imgUrl: string, cb: Callback<HTMLImageElement>) {
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

  addNext(info: Info) {
    const elem = this.makeElement(info);
    this.buffer.push(info);
    this.root.appendChild(elem);
  }

  addPrev(info: Info) {
    const elem = this.makeElement(info);
    this.buffer.unshift(info);
    this.cur++;
    this.root.insertBefore(elem, this.root.firstChild);
  }

  makeLink(url: string) {
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.appendChild(document.createTextNode(url));
    return a;
  }

  makeImage(info: InfoComic) {
    const img = document.createElement('img');
    img.setAttribute('width', String(info.width));
    img.setAttribute('height', String(info.height));
    img.setAttribute('src', info.imgUrl);
    // TODO alt text?
    return img;
  }

  makeElement(info: Info): HTMLElement {
    const div = document.createElement('div');
    div.className = 'row-elem';

    if (info.type === 'comic') {
      div.className += ' comic-row';

      const div1 = document.createElement('div');
      const div2 = document.createElement('div');
      const div3 = document.createElement('div');

      div1.className = 'link1';
      div2.className = 'link2';
      div3.className = 'the-comic';

      div1.appendChild(this.makeLink(info.url));
      div2.appendChild(this.makeLink(window.location.origin + '/comicview?comic=' +
          encodeURIComponent(this.comic) + '&index=' + encodeURIComponent(info.key)));
      div3.appendChild(this.makeImage(info));

      div.appendChild(div1);
      div.appendChild(div2);
      div.appendChild(div3);
    } else {
      div.className += ' marker-row';
      div.appendChild(document.createTextNode(info.type === 'startmarker' ?
          'Beginning of comic' : 'End of comic'));
    }

    return div;
  }

  handleScroll(pos: number) {
		if (this.buffer.length === 0) {
		  return;
		}

		// binary search to see which item is in view
		// lo <= the answer < hi
		let lo = 0, hi = this.buffer.length;
		while (hi > lo + 1) {
      const mid = (lo + hi) >> 1;
      const node = this.root.childNodes[mid];
      if ((node as HTMLElement).offsetTop <= pos) {
        lo = mid;
      } else {
        hi = mid;
      }
		}

    this.cur = lo;
  }

  last_known_scroll_position = 0;
  ticking = false;

  addScrollHandler() {
    window.addEventListener('scroll', (e) => {
      this.last_known_scroll_position = window.scrollY;
      if (!this.ticking) {
        window.requestAnimationFrame(() => {
          this.handleScroll(this.last_known_scroll_position);
          this.ticking = false;
        });
      }
      this.ticking = true;
    });
  }
}

(window as any).initApp = function() {
  (window as any).page = new ComicPage('girlgenius', '20021104');
};
