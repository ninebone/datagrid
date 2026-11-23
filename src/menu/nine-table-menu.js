import { trace } from "@nopeer";
import { ColFixManager } from "@/col/ColFixManager.js";

const DEFAULT_MENU_ITEMS = [
    /**{ menuId: "sort", name: "Sort", className: "ng-menu-sort" },*/
    /**{ menuId: "fix-column", name: "Fix Column", className: "ng-menu-fix-col" },
    { type: "separator" },*/
    {
        menuId: "export",
        name: "Export",
        className: "export",
        items: [
            { menuId: "export-excel", name: "Excel", className: "export-excel" },
            { menuId: "export-csv", name: "CSV", className: "export-csv" },
            { menuId: "export-pdf", name: "PDF", className: "export-pdf" },
        ],
    },

    { menuId: "filtering", name: "Filtering", className: "ng-menu-filtering", disabled: true },
    { menuId: "maximize", name: "Maximize", className: "maximize", disabled: true },

    {
        menuId: "properties",
        name: "Options",
        className: "options",
        disabled: true,
        items: [
            { menuId: "show-title-bar", name: "Title Bar Show/Hide", className: "show-title-bar" },
            { menuId: "show-status-bar", name: "Status Bar Show/Hide", className: "show-status-bar" },
            { menuId: "auto-fit-col", name: "Auto Fit Columns", className: "auto-fit-col" },
        ],
    },
];

export class ContextMenu extends HTMLElement {
    #host = null;
    #currentContext = null;
    #closeHandler = null;

    connectedCallback() {
        this.#host = this.getRootNode().host;

        this.#init();
    }

