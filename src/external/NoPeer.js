import { trace as traceOrigin } from '@ninebone/util';

export class Trace extends traceOrigin.constructor {
    constructor() {
        super();
        this.init("nine-table", "green");
    }
}

export const trace = new Trace();
