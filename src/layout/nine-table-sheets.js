export class NineTableSheets extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.#init();
    }

    #init = () => {

    };

}

if (!customElements.get('nine-table-sheets')) {
    customElements.define('nine-table-sheets', NineTableSheets);
}