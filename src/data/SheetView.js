import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";
import {Grouping} from "@/data/Grouping.js";

export class SheetView {
	#sheet;
	#host;
	#sortingColumns = []; // 정렬 규칙 [{ colname, asc, expr-func }]
	#filterRules = [];    // 필터 규칙
	#viewIndexes = [];    // 필터링 및 소팅이 반영된 유효 데이터 인덱스 버퍼

	#cachedVisibleRecords = null; // 💡 [추가] 캐싱된 유효 레코드 배열

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = sheet.getRootNode().host;

		this.refresh();
	}

	/**
	 * 🎯 [시트 뷰 전용 배열 조회] - 캐시 적용으로 성능 대폭 개선
	 */
	getArray = (at, colnm) => {
		// 💡 캐시가 없거나 비어있을 때만 가져옴 (보통 refresh에서 갱신됨)
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
			const fields = this.#host.data.getHostFields();
			const idx = fields.indexOf(colnm);
			return (idx >= 0 && targetRecord.v) ? targetRecord.v[idx] : null;
		}

		return targetRecord;
	};

	count = () => {
		// 💡 캐시가 없거나 비어있을 때만 가져옴 (보통 refresh에서 갱신됨)
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

	/**
	 * 🎯 유효 데이터 또는 정렬/필터 변경 시에만 실행되는 뷰 버퍼 재계산
	 */
		// SheetView.refresh() 내부 예시
	refresh = () => {

		this.#cachedVisibleRecords = null;

		// 1. 필터 적용
		const rawRecords = this.#host.data.getArray();
		let indices = [];
		rawRecords.forEach((record, i) => {
			if (!record) return;
			const filterSlot = record.m?._?.[NINE_TABLE.META.INDEX.FILTER];
			if (filterSlot && filterSlot[this.#sheet.index] === false) return;
			indices.push(i);
		});

		// 2. 정렬 적용
		if (this.#sortingColumns.length > 0) {
			indices = this.#applySorting(indices, rawRecords);
		}

		this.#viewIndexes = indices;
		const validRecords = indices.map(idx => rawRecords[idx]);

		//trace.log(this.#sheet.sourceTable);
		//const isGrouped = this.#sheet.sourceTable?.querySelector("tbody tr[grouping='true']") ? true : false;
		//trace.log("#######", isGrouped, this.#sheet.grouping?.columns);
		const groupColumns = this.#sheet.grouping?.columns || [];
		if (groupColumns.length > 0) {
			//this.#sheet.grouping.apply();
			const groupResult = Grouping.apply(validRecords, groupColumns, this.#host.data.getHostFields());
			//const groupResult = Grouping.apply(validRecords);
			this.#cachedVisibleRecords = groupResult.renderItems; // 최종 렌더링 아이템

			//trace.log("2.============================", groupColumns, this.#cachedVisibleRecords);

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
		trace.log(new Date());

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

				// 💡 1. expr 수식이 존재하면 ExprEngine으로 연산된 결과값을 가져옴
				if (expr) {
					valA = this.#host.exprEngine.evaluate(expr, a, idxA);
					valB = this.#host.exprEngine.evaluate(expr, b, idxB);
				} else {
					// 2. 일반 바인딩 필드인 경우 원시 배열에서 추출
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

		trace.log(new Date());
	};
}