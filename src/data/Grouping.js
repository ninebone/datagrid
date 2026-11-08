import { trace } from "@nopeer";

export const GROUP_IDX = {
	ID: 0,
	DEPTH: 1,
	NAME: 2,
	CHILDREN: 3,
};

export class GroupingManager {
	#sheet;
	#host;
	#groupColumns = [];
	#groupMap = new Map(); // 그룹별 자식 ID 매핑 관리용
	#isApplying = false;

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = this.#sheet.getRootNode().host;
	}

	get columns() {
		return this.#groupColumns;
	}

	get groupMap() {
		return this.#groupMap;
	}

	initialize = () => {
		let groupColumns = [];
		const sourceTable = this.#sheet.sourceTable;
		if (sourceTable) {
			sourceTable.querySelectorAll('tbody tr[grouping="true"]').forEach(($tr) => {
				const $cell =$tr.querySelector(`[cell-type="tree"]`);
				if ($cell &&$cell.dataset.bind) {
					groupColumns.push($cell.dataset.bind);
				}
			});
		}

		this.#groupColumns = groupColumns;
	};

	apply() {

		if (this.#isApplying) return;
		this.#isApplying = true;

		let groupColumns = [];
		const sourceTable = this.#sheet.sourceTable;
		if (sourceTable) {
			sourceTable.querySelectorAll('tbody tr[grouping="true"]').forEach(($tr) => {
				const $cell =$tr.querySelector(`[cell-type="tree"]`);
				if ($cell &&$cell.dataset.bind) {
					groupColumns.push($cell.dataset.bind);
				}
			});
		}

		this.#groupColumns = groupColumns;

		this.#isApplying = false;
		this.#sheet.scrollToY(0);
		this.#sheet.view.refresh();
	}

	clear() {
		this.#groupColumns = [];
		this.#groupMap.clear();
		this.#isApplying = false;
		this.#sheet.scrollToY(0);
		this.#sheet.view.refresh();
	}

	setGroupMap(map) {
		this.#groupMap = map;
	}

	getChildrenRowIds(groupId) {
		return this.#groupMap.get(groupId) || [];
	}

	getChildrenRecords(groupId) {
		const rowIds = this.getChildrenRowIds(groupId);
		const dataManager = this.#host.data;
		return rowIds.map(rowid => dataManager.getArray(rowid)).filter(Boolean);
	}
}

export class Grouping {

	static apply(rawRecords, groupColumns = [], fields = []) {
		if (!groupColumns || groupColumns.length === 0) {
			return { headers: [], renderItems: [], groupMap: new Map() };
		}

		const validRaw = rawRecords.filter(o => !o.__ng?.deleted);
		const groupMap = new Map();

		const nestedTree = Grouping.#buildNestedMap(validRaw, groupColumns, fields);
		const flatResult = [];
		const renderItems = [];

		Grouping.#flattenTree(nestedTree, 0, groupColumns, flatResult, renderItems, groupMap, "");

		return { headers: flatResult, renderItems, groupMap };
	}

	static #flattenTree(mapOrArray, depth, groupColumns, resultArr, renderItems, groupMap, parentId) {
		let counter = 0;
		const isLastLevel = (depth === groupColumns.length - 1); // 💡 연산자 수정 반영

		for (let [groupKey, subMapOrRecords] of mapOrArray.entries()) {
			const groupId = parentId ? `${parentId}_${counter++}` : `g_${counter++}`;

			const rowIds = Grouping.#collectLeafRowIds(subMapOrRecords);
			groupMap.set(groupId, rowIds);

			const groupRecord = [];
			groupRecord[GROUP_IDX.ID] = groupId;
			groupRecord[GROUP_IDX.DEPTH] = depth;
			groupRecord[GROUP_IDX.NAME] = groupKey;
			groupRecord[GROUP_IDX.CHILDREN] = rowIds;

			groupRecord.__isGroupHeader = true;
			groupRecord.__groupId = groupId;

			resultArr.push(groupRecord);

			renderItems.push({
				type: 'group',
				record: groupRecord,
				groupId: groupId,
			});

			if (!isLastLevel && subMapOrRecords instanceof Map) {
				Grouping.#flattenTree(subMapOrRecords, depth + 1, groupColumns, resultArr, renderItems, groupMap, groupId);
			} else {
				const leafRecords = Grouping.#collectLeafRecords(subMapOrRecords);
				leafRecords.forEach(record => {
					record.__isGroupHeader = false;
					record.__groupId = groupId;
					resultArr.push(record);

					renderItems.push({
						type: 'data',
						record: record,
						groupId: groupId
					});
				});
			}
		}
	}

	static #buildNestedMap(records, groupColumns, fields) {
		const colIndex = fields.indexOf(groupColumns[0]);
		const remainingCols = groupColumns.slice(1);
		const map = new Map();

		records.forEach(record => {
			const key = colIndex >= 0 ? record.v[colIndex] : '(Unknown)';
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(record);
		});

		if (remainingCols.length > 0) {
			const result = new Map();
			for (let [key, subRecords] of map.entries()) {
				result.set(key, Grouping.#buildNestedMap(subRecords, remainingCols, fields));
			}
			return result;
		}
		return map;
	}

	static #collectLeafRowIds(subMapOrRecords) {
		let rowIds = [];
		if (subMapOrRecords instanceof Map) {
			for (let subVal of subMapOrRecords.values()) {
				rowIds = rowIds.concat(Grouping.#collectLeafRowIds(subVal));
			}
		} else if (Array.isArray(subMapOrRecords)) {
			rowIds = rowIds.concat(subMapOrRecords.map(r => r.__ng?.rowid ?? r.m?._?.[0]));
		}
		return rowIds;
	}

	static #collectLeafRecords(subMapOrRecords) {
		let records = [];
		if (subMapOrRecords instanceof Map) {
			for (let subVal of subMapOrRecords.values()) {
				records = records.concat(Grouping.#collectLeafRecords(subVal));
			}
		} else if (Array.isArray(subMapOrRecords)) {
			records = records.concat(subMapOrRecords);
		}
		return records;
	}
}