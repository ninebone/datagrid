import { trace } from "@nopeer";

export const COLLAPSED_WIDTH = 16;

export class TableCompiler {

    static compile($srcTable) {

        const $table = $srcTable.cloneNode(true);

        TableCompiler.resetColIndex($table, $table.querySelectorAll('thead tr'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr[grouping="true"]'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr:not([grouping="true"])'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tfoot tr'));

        TableCompiler.#syncColAttributes($table);

        return $table;
    }

    static recompile($table) {


        TableCompiler.resetColIndex($table, $table.querySelectorAll('thead tr'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr[grouping="true"]'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tbody.body tr:not([grouping="true"])'));
        TableCompiler.resetColIndex($table, $table.querySelectorAll('tfoot tr'));

        TableCompiler.#syncColAttributes($table);

        return $table;
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