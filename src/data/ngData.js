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
		FILTER: 0, // 멀티뷰 필터 통과 여부 (true/false)
		// ── 추후 확장 예시 ──
		// GROUP: 1,
		// SELECT: 2,
		// EXPAND: 3
	};

	// 🎯 행 상태 정의 상수 내재화
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



	/**
	 * 🎯 [내부 공통] 삭제되지 않은 유효 레코드 목록 반환 (중복 제거 및 캡슐화)
	 */
	#getValidRecords = () => {
		const rawRecords = this.#parent.rawRecords || [];
		return rawRecords.filter(o => !o.__ng?.deleted);
	};

	/**
	 * 🎯 유효 데이터 행 개수 반환 (속성 및 메서드 형태 모두 지원)
	 */
	get count() {
		return this.length;
	}

	count = () => {
		return this.length;
	};

	/**
	 * 🎯 [내부 엔진/고성능용] 변환 오버헤드 없이 순수 데이터(v 배열 등) 그대로 반환
	 * - data.getArray() : 유효한 전체 내부 레코드 배열 반환
	 * - data.getArray(at) : 특정 행의 내부 레코드 객체({ v: [...] }) 반환
	 * - data.getArray(at, colnm) : 특정 행의 특정 컬럼 원시 값 반환
	 */
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

		return targetRecord; // { v: [...], __ng: {...} } 원본 형태 반환
	};

	setArray = (rowIndex, colIndex, value) => {
		//trace.log(rowIndex, colnm, value)
		const validRecords = this.#getValidRecords();
		const rowData = validRecords[rowIndex];

		const oldValue = rowData.v[colIndex];
		if (oldValue !== value && rowData.__ng.rowState !== ngData.ROW_STATE.INSERT) {
			// 변경 전 값 보존 우선 주석처리
			//rowData.o[colIndex] = value;
			rowData.__ng.rowState = ngData.ROW_STATE.UPDATE;
		}

		rowData.v[colIndex] = value;
		//trace.log(rowData, COL_IDX);
	};


	/**
	 * 🎯 [외부 개발자/비즈니스 로직용] 개발자가 활용하기 편한 JSON 객체 형태로 변환하여 반환
	 * - data.get() : 전체 유효 데이터를 JSON 객체 배열로 변환
	 * - data.get(at) : 특정 행을 JSON 객체로 변환
	 * - data.get(at, colnm) : 특정 컬럼 값 반환
	 */
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

	/**
	 * 🎯 [저장/서버 전송용] 삭제된 행을 포함한 전체 원본 배열 반환
	 */
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
		//this.clear();
		//this.add(v, false);
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
			_: [rowid, [], ],
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
			o.__ng.rowState = ngData.ROW_STATE.INSERT;
			o.__ng._[0] = rowid;
		});
		return arr;
	};

	add = (dataSource, updateState = true) => {
		if (dataSource === undefined) dataSource = {};
		const arr = this.#json2Array(dataSource);

		this.#parent.rawRecords = this.#parent.rawRecords.concat(this.#defaultInsert(arr));

		const row = this.count() - 1;
		if (!updateState) {
			arr.forEach((_, idx) => {
				const target = this.#parent.rawRecords[this.#parent.rawRecords.length - 1 - idx];
				if (target) target.__ng.rowState = ngData.ROW_STATE.EMPTY;
			});
		}

		this.#invalidate();
		return row;
	};

	delete = (at) => {
		let arr = [];
		if (Array.isArray(at)) {
			arr = at;
		} else if (typeof at === "undefined") {
			arr = [this.#parent.host.row.at];
		} else {
			arr = [parseInt(at, 10)];
		}

		const validRecords = this.#getValidRecords();

		arr.sort((a, b) => b - a).forEach(rowidx => {
			if (validRecords[rowidx]) {
				const targetId = validRecords[rowidx].__ng.rowid;
				if (validRecords[rowidx].__ng.rowState === ngData.ROW_STATE.INSERT) {
					this.#parent.rawRecords = this.#parent.rawRecords.filter(item => item.__ng.rowid !== targetId);
				} else {
					this.#parent.rawRecords.forEach(item => {
						if (item.__ng.rowid === targetId) {
							item.__ng.deleted = true;
							item.__ng.rowState = ngData.ROW_STATE.DELETE;
						}
					});
				}
			}
		});

		this.#invalidate();
	};

	setValue = (rowIndex, colnm, value) => {
		//trace.log(rowIndex, colnm, value)
		rowIndex = parseInt(rowIndex, 10);
		const fields = this.getHostFields();
		const COL_IDX = fields.indexOf(colnm);
		if (COL_IDX < 0) return;

		const validRecords = this.#getValidRecords();
		const rowData = validRecords[rowIndex];
		if (!rowData) return;



		const oldValue = rowData.v[COL_IDX];
		if (oldValue !== value && rowData.__ng.rowState !== ngData.ROW_STATE.INSERT) {
			if (!rowData.__ng.o.hasOwnProperty(colnm)) rowData.__ng.o[colnm] = oldValue;
			rowData.__ng.rowState = ngData.ROW_STATE.UPDATE;
		}

		rowData.v[COL_IDX] = value;
		//trace.log(rowData, COL_IDX);
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
