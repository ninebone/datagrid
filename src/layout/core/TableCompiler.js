import { trace } from "@nopeer";

export const COLLAPSED_WIDTH = 16;

export class TableCompiler {

    static compile($srcTable) {

        const $table = $srcTable.cloneNode(true);

        // 1. 헤더 컴파일
        TableCompiler.resetColIndex($table, $table.querySelectorAll('thead tr'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr[grouping="true"]'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr:not([grouping="true"])'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tfoot tr'));

        // 4. colgroup과 인덱스/fixed 속성 동기화
        TableCompiler.#syncColAttributes($table);

        /**
        setTimeout(() => {
            console.log("DEBUG------------------+++++++", $table);

            const templateHeights = TableCompiler.#measureTemplateHeights($table);
            $table.__templateRowHeights = templateHeights;
            $table.__cachedTemplateHeight = templateHeights.reduce((sum, h) => sum + h, 0);

            console.log("DEBUG------------------", $table.__templateRowHeights, $table.__cachedTemplateHeight);
        }); */

        return $table;
    }

    static recompile($table) {

        /** 너비조정은 필요없을듯 */
        /**
        const cols = Array.from($table.querySelectorAll('colgroup col'));
        cols.forEach((col, idx) => {
            //trace.log(col.cloneNode(true));

            col.setAttribute('data-col', idx);

            let w = col.getAttribute('width');
            if (!w || isNaN(parseFloat(w))) {
                w = parseFloat(col.style.width);
            }
            if (w && !isNaN(parseFloat(w))) {
                const numericWidth = Math.round(parseFloat(w));
                //trace.log(w, numericWidth);

                col.setAttribute('width', numericWidth);
                col.style.width = `${numericWidth}px`;
            }
        }); */

        TableCompiler.resetColIndex($table, $table.querySelectorAll('thead tr'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr[grouping="true"]'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr:not([grouping="true"])'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tfoot tr'));

        TableCompiler.#syncColAttributes($table);



        return $table;
    }

    static #measureTemplateHeights($table) {
        const trTemplates = $table.querySelectorAll('tbody tr');
        if (!trTemplates || trTemplates.length === 0) return [24]; // 방어 코드

        // 1. 화면에 영향을 주지 않는 숨겨진 측정용 임시 컨테이너 생성
        const measureBox = document.createElement('div');
        measureBox.style.cssText = 'position: absolute; visibility: hidden; pointer-events: none; top: -9999px; left: -9999px; width: 1000px;';

        const tempTable = document.createElement('table');
        const tempTbody = document.createElement('tbody');
        tempTbody.className = 'body';

        trTemplates.forEach($tr => {
            trace.log("DEBUG", $tr);
            tempTbody.appendChild($tr.cloneNode(true));
        });
        tempTable.appendChild(tempTbody);
        measureBox.appendChild(tempTable);
        document.body.appendChild(measureBox);

        // 2. 브라우저 레이아웃 엔진을 통해 실제 렌더링 높이 측정
        const heights = [];
        tempTbody.querySelectorAll('tr').forEach($tr => {
            const h = $tr.getBoundingClientRect().height || $tr.offsetHeight;
            heights.push(h > 0 ? h : 24); // 0일 경우 최소 높이 24 보장
        });

        // 3. 측정 완료 후 즉시 DOM에서 제거 (메모리 누수 방지)
        document.body.removeChild(measureBox);

        return heights;
    }

    static #syncColAttributes($table) {

        $table.querySelectorAll('colgroup col').forEach(($col, i) => {
            $col.setAttribute('data-col', i);
            const fixed = $col.getAttribute('fixed');

            $table.querySelectorAll(`[data-col="${i}"]`).forEach($el => {
                fixed ? $el.setAttribute('fixed', fixed) : $el.removeAttribute('fixed');
            });
        });
    }

    static resetColIndex($table, trs) {

        const cols = $table.querySelectorAll('colgroup col');
        const grid = Array.from({ length: trs.length }, () => Array(cols.length).fill(null));

        trs.forEach(($tr, index) => {

            $tr.dataset.subrow = index;

            let colIndex = 0;

            $tr.querySelectorAll('th, td').forEach($cell => {

                while (colIndex < cols.length && grid[index][colIndex] !== null) {
                    colIndex++;
                }

                $cell.dataset.col = colIndex;

                const rowSpan = $cell.rowSpan || 1;
                const colSpan = $cell.colSpan || 1;

                for (let r = 0; r < rowSpan; r++) {
                    for (let c = 0; c < colSpan; c++) {
                        if (index + r < trs.length && colIndex + c < cols.length) {
                            grid[index + r][colIndex + c] = $cell;
                        }
                    }
                }

                colIndex += colSpan;
            });
        });
    }


}