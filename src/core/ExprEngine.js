import { trace } from "@nopeer";

export class ExprEngine {
    #host;
    #fields;
    #exprCache = new Map(); // 💡 통합된 단일 캐시로 모든 컴파일된 함수 관리

    constructor(host) {
        this.#host = host;
        this.#fields = host.fields.get();
    }

    rewriteExpr(expr) {

        if (!expr || !this.#fields.length) return expr;

        return expr.replace(/data\.([a-zA-Z_$][\w$]*)/g, (match, fieldName) => {
            const idx = this.#fields.indexOf(fieldName);
            return idx >= 0 ? `rowItem.v[${idx}]` : match;
        });
    }

    precompile(expr) {
        if (!expr) return expr;
        return this.rewriteExpr(expr);
    }

    evaluate(expr, rowItem, row = 0) {

        if (expr === undefined || expr === null) return "";

        try {
            const trimmedExpr = String(expr).trim();
            const compiledExpr = this.rewriteExpr(trimmedExpr);

            if (compiledExpr.includes("provider.") || compiledExpr.includes("host.") || compiledExpr.includes("data.") || compiledExpr.includes("rowItem.v") || compiledExpr.includes("(")) {

                let evalFn = this.#exprCache.get(compiledExpr);

                if (!evalFn) {
                    evalFn = new Function('rowItem', 'row', 'host', `
                        const data = rowItem;
                        const provider = host;

                        if (!data && !host) return "";
                        return ${compiledExpr};
                    `);

                    this.#exprCache.set(compiledExpr, evalFn);
                }

                return evalFn(rowItem, row, this.#host);
            }

            return compiledExpr;
        } catch (e) {
            /**
            if (expr.includes("getCommonCode")) {
                console.trace("ExprEngine evaluation error:", e);
            } */
            return expr;
        }
    }
}