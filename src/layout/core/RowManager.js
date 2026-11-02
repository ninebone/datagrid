import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";
import { GROUP_IDX } from "@/data/Grouping.js";

export class RowManager {
    #BUFFER_ROW_COUNT = 3;

    #host;
    #sheet;
    #element;

    #containerTemplates = new Map();

    #templateRowHeights = [];                  // 💡 [추가] 템플릿 행별 개별 높이 보관 ([그룹1, 그룹2, 데이터])
    #cachedTemplateHeight = null;

    #resizeObserver = null;
    #sheetHeight = 0;
    #cachedRowCount;

    #isProgrammaticScroll = false;
    #isGrouped = false;

    constructor(sheet) {
        this.#host = sheet.getRootNode().host;
        this.#sheet = sheet;

        this.#initResizeObserver();
    }

    // ==========================================
    // 🎯 Public APIs & Getters
    // ==========================================

    getRowHeight() {
        return this.#templateRowHeights.reduce((sum, h) => sum + h, 0);//this.#cachedTemplateHeight;
    }


    refresh = (force = false) => {
        //trace.log("rowManager.refresh", { force });

        //this.#isGrouped = this.#sheet.sourceTable.querySelector("tbody tr[group='true']") ? true : false;

        if (!this.#sheet.classList.contains('active')) return;

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
        if (!bodyViewport) return;

        const wasInvalidHeight = !this.#cachedTemplateHeight || this.#cachedTemplateHeight <= 0;

        if (wasInvalidHeight) {
            this.#measureAndCacheHeight();
            if (this.#cachedTemplateHeight && this.#cachedTemplateHeight > 0) {
                this.#renderAllContainers();
            }
        }


        //this.#updateFooterSpacing();

        this.#handleScroll(bodyViewport.scrollTop, force);

        this.#sheet.querySelector('nine-table-vscrollbar')?.refresh();
    };

    #handleScroll = (scrollTop, force = false) => {

        if (this.#isGrouped) {
            this.#handleGroupedScroll(scrollTop, force);
            return;
        }

        const rowHeight = this.#cachedTemplateHeight;
        if (!rowHeight || rowHeight <= 0) return;

        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords.length;

        if (totalCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }

        const templateLength = this.#sheet.templateLength;

        const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
            (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
            this.#sheet.elements.body.tbody.head.offsetHeight;

        const viewHeight = this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0;
        // 1. 전체 실제 데이터의 높이 계산
        //const rawTotalVirtualHeight = Math.max(totalCount * rowHeight + (rowHeight*2) + fixedHeight - viewHeight, 0);
        const rawTotalVirtualHeight = Math.max(totalCount * rowHeight - (viewHeight - fixedHeight - rowHeight), 0);


        // 🎯 [핵심] 브라우저 DOM 최대 높이 제한 대응 (약 1,500만 픽셀 상한선)
        const MAX_BROWSER_HEIGHT = 15000000;
        const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

        let scaleFactor = 1;
        let totalVirtualHeight = rawTotalVirtualHeight;

        if (useScaling) {
            scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            totalVirtualHeight = MAX_BROWSER_HEIGHT;
        }
        //trace.log(totalCount, rowHeight, rawTotalVirtualHeight, MAX_BROWSER_HEIGHT);
        // 스크롤홀더에는 브라우저가 소화할 수 있는 최대 높이만 부여
        this.#sheet.elements.scrollHolder.style.height = `${totalVirtualHeight}px`;

        //trace.log("*************",this.#sheet.querySelector('.ng-sheet-body').clientHeight, this.#sheet.querySelector('.ng-sheet-body').offsetHeight, viewHeight, fixedHeight, rawTotalVirtualHeight, totalVirtualHeight);

        //trace.log(totalVirtualHeight);
        // 🎯 스크롤바 위치(scrollTop)를 실제 데이터 좌표계로 역환산
        const actualScrollTop = useScaling ? (scrollTop / scaleFactor) : scrollTop;

        const maxStartIndex = Math.max(0, totalCount - 1);
        const clampedScrollTop = Math.min(actualScrollTop, rawTotalVirtualHeight);

        // 실제 데이터 좌표 기준으로 시작 인덱스 산출 (원하시는 -1 보정 유지)
        //const startIndex = Math.max(0, Math.min(Math.floor(clampedScrollTop / rowHeight) - 1, maxStartIndex));

        //const calculatedIndexFloat = clampedScrollTop / rowHeight;
        //const startIndex = Math.max(0, Math.min(Math.floor(calculatedIndexFloat) - 1, maxStartIndex));
        const startIndex = Math.max(0, Math.min(Math.floor(clampedScrollTop / rowHeight), maxStartIndex));

        /**
        trace.log("🔍 [#handleScroll DEBUG]", {
            scrollTop,
            actualScrollTop,
            clampedScrollTop,
            rowHeight,
            //calculatedIndexFloat,
            startIndex,
            firstTrDatasetRow: this.#element.firstTr?.dataset?.row
        }); */

        // 🎯 화면 렌더링 오프셋도 '실제 데이터 좌표(clampedScrollTop)' 기준의 모듈러 연산 적용
        const renderOffsetTop = clampedScrollTop % rowHeight;
        this.#sheet.elements.left.tbody.body.style.top =
            this.#sheet.elements.body.tbody.body.style.top =
                this.#sheet.elements.right.tbody.body.style.top = `-${renderOffsetTop}px`;

        const firstTr = this.#element.firstTr;
        const currentStartIndex = firstTr && firstTr.dataset.row !== undefined ? parseInt(firstTr.dataset.row, 10) : -1;

        if (!force && currentStartIndex === startIndex) {
            //trace.log(`[Perf ${getTimestamp()}] ⏭️ 인덱스 동일로 스킵! 총 소요: ${(performance.now() - startTime).toFixed(2)}ms`);
            return;
        }

        //trace.log(`${getTimestamp()}`);


        // [범인 구간 추적]
        [
            this.#sheet.elements.left.tbody.body,
            this.#sheet.elements.body.tbody.body,
            this.#sheet.elements.right.tbody.body
        ].forEach(($tbody, tbodyIdx) => {
            if (!$tbody) return;

            const rows = $tbody.querySelectorAll('tbody.body tr');

            //trace.log(`${getTimestamp()}`);

            rows.forEach(($tr, index) => {
                const dataIndex = startIndex + Math.floor(index / templateLength);

                if (dataIndex >= totalCount) {
                    $tr.style.display = 'none';
                    $tr.dataset.matrixRow = null;
                    $tr.dataset.row = null;
                    $tr.dataset.index = null;
                    return;
                }

                // trace.log(`${getTimestamp()}`);
                const record = viewRecords[dataIndex];//this.#sheet.view.getArray(dataIndex);
                //trace.log(`${getTimestamp()}`);

                if (!record) {
                    $tr.style.display = 'none';
                    return;
                }

                const rowid = record.m._[NINE_TABLE.META.INDEX.ROWID];

                $tr.style.display = '';

                // 💡 만약 개별 바인딩 안에서 느린지 확인하려면 여기서 측정 가능
                this.#bindRowData($tr, record, rowid, dataIndex);
            });
        });

        // 셀렉션 갱신
        this.#sheet.selection.refresh();
    };


    #handleGroupedScroll = (scrollTop, force = false) => {

        trace.log("handleGroupdScroll() start")

        const allRenderItems = this.#sheet.view.getArray() || [];
        const totalVirtualCount = allRenderItems.length;

        if (totalVirtualCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }

        //trace.log(allRenderItems);

        const bodyContent = this.#sheet.querySelector('.ng-sheet-body .ng-sheet-body-content');
        const templateLength = this.#sheet.templateLength || 1;

        const getItemHeight = (item) => {
            if (item.type === 'group') {
                const depth = item.record[GROUP_IDX.DEPTH] || 0;
                // 💡 해당 뎁스 그룹 행의 높이가 정확히 잡히는지 확인 (없으면 첫 번째 템플릿 높이)
                const groupHeight = this.#templateRowHeights[depth] || this.#cachedTemplateHeight / templateLength;
                return groupHeight;
            } else {
                // 💡 데이터 행은 전체 템플릿 높이에서 그룹 TR들을 제외한 순수 데이터 TR들의 높이 합산이어야 합니다.
                // 만약 templateLength가 1이고 일반 행이라면 아래와 같이 처리
                let dataRowsHeight = 0;
                // templateRowHeights 전체 중에서 그룹이 아닌 데이터 행들의 높이만 합산하거나,
                // 단일 데이터 템플릿 높이를 정확히 반환해야 합니다.
                const templateLength = this.#sheet.templateLength || 1;

                // 간단하게 전체 캐시된 템플릿 높이에서 그룹 높이들을 뺀 나머지를 데이터 높이로 산정
                let groupHeightsTotal = 0;
                for(let i = 0; i < templateLength - 1; i++) {
                    groupHeightsTotal += this.#templateRowHeights[i] || 0;
                }
                dataRowsHeight = this.#cachedTemplateHeight - groupHeightsTotal;

                return dataRowsHeight > 0 ? dataRowsHeight : this.#cachedTemplateHeight;
            }
        };


        let totalVirtualHeight = 0;
        const itemHeights = new Array(totalVirtualCount);
        for (let i = 0; i < totalVirtualCount; i++) {
            const h = getItemHeight(allRenderItems[i]);
            itemHeights[i] = h;
            totalVirtualHeight += h;
        }

        this.#sheet.elements.scrollHolder.style.height = `${totalVirtualHeight}px`;

        trace.log("*************", totalVirtualHeight);

        const viewportClientHeight = this.#sheet.clientHeight;

        let accumulatedHeight = 0;
        let startIndex = 0;

        for (let i = 0; i < totalVirtualCount; i++) {
            const h = itemHeights[i];
            if (accumulatedHeight + h > scrollTop) {
                startIndex = i;
                break;
            }
            accumulatedHeight += h;
            startIndex = i;
        }

        //trace.log(startIndex);

        const offsetY = scrollTop - accumulatedHeight;
        if (bodyContent) {
            bodyContent.querySelectorAll("tbody").forEach(($tbody) => {
                $tbody.style.top = `-${Math.max(0, offsetY)}px`;
            });
        }

        const firstTr = this.#element.firstTr;
        const currentStartIndex = firstTr && firstTr.dataset.virtualIndex !== undefined
            ? parseInt(firstTr.dataset.virtualIndex, 10)
            : -1;

        if (!force && currentStartIndex === startIndex) {
            return;
        }

        const visibleRowsCount = Math.ceil(viewportClientHeight / (this.#cachedTemplateHeight / templateLength));
        const dynamicBuffer = (this.#sheet.grouping.columns?.length || 1) * 15;
        const targetStart = startIndex;
        const targetEnd = Math.min(totalVirtualCount, startIndex + visibleRowsCount + dynamicBuffer);




        const renderedItems = allRenderItems.slice(targetStart, targetEnd);

        //trace.log("handleGroupdScroll() 22", renderedItems);

        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (!container) return;

            const trs = Array.from(container.querySelectorAll('tbody.body tr'));

            for (let i = 0; i < trs.length; i += templateLength) {
                const itemIndex = Math.floor(i / templateLength);
                const item = renderedItems[itemIndex];
                const chunkTrs = trs.slice(i, i + templateLength);

                if (!item || itemIndex >= renderedItems.length) {
                    chunkTrs.forEach(tr => {
                        tr.style.display = 'none';
                        tr.dataset.matrixRow = null;
                        tr.dataset.row = null;
                        tr.dataset.index = null;
                    });
                    continue;
                }

                const dataIndex = startIndex + itemIndex;

                chunkTrs.forEach((tr, subIdx) => {
                    const virtualIndex = startIndex + itemIndex;
                    tr.dataset.virtualIndex = virtualIndex;
                    tr.dataset.row = (item.type === 'data') ? dataIndex : '';

                    const isTrGroup = tr.getAttribute('grouping') === 'true';

                    if (item.type === 'group') {
                        if (isTrGroup) {
                            const depth = item.record[GROUP_IDX.DEPTH];
                            if (subIdx === depth) {
                                tr.style.display = '';
                                this.#bindGroupRowData(tr, allRenderItems, item.record, virtualIndex);
                            } else {
                                tr.style.display = 'none';
                                tr.dataset.matrixRow = null;
                                tr.dataset.row = null;
                                tr.dataset.index = null;
                            }
                        } else {
                            tr.style.display = 'none';
                            tr.dataset.matrixRow = null;
                            tr.dataset.row = null;
                            tr.dataset.index = null;
                        }
                    } else {
                        if (isTrGroup) {
                            tr.style.display = 'none';
                            tr.dataset.matrixRow = null;
                            tr.dataset.row = null;
                            tr.dataset.index = null;
                        } else {
                            tr.style.display = '';

                            //trace.log(item.record)
                            const rowid = item.record.m?.rowid ?? 0;
                            this.#bindRowData(tr, item.record, rowid, virtualIndex);
                        }
                    }
                });
            }
        });

        this.#sheet.selection.refresh();

        trace.log("handleGroupdScroll() end")
    };

    #bindGroupRowData = ($tr, allRenderItems, groupRecord, virtualIndex) => {
        const templateLength = this.#sheet.templateLength || 1;
        const subRowIndex = parseInt($tr.dataset.subrow, 10) || 0;
        const matrixRow = (virtualIndex * templateLength) + subRowIndex;

        const indices = groupRecord[GROUP_IDX.CHILDREN]; // 인덱스 배열이 들어있는 위치 (정확한 인덱스는 구조에 맞게 조절)
        const allRecords = this.#host.data.getArray();
        const childrenRecords = indices ? indices.map(idx => allRecords[idx]).filter(Boolean) : [];

        // 필요하다면 groupRecord나 tr에 자식 레코드들을 캐싱해 둘 수도 있습니다.
        //groupRecord.childrenRecords = childrenRecords;

        //trace.log(allRecords, childrenRecords);


        $tr.dataset.virtualIndex = virtualIndex;
        $tr.dataset.row = '';
        $tr.dataset.matrixRow = matrixRow;
        $tr.data = childrenRecords;//groupRecord;
        $tr.dataset.groupId = groupRecord[GROUP_IDX.ID];

        //trace.log(tr, groupRecord)

        Array.from($tr.cells).forEach(($cell) => {

            $cell.dataset.row = virtualIndex;

            const customComp = Array.from($cell.children).find($el =>
                $el.tagName.toLowerCase().startsWith('cell-') || typeof $el.refresh === 'function'
            );

            //trace.log(customComp)

            if (customComp !== undefined && typeof customComp.refresh === 'function') {
                customComp?.refresh();
            }
        });
    };

