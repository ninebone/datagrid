import { trace } from "@nopeer";

export const TREE_IDX = {
	ID: 0,
	DEPTH: 1,
	NAME: 2,
	CHILDREN: 3,
};

export class TreeManager {
	#sheet;
	#host;
	#collapsedMap = new Map(); // 노드별 접힘 상태 관리 (`nodeId` -> boolean)

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = this.#sheet.getRootNode().host;
	}

	toggleNode(nodeId) {
		const currentState = this.#collapsedMap.get(nodeId) || false;
		this.#collapsedMap.set(nodeId, !currentState);
		this.#sheet.invalidate();
	}

	isCollapsed(nodeId) {
		return this.#collapsedMap.get(nodeId) || false;
	}

	expandAll() {
		this.#collapsedMap.clear();
		this.#sheet.invalidate();
	}

	collapseAll(rawRecords) {
		const fields = this.#host?.fields?.get() || [];
		const $cell = this.#sheet?.source?.table?.querySelector("tbody [cell-type='tree']");
		const idField = $cell?.getAttribute("key-name") || 'id';
		const parentIdField = $cell?.getAttribute("parent-key-name") || 'parentId';

		const treeData = Tree.buildTree(rawRecords, idField, parentIdField, fields);

		const collectIds = (nodes) => {
			if (!nodes || !Array.isArray(nodes)) return;
			nodes.forEach(node => {
				if (node.children && node.children.length > 0) {
					const nodeId = node.record.__nodeId || node.record.id;
					this.#collapsedMap.set(nodeId, true);
					collectIds(node.children);
				}
			});
		};
		collectIds(treeData.roots);
		this.#sheet.invalidate();
	}

	get collapsedMap() {
		return this.#collapsedMap;
	}

	#setDepthCollapse(targetDepth, collapse) {
		// 💡 외부에서 안 받고 GroupingManager처럼 내부에서 유효한 레코드 자동 획득
		const validRaw = this.#sheet.view.getValidRecords ? this.#sheet.view.getValidRecords() : this.#host?.data?.getRawRecords();
		if (!validRaw || validRaw.length === 0) return;

		const fields = this.#host?.fields?.get() || [];
		const $cell = this.#sheet?.source?.table?.querySelector("tbody [cell-type='tree']");
		const idField = $cell?.getAttribute("key-name") || 'id';
		const parentIdField = $cell?.getAttribute("parent-key-name") || 'parentId';

		const treeData = Tree.buildTree(validRaw.filter(o => !o.__ng?.deleted), idField, parentIdField, fields);

		const updateMapByDepth = (nodes, currentDepth) => {
			if (!nodes || !Array.isArray(nodes)) return;

			nodes.forEach(node => {
				const nodeId = node.record.__nodeId || node.record.id;

				if (currentDepth === targetDepth) {
					if (node.children && node.children.length > 0) {
						this.#collapsedMap.set(nodeId, collapse);
					}
				}

				if (node.children && node.children.length > 0) {
					updateMapByDepth(node.children, currentDepth + 1);
				}
			});
		};

		updateMapByDepth(treeData.roots, 0);
	}

	expand(depth) {
		if (depth === null || depth === undefined) {
			this.#collapsedMap.clear();
		} else {
			this.#setDepthCollapse(depth, false);
		}
		this.#sheet.invalidate();
	}

	collapse(depth) {
		if (depth === null || depth === undefined) {
			// 전체 접기 시에도 내부에서 데이터 조회 가능하도록 수정
			const validRaw = this.#sheet.view.getValidRecords ? this.#sheet.view.getValidRecords() : this.#host?.data?.getRawRecords();
			if (validRaw) this.collapseAll(validRaw);
		} else {
			this.#setDepthCollapse(depth, true);
		}
		this.#sheet.invalidate();
	}

	isDepthCollapsed(targetDepth) {
		const validRaw = this.#sheet.view.getValidRecords ? this.#sheet.view.getValidRecords() : this.#host?.data?.getRawRecords();
		if (!validRaw || validRaw.length === 0) return null;

		const fields = this.#host?.fields?.get() || [];
		const $cell = this.#sheet?.source?.table?.querySelector("tbody [cell-type='tree']");
		const idField = $cell?.getAttribute("key-name") || 'id';
		const parentIdField = $cell?.getAttribute("parent-key-name") || 'parentId';

		const treeData = Tree.buildTree(validRaw.filter(o => !o.__ng?.deleted), idField, parentIdField, fields);

		let targetIds = [];

		const collectIdsByDepth = (nodes, currentDepth) => {
			if (!nodes || !Array.isArray(nodes)) return;

			nodes.forEach(node => {
				const nodeId = node.record.__nodeId || node.record.id;
				const hasChildren = node.children && node.children.length > 0;

				if (currentDepth === targetDepth && hasChildren) {
					targetIds.push(nodeId);
				}

				if (hasChildren) {
					collectIdsByDepth(node.children, currentDepth + 1);
				}
			});
		};

		collectIdsByDepth(treeData.roots, 0);

		if (targetIds.length === 0) return null;

		const collapsedCount = targetIds.filter(nodeId => this.#collapsedMap.get(nodeId) === true).length;

		return (collapsedCount === targetIds.length) ? true : (collapsedCount === 0) ? false : null;
	}
}

