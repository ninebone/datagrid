import { trace } from "@nopeer";

export class Toolbar extends HTMLElement {
    #host;
    #customContainer;

    connectedCallback() {
        this.#host = this.getRootNode().host;
        this.#render();
        this.#bindEvents();
    }

    #render() {
        this.innerHTML = `
            <div class="ng-toolbar-left">
                <button type="button" class="ng-toolbar-menu-btn" title="Menu">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" stroke-width="2">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <span class="ng-toolbar-title"></span>
            </div>

            <div class="ng-toolbar-custom" id="custom-container"></div>
        `;

        this.#customContainer = this.querySelector('#custom-container');
        this.#syncStateFromHost();
    }

    #syncStateFromHost() {
        const isSimple = this.#host.getAttribute('theme') === 'simple' || this.#host.classList.contains('simple');
        const showToolbar = this.#host.getAttribute('show-toolbar') !== 'false';
        const showMenu = this.#host.getAttribute('show-menu') !== 'false';
        const caption = this.#host.getAttribute('caption') || '';

        if (isSimple || !showToolbar) {
            this.setAttribute('hidden', '');
        } else {
            this.removeAttribute('hidden');
        }

        this.setAttribute('show-menu', showMenu ? 'true' : 'false');
        this.updateCaption(caption);
    }

    #bindEvents() {
        const titleEl = this.querySelector('.ng-toolbar-title');
        if (titleEl) {
            titleEl.addEventListener('dblclick', () => {
                const link = '<font color="green">https://www.ninegrid.net</font>';
                const currentCaption = this.#host.getAttribute('caption') || '';
                titleEl.innerHTML = titleEl.innerHTML === link ? currentCaption : link;
            });
        }

        const menuBtn = this.querySelector('.ng-toolbar-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                this.#host.dispatchEvent(new CustomEvent('toolbar-menu-click', {
                    bubbles: true,
                    composed: true,
                    detail: { targetTable: this.#host }
                }));
            });
        }
    }

    addCustomElement(element) {
        if (this.#customContainer) {
            this.#customContainer.append(element);
        }
    }

    updateCaption(text) {
        const titleEl = this.querySelector('.ng-toolbar-title');
        if (titleEl) titleEl.textContent = text;
    }
}

if (!customElements.get('nine-table-toolbar')) {
    customElements.define('nine-table-toolbar', Toolbar);
}