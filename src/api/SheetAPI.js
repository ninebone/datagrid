import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";

export class SheetAPI {
    #sheet;
    #host;

    constructor(sheet) {
        this.#sheet = sheet;
        this.#host = sheet.getRootNode().host;
    }

    /**
    currentRow = () => {
        let rows = this.currentRows();
        return (rows.length === 0) ? -1 : rows[0];
    }
    currentRows = () => {

        let rows = [];
        this.#shadowRoot.querySelectorAll('nine-table-sheet.active').forEach($sheet => {

            const arr = $sheet.view.getArray($sheet.selection.minRow);
            const rowid = arr.m._[NINE_TABLE.META.INDEX.ROWID];

            //trace.log(this.data.getArray($sheet.selection.minRow));

            rows.push(rowid);
        });

        return rows;
    } */


    row = {
        at: () => {
            return Math.floor(this.#sheet.selection.minRow / this.#sheet.template.length)
        },
        focus: (index) => {
            if (!this.#sheet.row.isVisible(index)) {
                this.#sheet.row.moveTo(index);
            }
            const $trs = this.#sheet.querySelectorAll(`tbody.body tr[data-index="${index}"]`);
            const matrixRows = Array.from($trs, $tr => parseInt($tr.dataset.matrixRow, 10)).filter(n => !isNaN(n));

            // 2. col들도 마찬가지로 배열로 수집 (colSpan 고려)
            const cols = [];
            $trs.forEach($tr => {
                $tr.querySelectorAll('td, th').forEach($cell => {
                    const col = parseInt($cell.dataset.col, 10);
                    if (col != 0) cols.push(parseInt($cell.dataset.col, 10));
                });
            });

            return this.#sheet.selection.setRange(Math.min(...matrixRows), Math.min(...cols), Math.max(...matrixRows), Math.max(...cols));
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

            } else {
                this.#sheet.scrollTo(index, callback);
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