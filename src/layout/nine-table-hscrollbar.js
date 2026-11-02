// ui/nine-table-hscrollbar.js
import { trace } from "@nopeer";

export class NineTableHScrollBar extends HTMLElement {
    #owner;
    #dragging = false;
    #elements;
    #interval1;
    #interval2;
    #resizeObserver;

    constructor() {
        super();
    }

    connectedCallback() {
        this.#owner = this.closest("nine-table-sheet") || this.getRootNode().host;
        if (!this.#owner) return;

        this.innerHTML = `
            <button class='scroll-left' disabled><div class='scroll-icon'></div></button>
            <div class='scroll-track'><div class='scroll-thumb'></div></div>
            <button class='scroll-right' disabled><div class='scroll-icon'></div></button>
        `;

        const initWhenReady = () => {
            const body = this.#owner.querySelector(".ng-sheet-body .ng-container-body");
            if (!body) {
                setTimeout(initWhenReady, 10);
                return;
            }

            this.#elements = {
                container : body,
                track     : this.querySelector(".scroll-track"),
                thumb     : this.querySelector(".scroll-thumb"),
                left      : this.querySelector(".scroll-left"),
                right     : this.querySelector(".scroll-right"),
            };

            this.#init();
            this.#observeResize();
            this.refresh();
        };

        initWhenReady();
    }

    disconnectedCallback() {
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
        }
    }

    #observeResize = () => {
        if (!this.#owner) return;
        const body = this.#owner.querySelector(".ng-sheet-body .ng-container-body");
        if (!body) return;

        this.#resizeObserver = new ResizeObserver(() => {
            this.refresh();
        });
        this.#resizeObserver.observe(body);
    };

    refresh = () => {

        if (!this.#owner || !this.#elements || this.#dragging) return;

        const body = this.#elements.container;
        const table = body.querySelector("table");
        if (!table) return;

        const track = this.#elements.track;
        const thumb = this.#elements.thumb;

        const bodyWidth = body.clientWidth;
        const tableWidth = table.scrollWidth;

        const needsHScroll = (bodyWidth !== 0 && tableWidth > bodyWidth);
        this.#owner.classList.toggle('hscroll-visible', needsHScroll);

        if (!needsHScroll) {
            return;
        }

        const trackWidth = track.clientWidth;
        if (trackWidth <= 0) return;

        const thumbWidth = Math.max(Math.min(trackWidth * (bodyWidth / tableWidth), trackWidth), 20);
        thumb.style.width = `${thumbWidth}px`;

        const currentLeft = body.scrollLeft;
        const maxScrollLeft = tableWidth - bodyWidth;

        let l = 0;
        if (maxScrollLeft > 0) {
            l = parseInt((currentLeft / maxScrollLeft) * (trackWidth - thumbWidth), 10);
        }
        if (l < 0) l = 0;

        const maxThumbLeft = trackWidth - thumbWidth;
        if (l > maxThumbLeft) l = maxThumbLeft;

        thumb.style.left = `${l}px`;

        this.#elements.left.disabled = (l === 0);
        this.#elements.right.disabled = (l >= maxThumbLeft - 1);
    };

    #thumbMoveTo = (x) => {
        if (!this.#elements) return false;

        const body = this.#elements.container;
        const table = body.querySelector("table");
        if (!table) return false;

        const trackBound = this.#elements.track.getBoundingClientRect();
        const thumbWidth = this.#elements.thumb.clientWidth;

        let targetX = x;
        if (targetX < 0) targetX = 0;
        const maxThumbLeft = trackBound.width - thumbWidth;
        if (targetX > maxThumbLeft) targetX = maxThumbLeft;
        targetX = parseInt(targetX, 10);

        this.#elements.thumb.style.left = `${targetX}px`;

        this.#elements.left.disabled = (targetX === 0);
        this.#elements.right.disabled = (targetX >= maxThumbLeft - 1);

        const bodyWidth = body.clientWidth;
        const tableWidth = table.scrollWidth;
        const maxScrollLeft = tableWidth - bodyWidth;

        if (maxThumbLeft > 0 && maxScrollLeft > 0) {
            const newScrollLeft = (targetX / maxThumbLeft) * maxScrollLeft;
            body.scrollLeft = newScrollLeft;
        }

        return (targetX > 0 && targetX < maxThumbLeft - 1);
    };

    #init = () => {
        const delayScroll = (pos) => {
            clearInterval(this.#interval1);
            clearInterval(this.#interval2);

            const thumbLeft = parseInt(this.#elements.thumb.style.left || 0, 10);
            this.#thumbMoveTo(thumbLeft + pos);

            this.#interval1 = setInterval(() => {
                clearInterval(this.#interval1);

                this.#interval2 = setInterval(() => {
                    const currentThumbLeft = parseInt(this.#elements.thumb.style.left || 0, 10);
                    if (!this.#thumbMoveTo(currentThumbLeft + pos)) {
                        clearInterval(this.#interval2);
                    }
                }, 50);
            }, 500);
        };

        const clearTimer = () => {
            clearInterval(this.#interval1);
            clearInterval(this.#interval2);
        };

        ['mouseup', 'mouseleave', 'touchend'].forEach(evt => {
            this.#elements.left.addEventListener(evt, clearTimer);
            this.#elements.right.addEventListener(evt, clearTimer);
            this.#elements.track.addEventListener(evt, clearTimer);
        });

        this.#elements.left.addEventListener("mousedown", e => { if (e.button !== 0) return; delayScroll(-20); });
        this.#elements.right.addEventListener("mousedown", e => { if (e.button !== 0) return; delayScroll(20); });
        this.#elements.left.addEventListener("touchstart", () => delayScroll(-20));
        this.#elements.right.addEventListener("touchstart", () => delayScroll(20));

        this.#elements.track.addEventListener("mousedown", e => {
            if (e.button !== 0) return;
            e.preventDefault();
            const trackRect = this.#elements.track.getBoundingClientRect();
            const thumbWidth = this.#elements.thumb.clientWidth;
            this.#thumbMoveTo(e.clientX - trackRect.left - (thumbWidth / 2));
        });

        this.#elements.thumb.addEventListener("mousedown", e => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            this.#dragging = true;
            this.shiftX = e.clientX - this.#elements.thumb.getBoundingClientRect().left;

            const onMouseMove = (moveEvent) => {
                if (!this.#dragging) return;
                const trackRect = this.#elements.track.getBoundingClientRect();
                this.#thumbMoveTo(moveEvent.clientX - trackRect.left - this.shiftX);
            };

            const onMouseUp = () => {
                this.#dragging = false;
                clearTimer();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                this.refresh();
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    };
}

if (!customElements.get('nine-table-hscrollbar')) {
    customElements.define("nine-table-hscrollbar", NineTableHScrollBar);
}