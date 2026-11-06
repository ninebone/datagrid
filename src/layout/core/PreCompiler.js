import { trace } from "@nopeer";
import { TableCompiler } from "@/layout/core/TableCompiler.js";

export const COLLAPSED_WIDTH = 16;

export class PreCompiler {

    static initializeTable(host, tbl) {

        PreCompiler.#ensureColgroup(tbl);
        PreCompiler.#ensureThead(tbl);
        PreCompiler.#ensureSectionTbodys(tbl);

        PreCompiler.#ensureRowIndicator(tbl);

        PreCompiler.#normalizeColAttributes(tbl);

        TableCompiler.resetColIndex(tbl, tbl.querySelectorAll('thead tr'));
        TableCompiler.resetColIndex(tbl, tbl.querySelectorAll('tbody.body tr[grouping="true"]'));
        TableCompiler.resetColIndex(tbl, tbl.querySelectorAll('tbody.body tr:not([grouping="true"])'));
        TableCompiler.resetColIndex(tbl, tbl.querySelectorAll('tfoot tr'));

        PreCompiler.#createColIndicator(tbl);

        PreCompiler.#normalizeCollapsibleAttributes(tbl);

        PreCompiler.#generateCell(host, tbl);

        PreCompiler.#initColExpanders(tbl);

        PreCompiler.#initFilterButtons(host, tbl);

        PreCompiler.#applyInitialCellWidths(tbl);

        return tbl;
    }

    static #createColIndicator(tbl) {
        const thead = tbl.querySelector('thead');
        if (!thead || thead.querySelector('.col-indicator-rowgroup')) return;

        const tdTmpl = `<th data-col="@col" class="col-indicator" scope="col"></th>`;

        const tr = thead.insertRow(0);
        tr.setAttribute('role', 'row');
        tr.classList.add('col-indicator-rowgroup');
        tr.classList.add('collapse');

        const firstRow = tbl.querySelector('tbody tr');
        if (!firstRow) return;

        let cnt = 0;
        firstRow.querySelectorAll('th, td').forEach(td => {
            if (!td.classList.contains('dummy')) {
                const colSpan = td.colSpan || 1;
                for (let i = 0; i < colSpan; i++) {
                    const html = tdTmpl.replace('@col', cnt).replace('@text', PreCompiler.#numToExcelCol(cnt++));
                    tr.insertAdjacentHTML('beforeend', html);
                }
            }
        });

        const cols = Array.from(tbl.querySelectorAll('colgroup col'));
        tr.querySelectorAll('.col-indicator').forEach((el, i) => {
            const background = cols[i].getAttribute('background');
            if (background) {
                el.style.background = background;
            }
        });
    }

