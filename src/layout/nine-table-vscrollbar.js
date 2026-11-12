// ui/nine-table-vscrollbar.js
import { trace } from "@nopeer";
import { GROUP_IDX } from "@/data/Grouping.js";

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

        const scrollHolder = this.#sheet.elements.scrollHolder;
        let rawContentHeight = scrollHolder ? parseFloat(scrollHolder.style.height) || 0 : 0;

       // if (!rawContentHeight || rawContentHeight <= 0) {
            const isGrouped = this.#sheet.sourceTable?.querySelector("tbody tr[grouping='true']") ? true : false;
            if (isGrouped) {

                const getItemHeight = (item) => {
                    if (item.type === 'group') {
                        const depth = item.record[GROUP_IDX.DEPTH];
                        return this.#sheet.template.heights[depth];
                    } else {
                        // 정상적인 마이너스 연산자(-)가 포함된 데이터 행 높이 산출
                        const dataRowsHeight = this.#sheet.template.height - this.#sheet.template.group.height;
                        return dataRowsHeight > 0 ? dataRowsHeight : this.#sheet.template.height;
                    }
                };

                let sumHeight = 0;
                for (let i = 0; i < viewRecords.length; i++) {
                    sumHeight += getItemHeight(viewRecords[i]);
                }

                rawContentHeight = sumHeight;
            } else {
                const rowHeight = this.#sheet.template.height;
                rawContentHeight = totalCount * rowHeight;
            }
       // }

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

        // 💡 hardcoded 방식 대신 #getScaleInfo()가 산출한 contentHeight를 기준(rawContentHeight 대체)으로 활용
        const rawContentHeight = contentHeight;

        const needsVScroll = (rawContentHeight > viewHeight);

        this.#sheet.classList.toggle('vscroll-visible', needsVScroll);

        if (!needsVScroll) {
            return;
        }

        const trackHeight = track.clientHeight;
        if (trackHeight <= 0) return;

        // 💡 누락된 곱하기(*) 연산자 복구
        const thumbHeight = Math.max(Math.min(trackHeight * (viewHeight / rawContentHeight), trackHeight), 20);
        thumb.style.height = `${thumbHeight}px`;

        const currentScrollTop = body.scrollTop;

        // 💡 누락된 마이너스(-) 연산자 복구 및 viewHeight 기준 반영
        const maxScrollTop = Math.max(rawContentHeight - viewHeight, 1);

        let thumbTop = 0;
        if (maxScrollTop > 0) {
            // 💡 누락된 마이너스(-) 연산자 복구
            thumbTop = (currentScrollTop / maxScrollTop) * (trackHeight - thumbHeight);
        }

        // 💡 누락된 마이너스(-) 연산자 복구
        const maxThumbTop = trackHeight - thumbHeight;
        if (thumbTop < 0) thumbTop = 0;
        if (thumbTop > maxThumbTop) thumbTop = maxThumbTop;

        thumb.style.top = `${thumbTop}px`;

        this.#elements.top.disabled = (currentScrollTop <= 0);
        // 💡 누락된 마이너스(-) 연산자 복구
        this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);
    };

    #onMouseUp = () => {
        this.#dragging = false;
    };

    #onMouseDown = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        this.#dragging = true;

        this.#startY = e.clientY;
        this.#startThumbTop = parseFloat(this.#elements.thumb.style.top) || 0;

    };

    #onMouseMove = (e) => {
        if (!this.#dragging) return;

        /** will be move down */
        const trackRect = this.#elements.track.getBoundingClientRect();
        const trackHeight = trackRect.height;
        const thumbHeight = this.#elements.thumb.clientHeight;
        const maxThumbTop = trackHeight - thumbHeight;

        if (maxThumbTop <= 0) return;

        //trace.log(new Date().toISOString());

        const deltaY = e.clientY - this.#startY;
        let targetThumbTop = this.#startThumbTop + deltaY;

        if (targetThumbTop < 0) targetThumbTop = 0;
        if (targetThumbTop > maxThumbTop) targetThumbTop = maxThumbTop;

        // 썸 위치 즉시 이동
        this.#elements.thumb.style.top = `${targetThumbTop}px`;

        // 이동 비율(0 ~ 1) 산출
        const ratio = maxThumbTop > 0 ? (targetThumbTop / maxThumbTop) : 0;

        // RowManager 및 RowManager #handleScroll과 완벽히 동기화되는 픽셀 단위 scrollTop 산출
        const body = this.#elements.container;
        const fixedHeight = (this.#sheet.elements.body?.thead?.offsetHeight || 0) +
            (this.#sheet.elements.body?.tfoot?.offsetHeight || 0) +
            (this.#sheet.elements.body?.tbody.head.offsetHeight || 0);
        const viewHeight = body.clientHeight - fixedHeight;

        const { contentHeight } = this.#getScaleInfo();
        const maxScrollTop = Math.max(contentHeight - viewHeight, 0);

        const targetScrollTop = ratio * maxScrollTop;

        // 뷰포트 스크롤 직접 지정 및 RowManager 갱신 유도
        body.scrollTop = targetScrollTop;
        //this.#sheet.rowManager?.refresh(true);

        const currentScrollTop = body.scrollTop;
        this.#elements.top.disabled = (currentScrollTop <= 0);
        this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);
    };


    #init = () => {

        document.addEventListener('mouseup', this.#onMouseUp);
        document.addEventListener('mousemove', this.#onMouseMove);
        this.#elements.thumb.addEventListener("mousedown", this.#onMouseDown);

        // 2. 트랙(Track) 빈 공간 클릭 제어
        this.#elements.track.addEventListener("mousedown", (e) => {
            if (e.button !== 0 || e.target === this.#elements.thumb) return;
            const trackRect = this.#elements.track.getBoundingClientRect();
            const thumbHeight = this.#elements.thumb.clientHeight;
            const trackHeight = this.#elements.track.clientHeight;
            const maxThumbTop = trackHeight - thumbHeight;

            if (maxThumbTop > 0) {
                const clickY = e.clientY - trackRect.top - (thumbHeight / 2);
                const ratio = Math.max(0, Math.min(1, clickY / maxThumbTop));

                const body = this.#elements.container;
                const fixedHeight = (this.#sheet.elements.body?.thead?.offsetHeight || 0) +
                    (this.#sheet.elements.body?.tfoot?.offsetHeight || 0) +
                    (this.#sheet.elements.body?.tbody.head.offsetHeight || 0);
                const viewHeight = body.clientHeight - fixedHeight;

                const { contentHeight } = this.#getScaleInfo();
                const maxScrollTop = Math.max(contentHeight - viewHeight, 0);

                const targetScrollTop = ratio * maxScrollTop;

                body.scrollTop = targetScrollTop;
                this.#sheet.rowManager?.refresh(true);
            }
            this.refresh();
        });

        let scrollTimeout = null;

        const startContinuousScroll = (direction) => {
            if (scrollTimeout) return;

            const viewRecords = this.#sheet.view.getArray();

            const fixedHeight = (this.#sheet.querySelector('thead')?.offsetHeight || 0) +
                (this.#sheet.querySelector('tfoot')?.offsetHeight || 0) +
                (this.#sheet.querySelector('tbody.head')?.offsetHeight || 0);

            let currentDelay = 400;
            const minDelay = 1;

            const scrollStep = () => {
                const bodyView = this.#elements.container; // 💡 뷰포트 DOM 컨테이너 (bodyView)
                const scrollTop = bodyView.scrollTop;
                const bodyRect = bodyView.getBoundingClientRect(); // 💡 DOM 위치 정보
                const effectiveTop = bodyRect.top + fixedHeight;

                // 1. 현재 뷰포트에 렌더링된 tr들을 가져옴
                const trs = Array.from(this.#sheet.querySelectorAll('.ng-container-body tbody.body tr'));
                if (trs.length === 0) return;

                // 2. 첫 번째 유효한(보이는) tr 찾기
                const firstTr = trs.find(tr => tr.style.display !== 'none');
                if (!firstTr) return;

                const index = parseInt(firstTr.dataset.index, 10);
                const sameIndexTrs = trs.filter(tr => {
                    if (tr.style.display === 'none') return false;
                    return tr.dataset.index === firstTr.dataset.index;
                });

                const rects = sameIndexTrs.map(tr => tr.getBoundingClientRect());
                const groupTop = Math.min(...rects.map(r => r.top));

                // 3. 첫 번째 tr이 그룹 행인지 판단
                const isGroupRow = firstTr.getAttribute('grouping') === 'true';

                let targetScrollTop = scrollTop;
                let targetStepSize = 0;

                if (direction === 'down') {

                    if (isGroupRow) {

                        const groupBottom = Math.max(...rects.map(r => r.bottom));
                        const totalGroupHeight = groupBottom - groupTop;

                        if (effectiveTop > groupTop) {
                            targetStepSize = totalGroupHeight - (effectiveTop - groupTop);
                        } else {
                            targetStepSize = totalGroupHeight;
                        }
                    } else {
                        if (effectiveTop > groupTop) {
                            targetStepSize = this.#sheet.template.height - this.#sheet.template.group.height - (effectiveTop - groupTop);
                        } else {
                            targetStepSize = this.#sheet.template.height - this.#sheet.template.group.height;
                        }
                    }

                    targetScrollTop = scrollTop + targetStepSize;
                } else {
                    if (groupTop >= effectiveTop) {
                        if (index > 0) {
                            if (viewRecords[index-1].type === "group") {
                                const depth = viewRecords[index-1].groupId.split("_").length - 2;
                                targetStepSize = this.#sheet.template.group.heights[depth];
                            } else {
                                targetStepSize = this.#sheet.template.height - this.#sheet.template.group.height;
                            }
                        }
                    } else {
                        targetStepSize = effectiveTop - groupTop;
                    }

                    targetScrollTop = Math.max(0, scrollTop - targetStepSize);
                }

                bodyView.scrollTop = targetScrollTop;
                this.#sheet.rowManager?.refresh(true);
                this.refresh();

                currentDelay = Math.max(minDelay, Math.floor(currentDelay * 0.7));
                scrollTimeout = setTimeout(scrollStep, currentDelay);
            };

            scrollStep();
        };

        const stopContinuousScroll = () => {
            if (scrollTimeout) {
                clearTimeout(scrollTimeout); // 💡 setTimeout이므로 clearTimeout 사용
                scrollTimeout = null;
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

    #init1 = () => {

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

            const records = this.#sheet.getArray();

            const onMouseMove = (moveEvent) => {
                if (!this.#dragging) return;
                if (maxThumbTop <= 0) return;

                const deltaY = moveEvent.clientY - this.#startY;
                let targetThumbTop = this.#startThumbTop + deltaY;

                if (targetThumbTop < 0) targetThumbTop = 0;
                if (targetThumbTop > maxThumbTop) targetThumbTop = maxThumbTop;

                this.#elements.thumb.style.top = `${targetThumbTop}px`;

                const ratio = targetThumbTop / maxThumbTop;

                const rowHeight = this.#sheet.template.height;
                const viewHeight = (this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0) -
                    (this.#sheet.elements.body.thead?.offsetHeight || 0) -
                    (this.#sheet.elements.body.tfoot?.offsetHeight || 0) -
                    (this.#sheet.elements.body.tbody.head.offsetHeight || 0);

                const visibleRowCount = Math.floor(viewHeight / rowHeight);

                const { totalCount } = this.#getScaleInfo();
                const targetRow = Math.floor(ratio * (totalCount - visibleRowCount + 1));

                trace.log(totalCount, targetRow);

                this.#sheet.rowManager.scrollToDataRow(targetRow);

                const { contentHeight } = this.#getScaleInfo();
                const currentScrollTop = this.#elements.container.scrollTop;
                const maxScrollTop = Math.max(contentHeight - this.#sheet.rowManager.getRowHeight(), 0);

                this.#elements.top.disabled = (currentScrollTop <= 0);
                this.#elements.bottom.disabled = (currentScrollTop >= maxScrollTop - 1);

                //trace.log(new Date().toISOString());
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

