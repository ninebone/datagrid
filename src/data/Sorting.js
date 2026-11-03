// ui/data/Sorting.js (또는 정렬 관련 소스)
import { trace } from "@nopeer";

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

				if (e.offsetX <= 2 || e.offsetX >= cell.offsetWidth - 2) return;

				const host = this.#sheet.getRootNode().host;

				host.loading = true;
				setTimeout(() => {
					try {
						this.#handleSort(e, cell);
					} finally {
						host.loading = false;
					}
				});
			});
		});
	}

	#handleSort(e, cell) {
		const colIndex = cell.dataset.col;
		const tr = cell.closest('tr');
		const subRowIndex = tr ? tr.dataset.subrow || String(tr.sectionRowIndex) : '0';

		if (colIndex === undefined) return;

		const sourceTable = this.#sheet.sourceTable;
		if (!sourceTable) return;

		let colName = null;
		let exprVal = null;

		sourceTable.querySelectorAll(`tbody [data-col="${colIndex}"]`).forEach($td => {
			if ($td.dataset.bind) {
				colName = $td.dataset.bind;
			}

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

		this.#applySorting(cell);
	}

	#applySorting(cell) {

		this.#sheet.view.setSorting(this.#columns);
		this.#syncHeaderUI();
		this.#sheet.invalidate();
		requestAnimationFrame(() => {
		const cells = this.#sheet.querySelectorAll('tbody.body th, tbody.body td');

		cells.forEach($td => {
			$td.classList.remove('sorting-anim-asc', 'sorting-anim-desc', 'sorting-anim-none');

			if (cell.classList.contains('asc')) {
				$td.classList.add('sorting-anim-asc');
			} else if (cell.classList.contains('desc')) {
				$td.classList.add('sorting-anim-desc');
			} else {
				$td.classList.add('sorting-anim-none');
			}
		});

		requestAnimationFrame(() => {
			cells.forEach($td => {
				$td.classList.remove('sorting-anim-asc', 'sorting-anim-desc', 'sorting-anim-none');
			});
		});
		});
	}

	#syncHeaderUI() {
		this.#sheet.querySelectorAll('thead th, thead td').forEach(el => {
			el.classList.remove('asc', 'desc');
		});

		if (this.#columns.length === 0) {
			return;
		}

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