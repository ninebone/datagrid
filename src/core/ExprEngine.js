import { trace } from "@nopeer";

export class ExprEngine {
    #host;
    #fields;
    #exprCache = new Map(); // 💡 통합된 단일 캐시로 모든 컴파일된 함수 관리

    constructor(host) {
        this.#host = host;
        this.#fields = host.fields.get();
    }

    /**
     * 🎯 표현식 내의 data.fieldName을 원시 배열 인덱스 접근(rowItem.v[idx])으로 변환
     */
    rewriteExpr(expr) {

        if (!expr || !this.#fields.length) return expr;

        return expr.replace(/data\.([a-zA-Z_$][\w$]*)/g, (match, fieldName) => {
            const idx = this.#fields.indexOf(fieldName);
            return idx >= 0 ? `rowItem.v[${idx}]` : match;
        });
    }

    /**
     * 🎯 셀 또는 컬럼 정의에 선언된 expr 프리컴파일
     */
    precompile(expr) {
        if (!expr) return expr;
        return this.rewriteExpr(expr);
    }

    /**
     * 🎯 표현식 평가 및 실행 (통합 캐싱)
     */
    evaluate(expr, rowItem, row = 0) {

        if (expr === undefined || expr === null) return "";

        try {
            const trimmedExpr = String(expr).trim();
            const compiledExpr = this.rewriteExpr(trimmedExpr);

            // 💡 함수 호출, 데이터 참조, 연산식이 포함된 경우 통합 평가 및 캐싱
            if (compiledExpr.includes("data.") || compiledExpr.includes("rowItem.v") || compiledExpr.includes("host.") || compiledExpr.includes("(")) {
                let evalFn = this.#exprCache.get(compiledExpr);

                if (!evalFn) {
                    evalFn = new Function('rowItem', 'row', 'host', `
                        const data = rowItem;

                        if (!data && !host) return "";
                        return ${compiledExpr};
                    `);

                    this.#exprCache.set(compiledExpr, evalFn);
                }

                return evalFn(rowItem, row, this.#host);
            }

            return compiledExpr;
        } catch (e) {
            //console.trace("ExprEngine evaluation error:", e);
            return expr;
        }
    }
}