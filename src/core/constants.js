export const NINE_TABLE = {
    META: {
        INDEX: {
            ROWID: 0,
            FILTER: 1,
            GROUP: 2,
            // SELECT: 2,
            // EXPAND: 3
        }
    },
    ROW_STATE: {
        EMPTY: 'EMPTY',
        NORMAL: 'NORMAL',
        INSERT: 'INSERT',
        UPDATE: 'UPDATE',
        DELETE: 'DELETE'
    },
    EVENT: {
        LOAD: "load",
        CELL_BUTTON_CLICK:  "cell-button-click",
    },
};