// ui/menu/nine-table-menu-panel.js

export class MenuPanel extends HTMLElement {
    #onCallback;
    #closeHandler = null;

    constructor() {
        super();
    }

    connectedCallback() {

        this.style.position = 'fixed';
        this.style.display = 'none';
        this.style.zIndex = '99999';

        this.innerHTML = `
            <div class="menu-wrapper">
                <ul class="menu-container"></ul>
            </div>
        `;
    }

    render(items, callback) {
        this.#onCallback = callback;
        const container = this.querySelector('.menu-container');
        if (!container) return;

        container.innerHTML = '';

        this.#appendItems(container, items);
        this.#bindClickEvents();
    }

    openAt(x, y, targetCell = null) {
        this.style.display = 'block';

        if (targetCell) {
            const cellRect = targetCell.getBoundingClientRect();
            const cellRightX = cellRect.right;

            requestAnimationFrame(() => {
                const wrapper = this.querySelector('.menu-wrapper');
                if (!wrapper) return;
                const panelWidth = wrapper.getBoundingClientRect().width;

                let calculatedLeft = cellRightX - panelWidth;

                if (calculatedLeft < 0) {
                    calculatedLeft = cellRect.left;
                }

                const panelHeight = wrapper.getBoundingClientRect().height;
                let calculatedTop = y;
                if (y + panelHeight > window.innerHeight) {
                    calculatedTop = y - panelHeight;
                }

                this.style.left = `${calculatedLeft}px`;
                this.style.top = `${calculatedTop}px`;
            });
        } else {
            this.style.left = `${x}px`;
            this.style.top = `${y}px`;

            requestAnimationFrame(() => {
                const wrapper = this.querySelector('.menu-wrapper');
                if (!wrapper) return;
                const rect = wrapper.getBoundingClientRect();

                if (x + rect.width > window.innerWidth) {
                    this.style.left = `${x - rect.width}px`;
                }
                if (y + rect.height > window.innerHeight) {
                    this.style.top = `${y - rect.height}px`;
                }
            });
        }

        if (this.#closeHandler) {
            window.removeEventListener('pointerdown', this.#closeHandler);
        }

        this.#closeHandler = (e) => {
            const path = e.composedPath ? e.composedPath() : [];
            if (!path.includes(this) && !this.contains(e.target)) {
                this.close();
            }
        };

        setTimeout(() => {
            window.addEventListener('pointerdown', this.#closeHandler);
        }, 0);
    }

    close() {
        this.style.display = 'none';
        if (this.#closeHandler) {
            window.removeEventListener('pointerdown', this.#closeHandler);
            this.#closeHandler = null;
        }
    }

    toggleItemState(menuId, className, condition) {
        const li = this.querySelector(`li[menu-id="${menuId}"]`);
        if (li) {
            condition ? li.classList.add(className) : li.classList.remove(className);
        }
    }

    #appendItems(parentUl, items) {
        items.forEach(item => {
            if (item.type === 'separator') {
                const sep = document.createElement('li');
                sep.className = 'ng-menu-separator';
                parentUl.appendChild(sep);
                return;
            }

            const li = document.createElement('li');
            li.setAttribute('menu-id', item.menuId);
            li.className = `${item.className || ''} ${item.items ? 'submenu' : ''} ${item.disabled ? 'disabled' : ''}`.trim();

            const span = document.createElement('span');
            span.textContent = item.name;
            li.appendChild(span);

            if (item.items && item.items.length > 0) {
                const subUl = document.createElement('ul');
                subUl.className = 'ng-menu-sublist';
                this.#appendItems(subUl, item.items);
                li.appendChild(subUl);
            }

            parentUl.appendChild(li);
        });
    }

    #bindClickEvents() {
        this.querySelectorAll('li[menu-id]').forEach(li => {
            li.addEventListener('click', (e) => {
                e.stopPropagation();
                if (li.classList.contains('disabled')) return;

                const menuId = li.getAttribute('menu-id');
                this.#onCallback?.({ menuId, target: li });
                this.close();
            });
        });
    }

    disconnectedCallback() {
        this.close();
    }
}

if (!customElements.get('nine-table-menu-panel')) {
    customElements.define('nine-table-menu-panel', MenuPanel);
}