    static #numToExcelCol(num) {
        let text = '';
        for (let n = num; n >= 0; n = Math.floor(n / 26) - 1) {
            text = String.fromCharCode(65 + (n % 26)) + text;
        }
        return text;
    }

    static #ensureSectionTbodys(tbl) {
        let tbody = tbl.querySelector('tbody:not(.head):not(.foot)');

        if (!tbody) return;

        tbody.classList.add('body');

        if (!tbl.querySelector('tbody.head')) {
            const headTbody = document.createElement('tbody');
            headTbody.classList.add('head');
            tbody.before(headTbody);
        }

        if (!tbl.querySelector('tbody.foot')) {
            const footTbody = document.createElement('tbody');
            footTbody.classList.add('foot');
            tbody.after(footTbody);
        }
    }

    static #ensureColgroup(tbl) {
        let colgroup = tbl.querySelector('colgroup');
        if (!colgroup) {
            colgroup = document.createElement('colgroup');
            tbl.prepend(colgroup);
        }

        if (colgroup.querySelectorAll('col').length === 0) {
            const firstRow = tbl.querySelector('tbody tr');
            let colCount = 1;
            if (firstRow) {
                colCount = Array.from(firstRow.querySelectorAll('th, td')).reduce((sum, cell) => {
                    return sum + (parseInt(cell.getAttribute('colspan') || cell.colSpan, 10) || 1);
                }, 0);
            }
            colCount = Math.max(colCount, 1);

            for (let i = 0; i < colCount; i++) {
                const col = document.createElement('col');
                colgroup.appendChild(col);
            }
        }
    }

    static #normalizeColAttributes(tbl) {
        const cols = Array.from(tbl.querySelectorAll('colgroup col'));
        if (cols.length === 0) return;

        const containerWidth = tbl.clientWidth || 0;
        const defaultWidth = Math.max(Math.floor(containerWidth / cols.length), 100);

        cols.forEach((col, i) => {

            if (!col.hasAttribute('data-col')) {
                col.setAttribute('data-col', i);
            }

            const width = col.getAttribute('width') || parseInt(col.style.width, 10) || defaultWidth;
            col.setAttribute('width', width);

            const widthVal = String(width).includes('px') ? width : `${width}px`;
            col.style.width = widthVal;
        });
    }

    static #ensureThead(tbl) {
        if (tbl.querySelector('thead')) return;

        const thead = document.createElement('thead');
        const colgroup = tbl.querySelector('colgroup');

        if (colgroup) {
            colgroup.after(thead);
        } else {
            tbl.prepend(thead);
        }
    }

    static #normalizeCollapsibleAttributes(tbl) {
        const headers = tbl.querySelectorAll('thead th, thead td');
        headers.forEach(cell => {
            const isCollapsed = cell.getAttribute('collapsed') === 'true';
            if (isCollapsed && cell.getAttribute('collapsible') !== 'true') {
                cell.setAttribute('collapsible', 'true');
            }
        });
    }

    static #generateCell(host, $tbl) {

        const targetAttributes = ['data-bind', 'data-expr', 'type'];
        let autoIdCounter = 0;

        $tbl.querySelectorAll('tbody th, tbody td').forEach($cell => {
            const cellType = $cell.getAttribute('cell-type') || "renderer";
            const tagName = `cell-${cellType}`;

            const $datalist = $cell.querySelector("datalist");

            if ($datalist) {
                let l = [];
                $datalist.querySelectorAll('option').forEach($option => {
                    l.push({
                        k: $option.getAttribute("k"),
                        v: $option.getAttribute("v"),
                        value: $option.getAttribute("value"),
                    });
                });

                const uniqueFuncName = `__ds_${Date.now()}_${++autoIdCounter}`;

                if (host) {
                    host[uniqueFuncName] = () => l;
                }

                $cell.setAttribute("data-source", `host.${uniqueFuncName}()`);

                $datalist.remove();
            }

            const expr = $cell.dataset.expr;
            if (expr) {
                $cell.setAttribute('data-expr', host.exprEngine.precompile(expr));
            }

            Array.from($cell.attributes).forEach(attr => {
                if (['data-bind', 'data-expr', 'cell-type', 'validator'].includes(attr.name)) return;
                if (attr.value.includes("data.") || attr.value.includes("host.")) {
                    $cell.setAttribute(attr.name, host.exprEngine.precompile(attr.value));
                }
            });

            const innerAttrs = targetAttributes
                .filter(attr => $cell.hasAttribute(attr))
                .map(attr => `${attr}="${$cell.getAttribute(attr)}"`);

            $cell.innerHTML = `<${tagName} ${innerAttrs.join(' ')}></${tagName}>`;
            $cell.setAttribute('tabindex', '0');
        });

        $tbl.querySelectorAll('thead th, thead td, tfoot th, tfoot td').forEach($cell => {
            const cellType = $cell.getAttribute('cell-type');
            if (cellType) {
                const originalContent = $cell.innerHTML;
                const tagName = `cell-${cellType}`;
                const innerAttrs = targetAttributes
                    .filter(attr => $cell.hasAttribute(attr))
                    .map(attr => `${attr}="${$cell.getAttribute(attr)}"`);

                $cell.innerHTML = `<${tagName} ${innerAttrs.join(' ')} content="${originalContent}"></${tagName}>`;
            }
        });
    }

    static #initFilterButtons(host, tbl) {
        const hostFilter = host.getAttribute('filtering') === 'true';
        const tableFilter = tbl.getAttribute('filtering') === 'true';

        tbl.querySelectorAll('thead tr:not(.col-indicator-rowgroup) th, thead tr:not(.col-indicator-rowgroup) td').forEach(cell => {
            const finalFiltering = cell.getAttribute('filtering') === 'true' || tableFilter || hostFilter;

            cell.setAttribute('filtering', finalFiltering ? 'true' : 'false');

            if (finalFiltering) {
                cell.appendChild(document.createElement('nine-table-filter-button'));
            }
        });
    }

    static #initColExpanders(tbl) {

        tbl.querySelectorAll('thead th, thead td').forEach(cell => {
            const isCollapsible = cell.getAttribute('collapsible') === 'true' || cell.getAttribute('expandable') === 'true';
            if (!isCollapsible) return;

            const colIndex = parseInt(cell.dataset.col, 10);
            const colSpan = cell.colSpan || 1;
            const col = tbl.querySelector(`colgroup col[data-col="${colIndex}"]`);

            const currentWidth = col ? (parseInt(col.getAttribute('width'), 10) || 100) : 100;

            if (!cell.dataset.expandWidth || parseInt(cell.dataset.expandWidth, 10) <= COLLAPSED_WIDTH) {
                cell.dataset.expandWidth = String(currentWidth > COLLAPSED_WIDTH ? currentWidth : 100);
            }

            let expandBtn = cell.querySelector('nine-table-col-expand');
            if (!expandBtn) {
                expandBtn = document.createElement('nine-table-col-expand');
                cell.insertBefore(expandBtn, cell.firstChild);
            }

            const isCollapsed = cell.getAttribute('collapsed') === 'true';

            if (isCollapsed) {
                expandBtn.classList.add('collapsed');
                expandBtn.classList.remove('expand');
                expandBtn.setAttribute('collapsed', 'true');
                cell.style.color = 'transparent';

                const targetWidth = Math.max(10, Math.floor(COLLAPSED_WIDTH / colSpan));
                if (!isNaN(colIndex)) {
                    for (let i = 0; i < colSpan; i++) {
                        const targetCol = tbl.querySelector(`colgroup col[data-col="${colIndex + i}"]`);
                        if (targetCol) {
                            targetCol.setAttribute('width', targetWidth);
                            targetCol.style.width = `${targetWidth}px`;
                        }
                    }
                }
            } else {
                expandBtn.classList.remove('collapsed');
                expandBtn.classList.add('expand');
                expandBtn.setAttribute('collapsed', 'false');
                cell.style.color = '';
            }
        });
    }

    static #ensureRowIndicator(tbl, host) {

        const w = tbl.getAttribute("row-indicator") === 'true' ? 48 : 4;

        const colgroup = tbl.querySelector('colgroup');


        const col = document.createElement('col');
        //col.className = 'row-indicator-col';
        col.setAttribute('fixed', 'left');
        col.setAttribute('width', w);
        col.style.width = `${w}px`;
        colgroup.prepend(col);


        tbl.querySelectorAll('thead, tbody, tfoot').forEach(section => {
            const rows = Array.from(section.querySelectorAll('tr'));
            if (rows.length === 0) return;

            const firstTr = rows[0];

            const indicatorCell = document.createElement('th');
            indicatorCell.className = 'row-indicator';
            indicatorCell.setAttribute('cell-type', 'row-indicator');

            if (rows.length > 1) {
                indicatorCell.rowSpan = rows.length;
            }

            firstTr.insertBefore(indicatorCell, firstTr.firstElementChild);
        });
    }

    static #applyInitialCellWidths(tbl) {

        tbl.querySelectorAll('th[data-col], td[data-col]').forEach(cell => {

            const startColIdx = parseInt(cell.getAttribute('data-col'), 10);
            if (isNaN(startColIdx)) return;


            const colSpan = parseInt(cell.getAttribute('colspan') || cell.colSpan, 10) || 1;
            let totalWidth = 0;


            for (let i = 0; i < colSpan; i++) {
                const targetIdx = startColIdx + i;
                const col = tbl.querySelector(`colgroup col[data-col="${targetIdx}"]`);
                if (col) {
                    totalWidth += parseInt(col.getAttribute('width'), 10) || 100;
                }
            }

            if (totalWidth > 0) {
                const widthVal = `${totalWidth}px`;
                //cell.style.width = widthVal;
                //cell.style.minWidth = widthVal;
                //cell.style.maxWidth = widthVal;
            }
        });
    }
}
