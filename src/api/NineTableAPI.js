export class NineTableAPI {
    #host;

    constructor(host) {
        this.#host = host;

        // 관리할 네임스페이스들을 배열로 정의
        const namespaces = ["row"]; // 나중에 "col", "cell" 등만 추가하면 끝!

        namespaces.forEach(ns => {
            this[ns] = new Proxy({}, {
                get: (target, prop) => {
                    const $sheet = this.#getActiveSheet();
                    if (!$sheet || !$sheet[ns]) return undefined;

                    const targetMethod = $sheet[ns][prop];

                    if (typeof targetMethod === 'function') {
                        return (...args) => targetMethod.apply($sheet[ns], args);
                    }
                    return targetMethod;
                }
            });
        });
    }

    getActiveSheets() {
        return this.#host.shadow.querySelectorAll('nine-table-sheet.active');
    }

    #getActiveSheet() {
        const arr = this.getActiveSheets();
        return arr.length > 0 ? arr[0] : null;
    }
}