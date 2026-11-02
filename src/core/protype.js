Array.prototype.nineBinarySearch = function(target) {
    //this.sort((a, b) => { return a > b ? 1 : -1; });

    let start = 0;
    let end = this.length - 1;
    let mid;

    while (start <= end) {
        mid = parseInt((start + end) / 2);

        if (target === this[mid]) {
            return mid;
        } else {
            if (target < this[mid]) {
                end = mid - 1;
            } else {
                start = mid + 1;
            }
        }
    }

    return -1;
};

const elementDebounceState = new WeakMap();

HTMLElement.prototype.addDebounseEventListener = function(
    dblClickEvent,
    dblClickFn,
    pointerEvent,
    pointerFn,
    debounceTime = 500
) {
    const el = this;

    if (!elementDebounceState.has(el)) {
        elementDebounceState.set(el, { timer: null, cancelFn: null });
    }
    const state = elementDebounceState.get(el);

    el.addEventListener(pointerEvent, (e) => {
        e.actualTarget = e.target;

        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        // 💡 500ms 동안 대기한 뒤에야 실제 pointerFn이 실행됨
        state.timer = setTimeout(() => {
            state.timer = null;
            state.cancelFn = pointerFn.call(el, e);
        }, debounceTime);
    });

    el.addEventListener(dblClickEvent, (e) => {
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null;
        }

        if (state.cancelFn) {
            state.cancelFn();
            state.cancelFn = null;
        }

        dblClickFn.call(el, e);
    });
};


nine.measureTextSize = (_text, _font = '12px sans-serif') => {
    if (typeof _text === 'number') _text = _text + "";
    if (!_text) return { width: null, height: null };

    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    _text = _text.replaceAll("\n", "<br>");

    let canvas = document.body.querySelector('canvas#_nine_measure_canvas_');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = '_nine_measure_canvas_';
        canvas.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none; left: -9999px;';
        document.body.appendChild(canvas);
    }

    const context = canvas.getContext('2d');
    context.font = _font;

    let w = 0;
    let h = 0;

    for (let v of _text.split("<br>")) {
        const cleanText = stripHtml(v);
        const metrics = context.measureText(cleanText);

        w = Math.max(w, metrics.width);

        const ascent = metrics.fontBoundingBoxAscent || 10;
        const descent = metrics.fontBoundingBoxDescent || 3;
        h += ascent + descent;
    }

    return {
        width: w,
        height: h
    };
};