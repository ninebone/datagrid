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

        // 🎯 [핵심] 그룹핑이든 일반이든 스크롤홀더(scrollHolder)가 가진 실제 가상 총 높이를 최우선으로 반영
        const scrollHolder = this.#sheet.elements?.scrollHolder;
        let rawContentHeight = scrollHolder ? parseFloat(scrollHolder.style.height) || 0 : 0;

        if (!rawContentHeight || rawContentHeight <= 0) {
            const isGrouped = this.#sheet.sourceTable?.querySelector("tbody tr[grouping='true']") ? true : false;
            if (isGrouped && this.#sheet.rowManager) {
                // RowManager가 관리하는 누적 높이 활용 또는 fallback
                rawContentHeight = (body.scrollHeight > body.clientHeight) ? body.scrollHeight : (totalCount * 30);
            } else {
                const rowHeight = this.#sheet.getRowHeight() || 1;
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

        return { rawContentHeight, contentHeight, scaleFactor, useScaling, totalCount };
    };

    #getViewHeight = () => {
        const body = this.#elements.container;
        if (!body) return 0;

        const thead = this.#sheet.elements?.body?.thead?.offsetHeight || 0;
        const tfoot = this.#sheet.elements?.body?.tfoot?.offsetHeight || 0;
        const tbodyHead = this.#sheet.elements?.body?.tbody?.head?.offsetHeight || 0;
        const fixedHeight = thead + tfoot + tbodyHead;

        return body.clientHeight - fixedHeight;
    };

    refresh = () => {
        //trace.log("=================", "vscrollbar.refresh");
        // 💡 드래그 중에는 refresh에 의한 썸 위치 덮어쓰기 차단
        if (this.#dragging) return;

        if (!this.#sheet || !this.#sheet.elements || !this.#elements) return;

        const body = this.#elements.container;
        const track = this.#elements.track;
        const thumb = this.#elements.thumb;



        //const bodyHeight = this.#getViewHeight();
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

        // 1. 전체 실제 데이터의 높이 계산
        //const rawTotalVirtualHeight = Math.max(totalCount * rowHeight + (rowHeight*2) + fixedHeight - viewHeight, 0);
        //trace.log(viewHeight, fixedHeight);

        //trace.log(rawContentHeight, bodyHeight);
        //trace.log("**************************************", needsVScroll);

        this.#sheet.classList.toggle('vscroll-visible', needsVScroll);

        if (!needsVScroll) {
            return;
        }

        const trackHeight = track.clientHeight;
        if (trackHeight <= 0) return;

        //trace.log(body, body.scrollTop, bodyHeight, viewHeight, contentHeight);

        //trace.log(bodyHeight, rawContentHeight, contentHeight);

        const thumbHeight = Math.max(Math.min(trackHeight * (bodyHeight / rawContentHeight), trackHeight), 20);
        thumb.style.height = `${thumbHeight}px`;

        const currentScrollTop = body.scrollTop;
        //const maxScrollTop = Math.max(contentHeight - bodyHeight, 1);
        const maxScrollTop = Math.max(contentHeight - this.#sheet.rowManager.getRowHeight(), 1);

        let thumbTop = 0;
        if (maxScrollTop > 0) {
            thumbTop = (currentScrollTop / maxScrollTop) * (trackHeight - thumbHeight);
        }

        const maxThumbTop = trackHeight - thumbHeight;
        if (thumbTop < 0) thumbTop = 0;
        if (thumbTop > maxThumbTop) thumbTop = maxThumbTop;

        thumb.style.top = `${thumbTop}px`;

        /**
        // 🎯 [디버깅 로그] 스크롤바가 리프레시될 때 현재 상태 로깅
        trace.log("🔍 [VScroll Refresh]", {
            isGrouped: this.#sheet.sourceTable?.querySelector("tbody tr[grouping='true']") ? true : false,
            totalCount,
            bodyScrollTop: currentScrollTop,
            maxScrollTop,
            thumbTop,
            maxThumbTop
        }); */

        this.#elements.top.disabled = (currentScrollTop <= 0);
        this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);
    };

    #init = () => {
        trace.log("nine-table-vscrollbar.#init");

        const body = this.#elements.container;

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

                //this.#elements.container.scrollTop = 0;

                const deltaY = moveEvent.clientY - this.#startY;
                let targetThumbTop = this.#startThumbTop + deltaY;

                if (targetThumbTop < 0) targetThumbTop = 0;
                if (targetThumbTop > maxThumbTop) targetThumbTop = maxThumbTop;

                // 썸 위치 즉시 고정
                this.#elements.thumb.style.top = `${targetThumbTop}px`;

                const ratio = targetThumbTop / maxThumbTop;

                const rowHeight =this.#sheet.getRowHeight();
                const viewHeight = (this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0) -
                    (this.#sheet.elements.body.thead?.offsetHeight || 0) -
                    (this.#sheet.elements.body.tfoot?.offsetHeight || 0) -
                    (this.#sheet.elements.body.tbody.head.offsetHeight || 0);

                const visibleRowCount = Math.floor(viewHeight / rowHeight);

                const { totalCount } = this.#getScaleInfo();
                //const targetRow = Math.max(0, Math.min(Math.floor(ratio * (totalCount - 1)), totalCount - 1));
                const targetRow = Math.floor(ratio * (totalCount - visibleRowCount + 1));
                // 1000010 - 6
                this.#sheet.rowManager.scrollToDataRow(targetRow);

                const { rawContentHeight, contentHeight } = this.#getScaleInfo();
                const currentScrollTop = this.#elements.container.scrollTop;
                const maxScrollTop = Math.max(contentHeight - this.#sheet.rowManager.getRowHeight(), 0);

                //trace.log("*****************", visibleRowCount, ratio, totalCount, targetRow);

                this.#elements.top.disabled = (currentScrollTop <= 0);
                this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);
            };

            const onMouseUp = () => {
                this.#dragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                //this.refresh();
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

                trace.log("🎯 [VScroll Track Click]", { ratio, clickY, totalCount, targetRow });

                if (targetRow >= 0 && this.#sheet.rowManager && typeof this.#sheet.rowManager.scrollToDataRow === 'function') {
                    this.#sheet.rowManager.scrollToDataRow(targetRow, 'top');
                }
            }
            this.refresh();
        });

        /**
        this.#elements.top.addEventListener("click", () => {
            const currentTopRow = Math.floor(body.scrollTop / this.#sheet.getRowHeight());
            const targetRow = Math.max(0, currentTopRow - 1);
            if (this.#sheet.rowManager && typeof this.#sheet.rowManager.scrollToDataRow === 'function') {
                this.#sheet.rowManager.scrollToDataRow(targetRow, 'top');
            }
        });
        */
        /**
        this.#elements.bottom.addEventListener("click", (e) => {

            const $firstTr = this.#sheet.querySelector("tbody.body tr");
            const targetRow = parseInt($firstTr.dataset.row, 10) + 1;

            this.#sheet.rowManager.scrollToDataRow(targetRow + 1, null, () => {
                this.refresh();
            });
        }); */

        // 🎯 아래쪽 화살표 꾹 누를 때 연속 스크롤 처리
            // 🎯 상하 화살표 꾹 누를 때 연속 스크롤 공통 처리 함수
        let scrollInterval = null;

        const startContinuousScroll = (direction) => {
            if (scrollInterval) return;

            const scrollStep = () => {
                const $firstTr = this.#sheet.querySelector("tbody.body tr");

                if (!$firstTr || $firstTr.dataset.row === undefined) {
                    return;
                }

                trace.log(this.#sheet.isLastRow());
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

        // 1. 위쪽(top) 버튼 이벤트 바인딩
        this.#elements.top.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            startContinuousScroll('up');
        });

        // 2. 아래쪽(bottom) 버튼 이벤트 바인딩
        this.#elements.bottom.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            startContinuousScroll('down');
        });

        // 마우스가 떼어지거나 버튼 영역을 벗어났을 때 공통 정지
        document.addEventListener("mouseup", stopContinuousScroll);
        this.#elements.top.addEventListener("mouseleave", stopContinuousScroll);
        this.#elements.bottom.addEventListener("mouseleave", stopContinuousScroll);
    };
}

if (!customElements.get('nine-table-vscrollbar')) {
    customElements.define("nine-table-vscrollbar", NineTableVScrollBar);
}