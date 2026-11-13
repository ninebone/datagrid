import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";

export class SheetAPI {
    #sheet;
    #host;
    #elements;

    constructor(sheet) {
        this.#sheet = sheet;
        this.#host = sheet.getRootNode().host;

        //this.#resetElements();
    }

    #resetElements = () => {
        this.#elements = {
            viewport: this.#sheet.querySelector('.ng-sheet-body'),
            thead: this.#sheet.querySelector('thead'),
            tbody: this.#sheet.querySelector('tbody.body'),
            tfoot: this.#sheet.querySelector('tfoot'),
            thead_foot: this.#sheet.querySelector('thead.foot'),
            tbody_head: this.#sheet.querySelector('tbody.head'),
            tbody_foot: this.#sheet.querySelector('tbody.foot'),
        }
    };

    get elem() {

        if (this.#elements?.tbody_foot) return this.#elements;

        this.#elements = {
            viewport: this.#sheet.querySelector('.ng-sheet-body'),
            thead: this.#sheet.querySelector('thead'),
            tbody: this.#sheet.querySelector('tbody.body'),
            tfoot: this.#sheet.querySelector('tfoot'),
            thead_foot: this.#sheet.querySelector('thead.foot'),
            tbody_head: this.#sheet.querySelector('tbody.head'),
            tbody_foot: this.#sheet.querySelector('tbody.foot'),
        }

        return this.#elements;
    }

    get viewport() {
        const self = this;

        return {
            get tr() {
                return {
                    get length() {
                        const $tr = self.#sheet.querySelector('.ng-container-body tbody.body tr:last-child');
                        if (!$tr) return null;

                        return Math.ceil($tr.sectionRowIndex / self.#sheet.template.length);
                    },
                    count() {
                        return this.length;
                    }
                };
            },
            get group() {
                return {
                    get length() {
                        return self.#sheet.source.table.querySelectorAll("tbody tr[group-by]").length;
                    },
                    count() {
                        return this.length;
                    }
                };
            },
            get fixedHeight() {
                const getHeight = () => {
                    return (self.elem.thead?.offsetHeight || 0) +
                        (self.elem.thead_foot?.offsetHeight || 0) +
                        (self.elem.tfoot?.offsetHeight || 0) +
                        (self.elem.tbody_head?.offsetHeight || 0);
                }

                let h = getHeight();

                if (h === 0) {
                    self.#resetElements();
                    h = getHeight();
                }

                return h;
            },
            get height() {
                return self.elem.viewport.offsetHeight;
            },
            get innerHeight() {
                const viewPortHeight = self.elem.viewport.clientHeight;
                return viewPortHeight - this.fixedHeight; // 💡 동일 객체 내부이므로 this.fixedHeight 사용
            },
            get outerHeight() {
                return self.elem.viewport.offsetHeight;
            }
        };
    };





    col = {
        // 1. 특정 컬럼의 너비 설정 (ColResizer 활용)
        setWidth: (colIndex, width, containerType = null) => {
            const targetCols = Array.from(this.#sheet.querySelectorAll(`table colgroup col[data-col="${colIndex}"]`));
            targetCols.forEach(col => {
                col.setAttribute('width', width);
                col.style.width = `${width}px`;
            });

        },

        // 2. 특정 컬럼의 현재 너비 가져오기
        getWidth: (colIndex) => {
            const colEl = this.#sheet.querySelector(`table colgroup col[data-col="${colIndex}"]`);
            if (!colEl) return 0;
            return parseInt(colEl.getAttribute('width') || colEl.style.width, 10) || 0;
        },
        measureAutoFitColumnWidth: (cell, tbodyCell) => {

            const fieldIdx = this.#host.fields.get().indexOf(tbodyCell.dataset.bind);
            const computedStyle = window.getComputedStyle(tbodyCell);
            const font = computedStyle.font || '12px sans-serif';
            let maxTextWidth = 32;

            this.#sheet.view.getArray().forEach((record, idx) => {
                const val = String(tbodyCell.dataset.expr ? this.#host.exprEngine.evaluate(tbodyCell.dataset.expr, record, idx) : record.v[fieldIdx] ?? "").trim();
                const size = nine.measureTextSize(val, font);
                if (size.width && size.width > maxTextWidth) {
                    maxTextWidth = size.width;
                }
            });

            return maxTextWidth;
        },
        // 3. 특정 컬럼 자동 맞춤 (아까 분리한 measureAutoFitColumnWidth 연동)
        autoFit: (colIndex) => {
            const cell = this.#sheet.querySelector(`thead th[data-col="${colIndex}"]`);
            const tbodyCell = this.#sheet.querySelector(`tbody.body [data-col="${colIndex}"]`);

            if (!cell || !tbodyCell) return;

            this.#host.execute(() => {
                const calculatedWidth = this.col.measureAutoFitColumnWidth(cell, tbodyCell);
                if (calculatedWidth !== null) {
                    this.col.setWidth(colIndex, calculatedWidth);
                }
            });
        },

        // 4. 컬럼 표시/숨김 처리
        setVisible: (colIndex, isVisible) => {
            const targets = this.#sheet.querySelectorAll(`table colgroup col[data-col="${colIndex}"], th[data-col="${colIndex}"], td[data-col="${colIndex}"]`);
            targets.forEach(el => {
                el.style.display = isVisible ? '' : 'none';
            });
            this.#sheet.rowManager?.refresh();
        }
    };

    row = {
        at: () => {
            if (this.#sheet.selection.minRow < 0) return -1;
            return Math.floor(this.#sheet.selection.minRow / this.#sheet.template.length);
        },
        focus: async (index, callback) => {
            // 1. 화면에 안 보이면 moveTo 완료를 기다림
            if (!this.#sheet.row.isVisible(index)) {
                await new Promise((resolve) => {
                    this.#sheet.row.moveTo(index, () => {
                        resolve();
                    });
                });
            } else {
                // 2. 이미 보이더라도 브라우저 렌더링 큐에 한 템포 양보 (requestAnimationFrame)
                await new Promise((resolve) => requestAnimationFrame(resolve));
            }

            // 3. 렌더링이 완전히 안정화된 시점에 DOM 조회 및 선택 처리
            const $trs = this.#sheet.querySelectorAll(`tbody.body tr[data-index="${index}"]`);
            const matrixRows = Array.from($trs, $tr => parseInt($tr.dataset.matrixRow, 10)).filter(n => !isNaN(n));

            const cols = [];
            $trs.forEach($tr => {
                $tr.querySelectorAll('td, th').forEach($cell => {
                    const col = parseInt($cell.dataset.col, 10);
                    if (col != 0) cols.push(parseInt($cell.dataset.col, 10));
                });
            });

            if (matrixRows.length === 0 || cols.length === 0) return;

            const result = this.#sheet.selection.setRange(Math.min(...matrixRows), Math.min(...cols), Math.max(...matrixRows), Math.max(...cols));

            if (typeof callback === 'function') {
                callback();
            }

            return result;
        },
        isVisible: (index) => {

            const $sheetBody = this.#sheet.querySelector('.ng-sheet-body');

            const $trs = $sheetBody.querySelectorAll(`.ng-container-body tbody.body tr[data-index="${index}"]`);
            if (!$trs || $trs.length === 0) return false;

            const viewportRect = $sheetBody.getBoundingClientRect();
            const theadHeight = $sheetBody.querySelector('thead')?.offsetHeight || 0;
            const tfootHeight = $sheetBody.querySelector('tfoot')?.offsetHeight || 0;

            const viewportTop = viewportRect.top + theadHeight;
            const viewportBottom = viewportRect.bottom - tfootHeight;

            let isVisible = true;

            for (const $tr of $trs) {
                const trRect = $tr.getBoundingClientRect();

                const isAbove = trRect.top < viewportTop;
                const isBelow = trRect.bottom > viewportBottom;

                if (isAbove || isBelow) {
                    isVisible = false;
                    break;
                }
            }

            return isVisible;
        },
        add: (dataSource, updateState) => {
            return this.#host.data.add(dataSource, updateState);
        },
        moveTo: (index, callback) => {
            if (this.#sheet.row.isVisible(index)) {
                if (typeof callback === 'function') callback();
            } else {
                this.#sheet.scrollTo(index, () => {
                    if (typeof callback === 'function') callback();
                });
            }
        },
        insert: (index, dataSource, updateState = true) => {

            const currentJson = this.#sheet.view.get(index);
            const rowid = currentJson.m._[NINE_TABLE.META.INDEX.ROWID];

            const toRowid = this.#host.data.insert(rowid, dataSource, updateState);
            const records = this.#sheet.view.getArray();

            const targetIndex = records.findIndex(record => {
                if (!record || !record.m || !record.m._) return false;
                return record.m._[NINE_TABLE.META.INDEX.ROWID] === toRowid; // 타입 차이 방지를 위해 == 사용
            });

            return targetIndex;
        },
        remove: (index) => {

            const currentJson = this.#sheet.view.get(index);
            const rowid = currentJson.m._[NINE_TABLE.META.INDEX.ROWID];

            this.#host.data.remove(rowid);
        },
    };
}