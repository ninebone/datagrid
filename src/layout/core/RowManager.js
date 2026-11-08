import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";
import { GROUP_IDX } from "@/data/Grouping.js";

export class RowManager {
    #BUFFER_ROW_COUNT = 3;

    #host;
    #sheet;
    #element;

    #containerTemplates = new Map();

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

    getRowHeight() {
        return this.#sheet.template.height;
    }

    refresh = (force = false) => {

        if (!this.#sheet.classList.contains('active')) return;

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
        if (!bodyViewport) return;

        const wasInvalidHeight = !this.#sheet.template.height || this.#sheet.template.height <= 0;

        if (wasInvalidHeight) {
            this.#measureAndCacheHeight();
            if (this.#sheet.template.height && this.#sheet.template.height > 0) {
                this.#renderAllContainers();
            }
        }


        this.#handleScroll(bodyViewport.scrollTop, force);

        this.#sheet.querySelector('nine-table-vscrollbar')?.refresh();
    };

    #handleScroll = (scrollTop, force = false) => {

        if (this.#isGrouped) {
            this.#handleGroupedScroll(scrollTop, force);
            return;
        }

        const rowHeight = this.#sheet.template.height;
        if (!rowHeight || rowHeight <= 0) return;

        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords.length;

        if (totalCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }

        const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
            (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
            this.#sheet.elements.body.tbody.head.offsetHeight;

        const viewHeight = this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0;
        const rawTotalVirtualHeight = Math.max(totalCount * rowHeight - (viewHeight - fixedHeight - rowHeight) - rowHeight, 0);

        const MAX_BROWSER_HEIGHT = 15000000;
        const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

        let scaleFactor = 1;
        let totalVirtualHeight = rawTotalVirtualHeight;

        if (useScaling) {
            scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            totalVirtualHeight = MAX_BROWSER_HEIGHT;
        }


        this.#sheet.elements.scrollHolder.style.height = `${totalVirtualHeight}px`;

        const actualScrollTop = useScaling ? (scrollTop / scaleFactor) : scrollTop;

        const maxStartIndex = Math.max(0, totalCount - 1);
        const clampedScrollTop = Math.min(actualScrollTop, rawTotalVirtualHeight);
        const startIndex = Math.max(0, Math.min(Math.floor(clampedScrollTop / rowHeight), maxStartIndex));

        //trace.log(clampedScrollTop % rowHeight, rowHeight);

        /*
         * FIX: Use GPU-accelerated transform3d instead of 'top' positioning.
         * On mobile devices (iOS Safari), direct 'top' updates trigger expensive
         * layout reflows and cause severe scrolling lag during inertia touch scrolls.
         * translate3d forces hardware compositing for buttery-smooth performance.
         */
        this.#sheet.elements.left.tbody.body.style.transform =
            this.#sheet.elements.body.tbody.body.style.transform =
                this.#sheet.elements.right.tbody.body.style.transform = `translate3d(0px, -${clampedScrollTop % rowHeight}px, 0px)`;


        const firstTr = this.#element.firstTr;
        const currentStartIndex = firstTr && firstTr.dataset.row !== undefined ? parseInt(firstTr.dataset.row, 10) : -1;

        if (!force && currentStartIndex === startIndex) {
            return;
        }

        [
            this.#sheet.elements.left.tbody.body,
            this.#sheet.elements.body.tbody.body,
            this.#sheet.elements.right.tbody.body
        ].forEach(($tbody, tbodyIdx) => {
            if (!$tbody) return;

            const rows = $tbody.querySelectorAll('tbody.body tr');

            rows.forEach(($tr, index) => {
                const dataIndex = startIndex + Math.floor(index / this.#sheet.template.length);

                if (dataIndex >= totalCount) {
                    $tr.style.display = 'none';
                    $tr.dataset.matrixRow = null;
                    $tr.dataset.row = null;
                    $tr.dataset.index = null;
                    return;
                }

                const record = viewRecords[dataIndex];//this.#sheet.view.getArray(dataIndex);

                if (!record) {
                    $tr.style.display = 'none';
                    return;
                }

                const rowid = record.m._[NINE_TABLE.META.INDEX.ROWID];

                $tr.style.display = '';

                this.#bindRowData($tr, record, rowid, dataIndex);
            });
        });

        this.#sheet.selection.refresh();
    };


    #handleGroupedScroll = (scrollTop, force = false) => {

        const allRenderItems = this.#sheet.view.getArray() || [];
        const totalVirtualCount = allRenderItems.length;

        if (totalVirtualCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }


        const bodyContent = this.#sheet.querySelector('.ng-sheet-body .ng-sheet-body-content');
        const templateLength = this.#sheet.template.length;

        const getItemHeight = (item) => {
            if (item.type === 'group') {
                const depth = item.record[GROUP_IDX.DEPTH] || 0;
                const groupHeight = this.#sheet.template.height[depth] || this.#sheet.template.height / templateLength;
                return groupHeight;
            } else {
                let dataRowsHeight = 0;
                const templateLength = this.#sheet.templateLength || 1;

                let groupHeightsTotal = 0;
                for(let i = 0; i < templateLength - 1; i++) {
                    groupHeightsTotal += this.#sheet.template.heights[i] || 0;
                }
                dataRowsHeight = this.#sheet.template.height - groupHeightsTotal;

                return dataRowsHeight > 0 ? dataRowsHeight : this.#sheet.template.height;
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

        const visibleRowsCount = Math.ceil(viewportClientHeight / (this.#sheet.template.height / templateLength));
        const dynamicBuffer = (this.#sheet.grouping.columns?.length || 1) * 15;
        const targetStart = startIndex;
        const targetEnd = Math.min(totalVirtualCount, startIndex + visibleRowsCount + dynamicBuffer);
        const renderedItems = allRenderItems.slice(targetStart, targetEnd);

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
trace.log(item.type, isTrGroup);
                    if (item.type === 'group') {
                        if (isTrGroup) {
                            const depth = item.record[GROUP_IDX.DEPTH];
                            trace.log(subIdx, itemIndex, depth);
                            if (subIdx === depth) {
                                tr.style.display = '';
                                this.#bindGroupRowData(tr, allRenderItems, item, virtualIndex);
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


                            //if (item) {
                                const rowid = item.record.m._[NINE_TABLE.META.INDEX.ROWID];
                                this.#bindRowData(tr, item.record, rowid, virtualIndex);
                            //}

                        }
                    }
                });
            }
        });

        this.#sheet.selection.refresh();
    };

    #bindGroupRowData = ($tr, allRenderItems, groupRecord, virtualIndex) => {
        const templateLength = this.#sheet.templateLength || 1;
        const subRowIndex = parseInt($tr.dataset.subrow, 10) || 0;
        const matrixRow = (virtualIndex * templateLength) + subRowIndex;

        const indices = groupRecord[GROUP_IDX.CHILDREN];
        const allRecords = this.#host.data.getArray();
        const childrenRecords = indices ? indices.map(idx => allRecords[idx]).filter(Boolean) : [];


        $tr.dataset.virtualIndex = virtualIndex;
        $tr.dataset.row = '';
        $tr.dataset.matrixRow = matrixRow;
        $tr.data = childrenRecords;//groupRecord;
        $tr.dataset.groupId = groupRecord[GROUP_IDX.ID];


        Array.from($tr.cells).forEach(($cell) => {

            $cell.dataset.row = virtualIndex;

            const customComp = Array.from($cell.children).find($el =>
                $el.tagName.toLowerCase().startsWith('cell-') || typeof $el.refresh === 'function'
            );


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

        this.#isGrouped = this.#sheet.sourceTable.querySelector("tbody tr[grouping='true']") ? true : false;

        //this.#cachedTemplateHeight = null;
        this.#containerTemplates.clear();

        this.#element = {
            scrollTables: this.#sheet.querySelectorAll('.ng-sheet-body table'),
            firstTr: this.#sheet.querySelector('.ng-sheet-body .ng-container-body tbody.body tr'),
        };

        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (!container) return;

            const tableEl = container.querySelector('table');
            if (!tableEl) return;

            const tbody = tableEl.querySelector('tbody.body');
            if (!tbody) return;

            const trs = Array.from(tbody.querySelectorAll('tr'));
            const templateTrs = trs.map(tr => tr.cloneNode(true));
            this.#containerTemplates.set(selector, templateTrs);
        });

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');

        if (bodyViewport) {
            this.#sheetHeight = bodyViewport.clientHeight;
            //trace.log("this.#sheetHeight", this.#sheetHeight, this.#sheet);

            this.#measureAndCacheHeight();
            this.#renderAllContainers();
            this.#handleScroll(bodyViewport.scrollTop, true);

            bodyViewport.addEventListener('scroll', (e) => {

                this.#sheet.querySelectorAll("cell-combo-panel").forEach($el => {
                    $el.classList.remove('active');
                });


                if (this.#isProgrammaticScroll) return;

                const rowHeight = this.#sheet.template.height || 0;
                const totalCount = this.#sheet.view.getArray()?.length || 0;
                const rawTotalVirtualHeight = totalCount * rowHeight;

                if (rawTotalVirtualHeight <= bodyViewport.clientHeight) {
                    return;
                }

                this.#handleScroll(bodyViewport.scrollTop);

                this.#sheet.querySelector('nine-table-vscrollbar').refresh();

            }, { passive: true });
        }
    };

    scrollToDataRow(dataRow, align = 'top', onRendered) {

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');

        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords?.length || 0;

        const targetRow = Math.max(0, Math.min(dataRow, totalCount - 1));
        let targetScrollTop = 0;

        if (this.#isGrouped) {
            const maxScrollTop = Math.max(bodyViewport.scrollHeight - bodyViewport.clientHeight, 1);
            // targetRow가 전체 totalCount에서 차지하는 비율(ratio)만큼 실제 스크롤 최대 높이에 곱해줌
            const ratio = targetRow / Math.max(totalCount - 1, 1);
            targetScrollTop = ratio * maxScrollTop;
        } else {

            const rowHeight = this.#sheet.template.height;
            const rawTargetScrollTop = targetRow * rowHeight;

            const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
                (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
                this.#sheet.elements.body.tbody.head.offsetHeight;

            const viewHeight = bodyViewport.offsetHeight || 0;
            const rawTotalVirtualHeight = Math.max(totalCount * rowHeight + fixedHeight - viewHeight, 0);

            const MAX_BROWSER_HEIGHT = 15000000;
            const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

            let scaleFactor = 1;
            if (useScaling) {
                scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            }

            targetScrollTop = rawTargetScrollTop * scaleFactor;
        }

        this.#isProgrammaticScroll = true;
        bodyViewport.scrollTop = targetScrollTop;
        this.#handleScroll(targetScrollTop);

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
        this.#updateRowCount();
        return;
        if (!this.#sheet.classList.contains('active')) return;

        if (!this.#sheet.sourceTable) return;

        const trTemplates = this.#sheet.sourceTable?.querySelectorAll('tbody.body tr');

        const $tbody = this.#sheet.querySelector('.ng-container-body tbody.body');
        if (!$tbody) return;

        $tbody?.querySelectorAll('tr')?.forEach(tr => tr.remove());

        const fragment = document.createDocumentFragment();
        trTemplates.forEach($tr => fragment.appendChild($tr.cloneNode(true)));
        $tbody?.appendChild(fragment);

        const renderedTrs = $tbody.querySelectorAll('tr');

        renderedTrs.forEach(tr => tr.remove());

        this.#updateRowCount();
    };

    #updateRowCount = () => {

        if (this.#sheetHeight > 0 && this.#sheet.template.height > 0) {
            const visibleRows = Math.ceil(this.#sheetHeight / this.#sheet.template.height);

            let dynamicBuffer = this.#BUFFER_ROW_COUNT;
            if (this.#isGrouped && this.#sheet.grouping) {
                const groupDepth = this.#sheet.grouping.columns?.length || 1;
                dynamicBuffer += (groupDepth * 15);
            }

            this.#cachedRowCount = visibleRows + dynamicBuffer;
        }
    };

    #renderAllContainers = () => {

        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (container && container.querySelector('tbody')) {
                this.#renderRows(container);
            }
        });

        this.#syncRowHeights();
    };

    #renderRows = (container) => {

        let targetFixedType = null;
        if (container.classList.contains('ng-container-left')) targetFixedType = 'left';
        else if (container.classList.contains('ng-container-right')) targetFixedType = 'right';

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

        const targetTbody = container.querySelector('tbody.body');

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
                    //trace.log("this.#sheetHeight", this.#sheetHeight);
                    this.#updateRowCount();

                    if (this.#sheet.template.height !== null) {
                        this.#renderAllContainers();
                        this.refresh();
                    }
                }
            }
        });

        this.#resizeObserver.observe(this.#sheet);
    };
}