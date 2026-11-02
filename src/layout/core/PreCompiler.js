import { trace } from "@nopeer";
import { TableCompiler } from "@/layout/core/TableCompiler.js";

export const COLLAPSED_WIDTH = 16;

export class PreCompiler {

    static initializeTable(host, tbl) {

        // 1. 기본 구조 보장 (colgroup, thead)
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

        // 2. 속성 정규화 (collapsed="true" -> collapsible="true" 보정)
        PreCompiler.#normalizeCollapsibleAttributes(tbl);

        // 3. 셀 커스텀 엘리먼트 생성
        PreCompiler.#generateCell(host, tbl);

        // 5. 초기 접힘/펼치기(expand) 버튼 및 너비 세팅
        PreCompiler.#initColExpanders(tbl);

        // 6. 필터 버튼 생성
        PreCompiler.#initFilterButtons(host, tbl);

        PreCompiler.#applyInitialCellWidths(tbl);
        //tbl.classList.add('nine-table-element');

        //trace.log("**************", tbl.cloneNode(true));
        return tbl;
    }

    static #createColIndicator(tbl) {
        const thead = tbl.querySelector('thead');
        if (!thead || thead.querySelector('.col-indicator-rowgroup')) return;

        const tdTmpl = `<th data-col="@col" class="col-indicator" scope="col"></th>`;

        // 맨 위에 인덱스용 row(tr) 삽입
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

        // 🎯 colgroup의 모든 스타일 및 속성 동기화
        const cols = Array.from(tbl.querySelectorAll('colgroup col'));
        tr.querySelectorAll('.col-indicator').forEach((el, i) => {
            const background = cols[i].getAttribute('background');
            if (background) {
                el.style.background = background;
            }
        });
    }

    // 엑셀 스타일 알파벳 변환 유틸 (A, B, C ... Z, AA, AB ...)
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

        // 🎯 이미 존재하지 않을 때만 생성
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

        // 🎯 <col> 엘리먼트 자체가 없다면 행 기준으로 생성
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

        // 🎯 col 속성 및 너비 정리는 별도 함수로 분리
        //PreCompiler.#normalizeColAttributes(tbl);
    }

    // 🎯 <col>들의 data-col, width, style.width 속성 정리를 전담하는 메서드
    static #normalizeColAttributes(tbl) {
        const cols = Array.from(tbl.querySelectorAll('colgroup col'));
        if (cols.length === 0) return;

        const containerWidth = tbl.clientWidth || 0;
        const defaultWidth = Math.max(Math.floor(containerWidth / cols.length), 100);

        cols.forEach((col, i) => {
            // 1. data-col 인덱스 보장
            if (!col.hasAttribute('data-col')) {
                col.setAttribute('data-col', i);
            }

            // 2. width 속성 및 style.width 정규화
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

                // 🎯 1. 절대 겹치지 않는 유니크한 가상 함수 이름 생성
                const uniqueFuncName = `__ds_${Date.now()}_${++autoIdCounter}`;

                // 🎯 2. 호스트(NineTable)에 해당 데이터를 반환하는 클로저 함수 등록
                if (host) {
                    host[uniqueFuncName] = () => l;
                }

                // 🎯 3. 셀에 data-source 자동 장착 (정규식/세터 스캔기가 알아서 캐치함)
                $cell.setAttribute("data-source", `host.${uniqueFuncName}()`);

                // 🎯 4. 사용이 끝난 정적 datalist 엘리먼트는 DOM에서 제거
                $datalist.remove();
            }

            const expr = $cell.dataset.expr;
            if (expr) {
                $cell.setAttribute('data-expr', host.exprEngine.precompile(expr));
            }

            // 💡 2. 기타 속성들 중 표현식이 포함된 경우 프리컴파일
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

        // 🎯 인덱스 행을 제외한 실제 헤더 셀들만 타겟팅
        tbl.querySelectorAll('thead tr:not(.col-indicator-rowgroup) th, thead tr:not(.col-indicator-rowgroup) td').forEach(cell => {
            const finalFiltering = cell.getAttribute('filtering') === 'true' || tableFilter || hostFilter;

            cell.setAttribute('filtering', finalFiltering ? 'true' : 'false');

            if (finalFiltering) {
                cell.appendChild(document.createElement('nine-table-filter-button'));
            }
        });
    }

    static #initColExpanders(tbl) {
        /** 작동하나? */
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
        // 1. colgroup에 인디케이터용 <col> 추가
        const w = tbl.getAttribute("row-indicator") === 'true' ? 48 : 0;

        const colgroup = tbl.querySelector('colgroup');

        //if (colgroup && !colgroup.querySelector('col.row-indicator-col')) {
            const col = document.createElement('col');
            //col.className = 'row-indicator-col';
            col.setAttribute('fixed', 'left');
            col.setAttribute('width', w);
            col.style.width = `${w}px`;
            colgroup.prepend(col);
        //}

        // 2. thead, tbody, tfoot 각 섹션별로 첫 번째 tr에 인디케이터 생성 및 rowSpan 부여
        //const sections = tbl.querySelectorAll('thead, tbody, tfoot');

        tbl.querySelectorAll('thead, tbody, tfoot').forEach(section => {
            const rows = Array.from(section.querySelectorAll('tr'));
            if (rows.length === 0) return;

            const firstTr = rows[0];

            const indicatorCell = document.createElement('th');
            indicatorCell.className = 'row-indicator';
            indicatorCell.setAttribute('cell-type', 'row-indicator');
            //indicatorCell.setAttribute('filtering', 'false');

            // 💡 섹션 내 행이 여러 개면(멀티 라인 템플릿 등) 전체를 아우르도록 rowSpan 설정
            if (rows.length > 1) {
                indicatorCell.rowSpan = rows.length;
            }

            firstTr.insertBefore(indicatorCell, firstTr.firstElementChild);
        });
    }

    static #applyInitialCellWidths(tbl) {
        // 🎯 컬럼 기준이 아닌 셀(th, td) 기준으로 순회하여 colspan 반영
        tbl.querySelectorAll('th[data-col], td[data-col]').forEach(cell => {

            const startColIdx = parseInt(cell.getAttribute('data-col'), 10);
            if (isNaN(startColIdx)) return;

            // 셀의 실제 colspan 값 추출 (기본값 1)
            const colSpan = parseInt(cell.getAttribute('colspan') || cell.colSpan, 10) || 1;
            let totalWidth = 0;

            // colspan 만큼 다음 컬럼들의 너비를 누적 합산
            for (let i = 0; i < colSpan; i++) {
                const targetIdx = startColIdx + i;
                const col = tbl.querySelector(`colgroup col[data-col="${targetIdx}"]`);
                if (col) {
                    totalWidth += parseInt(col.getAttribute('width'), 10) || 100;
                }
            }

            if (totalWidth > 0) {
                const widthVal = `${totalWidth}px`;
                cell.style.width = widthVal;
                cell.style.minWidth = widthVal;
                cell.style.maxWidth = widthVal;
            }
        });
    }
}