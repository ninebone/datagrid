import { trace } from "@nopeer";
import { ColFixManager } from "@/col/ColFixManager.js";

export class ContextMenu extends HTMLElement {
    #tableHost;
    #panel;

    connectedCallback() {
        const root = this.getRootNode();
        this.#tableHost = root instanceof ShadowRoot ? root.host : (this.closest('nine-table') || root.host);

        if (!this.#tableHost) {
            this.#tableHost = this.parentElement?.closest('nine-table') || this.assignedSlot?.closest('nine-table');
        }

        if (!this.#tableHost) return;
    }

    #onContextMenu = (e) => {
        const path = e.composedPath ? e.composedPath() : [];
        const targetCell = path.find(el => el.tagName === 'TH' || el.tagName === 'TD');

        if (!targetCell) return;

        const targetTable = path.find(el => el.tagName === 'TABLE') || targetCell.closest('table');

        e.preventDefault();
        e.stopPropagation();

        this.openMenu(e.clientX, e.clientY, targetCell, targetTable);
    };

    #getTargetSheet(targetCell) {
        return targetCell?.closest('nine-table-sheet') || this.#tableHost.activeSheet || this.#tableHost;
    }

    #getFixManager(targetCell) {
        const sheet = this.#getTargetSheet(targetCell);
        if (!sheet) return null;

        if (!sheet.colFix) {
            sheet.colFix = new ColFixManager(sheet);
        }
        return sheet.colFix;
    }

    #parseCustomMenuItems(containerElement, activeTable) {
        const items = [];
        const activeTableId = activeTable?.id;
        const allUls = Array.from(containerElement.querySelectorAll(':scope > ul'));

        allUls.forEach(rootUl => {
            const targetTableAttr = rootUl.getAttribute('target-table');

            if (!targetTableAttr || (activeTableId && targetTableAttr === activeTableId)) {
                const parsedList = this.#traverseUl(rootUl);
                items.push(...parsedList);
            }
        });

        return items;
    }

    #traverseUl(ulEl) {
        const list = [];
        Array.from(ulEl.children).forEach(child => {
            const tagName = child.tagName.toLowerCase();

            if (tagName === 'hr' || child.classList.contains('separator')) {
                list.push({ type: 'separator' });
                return;
            }

            if (tagName === 'li') {
                let name = '';
                const spanEl = child.querySelector(':scope > span');
                if (spanEl) {
                    name = spanEl.textContent.trim();
                } else {
                    name = Array.from(child.childNodes)
                        .filter(n => n.nodeType === Node.TEXT_NODE)
                        .map(n => n.textContent.trim())
                        .join('');
                }

                const subUl = child.querySelector(':scope > ul');
                const item = {
                    menuId: child.id || name,
                    name: name,
                    className: child.className || '',
                    disabled: child.hasAttribute('disabled') || child.getAttribute('disabled') === 'true',
                    isCustom: true
                };

                if (subUl) {
                    item.items = this.#traverseUl(subUl);
                }

                list.push(item);
            }
        });
        return list;
    }

    #buildMenuItems(activeTable, isHeaderCell, targetCell) {
        const useDefault = this.getAttribute('use-default-menu') !== 'false';
        let rawItems = [];

        const customItems = this.#parseCustomMenuItems(this, activeTable);
        if (customItems.length > 0) {
            rawItems.push(...customItems);
        }

        const fixManager = this.#getFixManager(targetCell);
        const currentFixState = fixManager?.getFixState(targetCell, activeTable) ?? 'none';
        const isFixable = isHeaderCell && (fixManager?.canFixColumn(targetCell, activeTable) ?? false);

        let fixMenuItem = null;
        if (currentFixState === 'left' || currentFixState === 'right') {
            fixMenuItem = {
                menuId: 'unfix-column',
                name: 'Unfix Column',
                className: 'ng-menu-unfix-col',
                disabled: !isHeaderCell
            };
        } else {
            fixMenuItem = {
                menuId: 'fix-column',
                name: 'Fix Column',
                className: 'ng-menu-fix-col',
                disabled: !isFixable
            };
        }

        if (useDefault) {
            rawItems.push(
                { type: 'separator' },
                {
                    menuId: 'sort',
                    name: 'Sort',
                    className: 'ng-menu-sort',
                    disabled: !isHeaderCell
                },
                fixMenuItem,
                { type: 'separator' },
                { menuId: 'filtering', name: 'Filtering', className: 'ng-menu-filtering' },
                { menuId: 'maximize', name: 'Maximize', className: 'maximize' },
                {
                    menuId: 'export',
                    name: 'Export',
                    className: 'export',
                    items: [
                        { menuId: 'export-excel', name: 'Excel', className: 'export-excel' },
                        { menuId: 'export-pdf', name: 'PDF', className: 'export-pdf', disabled: true }
                    ]
                },
                {
                    menuId: 'properties',
                    name: 'Options',
                    className: 'options',
                    items: [
                        { menuId: 'show-title-bar', name: 'Title Bar Show/Hide', className: 'show-title-bar' },
                        { menuId: 'show-status-bar', name: 'Status Bar Show/Hide', className: 'show-status-bar' },
                        { menuId: 'auto-fit-col', name: 'Auto Fit Columns', className: 'auto-fit-col' }
                    ]
                }
            );
        }

        const cleanedItems = [];
        rawItems.forEach((item) => {
            if (item.type === 'separator') {
                if (cleanedItems.length === 0 || cleanedItems[cleanedItems.length - 1].type === 'separator') {
                    return;
                }
            }
            cleanedItems.push(item);
        });

        if (cleanedItems.length > 0 && cleanedItems[cleanedItems.length - 1].type === 'separator') {
            cleanedItems.pop();
        }

        return cleanedItems;
    }

    openMenu(x, y, targetCell, targetTable) {
        const targetParent = this.#tableHost.shadowRoot || this.#tableHost;

        if (!this.#panel) {
            this.#panel = document.createElement('nine-table-menu-panel');
            targetParent.appendChild(this.#panel);
        }

        const isHeaderCell = !!targetCell.closest('thead');
        const menuItems = this.#buildMenuItems(targetTable, isHeaderCell, targetCell);

        this.#panel.render(menuItems, (e) => this.#handleMenuClick(e, targetCell, targetTable));

        const targetSheet = this.#getTargetSheet(targetCell);
        this.#syncMenuStates(targetSheet);

        this.#panel.openAt(x, y);
    }

    #syncMenuStates(targetSheet) {
        if (!this.#panel || !targetSheet) return;

        const isFiltering = targetSheet.filtering?.isFiltering?.() || false;
        this.#panel.toggleItemState('filtering', 'on', isFiltering);

        const autoFit = this.#tableHost.getAttribute('auto-fit-col') === 'true';
        this.#panel.toggleItemState('auto-fit-col', 'on', autoFit);

        const showTitle = this.#tableHost.getAttribute('show-title-bar') === 'true';
        this.#panel.toggleItemState('show-title-bar', 'on', showTitle);
    }

    #handleMenuClick(e, targetCell, targetTable) {
        const menuId = e.menuId;

        const customEvent = new CustomEvent('menu-click', {
            detail: { menuId, targetCell, targetTable, originalEvent: e },
            bubbles: true,
            composed: true
        });
        this.dispatchEvent(customEvent);

        const baseCol = parseInt(targetCell.dataset.col, 10);
        const targetSheet = this.#getTargetSheet(targetCell);

        switch (menuId) {
            case 'fix-column':
            case 'unfix-column':
                const fixManager = this.#getFixManager(targetCell);
                fixManager?.executeFixToggle(menuId, targetCell);
                break;

            case 'sort':
                if (!isNaN(baseCol)) {
                    targetSheet.sorting?.handleSortFromMenu?.(baseCol, targetCell);
                }
                break;

            case 'filtering':
                targetSheet?.filtering?.toggle();
                break;

            case 'auto-fit-col':
                this.#tableHost.setAttribute('auto-fit-col', this.#tableHost.getAttribute('auto-fit-col') === 'true' ? 'false' : 'true');
                break;

            case 'show-title-bar':
                this.#tableHost.setAttribute('show-title-bar', this.#tableHost.getAttribute('show-title-bar') === 'true' ? 'false' : 'true');
                break;
        }

        this.#panel.close();
    }

    disconnectedCallback() {
        this.#tableHost?.removeEventListener('contextmenu', this.#onContextMenu);
    }
}

if (!customElements.get('nine-table-menu')) {
    customElements.define('nine-table-menu', ContextMenu);
}