export class Tree {

	static apply(rawRecords, collapsedMap = new Map(), idField, parentIdField, columns) {
		if (!rawRecords || rawRecords.length === 0) {
			return { headers: [], renderItems: [], maxDepth: 0 };
		}

		const validRaw = rawRecords.filter(o => !o.__ng?.deleted);

		const treeData = Tree.buildTree(validRaw, idField, parentIdField, columns);
		const roots = treeData.roots;

		// 💡 전체 트리 구조에서 최대 depth 계산 (0부터 시작하므로 최하위가 depth 2면 maxDepth는 2 또는 3)
		const maxDepth = Tree.#calcMaxDepth(roots, 0);

		const headers = [];
		const renderItems = [];

		Tree.#flattenTree(roots, collapsedMap, 0, renderItems);

		return { headers, renderItems, maxDepth };
	}

	static buildTree(records, idField, parentIdField, columns) {
		const map = new Map();
		const roots = [];

		const idIdx = typeof idField === 'number' ? idField : columns.indexOf(idField);
		const parentIdIdx = typeof parentIdField === 'number' ? parentIdField : columns.indexOf(parentIdField);

		// 1. 모든 노드를 map에 등록
		records.forEach((record, index) => {
			if (!record) return;

			let id = null;
			if (idIdx >= 0 && record.v) {
				id = record.v[idIdx];
			} else {
				id = record[idField] || record.id;
			}

			// 💡 ID가 아예 없거나 빈 값이면 임시 고유 ID를 부여하되, 루트로 빼지 않을지 판단 필요
			if (id === undefined || id === null || id === '') {
				id = `__empty_id_${index}`;
			}

			record.__nodeId = String(id);
			map.set(record.__nodeId, { record, children: [], __depth: 0 });
		});

		// 2. 부모-자식 관계 연결
		records.forEach((record, index) => {
			if (!record) return;
			const nodeId = record.__nodeId;
			const node = map.get(nodeId);
			if (!node) return;

			let parentId = null;
			if (parentIdIdx >= 0 && record.v) {
				parentId = record.v[parentIdIdx];
			} else {
				parentId = record[parentIdField] || record.parentId;
			}

			// 💡 부모 ID가 유효하고(빈 값이 아니고) 맵에 존재하는 경우만 자식으로 연결
			if (parentId !== null && parentId !== undefined && parentId !== '') {
				const parentKey = String(parentId);
				const parent = map.get(parentKey);

				if (parent) {
					parent.children.push(node);
					node.__parentId = parentKey;
				} else {
					// 부모 ID는 적혀있는데 해당하는 부모를 못 찾은 경우
					roots.push(node);
				}
			} else {
				// 💡 만약 이 행 자체가 트리 구조에 속하지 않는 일반 데이터(ID/ParentID가 다 빈 행)라면
				// roots에 넣지 않고 아예 제외하거나 별도 처리가 필요할 수 있습니다.
				// 현재는 부모가 없으면 Root로 들어가므로 맨 앞에 쏟아졌던 것입니다.

				// 만약 빈 값인 행들을 트리의 최상위로 올리고 싶지 않다면 여기서 필터링할 수 있습니다.
				if (idIdx >= 0 && record.v && record.v[idIdx] !== '') {
					roots.push(node);
				}
			}
		});

		return { roots, map };
	}

	static #calcMaxDepth(nodes, currentDepth = 0) {
		if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
			return currentDepth;
		}

		let max = currentDepth;
		nodes.forEach(node => {
			if (node.children && node.children.length > 0) {
				const childMax = Tree.#calcMaxDepth(node.children, currentDepth + 1);
				if (childMax > max) {
					max = childMax;
				}
			}
		});
		return max;
	}

	static #flattenTree(nodes, collapsedMap, depth = 0, result = []) {
		if (!nodes || !Array.isArray(nodes)) return result;

		nodes.forEach(node => {
			// 깊이 및 자식 유무 설정
			node.__depth = depth;
			node.__hasChildren = node.children && node.children.length > 0;

			const nodeId = node.record.__nodeId || node.record.id;
			const isCollapsed = collapsedMap.get(nodeId) === true;
			node.__collapsed = isCollapsed;

			// 1. 부모 노드 먼저 결과에 담고
			result.push({
				type: 'tree-node',
				record: node.record,
				nodeId,
				depth,
				hasChildren: node.__hasChildren,
				collapsed: isCollapsed
			});

			// 2. 접혀있지 않고 자식이 있다면, 바로 이어서 자식들을 재귀 순회하여 밀어 넣음 (부모 바로 밑에 자식이 붙는 핵심 원리)
			if (!isCollapsed && node.__hasChildren) {
				this.#flattenTree(node.children, collapsedMap, depth + 1, result);
			}
		});
		return result;
	}
}