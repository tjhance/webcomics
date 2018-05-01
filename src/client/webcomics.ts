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

const SMALL_SCREEN = window.matchMedia &&
    window.matchMedia('only screen and (max-device-width: 600px)').matches;

class ComicPage {
  buffer: Info[] = [];
  cur = -1;
  root: HTMLElement;

  cookieManager: CookieManager;

  constructor(
      public comic: string,
      public startKey: string) {
    this.cookieManager = new CookieManager(comic, startKey);
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
      let needsAtEnd = this.buffer[this.buffer.length - 1].type === 'comic' && (this.cur > this.buffer.length - 25);
      let needsAtFront = this.buffer[0].type === 'comic' && this.cur < 10;
      if (needsAtEnd || needsAtFront) {
        const useFront = needsAtFront && (!needsAtEnd ||
            (this.cur * 2 < this.buffer.length && this.cur < this.buffer.length - 2));
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
      requestAnimationFrame(() => {
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

        if (dir === 'self') {
          this.updateCookies();
        }
      });
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
    const div = document.createElement('div');
    const div2 = document.createElement('div');

    const img = document.createElement('img');
    img.setAttribute('width', String(info.width));
    img.setAttribute('height', String(info.height));
    img.setAttribute('src', info.imgUrl);

    // On small screens, we want to expand the image to fit the whole screen.
    // This is magic styling which the image 100% width, the correct aspect ratio,
    // even before the image loads (no flicker).
    // It works because paddingTop is a percentage of the parent node's *width*.
    if (SMALL_SCREEN) {
      div.className = 'img-container-small-screen';
      div.style.paddingTop = (100 * info.height / info.width) + '%';
      div2.className = 'img-container-inner-small-screen';
      img.className = 'img-small-screen';
    }

    // TODO alt text?
    div2.appendChild(img);
    div.appendChild(div2);
    return div;
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
      this.updateCookies();
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

  getCurrentKey(): string | null {
    if (0 <= this.cur && this.cur < this.buffer.length) {
      if (this.buffer[this.cur].type === 'comic') {
        return (this.buffer[this.cur] as InfoComic).key;
      } else if (this.buffer[this.cur].type === 'startmarker' && this.cur > 0) {
        return (this.buffer[this.cur - 1] as InfoComic).key;
      } else if (this.buffer[this.cur].type === 'endmarker' && this.cur < this.buffer.length - 1) {
        return (this.buffer[this.cur + 1] as InfoComic).key;
      }
    }
    return null;
  }

  updateUrl() {
    const key = this.getCurrentKey();
    if (key == null) {
      return;
    }

    window.history.replaceState(key, '',
        window.location.origin + '/comicview?comic=' +
        encodeURIComponent(this.comic) + '&index=' + encodeURIComponent(key));
  }

  updateCookies() {
    const key = this.getCurrentKey();
    if (key == null) {
      return;
    }

    this.cookieManager.setCur(key);
    this.cookieManager.save();
  }
}

type HistoryEntry = {
  comic: string;
  key: string;
  date: Date;
};

class CookieManager {
	prevHistory: HistoryEntry[];

	comicname: string;
	startKey: string;
	startDate: Date;
	curKey: string;
	curDate: Date;

  constructor(comicname: string, startKey: string) {
    this.comicname = comicname;

    this.startKey = startKey;
    this.startDate = new Date();

    this.curKey = this.startKey;
    this.curDate = this.startDate;

    this.prevHistory = getHistory();
  }

  setCur(key: string) {
    this.curKey = key;
    this.curDate = new Date();
  }

  getHistoryToSave(): HistoryEntry[] {
    const entries = this.prevHistory.slice(0);
    const append = (key: string, date: Date) => {
      for (let i = 0; i < entries.length; i++) {
        if (entries[i].comic === this.comicname && entries[i].key === key) {
          entries.splice(i, 1);
          break;
        }
      }
      entries.push({
        comic: this.comicname,
        key: key,
        date: date,
      });
    };
    append(this.startKey, this.startDate);
    append(this.curKey, this.curDate);
    return entries;
  }

  save() {
    saveHistory(this.getHistoryToSave());
  }
}

function getHistory(): HistoryEntry[] {
  try {
    let cookie: string | null = window.localStorage.getItem("history");
    if (!cookie) {
      cookie = docCookies.getItem("history");
    }
    if (!cookie) {
      return [];
    }
    const entries = JSON.parse(cookie);
    entries.forEach((entry: any) => {
      entry.date = new Date(entry.date);
    });
    return entries;
  } catch(ex) {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem("history", JSON.stringify(entries));
}

/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  Revision #3 - July 13th, 2017
|*|
|*|  https://developer.mozilla.org/en-US/docs/Web/API/document.cookie
|*|  https://developer.mozilla.org/User:fusionchess
|*|  https://github.com/madmurphy/cookies.js
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path[, domain]])
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

// https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie/Simple_document.cookie_framework

const docCookies = {
  getItem: function (sKey: string) {
    if (!sKey) { return null; }
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey: string, sValue: string, vEnd?: any, sPath?: any, sDomain?: any, bSecure?: any) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    let sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          /*
          Note: Despite officially defined in RFC 6265, the use of `max-age` is not compatible with any
          version of Internet Explorer, Edge and some mobile browsers. Therefore passing a number to
          the end parameter might not work as expected. A possible solution might be to convert the the
          relative time to an absolute time. For instance, replacing the previous line with:
          */
          /*
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; expires=" + (new Date(vEnd * 1e3 + Date.now())).toUTCString();
          */
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey: string, sPath?: any, sDomain?: any) {
    if (!this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey: string) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: function () {
    const aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (let nLen = aKeys.length, nIdx = 0; nIdx < nLen; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};

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

type Section = {
  name: string;
  entries: HistoryEntry[];
};

(window as any).initHome = function() {
  const entries = getHistory().reverse();

  const sections: Section[] = [];
  const nameToSectionIndex: {[name: string]: number} = {};
  entries.forEach((entry: HistoryEntry) => {
    if (entry.comic in nameToSectionIndex) {
      sections[nameToSectionIndex[entry.comic]].entries.push(entry);
    } else {
      sections.push({
        name: entry.comic,
        entries: [entry],
      });
      nameToSectionIndex[entry.comic] = sections.length - 1;
    }
  });

  let elem: HTMLElement;
  if (sections.length === 0) {
    elem = document.createElement('div');
    elem.className = 'no-history';
    elem.appendChild(document.createTextNode('No history to display.'));
  } else {
    elem = document.createElement('div');
    elem.className = 'yes-history';

    const header = document.createElement('div');
    header.className = 'history-header';
    header.appendChild(document.createTextNode('History'));
    elem.appendChild(header);

    sections.forEach((section) => {
      const sectionElem = document.createElement('div');
      sectionElem.className = 'history-section';

      const header = document.createElement('div');
      header.className = 'history-section-header';
      header.appendChild(document.createTextNode(section.name));
      sectionElem.appendChild(header);

      section.entries.forEach((entry) => {
        const entryElem = document.createElement('div');
        entryElem.className = 'section-entry';
        const anode = document.createElement('a');
        anode.setAttribute('href', 
            window.location.origin + '/comicview?comic=' +
            encodeURIComponent(entry.comic) + '&index=' + encodeURIComponent(entry.key));
        anode.appendChild(document.createTextNode(entry.key));
        entryElem.appendChild(anode);
        entryElem.appendChild(document.createTextNode(' at ' + String(entry.date)));
        sectionElem.appendChild(entryElem);
      });

      elem.appendChild(sectionElem);
    });
  }

  document.getElementsByClassName('history')[0].appendChild(elem);
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
