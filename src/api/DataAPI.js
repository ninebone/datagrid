import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";

export class DataAPI {

    #host;

    constructor(host) {
        this.#host = host;
    }
/**
    add(dataSource, updateState = true) {
        return this.#host.data.add(dataSource, updateState);
    }
*/

    /**
    insert(index, dataSource, updateState = true) {
        const activeSheet = this.#host.shadow.querySelector('nine-table-sheet.active');
        if (!activeSheet) return -1;

        const currentJson = activeSheet.view.get(index);
        const rowid = currentJson.m._[NINE_TABLE.META.INDEX.ROWID];

        const toRowid = this.#host.data.insert(rowid, dataSource, updateState);
        const records = activeSheet.view.getArray();

        return records.findIndex(record => {
            if (!record?.m?._) return false;
            return record.m._[NINE_TABLE.META.INDEX.ROWID] === toRowid;
        });
    }

    remove(index) {
        const activeSheet = this.#host.shadow.querySelector('nine-table-sheet.active');
        if (!activeSheet) return;

        const currentJson = activeSheet.view.get(index);
        const rowid = currentJson.m._[NINE_TABLE.META.INDEX.ROWID];

        this.#host.data.remove(rowid);
    }

    set(records) {
        this.#host.dataManager.data.set(records);
        this.#host.refresh();
    } */
}