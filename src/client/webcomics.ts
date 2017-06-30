type Callback<T> = (t: T) => void;

type InfoEndMarker = {type: 'endmarker'};
type InfoStartMarker = {type: 'startmarker'};
type InfoComic = {
  type: 'comic',
  url: string,
  key: string,
  isStart: boolean,
  imageInfos: ImageInfo[],
};
type Info = InfoEndMarker | InfoStartMarker | InfoComic;

type ImageInfo = {
  imgUrl: string,
  image: HTMLImageElement,
  width: number,
  height: number,
};

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
				// Special-case when you open up to the first comic.
				// In that case, show the 'startmarker' to begin with.
				if (result.type === 'comic' && result.isStart) {
				  this.addNext({type: 'startmarker'});
				}
			}
      if (dir === 'self' || dir === 'next') {
        this.addNext(result);
        this.maybePopFront();
      } else {
        this.addPrev(result);
        this.maybePopBack();
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
      const imgUrls = data.imgUrls;
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
            !Array.isArray(imgUrls)) {
          throw new Error('bad result from server');
        }
        if (imgUrls.length < 1 || imgUrls.length > 2) {
          throw new Error("bad result from server");
        }
        for (const imgUrl of imgUrls) {
          if (typeof(imgUrl) !== 'string') {
            throw new Error("bad result from server");
          }
        }

        // preload the images
        this.preloadImages(imgUrls, (images: HTMLImageElement[]) => {
          const imageInfos: ImageInfo[] = [];
          for (let i = 0; i < imgUrls.length; i++) {
            const imgUrl = imgUrls[i];
            const image = images[i];
            if (!image.width || !image.height) {
              throw new Error("width and height not present for some reason");
            }
            imageInfos.push({imgUrl, image, width: image.width, height: image.height});
          }
          cb({
            type: 'comic',
            url: url,
            key: key,
            imageInfos: imageInfos,
            isStart: !!data.isStart,
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

  preloadImages(imgUrls: string[], cb: Callback<HTMLImageElement[]>) {
    const imgs = imgUrls.map((imgUrl) => {
      const img = new Image();
      img.src = imgUrl;
      return img;
    });

    let done = false;
    const ifCompleteThenCallCb = () => {
      if (done) {
        return;
      }
      for (const img of imgs) {
        if (!img.complete) {
          return false;
        }
      }
      done = true;
      cb(imgs);
    };

    for (const img of imgs) {
      img.onload = ifCompleteThenCallCb;
    }

    ifCompleteThenCallCb();
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
    this.preservePosition(() => {
      this.root.insertBefore(elem, this.root.firstChild);
    });
  }

  static NUM_BEFORE_POPPING = 15;

  maybePopFront() {
    if (this.cur > ComicPage.NUM_BEFORE_POPPING) {
      this.preservePosition(() => {
        while (this.cur > ComicPage.NUM_BEFORE_POPPING) {
          this.buffer.shift();
          this.cur--;
          this.root.removeChild(this.root.firstChild as HTMLElement);
        }
      });
    }
  }

  maybePopBack() {
    while (this.cur < this.buffer.length - ComicPage.NUM_BEFORE_POPPING) {
      this.buffer.pop();
      this.root.removeChild(this.root.lastChild as HTMLElement);
    }
  }

  preservePosition(fn: () => void) {
    const lastChild = this.root.lastChild;
    if (lastChild) {
      const offsetTop1 = (lastChild as HTMLElement).offsetTop;
      const x = window.pageXOffset;
      const y = window.pageYOffset;
      fn();
      const offsetTop2 = (lastChild as HTMLElement).offsetTop;
      window.scrollTo(x, y + offsetTop2 - offsetTop1);
    } else {
      fn();
    }
  }

  makeLink(url: string) {
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.appendChild(document.createTextNode(url));
    return a;
  }

  makeImage(info: ImageInfo) {
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
      for (const imageInfo of info.imageInfos) {
        div3.appendChild(this.makeImage(imageInfo));
      }

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

    if (this.cur !== lo) {
      this.cur = lo;
      this.updateUrl();
    }
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

  updateUrl() {
    let key = null;
    if (0 < this.cur && this.cur < this.buffer.length) {
      if (this.buffer[this.cur].type === 'comic') {
        key = (this.buffer[this.cur] as InfoComic).key;
      } else if (this.buffer[this.cur].type === 'startmarker' && this.cur > 0) {
        key = (this.buffer[this.cur - 1] as InfoComic).key;
      } else if (this.buffer[this.cur].type === 'endmarker' && this.cur < this.buffer.length - 1) {
        key = (this.buffer[this.cur + 1] as InfoComic).key;
      }
    }
    if (key == null) {
      return;
    }

    window.history.replaceState(key, '',
        window.location.origin + '/comicview?comic=' +
        encodeURIComponent(this.comic) + '&index=' + encodeURIComponent(key));

  }
}

(window as any).initApp = function() {
  const query = getQuery();
  const name = query['comic'];
  const index = query['index'];
  if (name && index) {
    (window as any).page = new ComicPage(name, index);
  } else {
    window.location.href = '/home';
  }
};

function getQuery() {
	const query = window.location.search.substring(1);
	const vars = query.split('&');
	const d: {[name: string]: string} = {};
	for (var i = 0; i < vars.length; i++) {
		var split = vars[i].split('=');
		const name = decodeURIComponent(split[0]);
		split.shift();
		const val = decodeURIComponent(split.join('='));
		d[name] = val;
	}
	return d;
}
