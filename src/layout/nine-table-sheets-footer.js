export class NineTableSheetsFooter extends HTMLElement {
    #host;

    constructor() {
        super();
    }

    connectedCallback() {
        this.#init();
    }

    refresh = () => {
        this.querySelector("#row-count").innerHTML = this.#host.data.count().toLocaleString();
    };

    #init = () => {
        this.#host = this.getRootNode().host;

        this.#render();

        this.querySelector('.nine-tab-bar')?.addEventListener('click', (e) => {
            const isMultiSelect = e.ctrlKey || e.metaKey || e.shiftKey;
            const tabItem = e.target.closest('nt-sheets-tab-item');

            if (!tabItem) return;

            const index = parseInt(tabItem.dataset.index, 10);
            this.#switchSheet(index, isMultiSelect);
        });

        setTimeout(() => {
            this.#switchSheet(0, false);
        })
    };

    #switchSheet = (index, isMultiSelect = false) => {

        const updateSplitters = () => {
            const sheets = Array.from(this.#host.shadowRoot.querySelectorAll('nine-table-sheet'));
            const splitters = Array.from(this.#host.shadowRoot.querySelectorAll('nine-splitter'));

            splitters.forEach(s => s.style.setProperty('display', 'none'));

            const activeSheets = sheets
                .map((sheet, idx) => ({ sheet, idx }))
                .filter(({ sheet }) => sheet.classList.contains('active'));

            if (activeSheets.length < 2) return;

            for (let i = 0; i < activeSheets.length - 1; i++) {
                const currentIdx = activeSheets[i].idx;

                const targetSplitter = this.#host.shadowRoot.querySelector(`nine-splitter[data-split-index="${currentIdx}"]`);
                if (targetSplitter) {
                    targetSplitter.style.setProperty('display', '');
                }
            }
        };

        const tabBar = this.querySelector('.nine-tab-bar');
        const body = this.#host.shadowRoot.querySelector('nine-table-sheets-body');
        const tabItems = tabBar.querySelectorAll('nt-sheets-tab-item');
        const sheetElements = body.querySelectorAll('nine-table-sheet');

        if (!tabItems[index]) return;

        if (!isMultiSelect) {
            tabItems.forEach((tab, idx) => {
                tab.setActive(idx === index);
            });

            sheetElements.forEach((sheet, idx) => {
                const isActive = idx === index;
                sheet.classList.toggle('active', isActive);
                sheet.style.flex = isActive ? '1 1 100%' : '';
            });
        } else {
            const clickedTab = tabItems[index];
            const activeTabs = tabBar.querySelectorAll('nt-sheets-tab-item.active');

            if (clickedTab.classList.contains('active') && activeTabs.length <= 1) {
                return;
            }

            clickedTab.classList.toggle('active');
            const targetSheet = body.querySelector(`nine-table-sheet[data-index="${index}"]`);
            if (targetSheet) {
                targetSheet.classList.toggle('active');
                if (!targetSheet.classList.contains('active')) {
                    targetSheet.style.flex = '';
                }
            }
        }

        const activeSheets = body.querySelectorAll('nine-table-sheet.active');

        activeSheets?.forEach(sheet => {
            sheet.style.flex = (activeSheets.length > 1) ? '1 1 0%' : '1 1 100%';

            if (typeof sheet.refreshLayout === 'function') {
                sheet.refreshLayout();
            } else {
                sheet.invalidate?.();
            }
        });

        updateSplitters();
    };

    #render() {
        const rawElements = Array.from(this.#host.children);
        const rawTables = rawElements.filter(el => (el.tagName.toUpperCase() === 'TABLE'));

        const tabsHtml = rawTables.map((table, idx) => {
            const className = idx === 0 ? 'active' : '';
            const tabName = table.getAttribute('caption') || `Sheet ${idx + 1}`;

            return `<nt-sheets-tab-item class="${className}" data-index="${idx}">${tabName}</nt-sheets-tab-item>`;
        }).join('');

        this.innerHTML = `
            <div class="nine-tab-bar">${tabsHtml}</div>
            <div class="sheets-counter">Total : <span id="row-count">0</span></div>
        `;
    };
}

export class SheetTabItem extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {

    }

    setActive(isActive) {
        this.classList.toggle('active', isActive);
    }
}

if (!customElements.get('nt-sheets-tab-item')) {
    customElements.define('nt-sheets-tab-item', SheetTabItem);
}

if (!customElements.get('nine-table-sheets-footer')) {
    customElements.define('nine-table-sheets-footer', NineTableSheetsFooter);
}