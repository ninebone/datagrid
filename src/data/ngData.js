import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";

export class ngRow {
	#parent;
	#newrow = -1;

	constructor(parent) {
		this.#parent = parent;
	}

	get at() {
		return this.#newrow;
	}
	set at(v) {
		this.#newrow = parseInt(v, 10);
	}

	count = () => this.#parent.rawRecords.length;
}

export class ngData {
	#host;
	#parent;
	#nextId = 0;
	#defaultHeight = [];

	static META_INDEX = {
		FILTER: 0,
		// GROUP: 1,
		// SELECT: 2,
		// EXPAND: 3
	};

	static ROW_STATE = {
		EMPTY: 'EMPTY',
		NORMAL: 'NORMAL',
		INSERT: 'INSERT',
		UPDATE: 'UPDATE',
		DELETE: 'DELETE'
	};

	constructor(host, parent) {
		this.#host = host;
		this.#parent = parent;
		this.#initialize();
	}


	#getValidRecords = () => {
		const rawRecords = this.#parent.rawRecords || [];
		return rawRecords.filter(item => item.m._[NINE_TABLE.META.INDEX.ROW_STATE] !== NINE_TABLE.ROW_STATE.DELETE);
	};

	get count() {
		return this.length;
	}

	count = () => {
		return this.length;
	};

	getArray = (at, colnm) => {
		const validRecords = this.#getValidRecords();

		if (at === undefined || at === null) {
			return validRecords; // 변환 없이 배열 그대로 반환 (렌더링 최적화)
		}

		if (at < 0 || at >= validRecords.length) return null;

		const targetRecord = validRecords[at];

		if (colnm != null) {
			const fields = this.getHostFields();
			const idx = fields.indexOf(colnm);
			return (idx >= 0) ? targetRecord.v[idx] : null;
		}

		return targetRecord;
	};

	setArray = (rowIndex, colIndex, value) => {
		const validRecords = this.#getValidRecords();
		const rowData = validRecords[rowIndex];

		const oldValue = rowData.v[colIndex];
		if (oldValue !== value && rowData.__ng.rowState !== ngData.ROW_STATE.INSERT) {
			rowData.__ng.rowState = ngData.ROW_STATE.UPDATE;
		}

		rowData.v[colIndex] = value;
	};


	get = (at, colnm) => {
		const validRecords = this.#getValidRecords();

		if (at === undefined || at === null) {
			return this.#conv(validRecords);
		}

		if (at < 0 || at >= validRecords.length) return null;

		const targetRecord = validRecords[at];
		const fields = this.getHostFields();

		if (colnm != null) {
			const idx = fields.indexOf(colnm);
			return (idx >= 0) ? targetRecord.v[idx] : null;
		}

		return this.#conv(targetRecord);
	};

	getAll = () => {
		return this.#parent.rawRecords || [];
	};

	getHostFields = () => {
		return typeof this.#host.fields?.get === 'function' ? this.#host.fields.get() : [];
	};

	#initialize = () => {
		this.#defaultHeight = [];
		const templateElements = this.#host.template || [];
		Array.from(templateElements).forEach(el => {
			this.#defaultHeight.push(el.getBoundingClientRect?.().height || 24);
		});

		(this.#parent.rawRecords || []).forEach(v => {
			if (!v.__ng) v.__ng = this.#getDefaultMeta();
			v.__ng.height = this.#defaultHeight.slice();
		});
	};

	get source() {
		return this.#conv(this.#parent.rawRecords);
	}
	set source(v) {
		this.set(v);
	}

	#invalidate = () => {
		this.#host.shadowRoot.querySelectorAll("nine-table-sheet").forEach($el => {
			$el.invalidate();
		});

		this.#host.shadowRoot.querySelector("nine-table-sheets-footer")?.refresh();
	};

	set = (dataSource) => {

		const loadData = () => {
			this.#host.loading = true;
			setTimeout(() => {
				try {
					this.clear();
					this.add(dataSource, false);
					this.#invalidate();
				} finally {
					this.#host.loading = false;
				}
			});
		}

		if (this.#host.loaded) {
			loadData();
		}
		else {
			this.#host.addEventListener(NINE_TABLE.EVENT.LOAD, e => {
				loadData();
			}, { once: true });
		}


	};

	get nextId() {
		return this.#nextId++;
	}

	get length() {
		return this.#getValidRecords().length;
	}

	get count() {
		return this.length;
	}

	getRowCount() {
		return this.length;
	}

	#getDefaultMeta = (rowid = 0) => {
		return {
			rowState: ngData.ROW_STATE.EMPTY,
			deleted: false,
			filtered: false,
			height: this.#defaultHeight.slice(),
			o: {},
			c: {},
			__: [0, 0, 0, 0, ngData.ROW_STATE.EMPTY, false, false, true, false, true, true, false, this.#defaultHeight.slice(), -1, {}, {}],
			_: [rowid, NINE_TABLE.ROW_STATE.EMPTY, [], []],
		};
	};

	reset = () => {
		this.#parent.rawRecords = [];
		this.#invalidate();
	};

	clear = () => {
		this.#parent.rawRecords = [];
		if (this.#parent.viewRecords?.reset) {
			this.#parent.viewRecords.reset();
		}

		this.#nextId = 0;

		this.#invalidate();
	};

	#json2Array = (jsonArray) => {
		if (!Array.isArray(jsonArray)) jsonArray = [jsonArray];

		const fields = this.getHostFields().length > 0 ? this.getHostFields() : Object.keys(jsonArray[0] || {});
		const arr = [];

		jsonArray.forEach(json => {
			const o = { v: [] };
			fields.forEach(colnm => {
				o.v.push(json[colnm] !== undefined && json[colnm] !== null ? json[colnm] : "");
			});
			arr.push(o);
		});

		return arr;
	};

	#defaultInsert = (arr) => {
		if (!Array.isArray(arr)) arr = [arr];
		arr.forEach(o => {
			const rowid = this.nextId;

			o.m = this.#getDefaultMeta(rowid);
			o.__ng = o.m;
			o.__ng.rowid = rowid;
			//o.__ng.rowState = ngData.ROW_STATE.INSERT;

			o.m._[NINE_TABLE.META.INDEX.ROWID] = rowid;
			o.m._[NINE_TABLE.META.INDEX.ROW_STATE] = NINE_TABLE.ROW_STATE.EMPTY;
		});
		return arr;
	};

	#getIndexFromRow = (rowid) => {
		const index = this.#parent.rawRecords.findIndex(record => {
			if (!record || !record.m || !record.m._) return false;
			return record.m._[NINE_TABLE.META.INDEX.ROWID] === rowid;
		});

		return index;
	}

	add = (dataSource, updateState = true) => {
		if (dataSource === undefined) dataSource = {};
		const arr = this.#json2Array(dataSource);

		const processedArr = this.#defaultInsert(arr);

		this.#parent.rawRecords = this.#parent.rawRecords.concat(processedArr);

		const row = this.count() - 1;
		if (updateState) {
			arr.forEach((_, idx) => {
				const target = this.#parent.rawRecords[this.#parent.rawRecords.length - 1 - idx];
				if (target) target.m._[NINE_TABLE.META.INDEX.ROW_STATE] = NINE_TABLE.ROW_STATE.INSERT;
			});
		}

		this.#invalidate();

		this.#host.dispatchEvent(new CustomEvent(NINE_TABLE.EVENT.ROW_ADDED, {
			bubbles: true,
			detail: { target: this.#host, rowid: processedArr.length > 0 ? processedArr[0].m._[NINE_TABLE.META.INDEX.ROWID] : null }
		}));

		return row;
	};


	insert = (rowid, dataSource, updateState = true) => {
		//trace.log("찾을 rowid:", rowid);

		if (dataSource === undefined) dataSource = {};
		const arr = this.#json2Array(dataSource);
		if (arr.length === 0) return -1;

		let targetIndex = this.#getIndexFromRow(rowid);
		/**
		if (rowid !== undefined && rowid !== null) {
			targetIndex = this.#parent.rawRecords.findIndex(record => {
				if (!record || !record.m || !record.m._) return false;
				return record.m._[NINE_TABLE.META.INDEX.ROWID] === rowid;
			});
		} */

		const processedArr = this.#defaultInsert(arr);

		//if (targetIndex === -1) {
		//	targetIndex = this.#parent.rawRecords.length;
		//}

		this.#parent.rawRecords.splice(targetIndex, 0, ...processedArr);

		if (updateState) {
			processedArr.forEach((_, idx) => {
				const target = this.#parent.rawRecords[targetIndex + idx];

				if (target && target.m && target.m._) {
					target.m._[NINE_TABLE.META.INDEX.ROW_STATE] = NINE_TABLE.ROW_STATE.INSERT;
				}
			});
		}

		this.#invalidate();

		this.#host.dispatchEvent(new CustomEvent(NINE_TABLE.EVENT.ROW_ADDED, {
			bubbles: true,
			detail: { target: this.#host, rowid: processedArr.length > 0 ? processedArr[0].m._[NINE_TABLE.META.INDEX.ROWID] : null }
		}));

		return processedArr[0].m._[NINE_TABLE.META.INDEX.ROWID]; // 삽입된 실제 배열 인덱스 반환
	};

	remove = (v) => {
		let arr = [];
		if (Array.isArray(v)) {
			arr = at;
		//} else if (typeof at === "undefined") {
		//	arr = [this.#parent.host.row.at];
		} else {
			arr = [parseInt(v, 10)];
		}

		let arrIndex = [];
		arr.forEach(rowid => {
			arrIndex.push(this.#getIndexFromRow(rowid));
		});

		const records = this.#parent.rawRecords;//this.#getValidRecords();

		arrIndex.sort((a, b) => b - a).forEach(index => {
			//if (validRecords[index]) {
				const targetId = records[index].m._[NINE_TABLE.META.INDEX.ROWID];

				if (records[index].m._[NINE_TABLE.META.INDEX.ROW_STATE] === NINE_TABLE.ROW_STATE.INSERT) {
					this.#parent.rawRecords = this.#parent.rawRecords.filter(item => item.m._[NINE_TABLE.META.INDEX.ROWID] !== targetId);
				} else {
					this.#parent.rawRecords.forEach(item => {
						if (item.m._[NINE_TABLE.META.INDEX.ROWID] === targetId) {
							item.m._[NINE_TABLE.META.INDEX.ROW_STATE] = NINE_TABLE.ROW_STATE.DELETE;
						}
					});
				}
			//}
		});

		this.#invalidate();

		this.#host.dispatchEvent(new CustomEvent(NINE_TABLE.EVENT.ROW_REMOVED, {
			bubbles: true,
			detail: { target: this.#host, rowid: arr.length > 0 ? arr[0] : null }
		}));
	};

	setValue = (rowid, colnm, value) => {

		rowid = parseInt(rowid, 10);
		const fields = this.getHostFields();
		const COL_IDX = fields.indexOf(colnm);
		if (COL_IDX < 0) return;

		const index = this.#getIndexFromRow(rowid);

		const records = this.#parent.rawRecords;
		const rowData = records[index];
		if (!rowData) return;

		const oldValue = rowData.v[COL_IDX];
		if (oldValue !== value && rowData.m._[NINE_TABLE.META.INDEX.ROW_STATE] !== NINE_TABLE.ROW_STATE.INSERT) {
			rowData.m._[NINE_TABLE.META.INDEX.ROW_STATE] = NINE_TABLE.ROW_STATE.UPDATE;
		}

		rowData.v[COL_IDX] = value;
	};

	getChangedData = (rowState) => {

		const records = this.#parent.rawRecords;

		if (rowState) {
			return this.#conv( records.filter(item => { return item.m._[NINE_TABLE.META.INDEX.ROW_STATE] === rowState; } ) );
		}
		else {
			return {
				C: this.#conv( records.filter(item => { return item.m._[NINE_TABLE.META.INDEX.ROW_STATE] === NINE_TABLE.ROW_STATE.INSERT; } ) ),
				U: this.#conv( records.filter(item => { return item.m._[NINE_TABLE.META.INDEX.ROW_STATE] === NINE_TABLE.ROW_STATE.UPDATE; } ) ),
				D: this.#conv( records.filter(item => { return item.m._[NINE_TABLE.META.INDEX.ROW_STATE] === NINE_TABLE.ROW_STATE.DELETE; } ) ),
			};
		}
	};

	#conv = (arr) => {
		if (!arr) return arr;

		const isSingle = !Array.isArray(arr);
		const targetArr = isSingle ? [arr] : arr;
		const fields = this.getHostFields();

		const result = targetArr.filter(o => !o.__ng?.deleted).map(o => {
			const t = {};
			fields.forEach((colnm, i) => {
				t[colnm] = o.v ? o.v[i] : o[colnm];
			});
			t.__ng = o.__ng;
			return t;
		});

		return isSingle ? result[0] : result;
	};
}
