import { trace as traceOrigin } from '@ninebone/util';

/**
// 1. 내부 프라이빗 필드 문제를 피하기 위해 래퍼 객체 생성
export const trace = {
    init(prefix, color) {
        // 필요하다면 여기서 초기화 로직 수행 가능
        if (traceOrigin.init) {
            try { traceOrigin.init(prefix, color); } catch (e) {}
        }
    },
    log(...args) {
        return traceOrigin.log(...args);
    },
    warn(...args) {
        return traceOrigin.warn(...args);
    },
    error(...args) {
        return traceOrigin.error(...args);
    }
};

// 2. 모듈 로드 시점에 네임스페이스 초기화 시도
try {
    traceOrigin.init("nine-table", "green");
} catch (e) {}
*/


export class Trace extends traceOrigin.constructor {
    constructor() {
        super();
        this.init("nine-table", "green");
    }
}

export const trace = new Trace();


//trace.init("nine-table", "green");