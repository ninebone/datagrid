// ui/menu/nine-table-menu-panel.js

export class MenuPanel extends HTMLElement {
    #onCallback;
    #closeHandler = null; // 🎯 이벤트 누수 방지용 리스너 참조

    constructor() {
        super();
    }

    connectedCallback() {
        // 🎯 [보정 1] 패널 자체의 기본 레이아웃 스타일은 element style로 직접 지정
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

    /**
     * 🎯 패널의 우측선과 targetCell의 우측선을 일치시키는 포지셔닝
     */
    openAt(x, y, targetCell = null) {
        this.style.display = 'block';

        if (targetCell) {
            const cellRect = targetCell.getBoundingClientRect();
            // 셀의 오른쪽 경계선 좌표
            const cellRightX = cellRect.right;

            requestAnimationFrame(() => {
                const wrapper = this.querySelector('.menu-wrapper');
                if (!wrapper) return;
                const panelWidth = wrapper.getBoundingClientRect().width;

                // 패널 우측선을 셀 우측선에 맞춤 (Left = cellRight - panelWidth)
                let calculatedLeft = cellRightX - panelWidth;

                // 뷰포트 왼쪽 밖으로 벗어나는 예외 처리
                if (calculatedLeft < 0) {
                    calculatedLeft = cellRect.left; // 공간이 부족하면 셀 좌측선에 맞춤
                }

                // 뷰포트 아래쪽 벗어남 처리
                const panelHeight = wrapper.getBoundingClientRect().height;
                let calculatedTop = y;
                if (y + panelHeight > window.innerHeight) {
                    calculatedTop = y - panelHeight;
                }

                this.style.left = `${calculatedLeft}px`;
                this.style.top = `${calculatedTop}px`;
            });
        } else {
            // 기본 마우스 클릭 좌표 기반 (Fallback)
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

        // 바깥 클릭 핸들러 등록
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