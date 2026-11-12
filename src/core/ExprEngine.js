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

    rewriteExprGroup(expr) {
return expr;
        if (!expr || !this.#fields.length) return expr;

        return expr.replace(/data\.([a-zA-Z_$][\w$]*)/g, (match, fieldName) => {
            const idx = this.#fields.indexOf(fieldName);
            return idx >= 0 ? `childrenItems` : match;
        });
    }

    precompile(expr, isGroup) {
        if (!expr) return expr;
        return isGroup ?  this.rewriteExprGroup(expr) : this.rewriteExpr(expr);
    }

    evaluate(expr, rowItem, row = 0, isGroup = false) {

        if (expr === undefined || expr === null) return "";

        try {

            const trimmedExpr = String(expr).trim();
            const compiledExpr = isGroup ? this.rewriteExprGroup(trimmedExpr) : this.rewriteExpr(trimmedExpr);

            if (compiledExpr.includes("provider.") || compiledExpr.includes("host.") || compiledExpr.includes("data.") || compiledExpr.includes("rowItem.v") || compiledExpr.includes("(")) {

                let evalFn = this.#exprCache.get(compiledExpr);

                if (isGroup) {
                    if (!evalFn) {
                        evalFn = new Function('childrenItems', 'row', 'host', `
                            const children = childrenItems || [];
                            const fields = ${JSON.stringify(this.#fields)};
                            
                            const data = new Proxy(children, {
                                get(target, prop) {
                                    if (prop in target || typeof prop === 'symbol') return target[prop];
                
                                    const idx = fields.indexOf(prop);
                                    if (idx >= 0) {
                                        return target.map(r => r.v ? r.v[idx] : r[prop]);
                                    }
                
                                    return target[prop];
                                }
                            });
                
                            const provider = host;
                
                            // 💡 1. 수식 안에서 바로 쓸 수 있는 집계 함수들 선언
                            
                            const sum = (arr) => Array.isArray(arr) ? arr.reduce((a, b) => a + (Number(b) || 0), 0) : 0;
                            const avg = (arr) => Array.isArray(arr) && arr.length > 0 ? sum(arr) / arr.length : 0;
                            const max = (arr) => Array.isArray(arr) && arr.length > 0 ? Math.max(...arr.map(Number)) : 0;
                            const min = (arr) => Array.isArray(arr) && arr.length > 0 ? Math.min(...arr.map(Number)) : 0;
                            
                            // 만약 꼭 'Math.sum' 형태로 쓰고 싶다면 아래처럼 Math 객체에 잠시 붙여줄 수도 있습니다.
                            if (!Math.sum) Math.sum = sum;
                            if (!Math.avg) Math.avg = avg;
                
                            if (!data && !host) return "";
                            return ${compiledExpr};
                        `);

                        this.#exprCache.set(compiledExpr, evalFn);
                    }
                } else {
                    if (!evalFn) {
                        evalFn = new Function('rowItem', 'row', 'host', `
                            const data = rowItem;
                            const provider = host;
    
                            if (!data && !host) return "";
                            return ${compiledExpr};
                        `);

                        this.#exprCache.set(compiledExpr, evalFn);
                    }
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