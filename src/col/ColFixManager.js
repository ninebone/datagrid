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
                if (idx <= targetColIndex) {
                    col.setAttribute('fixed', fixType);
                }
            });

            ['thead', 'tbody', 'tfoot'].forEach(group => {
                sourceTable.querySelectorAll(`${group} tr`).forEach(tr => {
                    Array.from(tr.children).forEach(cell => {
                        const cIdx = parseInt(cell.dataset.col, 10);
                        if (!isNaN(cIdx) && cIdx <= targetColIndex) {
                            cell.setAttribute('fixed', fixType);
                        }
                    });
                });
            });

        } else if (action === 'unfix-column') {
            let minBaseCol = baseCol;
            let maxEndCol = baseCol + colSpan - 1;

            ['thead', 'tbody', 'tfoot'].forEach(group => {
                sourceTable.querySelectorAll(`${group} tr`).forEach((tr, rIdx) => {
                    Array.from(tr.children).forEach(cell => {
                        const cCol = parseInt(cell.dataset.col, 10);
                        const cSpan = cell.colSpan || 1;
                        const cEnd = cCol + cSpan - 1;
                        const rSpan = cell.rowSpan || 1;
                        const trIndex = tr.sectionRowIndex ?? rIdx;

                        const isVerticalOverlap = !(trIndex + rSpan - 1 < cell.closest('tr').sectionRowIndex || trIndex > (cell.closest('tr').sectionRowIndex + rSpan - 1));

                        const isHorizontalOverlap = !(cEnd < baseCol || cCol > targetColIndex);

                        if (isHorizontalOverlap) {
                            minBaseCol = Math.min(minBaseCol, cCol);
                            maxEndCol = Math.max(maxEndCol, cEnd);
                        }
                    });
                });
            });

            cols.forEach(col => {
                const idx = parseInt(col.getAttribute('data-col'), 10);
                if (idx >= minBaseCol) {
                    col.removeAttribute('fixed');
                }
            });

            let isBroken = false;
            cols.forEach(col => {
                if (isBroken) {
                    col.removeAttribute('fixed');
                } else if (!col.getAttribute('fixed')) {
                    isBroken = true;
                }
            });

            ['thead', 'tbody', 'tfoot'].forEach(group => {
                sourceTable.querySelectorAll(`${group} tr`).forEach(tr => {
                    Array.from(tr.children).forEach(cell => {
                        const cIdx = parseInt(cell.dataset.col, 10);
                        if (isNaN(cIdx)) return;

                        const correspondingCol = cols.find(c => parseInt(c.getAttribute('data-col'), 10) === cIdx);
                        const isColFixed = correspondingCol?.getAttribute('fixed');

                        if (isColFixed) {
                            cell.setAttribute('fixed', isColFixed);
                        } else {
                            cell.removeAttribute('fixed');
                        }
                    });
                });
            });
        }

        this.#sheet.recompileAndRefresh?.();
    }
}