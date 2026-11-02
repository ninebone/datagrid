// ui/data/Sorting.js (또는 정렬 관련 소스)
import { trace } from "@nopeer";
import { TableCompiler } from "@/layout/core/TableCompiler.js";

export class Sorting {
	#sheet;
	#host;

	#columns = [];

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = sheet.getRootNode().host;

		setTimeout(() => {
			this.#initEvents();
		}, 300);
	}

	#initEvents() {

		this.#sheet.querySelectorAll("thead").forEach($el => {

			$el.addEventListener('dblclick', (e) => {

				const cell = e.target.closest('th, td');
				if (!cell || cell.classList.contains('resizable-edge')) return;

				if (["INPUT","CELL-CHECKBOX"].includes(e.target.tagName)) return;

				// 🎯 [수정] 줄바꿈으로 깨져있던 마이너스 연산자를 한 줄로 정상 복구
				if (e.offsetX <= 2 || e.offsetX >= cell.offsetWidth - 2) return;

				const host = this.#sheet.getRootNode().host;

				host.loading = true;
				setTimeout(() => {
					try {
						this.#handleSort(e, cell);
					} finally {
						// 🎯 3. 작업이 끝나면 무조건 로딩바 끄기
						host.loading = false;
					}
				}); // 또는 requestAnimationF
			});
		});

		trace.log("🎯 [NineTableSorting] Initialized");
	}

	#handleSort(e, cell) {
		const colIndex = cell.dataset.col;
		const tr = cell.closest('tr');
		const subRowIndex = tr ? tr.dataset.subrow || String(tr.sectionRowIndex) : '0';

		if (colIndex === undefined) return;

		const sourceTable = this.#sheet.sourceTable;
		if (!sourceTable) return;

		let colName = null;
		let exprVal = null; // 💡 expr 속성 수집용 변수

		// 1. 🎯 데이터 바인딩 키(colName) 및 expr 탐지
		sourceTable.querySelectorAll(`tbody [data-col="${colIndex}"]`).forEach($td => {
			if ($td.dataset.bind) {
				colName = $td.dataset.bind;
			}
			// 💡 셀에 선언된 expr 식 추출
			if ($td.dataset.expr) {
				exprVal = $td.dataset.expr;
			}
		});

		if (!colName && !exprVal) return;

		const isAsc = cell.classList.contains('asc');
		const isDesc = cell.classList.contains('desc');

		if (!e.ctrlKey && !e.shiftKey) {
			this.#columns = [];
		}

		const existingColIndex = this.#columns.findIndex(
			m => (m.colIndex === colIndex && m.subRowIndex === subRowIndex) || m.colName === colName
		);

		// 정렬 규칙 추가 시 expr 속성(`expr`) 함께 저장
		const ruleData = {
			colIndex,
			subRowIndex,
			colname: colName || exprVal,
			colName: colName || exprVal,
			expr: exprVal, // 💡 expr 규칙 보관
			asc: true,
			"expr-func": exprVal ? (record, idx) => this.#host.exprEngine(exprVal, record, idx) : null
		};

		if (!isAsc && !isDesc) {
			if (existingColIndex >= 0) {
				this.#columns[existingColIndex].asc = true;
			} else {
				this.#columns.push({ ...ruleData, asc: true });
			}
		} else if (isAsc) {
			if (existingColIndex >= 0) {
				this.#columns[existingColIndex].asc = false;
			} else {
				this.#columns.push({ ...ruleData, asc: false });
			}
		} else {
			this.#columns = this.#columns.filter(
				m => !((m.colIndex === colIndex && m.subRowIndex === subRowIndex) || m.colName === colName)
			);
		}

		this.#applySorting();
	}

	#applySorting() {
		if (!this.#sheet.view) {
			console.warn("⚠️ [NineTableSorting] Sheet view (SheetView) is not initialized.");
			return;
		}

		this.#sheet.view.setSorting(this.#columns);
		this.#syncHeaderUI();
		this.#sheet.invalidate();
		//this.#sheet.rowManager?.refresh(true);

		trace.log("🔄 [NineTableSorting] Sorting applied via RowManager.refresh(true)");
	}

	#syncHeaderUI() {
		// 기존 UI 클래스 초기화
		this.#sheet.querySelectorAll('thead th, thead td').forEach(el => {
			el.classList.remove('asc', 'desc');
		});

		if (this.#columns.length === 0) {
			return;
		}

		// 🎯 [핵심] tr[data-subrow] + [data-col] 조합으로 정밀 타겟팅
		this.#columns.forEach(colRule => {
			const { colIndex, subRowIndex, asc } = colRule;

			if (colIndex !== undefined) {
				let selector = `thead [data-col="${colIndex}"]`;
				if (subRowIndex !== undefined) {
					selector = `thead tr[data-subrow="${subRowIndex}"] [data-col="${colIndex}"]`;
				}

				const targetHeaderCells = this.#sheet.querySelectorAll(selector);
				targetHeaderCells.forEach(cell => {
					cell.classList.add(asc ? 'asc' : 'desc');
				});
			}
		});

		//TableCompiler.decompile(this.#sheet);
	}

	restore() {
		this.#columns = [];
		if (this.#sheet.view) {
			this.#sheet.view.resetSorting();
		}

		this.#syncHeaderUI();
		this.#sheet.rowManager?.refresh(true);
	}
}