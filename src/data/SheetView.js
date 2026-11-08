import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";
import {Grouping} from "@/data/Grouping.js";

export class SheetView {
	#sheet;
	#host;
	#sortingColumns = [];
	#filterRules = [];
	#viewIndexes = [];

	#cachedVisibleRecords = null;

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = sheet.getRootNode().host;

		this.refresh();
	}

	getArray = (at, colnm) => {

		if (!this.#cachedVisibleRecords) {
			const records = this.#host.data.getArray();
			this.#cachedVisibleRecords = this.#viewIndexes.map(idx => records[idx]);
		}

		const visibleRecords = this.#cachedVisibleRecords;

		if (at === undefined || at === null) {
			return visibleRecords;
		}

		if (at < 0 || at >= visibleRecords.length) return null;

		const targetRecord = visibleRecords[at];
		if (colnm != null) {
			const fields = this.#host.fields.get();
			const idx = fields.indexOf(colnm);
			return (idx >= 0 && targetRecord.v) ? targetRecord.v[idx] : null;
		}

		return targetRecord;
	};

	count = () => {
		if (!this.#cachedVisibleRecords) {
			const records = this.#host.data.getArray();
			this.#cachedVisibleRecords = this.#viewIndexes.map(idx => records[idx]);
		}

		return this.#cachedVisibleRecords.length;
	}

	get = (at, colnm) => {
		const visibleRecords = this.getArray();
		const fields = this.#host.data.getHostFields?.() || [];

		if (at === undefined || at === null) {
			return visibleRecords.map(record => this.#convSingle(record, fields));
		}

		if (at < 0 || at >= visibleRecords.length) return null;

		const targetRecord = visibleRecords[at];
		if (!targetRecord) return null;

		if (colnm != null) {
			const idx = fields.indexOf(colnm);
			return (idx >= 0 && targetRecord.v) ? targetRecord.v[idx] : null;
		}

		return this.#convSingle(targetRecord, fields);
	};

	#convSingle = (o, fields) => {
		if (!o) return null;
		const t = {};
		fields.forEach((colnm, i) => {
			t[colnm] = o.v ? o.v[i] : o[colnm];
		});
		if (o.m) t.m = o.m;
		if (o._) t._ = o._;
		return t;
	};

	refresh = () => {

		this.#cachedVisibleRecords = null;

		const rawRecords = this.#host.data.getArray();
		let indices = [];
		rawRecords.forEach((record, i) => {
			if (!record) return;
			const filterSlot = record.m?._?.[NINE_TABLE.META.INDEX.FILTER];
			if (filterSlot && filterSlot[this.#sheet.index] === false) return;
			indices.push(i);
		});

		if (this.#sortingColumns.length > 0) {
			indices = this.#applySorting(indices, rawRecords);
		}

		this.#viewIndexes = indices;
		const validRecords = indices.map(idx => rawRecords[idx]);

		const groupColumns = this.#sheet.grouping?.columns || [];

		trace.log(groupColumns);

		if (groupColumns.length > 0) {
			const groupResult = Grouping.apply(validRecords, groupColumns, this.#host.data.getHostFields());

			this.#cachedVisibleRecords = groupResult.renderItems; // 최종 렌더링 아이템

			this.#sheet.grouping.setGroupMap(groupResult.groupMap); // 자식 매핑 공유
		} else {
			this.#cachedVisibleRecords = validRecords;
		}



	}

	setSorting = (columns) => {
		this.#sortingColumns = columns || [];
		this.refresh();
	};

	getSorting = () => {
		return this.#sortingColumns;
	};

	resetSorting = () => {
		this.#sortingColumns = [];
		this.refresh();
	};


	#applySorting = (indices, validRecords) => {

		const fields = typeof this.#host.data.getHostFields === 'function' ? this.#host.data.getHostFields() : [];

		const rulesWithIdx = this.#sortingColumns.map(rule => ({
			...rule,
			colIndex: fields.indexOf(rule.colname || rule.colName)
		}));

		return indices.sort((idxA, idxB) => {
			const a = validRecords[idxA];
			const b = validRecords[idxB];

			for (const rule of rulesWithIdx) {
				const isAsc = rule.asc;
				const expr = rule.expr; // 💡 등록된 expr 수식
				let valA, valB;

				if (expr) {
					valA = this.#host.exprEngine.evaluate(expr, a, idxA);
					valB = this.#host.exprEngine.evaluate(expr, b, idxB);
				} else {
					if (rule.colIndex >= 0 && a.v && b.v) {
						valA = a.v[rule.colIndex];
						valB = b.v[rule.colIndex];
					}
				}

				const isEmptyA = (valA === null || valA === undefined || valA === '');
				const isEmptyB = (valB === null || valB === undefined || valB === '');

				if (isEmptyA && isEmptyB) continue;
				if (isEmptyA) return 1;
				if (isEmptyB) return -1;

				if (valA !== valB) {
					let diff = 0;

					if (typeof valA === 'number' && typeof valB === 'number') {
						diff = valA - valB;
					} else {
						const strA = String(valA);
						const strB = String(valB);
						diff = strA > strB ? 1 : (strA < strB ? -1 : 0);
					}

					if (diff !== 0) {
						return isAsc ? diff : -diff;
					}
				}
			}

			return idxA - idxB;
		});
	};
}