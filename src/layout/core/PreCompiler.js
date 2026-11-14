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
        TableCompiler.resetColIndex(tbl, tbl.querySelectorAll('tbody.body tr[group-by]'));
        TableCompiler.resetColIndex(tbl, tbl.querySelectorAll('tbody.body tr:not([group-by])'));
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
            col.style.width = col.style.minWidth = col.style.maxWidth = widthVal;
        });
    }

    static #ensureThead(tbl) {
        // 1. 기본 메인 thead (not .foot) 보장
        let thead = tbl.querySelector('thead:not(.foot)');
        if (!thead) {
            thead = document.createElement('thead');
        }

        const colgroup = tbl.querySelector('colgroup');
        if (colgroup) {
            colgroup.after(thead);
        } else {
            tbl.prepend(thead);
        }

        let theadFoot = tbl.querySelector('thead.foot');
        if (!theadFoot) {
            theadFoot = document.createElement('thead');
            theadFoot.classList.add('foot');
            thead.after(theadFoot); // 메인 thead 바로 뒤에 위치하도록 배치
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

        $tbl.querySelectorAll('tbody th,tbody td,tfoot th, tfoot td').forEach($cell => {

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

            const $tr = $cell.closest('tr');
            const expr = $cell.dataset.expr;
            if (expr) {
                $cell.setAttribute('data-expr', host.exprEngine.precompile(expr, $tr.getAttribute("group-by") ? true : false));
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

        $tbl.querySelectorAll('thead th, thead td').forEach($cell => {
            const cellType = $cell.getAttribute('cell-type') || "renderer";
            const tagName = `cell-${cellType}-thead`;

            //const cellType = $cell.getAttribute('cell-type');
            //if (cellType) {
                const originalContent = $cell.innerHTML;
                //const tagName = `cell-${cellType}`;
                const innerAttrs = targetAttributes
                    .filter(attr => $cell.hasAttribute(attr))
                    .map(attr => `${attr}="${$cell.getAttribute(attr)}"`);

                $cell.innerHTML = `<${tagName} ${innerAttrs.join(' ')} content="${originalContent}"></${tagName}>`;
            //}
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
                            targetCol.style.width = targetCol.style.minWidth = targetCol.style.maxWidth`${targetWidth}px`;
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

        // row-indicator용 col이 이미 없다면 추가
        if (colgroup && !colgroup.querySelector('.row-indicator-col')) {
            const col = document.createElement('col');
            col.className = 'row-indicator-col';
            col.setAttribute('fixed', 'left');
            col.setAttribute('width', w);
            col.style.width = col.style.minWidth = col.style.maxWidth = `${w}px`;
            colgroup.prepend(col);
        }

        tbl.querySelectorAll('thead, tbody, tfoot').forEach(section => {
            const rows = Array.from(section.querySelectorAll('tr'));
            if (rows.length === 0) return;

            // 1. 행들을 규칙에 맞게 그룹으로 묶기
            const groups = [];
            let currentGroup = null;

            rows.forEach(tr => {
                // col-indicator 전용 행 등은 제외 처리
                if (tr.classList.contains('col-indicator-rowgroup')) return;

                if (tr.getAttribute('group-by')) {
                    groups.push({ isGrouping: true, rows: [tr] });
                    currentGroup = null; // 일반 그룹 체이닝 끊기
                } else {
                    // 일반 행들은 연속되는 경우 하나의 그룹으로 묶음
                    if (!currentGroup || currentGroup.isGrouping !== false) {
                        currentGroup = { isGrouping: false, rows: [tr] };
                        groups.push(currentGroup);
                    } else {
                        currentGroup.rows.push(tr);
                    }
                }
            });

            // 2. 각 그룹별로 첫 번째 tr에 row-indicator 삽입
            groups.forEach(group => {
                const groupRows = group.rows;
                if (groupRows.length === 0) return;

                const firstTr = groupRows[0];

                // 이미 해당 행에 row-indicator가 존재하면 중복 생성 방지
                if (firstTr.querySelector(':scope > th.row-indicator')) return;

                const indicatorCell = document.createElement('th');
                indicatorCell.className = 'row-indicator';
                indicatorCell.setAttribute('cell-type', 'row-indicator');

                if (!group.isGrouping && groupRows.length > 1) {
                    indicatorCell.rowSpan = groupRows.length;
                }

                firstTr.insertBefore(indicatorCell, firstTr.firstElementChild);
            });
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
        });
    }
}