    #bindRowData = ($tr, record, rowid, dataIndex) => {
        const templateLength = this.#sheet.templateLength || 1;
        const subRowIndex = parseInt($tr.dataset.subrow, 10) || 0;
        const matrixRow = (dataIndex * templateLength) + subRowIndex;

        $tr.dataset.index = dataIndex;
        $tr.dataset.row = rowid;
        $tr.dataset.matrixRow = matrixRow;
        $tr.data = record;

        Array.from($tr.cells).forEach(($cell) => {
            $cell.dataset.index = dataIndex;
            $cell.dataset.row = rowid;

            const customComp = Array.from($cell.children).find($el =>
                $el.tagName.toLowerCase().startsWith('cell-') && typeof $el.refresh === 'function'
            );

            customComp?.refresh();
        });
    };

    initialize = () => {
        //trace.log("rowManager.initialize");

        this.#isGrouped = this.#sheet.sourceTable.querySelector("tbody tr[grouping='true']") ? true : false;

        this.#cachedTemplateHeight = null;
        this.#containerTemplates.clear();

        this.#element = {
            scrollTables: this.#sheet.querySelectorAll('.ng-sheet-body table'),
            firstTr: this.#sheet.querySelector('.ng-sheet-body .ng-container-body tbody.body tr'),
        };

        // 컨테이너 템플릿 수집 부분도 tbody.body 기준으로 변경
        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (!container) return;

            const tableEl = container.querySelector('table');
            if (!tableEl) return;

            const tbody = tableEl.querySelector('tbody.body'); // 👈 .bindable-tbody 대신 tbody.body
            if (!tbody) return;

            const trs = Array.from(tbody.querySelectorAll('tr'));
            const templateTrs = trs.map(tr => tr.cloneNode(true));
            this.#containerTemplates.set(selector, templateTrs);
        });

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');

        if (bodyViewport) {
            this.#sheetHeight = bodyViewport.clientHeight;

            this.#measureAndCacheHeight();
            this.#renderAllContainers();
            this.#handleScroll(bodyViewport.scrollTop, true);

            bodyViewport.addEventListener('scroll', (e) => {

                if (this.#isProgrammaticScroll) return;

                const rowHeight = this.#cachedTemplateHeight || 0;
                const totalCount = this.#sheet.view.getArray()?.length || 0;
                const rawTotalVirtualHeight = totalCount * rowHeight;

                if (rawTotalVirtualHeight <= bodyViewport.clientHeight) {
                    trace.log(rawTotalVirtualHeight, bodyViewport.clientHeight)
                    return;
                }

                this.#handleScroll(bodyViewport.scrollTop);

                this.#sheet.querySelector('nine-table-vscrollbar').refresh();
                //this.#sheet.querySelector('nine-table-hscrollbar').refresh();
            }, { passive: true });
        }
    };

    scrollToDataRow(dataRow, align = 'top', onRendered) {
        //trace.log("🔍 [scrollToDataRow ENTER]", { dataRow, isGrouped: this.#isGrouped });

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');

        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords?.length || 0;

        const targetRow = Math.max(0, Math.min(dataRow, totalCount - 1));
        let targetScrollTop = 0;

        // 🎯 [핵심] 그룹핑 모드일 때는 실제 scrollHeight(또는 렌더링된 총 높이)를 기준으로 비율 계산
        if (this.#isGrouped) {
            const maxScrollTop = Math.max(bodyViewport.scrollHeight - bodyViewport.clientHeight, 1);
            // targetRow가 전체 totalCount에서 차지하는 비율(ratio)만큼 실제 스크롤 최대 높이에 곱해줌
            const ratio = targetRow / Math.max(totalCount - 1, 1);
            targetScrollTop = ratio * maxScrollTop;
        } else {
            /**
            const rowHeight = this.#cachedTemplateHeight;

            let rawTargetScrollTop = targetRow * rowHeight;

            const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
                (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
                this.#sheet.elements.body.tbody.head.offsetHeight;

            const viewHeight = this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0;
            // 1. 전체 실제 데이터의 높이 계산
            const rawTotalVirtualHeight = Math.max(totalCount * rowHeight + (rowHeight*2) + fixedHeight - viewHeight, 0);

            //const rawTotalVirtualHeight = 0;

            trace.log("****************", rawTotalVirtualHeight);

            //const rawTotalVirtualHeight = totalCount * rowHeight;
            const MAX_BROWSER_HEIGHT = 15000000;
            const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

            let scaleFactor = 1;
            if (useScaling) {
                scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            }

            targetScrollTop = rawTargetScrollTop * scaleFactor;
                */
            const rowHeight = this.#cachedTemplateHeight;
            const rawTargetScrollTop = targetRow * rowHeight;

            const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
                (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
                this.#sheet.elements.body.tbody.head.offsetHeight;

            const viewHeight = bodyViewport.offsetHeight || 0;

            // #handleScroll에서 사용하는 rawTotalVirtualHeight 공식과 정확히 일치시켜야 함
            const rawTotalVirtualHeight = Math.max(totalCount * rowHeight + fixedHeight - viewHeight, 0);

            const MAX_BROWSER_HEIGHT = 15000000;
            const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

            let scaleFactor = 1;
            if (useScaling) {
                scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            }

            targetScrollTop = rawTargetScrollTop * scaleFactor;
        }

        //trace.log("🔍 [scrollToDataRow CALC FIXED]", { targetRow, totalCount, targetScrollTop });

        trace.log(targetScrollTop);

        this.#isProgrammaticScroll = true;
        bodyViewport.scrollTop = targetScrollTop;
        this.#handleScroll(targetScrollTop);
        //trace.log(targetScrollTop);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.#isProgrammaticScroll = false;
                if (typeof onRendered === 'function') onRendered();
            });
        });
    }



    destroy = () => {
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }
    };

    #measureAndCacheHeight = () => {
        if (!this.#sheet.classList.contains('active')) return;

        if (!this.#sheet.sourceTable) return;

        const trTemplates = this.#sheet.sourceTable?.querySelectorAll('tbody.body tr');
        //trace.log("[DEBUG #measureAndCacheHeight] bodyTemplates count:", trTemplates?.length);
        //if (!trTemplates || trTemplates.length === 0) return;

        const $tbody = this.#sheet.querySelector('.ng-sheet-body .ng-container-body tbody.body');
        //if (!tbody) return -1;

        $tbody.querySelectorAll('tr').forEach(tr => tr.remove());

        const fragment = document.createDocumentFragment();
        trTemplates.forEach($tr => fragment.appendChild($tr.cloneNode(true)));
        $tbody.appendChild(fragment);

        //let totalHeight = 0;
        const renderedTrs = $tbody.querySelectorAll('tr');

        this.#templateRowHeights = [];
        renderedTrs.forEach($tr => {
            //const h = $tr.offsetHeight;
            //trace.log(`[DEBUG #measureAndCacheHeight] tr[${idx}] height:`, h);
            //totalHeight += h;

            if ($tr?.offsetHeight === 2) {
                trace.log("================================");
                trace.log(this.#sheet);
                trace.log($tr);
                trace.log($tr.cloneNode(true));

                const computedStyle = window.getComputedStyle($tr);
                //const rectHeight = parseFloat(computedStyle.height) || parseFloat(computedStyle.minHeight) || 0

                trace.log("================================", computedStyle, computedStyle.height, computedStyle.minHeight);
            }

            this.#templateRowHeights.push(Math.max($tr.offsetHeight, 24));
        });

        renderedTrs.forEach(tr => tr.remove());

        this.#cachedTemplateHeight = this.#templateRowHeights.reduce((sum, h) => sum + h, 0);

        this.#updateRowCount();
    };

    #updateRowCount = () => {
        trace.log("[DEBUG #updateRowCount] sheetHeight:", this.#sheetHeight, "cachedTemplateHeight:", this.#cachedTemplateHeight);
        if (this.#sheetHeight > 0 && this.#cachedTemplateHeight > 0) {
            const visibleRows = Math.ceil(this.#sheetHeight / this.#cachedTemplateHeight);

            // 💡 [유연한 개선] 그룹화가 켜져 있다면 그룹 컬럼 깊이(다단 레벨)에 따라 버퍼를 동적으로 확장
            let dynamicBuffer = this.#BUFFER_ROW_COUNT;
            if (this.#isGrouped && this.#sheet.grouping) {
                const groupDepth = this.#sheet.grouping.columns?.length || 1;
                // 그룹 단계가 깊을수록 헤더 행이 많이 차지하므로 여유분을 비례해서 늘림 (예: 기본 버퍼 + (뎁스당 추가 여유))
                dynamicBuffer += (groupDepth * 15);
            }

            this.#cachedRowCount = visibleRows + dynamicBuffer;
            trace.log("[DEBUG #updateRowCount] calculated cachedRowCount:", this.#host, this.#cachedRowCount);
        }
    };

    #renderAllContainers = () => {
        trace.log("rowManager.#renderAllContainers");

        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (container && container.querySelector('tbody')) {
                this.#renderRows(container); // selector 인자 제거!
            }
        });

        this.#syncRowHeights();
    };

    #renderRows = (container) => {
        let targetFixedType = null;
        if (container.classList.contains('ng-container-left')) targetFixedType = 'left';
        else if (container.classList.contains('ng-container-right')) targetFixedType = 'right';

        // 🎯 [수정] 원본 테이블에서 tbody.body에 해당하는 tr들만 복제
        const templateTrs = Array.from(this.#sheet.sourceTable.querySelectorAll('tbody.body tr')).map(tr => {
            const clonedTr = tr.cloneNode(true);

            if (targetFixedType === 'left') {
                clonedTr.querySelectorAll('th,td').forEach($cell => {
                    if ($cell.getAttribute('fixed') !== 'left') $cell.remove();
                });
            } else if (targetFixedType === 'right') {
                clonedTr.querySelectorAll('th,td').forEach($cell => {
                    if ($cell.getAttribute('fixed') !== 'right') $cell.remove();
                });
            } else {
                clonedTr.querySelectorAll('[fixed=left], [fixed=right]').forEach($cell => {
                    $cell.remove();
                });
            }

            return clonedTr;
        });

        if (templateTrs.length === 0) return;

        // 🎯 [수정] targetTbody도 일반 tbody가 아니라 tbody.body를 정확히 타겟팅
        const targetTbody = container.querySelector('tbody.body');
        if (!targetTbody) return;

        targetTbody.querySelectorAll("tr").forEach(tr => tr.remove());

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this.#cachedRowCount; i++) {
            templateTrs.forEach(tmpl => fragment.appendChild(tmpl.cloneNode(true)));
        }


        targetTbody.appendChild(fragment);

        if (container.classList.contains('ng-container-body')) {
            this.#element.firstTr = targetTbody.querySelector('tr');
        }
    };



    #syncRowHeights = () => {
        const leftTable = this.#sheet.querySelector('.ng-sheet-body .ng-container-left table');
        const bodyTable = this.#sheet.querySelector('.ng-sheet-body .ng-container-body table');
        const rightTable = this.#sheet.querySelector('.ng-sheet-body .ng-container-right table');

        if (bodyTable) {
            const leftRows = leftTable ? Array.from(leftTable.querySelectorAll('tbody tr')) : [];
            const bodyRows = Array.from(bodyTable.querySelectorAll('tbody tr'));
            const rightRows = rightTable ? Array.from(rightTable.querySelectorAll('tbody tr')) : [];

            const maxRows = Math.max(leftRows.length, bodyRows.length, rightRows.length);

            for (let i = 0; i < maxRows; i++) {
                const heights = [
                    leftRows[i]?.getBoundingClientRect().height || 0,
                    bodyRows[i]?.getBoundingClientRect().height || 0,
                    rightRows[i]?.getBoundingClientRect().height || 0
                ];
                const maxHeight = Math.max(...heights);

                if (maxHeight > 0) {
                    if (leftRows[i]) leftRows[i].style.height = `${maxHeight}px`;
                    if (bodyRows[i]) bodyRows[i].style.height = `${maxHeight}px`;
                    if (rightRows[i]) rightRows[i].style.height = `${maxHeight}px`;
                }
            }
        }
    };

    #initResizeObserver = () => {

        if (!this.#sheet || !(this.#sheet instanceof HTMLElement)) return;

        this.#resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {

                const sheetEl = entry.target;
                if (!sheetEl.classList.contains('active')) continue;

                const height = entry.contentRect.height;
                const width = entry.contentRect.width;

                if (width > 0 && this.#sheet.isAutoFitCol) {
                    this.#sheet.autoFit(true);
                }

                if (height > 0 && this.#sheetHeight !== height) {
                    this.#sheetHeight = height;
                    this.#updateRowCount();

                    if (this.#cachedTemplateHeight !== null) {
                        this.#renderAllContainers();
                        this.refresh();
                    }
                }
            }
        });

        this.#resizeObserver.observe(this.#sheet);
    };
}