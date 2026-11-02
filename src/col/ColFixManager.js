// ui/col/ColFixManager.js
import { trace } from "@nopeer";
import { TableCompiler } from "@/layout/core/TableCompiler.js";

export class ColFixManager {
    #sheet;

    constructor(sheet) {
        this.#sheet = sheet;
    }

    /**
     * 🎯 현재 클릭된 셀의 고정 구역('left', 'right', 'none') 탐색
     */
    getFixState(targetCell, table) {
        if (!targetCell || !table) return 'none';

        // 🎯 [보정] 3분할 레이어 구조 내부의 컨테이너를 안전하게 탐색
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

    /**
     * 🎯 상하 멀티 헤더 경계선 일치 여부 검사 (Fix Column 가부 판별)
     */
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

                // 목표 경계선이 특정 셀의 중간을 관통하는 경우 (Fix 불가능)
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

    /**
     * 🎯 [인스턴스 메서드] 배치 범위 고정 및 해제 처리
     * - 원본(`sourceTable`)의 구조(fixed 속성)를 직접 조작하므로 decompile은 절대 호출하지 않음!
     */
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
            // 🎯 Batch Fix: 0번부터 targetColIndex까지의 모든 <col>과 셀에 fixed 속성 일괄 부여
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

                        // 현재 클릭된 셀의 수직 범위와 겹치는 머지 셀이 있는지 검사
                        const isVerticalOverlap = !(trIndex + rSpan - 1 < cell.closest('tr').sectionRowIndex || trIndex > (cell.closest('tr').sectionRowIndex + rSpan - 1));

                        // 만약 기존에 고정(fixed)되어 있으면서 현재 클릭한 타겟 라인과 걸쳐있는 머지 셀이라면 범위를 확장합니다.
                        const isHorizontalOverlap = !(cEnd < baseCol || cCol > targetColIndex);

                        if (isHorizontalOverlap) {
                            minBaseCol = Math.min(minBaseCol, cCol);
                            maxEndCol = Math.max(maxEndCol, cEnd);
                        }
                    });
                });
            });

            // 🎯 2단계: 계산된 실제 머지 블록의 시작점(minBaseCol) 이상인 모든 <col> 속성 해제
            cols.forEach(col => {
                const idx = parseInt(col.getAttribute('data-col'), 10);
                if (idx >= minBaseCol) {
                    col.removeAttribute('fixed');
                }
            });

            // 🎯 3단계: left 구역의 고정 연속성(체인) 검증
            let isBroken = false;
            cols.forEach(col => {
                if (isBroken) {
                    col.removeAttribute('fixed');
                } else if (!col.getAttribute('fixed')) {
                    isBroken = true;
                }
            });

            // 🎯 4단계: <col>들의 최종 fixed 상태를 기준으로 모든 thead, tbody, tfoot 셀(th, td)의 fixed 속성 완벽 동기화
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

        trace.log(this.#sheet.sourceTable);

        // 🎯 recompileAndRefresh 단 1회 호출로 원본 정렬 및 뷰포트 재생성 완결
        this.#sheet.recompileAndRefresh?.();
    }
}