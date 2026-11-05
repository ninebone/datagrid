import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";

export class DataAPI {

    #host;

    constructor(host) {
        this.#host = host;
    }

    provider = {
        // 스타일 데이터를 provider 객체 내부에서 직접 관리 (일반 메서드 축약형 사용)
        style: {
            value: '',
        },
        add: (providerObj) => {
            if (!providerObj || typeof providerObj !== 'object') return;

            const { style, ...methods } = providerObj;

            if (style && typeof style === 'string') {
                this.provider.style.value = style;
            }

            if (Object.keys(methods).length > 0) {
                setTimeout(() => {
                    Object.entries(methods).forEach(([name, fn]) => {
                        if (typeof fn === 'function') {
                            this.#host[name] = fn;
                        }
                    });

                    this.#host.rerenderer();
                });
            }
        },
    }

}