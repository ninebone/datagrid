export const NINE_TABLE = {
    META: {
        INDEX: {
            ROWID: 0,
            ROW_STATE: 1,
            FILTER: 2,
            GROUP: 3,
            // SELECT: 2,
            // EXPAND: 3
        }
    },
    ROW_STATE: {
        EMPTY: 0,
        NORMAL: 1,
        INSERT: 2,
        UPDATE: 3,
        DELETE: 9
    },
    EVENT: {
        LOAD: "load",
        CELL_BUTTON_CLICK:  "cell-button-click",
    },
};