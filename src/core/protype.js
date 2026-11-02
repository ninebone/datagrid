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

// 엘리먼트별 디바운스/취소 상태를 격리하기 위한 WeakMap
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

    // 1. 포인터(다운) 이벤트: 즉시 실행하지 않고 debounceTime 동안 지연시킴
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

    // 2. 더블클릭 이벤트: 대기 시간 내에 들어오면 예약되어 있던 pointerdown 자체를 원천 차단
    el.addEventListener(dblClickEvent, (e) => {
        //trace.log(e);
        if (state.timer) {
            clearTimeout(state.timer);
            state.timer = null; // 💡 pointerdown 실행 예약이 아예 취소됨!
        }

        // 혹시 이미 실행되어 버린 경우의 안전장치 롤백
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

    // 🎯 브라우저 DOM 파싱을 이용한 완벽한 HTML 태그 제거 함수
    const stripHtml = (html) => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    // 줄바꿈 처리 전 HTML 정제 또는 줄바꿈 단위별 정제
    _text = _text.replaceAll("\n", "<br>");

    // 🎯 공용 숨김 캔버스를 querySelector로 찾거나 없으면 생성
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
        // 브라우저 파서로 HTML 태그를 완전히 제거한 순수 텍스트 획득
        const cleanText = stripHtml(v);
        const metrics = context.measureText(cleanText);

        //trace.log(cleanText);

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