    #init = () => {
        this.#renderer();
        this.#initEvent();
    };
    #renderer = () => {
        this.innerHTML = `
            <div class="menu-wrapper">
                <ul class="menu-container"></ul>
            </div>
        `;
    };
    #initEvent = () => {
        this.#host.removeEventListener("contextmenu", this.#onContextMenu);
        this.#host.addEventListener("contextmenu", this.#onContextMenu);

        this.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            e.stopPropagation();
        });

        this.addEventListener("click", this.#onClick);
    };

    #onContextMenu = (e) => {
        if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

        const path = e.composedPath ? e.composedPath() : [];
        const targetCell = path.find((el) => el.tagName === "TH" || el.tagName === "TD");
        if (!targetCell) return;

        const targetTable = path.find((el) => el.tagName === "TABLE") || targetCell.closest("table");

        e.preventDefault();
        e.stopPropagation();

        this.open(e.clientX, e.clientY, targetCell, targetTable);
    };

    #onClick = (e) => {
        const li = e.target.closest("li[menu-id]");
        if (!li || !this.contains(li)) return;

        e.stopPropagation();
        if (li.classList.contains("disabled")) return;

        this.#execute(li.getAttribute("menu-id"));
        this.close();
    };

    open(x, y, targetCell, targetTable) {
        const isHeaderCell = !!targetCell.closest("thead");
        this.#currentContext = { targetCell, targetTable, isHeaderCell };

        this.#renderItems();
        this.#syncItemStates(targetTable, isHeaderCell, targetCell);

        this.style.display = "block";
        this.style.left = `${x}px`;
        this.style.top = `${y}px`;

        requestAnimationFrame(() => {
            const wrapper = this.querySelector(".menu-wrapper");
            if (!wrapper) return;
            const rect = wrapper.getBoundingClientRect();

            if (x + rect.width > window.innerWidth) this.style.left = `${x - rect.width}px`;
            if (y + rect.height > window.innerHeight) this.style.top = `${y - rect.height}px`;
        });

        this.#unbindCloseHandler();
        this.#closeHandler = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            if (!path.includes(this) && !this.contains(e.target)) this.close();
        };
        requestAnimationFrame(() => {
            if (this.#closeHandler) window.addEventListener("click", this.#closeHandler);
        });
    }

    close() {
        this.style.display = "none";
        this.#unbindCloseHandler();
    }

    #unbindCloseHandler() {
        if (this.#closeHandler) {
            window.removeEventListener("click", this.#closeHandler);
            this.#closeHandler = null;
        }
    }

    #getCustomItems() {
        const raw = this.#host.provider?.menuItems;
        const list = typeof raw === "function" ? raw(this.#currentContext) : raw;
        return Array.isArray(list) ? list : [];
    }

    #renderItems() {
        const container = this.querySelector(".menu-container");
        if (!container) return;

        const customItems = this.#getCustomItems();
        const useDefault = this.#host.provider?.useDefaultMenu !== false;

        const rawItems = [
            ...customItems,
            ...(customItems.length > 0 && useDefault ? [{ type: "separator" }] : []),
            ...(useDefault ? DEFAULT_MENU_ITEMS : []),
        ];

        container.innerHTML = "";
        this.#appendItems(container, this.#cleanSeparators(rawItems));
    }

    #syncItemStates(targetTable, isHeaderCell, targetCell) {
        const sheet = this.#getTargetSheet(targetCell);
        const fixManager = sheet?.colFix;
        const sourceTable = sheet?.sourceTable || targetTable;

        const fixState = fixManager?.getFixState(targetCell, sourceTable) ?? "none";
        const isFixed = fixState === "left" || fixState === "right";
        const canFix = isHeaderCell && (fixManager?.canFixColumn(targetCell, sourceTable) ?? false);

        this.#setItemState("fix-column", {
            text: isFixed ? "Unfix Column" : "Fix Column",
            disabled: isFixed ? !isHeaderCell : !canFix,
        });
    }

    #setItemState(menuId, { disabled, text, active } = {}) {
        const li = this.querySelector(`li[menu-id="${menuId}"]`);
        if (!li) return;

        if (typeof disabled === "boolean") li.classList.toggle("disabled", disabled);
        if (typeof text === "string") {
            const span = li.querySelector(":scope > span");
            if (span) span.textContent = text;
        }
        if (typeof active === "boolean") li.classList.toggle("on", active);
    }

    #execute(menuId) {
        const { targetCell, targetTable } = this.#currentContext;

        const matchedItem = this.#findItem(this.#getCustomItems(), menuId);
        matchedItem?.onClick?.(this.#currentContext);

        /**
        this.#host.dispatchEvent(
            new CustomEvent("menu-click", {
                detail: { menuId, targetCell, targetTable, item: matchedItem || null },
                bubbles: true,
                composed: true,
            })
        ); */

        const exporter = this.#host?.shadowRoot?.querySelector("nine-table-export-progress");

        switch (menuId) {
            case "export-excel":
                exporter?.exportData({ format: "excel", showDialog: true });
                break;
            case "export-csv":
                exporter?.exportData({ format: "csv", showDialog: true });
                break;
            case "export-pdf":
                exporter?.exportData({ format: "pdf", showDialog: true });
                break;
        }
    }

    #getTargetSheet(targetCell) {
        return targetCell.closest("nine-table-sheet") || this.#host.activeSheet || this.#host;
    }

    #getFixManager(targetCell) {
        const sheet = this.#getTargetSheet(targetCell);
        if (!sheet) return null;
        if (!sheet.colFix) sheet.colFix = new ColFixManager(sheet);
        return sheet.colFix;
    }

    #findItem(items, menuId) {
        for (const item of items) {
            if (item.menuId === menuId) return item;
            if (Array.isArray(item.items)) {
                const found = this.#findItem(item.items, menuId);
                if (found) return found;
            }
        }
        return null;
    }

    #cleanSeparators(items) {
        const cleaned = [];
        items.forEach((item) => {
            if (item.type === "separator") {
                if (cleaned.length === 0 || cleaned[cleaned.length - 1].type === "separator") return;
            }
            cleaned.push(item);
        });
        if (cleaned[cleaned.length - 1]?.type === "separator") cleaned.pop();
        return cleaned;
    }

    #appendItems(parentUl, items) {
        items.forEach((item) => {
            if (item.type === "separator") {
                const sep = document.createElement("li");
                sep.className = "ng-menu-separator";
                parentUl.appendChild(sep);
                return;
            }

            const li = document.createElement("li");
            li.setAttribute("menu-id", item.menuId);
            li.className = [
                item.className || "",
                item.items?.length ? "submenu" : "",
                item.disabled ? "disabled" : "",
            ].filter(Boolean).join(" ");

            const span = document.createElement("span");
            span.textContent = item.name;
            li.appendChild(span);

            if (item.items?.length > 0) {
                const subUl = document.createElement("ul");
                subUl.className = "ng-menu-sublist";
                this.#appendItems(subUl, item.items);
                li.appendChild(subUl);
            }

            parentUl.appendChild(li);
        });
    }

    disconnectedCallback() {
        this.#host?.removeEventListener("contextmenu", this.#onContextMenu);
        this.close();
    }
}

if (!customElements.get("nine-table-menu")) {
    customElements.define("nine-table-menu", ContextMenu);
}