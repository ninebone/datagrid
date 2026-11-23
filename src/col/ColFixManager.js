// ui/col/ColFixManager.js
import { trace } from "@nopeer";

export class ColFixManager {
    #sheet;

    constructor(sheet) {
        this.#sheet = sheet;
    }

    getFixState(targetCell, table) {
        if (!targetCell || !table) return 'none';

        const container = targetCell.closest('.ng-container-left, .ng-container-right, .ng-container-body');
        if (container?.classList.contains('ng-container-left')) return 'left';
        if (container?.classList.contains('ng-container-right')) return 'right';

        const baseCol = parseInt(targetCell.dataset.col, 10);
        if (!isNaN(baseCol)) {
            const colEl = table.querySelector(`colgroup col[data-col="${baseCol}"]`);
            const fixedAttr = colEl?.getAttribute('fixed');
            if (fixedAttr) return fixedAttr;
        }

        return 'none';
    }

    canFixColumn(targetCell, table) {
        if (!targetCell || targetCell.tagName !== 'TH' || !table) return false;

        const baseCol = parseInt(targetCell.dataset.col, 10);
        const colSpan = targetCell.colSpan || 1;
        if (isNaN(baseCol)) return false;

        const targetBoundaryCol = baseCol + colSpan - 1;
        const theadTrs = Array.from(table.querySelectorAll('thead tr'));

        if (theadTrs.length <= 1) return true;

        for (const tr of theadTrs) {
            const cells = Array.from(tr.querySelectorAll('th, td'));
            let cellBoundaryFound = false;

            for (const cell of cells) {
                const cCol = parseInt(cell.dataset.col, 10);
                const cSpan = cell.colSpan || 1;
                const cEndCol = cCol + cSpan - 1;

                if (cCol <= targetBoundaryCol && targetBoundaryCol < cEndCol) {
                    return false;
                }

                if (cEndCol === targetBoundaryCol) {
                    cellBoundaryFound = true;
                    break;
                }
            }

            if (!cellBoundaryFound) return false;
        }

        return true;
    }

    // ColFixManager.js 의 executeFixToggle 보완
    executeFixToggle(action, targetCell, fixType = 'left') {
        if (!this.#sheet || !targetCell) return;

        const sourceTable = this.#sheet.sourceTable;
        if (!sourceTable) return;

        const baseCol = parseInt(targetCell.dataset.col, 10);
        const colSpan = targetCell.colSpan || 1;
        const targetColIndex = baseCol + colSpan - 1;
        if (isNaN(targetColIndex)) return;

        const colgroup = sourceTable.querySelector('colgroup');
        if (!colgroup) return;

        const cols = Array.from(colgroup.querySelectorAll('col'));

        if (action === 'fix-column') {
            cols.forEach(col => {
                const idx = parseInt(col.getAttribute('data-col'), 10);
                if (fixType === 'left' && idx <= targetColIndex) {
                    col.setAttribute('fixed', 'left');
                } else if (fixType === 'right' && idx >= baseCol) {
                    col.setAttribute('fixed', 'right');
                }
            });
        } else if (action === 'unfix-column') {
            const currentType = this.getFixState(targetCell, sourceTable);

            cols.forEach(col => {
                const idx = parseInt(col.getAttribute('data-col'), 10);
                if (col.getAttribute('fixed') !== currentType) return;

                if (currentType === 'left' && idx >= baseCol) {
                    col.removeAttribute('fixed');
                } else if (currentType === 'right' && idx <= targetColIndex) {
                    col.removeAttribute('fixed');
                }
            });
        }

        // colgroup의 fixed 상태를 thead, tbody, tfoot 셀에 일괄 동기화
        const fixedMap = new Map();
        cols.forEach(col => {
            const idx = parseInt(col.getAttribute('data-col'), 10);
            fixedMap.set(idx, col.getAttribute('fixed') || null);
        });

        ['thead', 'tbody', 'tfoot'].forEach(group => {
            sourceTable.querySelectorAll(`${group} tr`).forEach(tr => {
                Array.from(tr.children).forEach(cell => {
                    const cIdx = parseInt(cell.dataset.col, 10);
                    if (isNaN(cIdx)) return;

                    const state = fixedMap.get(cIdx);
                    if (state) {
                        cell.setAttribute('fixed', state);
                    } else {
                        cell.removeAttribute('fixed');
                    }
                });
            });
        });

        //this.#sheet.recompileAndRefresh?.();
    }
}