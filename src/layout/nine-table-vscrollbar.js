// ui/nine-table-vscrollbar.js
import { trace } from "@nopeer";

export class NineTableVScrollBar extends HTMLElement {
    #host;
    #sheet;
    #dragging = false;
    #elements;
    #startY = 0;
    #startScrollTop = 0;
    #startThumbTop = 0;

    constructor() {
        super();
    }

    connectedCallback() {
        this.#host = this.getRootNode().host;
        this.#sheet = this.closest("nine-table-sheet");

        this.innerHTML = `
            <button class='scroll-top' disabled><div class='scroll-icon'></div></button>
            <div class='scroll-track'><div class='scroll-thumb'></div></div>
            <button class='scroll-bottom' disabled><div class='scroll-icon'></div></button>
        `;

        const initWhenReady = () => {
            const body = this.#sheet.querySelector(".ng-sheet-body");
            if (!body) {
                setTimeout(initWhenReady, 10);
                return;
            }

            this.#elements = {
                container: body,
                track: this.querySelector(".scroll-track"),
                thumb: this.querySelector(".scroll-thumb"),
                top: this.querySelector(".scroll-top"),
                bottom: this.querySelector(".scroll-bottom"),
            };

            this.#init();
            this.refresh();
        };

        initWhenReady();
    }

    #getScaleInfo = () => {
        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords ? viewRecords.length : 0;

        const scrollHolder = this.#sheet.elements?.scrollHolder;
        let rawContentHeight = scrollHolder ? parseFloat(scrollHolder.style.height) || 0 : 0;

        if (!rawContentHeight || rawContentHeight <= 0) {
            const isGrouped = this.#sheet.sourceTable?.querySelector("tbody tr[grouping='true']") ? true : false;
            if (isGrouped) {
                const rowHeight = this.#sheet.template.height;
                rawContentHeight = totalCount * rowHeight;// (body.scrollHeight > body.clientHeight) ? body.scrollHeight : (totalCount * 30);
            } else {
                const rowHeight = this.#sheet.template.height;
                rawContentHeight = totalCount * rowHeight;
            }
        }

        const MAX_BROWSER_HEIGHT = 15000000;
        const useScaling = rawContentHeight > MAX_BROWSER_HEIGHT;

        let scaleFactor = 1;
        let contentHeight = rawContentHeight;

        if (useScaling) {
            scaleFactor = MAX_BROWSER_HEIGHT / rawContentHeight;
            contentHeight = MAX_BROWSER_HEIGHT;
        }

        return { contentHeight, scaleFactor, useScaling, totalCount };
    };


    refresh = () => {
        if (this.#dragging) return;

        if (!this.#sheet || !this.#sheet.elements || !this.#elements) return;

        const body = this.#elements.container;
        const track = this.#elements.track;
        const thumb = this.#elements.thumb;
        const { contentHeight } = this.#getScaleInfo();

        const fixedHeight = (this.#sheet.querySelector('thead')?.offsetHeight || 0) +
            (this.#sheet.querySelector('tfoot')?.offsetHeight || 0) +
            (this.#sheet.querySelector('tbody.head')?.offsetHeight || 0);

        const bodyHeight = (this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0);
        const viewHeight = bodyHeight - fixedHeight;

        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords.length;

        const rawContentHeight = this.#sheet.getRowHeight() * totalCount;

        const needsVScroll = (rawContentHeight > viewHeight);

        this.#sheet.classList.toggle('vscroll-visible', needsVScroll);

        if (!needsVScroll) {
            return;
        }

        const trackHeight = track.clientHeight;
        if (trackHeight <= 0) return;

        const thumbHeight = Math.max(Math.min(trackHeight * (bodyHeight / rawContentHeight), trackHeight), 20);
        thumb.style.height = `${thumbHeight}px`;

        const currentScrollTop = body.scrollTop;
        const maxScrollTop = Math.max(contentHeight - this.#sheet.rowManager.getRowHeight(), 1);

        let thumbTop = 0;
        if (maxScrollTop > 0) {
            thumbTop = (currentScrollTop / maxScrollTop) * (trackHeight - thumbHeight);
        }

        const maxThumbTop = trackHeight - thumbHeight;
        if (thumbTop < 0) thumbTop = 0;
        if (thumbTop > maxThumbTop) thumbTop = maxThumbTop;

        thumb.style.top = `${thumbTop}px`;

        this.#elements.top.disabled = (currentScrollTop <= 0);
        this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);
    };

    #init = () => {

        this.#elements.thumb.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            this.#dragging = true;

            this.#startY = e.clientY;
            this.#startThumbTop = parseFloat(this.#elements.thumb.style.top) || 0;
            const trackRect = this.#elements.track.getBoundingClientRect();
            const trackHeight = trackRect.height;
            const thumbHeight = this.#elements.thumb.clientHeight;
            const maxThumbTop = trackHeight - thumbHeight;

            const onMouseMove = (moveEvent) => {
                if (!this.#dragging) return;
                if (maxThumbTop <= 0) return;


                const deltaY = moveEvent.clientY - this.#startY;
                let targetThumbTop = this.#startThumbTop + deltaY;

                if (targetThumbTop < 0) targetThumbTop = 0;
                if (targetThumbTop > maxThumbTop) targetThumbTop = maxThumbTop;

                this.#elements.thumb.style.top = `${targetThumbTop}px`;

                const ratio = targetThumbTop / maxThumbTop;

                const rowHeight =this.#sheet.getRowHeight();
                const viewHeight = (this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0) -
                    (this.#sheet.elements.body.thead?.offsetHeight || 0) -
                    (this.#sheet.elements.body.tfoot?.offsetHeight || 0) -
                    (this.#sheet.elements.body.tbody.head.offsetHeight || 0);

                const visibleRowCount = Math.floor(viewHeight / rowHeight);

                const { totalCount } = this.#getScaleInfo();
                const targetRow = Math.floor(ratio * (totalCount - visibleRowCount + 1));

                this.#sheet.rowManager.scrollToDataRow(targetRow);

                const { contentHeight } = this.#getScaleInfo();
                const currentScrollTop = this.#elements.container.scrollTop;
                const maxScrollTop = Math.max(contentHeight - this.#sheet.rowManager.getRowHeight(), 0);

                this.#elements.top.disabled = (currentScrollTop <= 0);
                this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);
            };

            const onMouseUp = () => {
                this.#dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        this.#elements.track.addEventListener("mousedown", (e) => {
            if (e.button !== 0 || e.target === this.#elements.thumb) return;
            const trackRect = this.#elements.track.getBoundingClientRect();
            const thumbHeight = this.#elements.thumb.clientHeight;
            const trackHeight = this.#elements.track.clientHeight;
            const maxThumbTop = trackHeight - thumbHeight;

            if (maxThumbTop > 0) {
                const clickY = e.clientY - trackRect.top - (thumbHeight / 2);
                const ratio = Math.max(0, Math.min(1, clickY / maxThumbTop));

                const { totalCount } = this.#getScaleInfo();
                const targetRow = Math.max(0, Math.min(Math.floor(ratio * (totalCount - 1)), totalCount - 1));


                if (targetRow >= 0 && this.#sheet.rowManager && typeof this.#sheet.rowManager.scrollToDataRow === 'function') {
                    this.#sheet.rowManager.scrollToDataRow(targetRow, 'top');
                }
            }
            this.refresh();
        });

        let scrollInterval = null;

        const startContinuousScroll = (direction) => {
            if (scrollInterval) return;

            const scrollStep = () => {
                const $firstTr = this.#sheet.querySelector("tbody.body tr");

                if (!$firstTr || $firstTr.dataset.row === undefined) {
                    return;
                }

                if (direction === 'down' && this.#sheet.isLastRow()) {
                    return;
                }

                const currentRow = parseInt($firstTr.dataset.row, 10);
                const targetRow = direction === 'down' ? currentRow+1 : Math.max(0, currentRow-1);

                this.#sheet.rowManager.scrollToDataRow(targetRow, null, () => {
                    this.refresh();
                });
            };

            scrollStep();
            scrollInterval = setInterval(scrollStep, 200); // 100ms 간격 반복
        };

        const stopContinuousScroll = () => {
            if (scrollInterval) {
                clearInterval(scrollInterval);
                scrollInterval = null;
            }
        };

        this.#elements.top.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            startContinuousScroll('up');
        });

        this.#elements.bottom.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            startContinuousScroll('down');
        });

        document.addEventListener("mouseup", stopContinuousScroll);
        this.#elements.top.addEventListener("mouseleave", stopContinuousScroll);
        this.#elements.bottom.addEventListener("mouseleave", stopContinuousScroll);
    };
}

if (!customElements.get('nine-table-vscrollbar')) {
    customElements.define("nine-table-vscrollbar", NineTableVScrollBar);
}

