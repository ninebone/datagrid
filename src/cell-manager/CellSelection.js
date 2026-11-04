import { trace } from "@nopeer";

export class CellSelection {
	#sheet;
	#range = { startRow: -1, startCol: -1, endRow: -1, endCol: -1 };

	constructor(sheet) {
		this.#sheet = sheet;
		this.#initEvents();
	}

	#getMatrixRow(tr) {
		if (!tr) return { dataRow: -1, subRowIndex: -1, matrixRow: -1 };

		const dataRow = parseInt(tr.dataset.index, 10);
		if (isNaN(dataRow)) return { dataRow: -1, subRowIndex: -1, matrixRow: -1 };

		const tbody = tr.closest('tbody');
		const trs = Array.from(tbody.querySelectorAll('tr'));

		const sameGroupTrs = trs.filter(t => parseInt(t.dataset.index, 10) === dataRow);
		const subRowIndex = sameGroupTrs.indexOf(tr);
		const templateLength = sameGroupTrs.length > 0 ? sameGroupTrs.length : 1;

		const matrixRow = (dataRow * templateLength) + (subRowIndex >= 0 ? subRowIndex : (tr.sectionRowIndex % templateLength));

		return { dataRow, subRowIndex, matrixRow };
	}

	setFocus(matrixRow, col) {
		this.#sheet.querySelectorAll(`tr.selected-start`).forEach($tr => {
			$tr.classList.remove("selected-start");
			$tr.querySelectorAll(`td.selected-start`).forEach($td => {
				$td.classList.remove("selected-start");
			});
		});

		const $td = this.#sheet.querySelector(`.ng-sheet-body-content tr[data-matrix-row="${matrixRow}"] td[data-col="${col}"]`);
		if (!$td) return;

		$td.classList.add("selected-start");
		$td.closest('tr')?.classList.add("selected-start");
	}

	setRange(startRow, startCol, endRow, endCol) {
		let r1 = Math.min(startRow, endRow);
		let r2 = Math.max(startRow, endRow);
		let c1 = Math.min(startCol, endCol);
		let c2 = Math.max(startCol, endCol);

		const containers = this.#sheet.querySelectorAll('.ng-container-left, .ng-container-body, .ng-container-right');

		let expanded = true;
		let loopCount = 0;

		while (expanded && loopCount < 5) {
			expanded = false;
			loopCount++;

			containers.forEach(container => {

				const visibleTrs = Array.from(container.querySelectorAll('tbody tr')).filter(tr => {
					return tr.style.display !== 'none'; // 혹은 tr.offsetHeight > 0 체크
				});

				visibleTrs.forEach(tr => {
					const { matrixRow } = this.#getMatrixRow(tr);
					if (matrixRow < 0) return;

					tr.querySelectorAll('td, th').forEach(cell => {
						const col = parseInt(cell.dataset.col, 10);
						if (isNaN(col)) return;

						const rowSpan = parseInt(cell.rowSpan || 1, 10);
						const colSpan = parseInt(cell.colSpan || 1, 10);

						const cellEndRow = matrixRow + rowSpan - 1;
						const cellEndCol = col + colSpan - 1;

						const isIntersecting = cellEndRow >= r1 && matrixRow <= r2 && cellEndCol >= c1 && col <= c2;

						if (isIntersecting) {
							const nsR = Math.min(r1, matrixRow);
							const neR = Math.max(r2, cellEndRow);
							const nsC = Math.min(c1, col);
							const neC = Math.max(c2, cellEndCol);

							if (nsR !== r1 || neR !== r2 || nsC !== c1 || neC !== c2) {
								r1 = nsR; r2 = neR; c1 = nsC; c2 = neC;
								expanded = true;
							}
						}
					});
				});
			});
		}

		this.#range = { startRow: r1, startCol: c1, endRow: r2, endCol: c2 };

		//this.#sheet.view.clearSelectedRange();
		//this.#sheet.view.setSelectedRange(r1, r2, c1, c2);

		this.render();
	}

	get minRow() {
		return this.#range.startRow;
	};
	get maxRow() {
		return this.#range.endRow;
	};
	get minCol() {
		return this.#range.startCol;
	};
	get maxCol() {
		return this.#range.endCol;
	};

	refresh = () => {
		this.render();
	}

	render = () => {
		const { startRow, startCol, endRow, endCol } = this.#range;

		const containers = this.#sheet.querySelectorAll(
			'.ng-container-left, .ng-container-body, .ng-container-right'
		);

		containers.forEach(container => {
			container.querySelectorAll('.selected, .selected-top, .selected-bottom, .selected-left, .selected-right, .selected-start').forEach(el => {
				el.classList.remove('selected', 'selected-top', 'selected-bottom', 'selected-left', 'selected-right', 'selected-start');
			});

			container.querySelectorAll('tr.selected-start').forEach(tr => {
				tr.classList.remove('selected-start');
			});
		});

		if (startRow < 0 || startCol < 0) return;

		containers.forEach((container) => {
			const visibleTrs = Array.from(container.querySelectorAll('tbody tr')).filter(tr => {
				return tr.style.display !== 'none';
			});

			visibleTrs.forEach(tr => {
				const { matrixRow } = this.#getMatrixRow(tr);
				if (matrixRow < 0) return;


				if (matrixRow >= startRow && matrixRow <= endRow) {
					container.querySelectorAll(`tbody tr[data-index="${tr.dataset.index}"]`).forEach(tr => {
						tr.classList.add('selected');
					});
				}

				//trace.log(this.#sheet.view);


				tr.querySelectorAll('td, th').forEach(cell => {
					const col = parseInt(cell.dataset.col, 10);
					if (isNaN(col)) return;

					const rowSpan = parseInt(cell.rowSpan || 1, 10);
					const colSpan = parseInt(cell.colSpan || 1, 10);

					const cellEndRow = matrixRow + rowSpan - 1;
					const cellEndCol = col + colSpan - 1;

					const isSelected = cellEndRow >= startRow && matrixRow <= endRow && cellEndCol >= startCol && col <= endCol;
					if (!isSelected) return;

					cell.classList.add('selected');

					if (matrixRow <= startRow) cell.classList.add('selected-top');
					if (cellEndRow >= endRow) cell.classList.add('selected-bottom');
					if (col <= startCol) cell.classList.add('selected-left');
					if (cellEndCol >= endCol) cell.classList.add('selected-right');
				});
			});
		});
	}

	#initEvents() {
		const mainZone = this.#sheet.querySelector('.ng-sheet-body');
		if (!mainZone) {
			return;
		}

		mainZone.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;

			const cell = e.target.closest('td, th');
			if (!cell) return;
			if (cell.dataset.row === undefined || cell.dataset.col === undefined) return;

			this.#sheet.style.userSelect = 'none';
			this.#sheet.style.webkitUserSelect = 'none';

			const tr = cell.closest('tr');
			const { matrixRow: startRow } = this.#getMatrixRow(tr);
			const startCol = parseInt(cell.dataset.col, 10);

			if (startRow < 0) {
				this.#sheet.style.userSelect = '';
				this.#sheet.style.webkitUserSelect = '';
				return;
			}

			this.setFocus(startRow, startCol);
			this.setRange(startRow, startCol, startRow, startCol);

			let lastMatrixRow = startRow;
			let lastCol = startCol;

			const onMouseMove = (moveEvent) => {
				const targetEl = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
				let targetCell = targetEl?.closest('td, th');

				if (!targetCell || !this.#sheet.contains(targetCell)) {
					const allCells = this.#sheet.querySelectorAll('.ng-sheet-body-content tbody tr td, .ng-sheet-body-content tbody tr:not(.nodata) th');
					for (const c of allCells) {
						const rect = c.getBoundingClientRect();
						if (
							moveEvent.clientX >= rect.left &&
							moveEvent.clientX <= rect.right &&
							moveEvent.clientY >= rect.top &&
							moveEvent.clientY <= rect.bottom
						) {
							targetCell = c;
							break;
						}
					}
				}

				if (!targetCell) return;
				if (targetCell.dataset.row === undefined || targetCell.dataset.col === undefined) return;

				const targetTr = targetCell.closest('tr');
				const { matrixRow: endRow } = this.#getMatrixRow(targetTr);
				const endCol = parseInt(targetCell.dataset.col, 10);

				if (endRow < 0) return;
				if (lastMatrixRow === endRow && lastCol === endCol) return;

				lastMatrixRow = endRow;
				lastCol = endCol;

				this.setRange(startRow, startCol, endRow, endCol);
			};

			const onMouseUp = () => {
				this.#sheet.style.userSelect = '';
				this.#sheet.style.webkitUserSelect = '';

				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
			};

			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
		});
	}
}