import { trace } from "@nopeer";

export class CellNavigation {
	#sheet;
	#host;

	#currentCell = null;
	#currentTr = null;

	constructor(sheet) {
		this.#sheet = sheet;
		this.#host = sheet.getRootNode().host;

		this.#initEvents();
		trace.log("🎯 [CellNavigation] Initialized (Diagnostic Logging Restored)");
	}

	get currentCell() {
		return this.#currentCell;
	}

	set currentCell(cell) {
		if (!cell) return;

		this.#currentCell = cell;
		cell.focus({ preventScroll: true });

		this.#currentTr = cell.closest("tr");
		const matrixRow = parseInt(this.#currentTr.dataset.matrixRow, 10);//this.#getMatrixRowFromTr(this.#currentTr);

		//trace.log(`📌 [setCurCell] Active set -> dataRow: ${cell.dataset.index}, subrow: ${cell.closest('tr')?.dataset.subrow}, matrixRow: ${matrixRow}, col: ${cell.dataset.col}`);
		this.#sheet.selection.setFocus(matrixRow, this.#currentCell.dataset.col);
	}


	#moveCellH = (e, cell) => {

		if (!cell) return;

		switch (e.code) {
			case "Tab":
				if (e.shiftKey) {
					if (!this.#isCellLeftVisible(cell)) {
						cell.scrollIntoView({ inline: 'nearest', block: 'nearest' });
					}
				} else {
					if (!this.#isCellRightVisible(cell)) {
						cell.scrollIntoView({ inline: 'nearest', block: 'nearest' });
					}
				}
				break;
			case "ArrowRight":
				if (!this.#isCellRightVisible(cell)) {
					cell.scrollIntoView({ inline: 'nearest', block: 'nearest' });
				}
				break;
			case "ArrowLeft":
				if (!this.#isCellLeftVisible(cell)) {
					cell.scrollIntoView({ inline: 'nearest', block: 'nearest' });
				}
				break;
		}

		this.currentCell = cell;
		this.#sheet.selection.setRange(this.#currentTr.dataset.matrixRow, cell.dataset.col, this.#currentTr.dataset.matrixRow, cell.dataset.col);
	};

	#moveCellV = (e, cell) => {
		if (cell) {
			let isVisible = false;
			switch (e.code) {
				case "Enter":
					if (e.shiftKey) {
						if (this.#isCellBelowVisible(cell)) {
							isVisible = true;
						}
					} else {
						if (this.#isCellBelowVisible(cell)) {
							isVisible = true;
						}
					}
					break;
				case "ArrowDown":
					if (this.#isCellBelowVisible(cell)) {
						isVisible = true;
					}
					break;
				case "ArrowUp":
					if (this.#isCellAboveVisible(cell)) {
						isVisible = true;
					}
					break;
			}

			if (isVisible) {
				this.currentCell = cell;
				this.#sheet.selection.setRange(this.#currentTr.dataset.matrixRow, cell.dataset.col, this.#currentTr.dataset.matrixRow, cell.dataset.col);
				return;
			}
		}

		const dataIndex = parseInt(this.#currentTr.dataset.index, 10);
		let scrollTopIndex = -1;
		switch (e.code) {
			case "Enter":
				if (e.shiftKey) {
					const visibleRowCount = this.#getVisibleRowCount();
					scrollTopIndex = Math.max(dataIndex - visibleRowCount + 0, 0);
				} else {
					scrollTopIndex = Math.min(dataIndex, this.#sheet.view.count());
				}
				break;
			case "ArrowDown":
				scrollTopIndex = Math.min(dataIndex, this.#sheet.view.count());
				break;
			case "ArrowUp":
				const visibleRowCount = this.#getVisibleRowCount();
				scrollTopIndex = Math.max(dataIndex - visibleRowCount + 0, 0);
				break;
		}

		if (scrollTopIndex < 0) return;

		let matrixRow = parseInt(this.#currentTr.dataset.matrixRow, 10);
		const col = parseInt(this.#currentCell.dataset.col, 10);
		const rowSpan = parseInt(this.#currentCell.rowSpan, 10) || 1;

		switch (e.code) {
			case "ArrowDown":
				matrixRow += rowSpan;
				break;
			case "ArrowUp":
				matrixRow --;
				break;
		}

		this.#sheet.rowManager.scrollToDataRow(scrollTopIndex, null, () => {
			const currentCell = this.#findCell(matrixRow, col);

			if (currentCell) {
				this.currentCell = currentCell;
				this.#sheet.selection.setRange(this.#currentTr.dataset.matrixRow, currentCell.dataset.col, this.#currentTr.dataset.matrixRow, currentCell.dataset.col);
			}
		});
	}

	moveCell = (e) => {

		if (e.target.tagName === "INPUT") {
			if (["text"].includes(e.target.type)) {
				if (["ArrowLeft","ArrowRight","Home","End"].includes(e.code)) {
					return;
				}
			}

			if (["date","datetime-local","time","week","month"].includes(e.target.type)) {
				return;
			}
		}

		if (!this.#currentCell || !this.#currentTr) {
			trace.log("⚠️ [moveCell] currentCell or currentTr is missing!");
			return;
		}

		let nextCell;
		switch (e.code) {
			case "Tab":
				nextCell = e.shiftKey ? this.#getPreviousCell() : this.#getNextCell();
				break;
			case "ArrowRight":
				nextCell = this.#getNextCell();
				break;
			case "ArrowLeft":
				nextCell = this.#getPreviousCell();
				break;
			case "Enter":
				nextCell = e.shiftKey ? this.#getUpCell() : this.#getDownCell();
				break;
			case "ArrowDown":
				nextCell = this.#getDownCell();
				break;
			case "ArrowUp":
				nextCell = this.#getUpCell();
				break;
		}

		e.preventDefault();

		if (["ArrowLeft","ArrowRight","Tab"].includes(e.code)) {
			this.#moveCellH(e, nextCell);
		}
		else if (["Enter","ArrowUp","ArrowDown"].includes(e.code)) {
			this.#moveCellV(e, nextCell);
		}
	}

	#getNextCell = () => {
		const col = parseInt(this.#currentCell.dataset.col, 10);
		const colSpan = parseInt(this.#currentCell.colSpan, 10) || 1;
		const dataIndex = parseInt(this.#currentTr.dataset.index, 10);
		const matrixRow = parseInt(this.#currentTr.dataset.matrixRow, 10);

		const nextCol = col + colSpan;

		let nextCell = this.#sheet.querySelector(`tbody tr[data-matrix-row="${matrixRow}"] td[data-col="${nextCol}"]`);
		if (!nextCell) {
			nextCell = this.#sheet.querySelector(`tbody tr[data-index="${dataIndex}"] td[data-col="${nextCol}"]`);
		}

		return nextCell;
	}

	#getPreviousCell = () => {

		const col = parseInt(this.#currentCell.dataset.col, 10);
		const dataIndex = parseInt(this.#currentTr.dataset.index, 10);
		const matrixRow = parseInt(this.#currentTr.dataset.matrixRow, 10);

		let nextCell;
		for (let i = col - 1; i >= 0; i--) {
			nextCell = this.#sheet.querySelector(`tbody tr[data-matrix-row="${matrixRow}"] td[data-col="${i}"]`);
			if (!nextCell) {
				nextCell = this.#sheet.querySelector(`tbody tr[data-index="${dataIndex}"] td[data-col="${i}"]`);
			}

			if (nextCell) break;
		}

		return nextCell;
	}



	#findCell = (matrixRow, col) => {

		const $tr = this.#sheet.querySelector(`tbody tr[data-matrix-row="${matrixRow}"]`);
		if (!$tr) return;

		const dataIndex = parseInt($tr.dataset.index, 10);

		let targetCell = this.#sheet.querySelector(`tbody tr[data-matrix-row="${matrixRow}"] td[data-col="${col}"]`);
		if (!targetCell) {
			this.#sheet.querySelectorAll(`tbody tr[data-matrix-row="${matrixRow}"] td`).forEach($cell => {
				const cellCol = parseInt($cell.dataset.col, 10);
				const colSpan = parseInt($cell.colSpan, 10) || 1;

				if (col >= cellCol && col < cellCol + colSpan) {
					targetCell = $cell;
				}
			});

			if (!targetCell) {
				targetCell = this.#sheet.querySelector(`tbody tr[data-index="${dataIndex}"] td[data-col="${col}"]`);

				if (!targetCell) {
					this.#sheet.querySelectorAll(`tbody tr[data-index="${dataIndex}"] td`).forEach($cell => {
						const cellCol = parseInt($cell.dataset.col, 10);
						const colSpan = parseInt($cell.colSpan, 10) || 1;

						if (col >= cellCol && col < cellCol + colSpan) {
							targetCell = $cell;
						}
					});
				}
			}
		}

		return targetCell;
	}

	#getUpCell = () => {
		const col = parseInt(this.#currentCell.dataset.col, 10);
		const matrixRow = parseInt(this.#currentTr.dataset.matrixRow, 10);

		return this.#findCell(matrixRow - 1, col);
	}

	#getDownCell = () => {
		const col = parseInt(this.#currentCell.dataset.col, 10);
		const matrixRow = parseInt(this.#currentTr.dataset.matrixRow, 10);
		const rowSpan = parseInt(this.#currentCell.rowSpan, 10) || 1;

		return this.#findCell(matrixRow + rowSpan, col);
	}

	// 1. 위쪽 잘림 체크 (기준: bodyViewport)
	#isCellAboveVisible = (cell) => {
		const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
		if (!bodyViewport || !cell) return true;

		const cellRect = cell.getBoundingClientRect();
		const viewportRect = bodyViewport.getBoundingClientRect();
		const theadHeight = bodyViewport.querySelector('thead')?.offsetHeight || 0;

		// 셀의 상단이 헤더 아래쪽보다 위에 있으면 잘린(안 보이는) 상태
		return cellRect.top >= (viewportRect.top + theadHeight);
	}

	// 2. 아래쪽 잘림 체크 (기준: bodyViewport)
	#isCellBelowVisible = (cell) => {
		const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
		if (!bodyViewport || !cell) return true;

		const cellRect = cell.getBoundingClientRect();
		const viewportRect = bodyViewport.getBoundingClientRect();

		// 셀의 하단이 뷰포트 하단보다 아래에 있으면 잘린 상태
		return cellRect.bottom <= viewportRect.bottom;
	}

	// 3. 왼쪽 잘림 체크 (기준: bodyViewport2)
	#isCellLeftVisible = (cell) => {
		const bodyViewport2 = this.#sheet.querySelector('.ng-container-body'); // 또는 좌우 스크롤을 담당하는 뷰포트
		if (!bodyViewport2 || !cell) return true;

		const cellRect = cell.getBoundingClientRect();
		const viewportRect = bodyViewport2.getBoundingClientRect();

		// 셀의 좌측이 뷰포트 좌측보다 왼쪽에 있으면 잘린 상태
		return cellRect.left >= viewportRect.left;
	}

	// 4. 오른쪽 잘림 체크 (기준: bodyViewport2)
	#isCellRightVisible = (cell) => {
		const bodyViewport2 = this.#sheet.querySelector('.ng-container-body');
		if (!bodyViewport2 || !cell) return true;

		const cellRect = cell.getBoundingClientRect();
		const viewportRect = bodyViewport2.getBoundingClientRect();

		// 셀의 우측이 뷰포트 우측보다 오른쪽에 있으면 잘린 상태
		return cellRect.right <= viewportRect.right;
	}

	// 💡 필요하다면 이 4개를 조합해서 전체 가시성을 판단하는 통합 함수도 쉽게 구성할 수 있습니다.
	#isCellVisible = (cell) => {
		return this.#isCellAboveVisible(cell) &&
			this.#isCellBelowVisible(cell) &&
			this.#isCellLeftVisible(cell) &&
			this.#isCellRightVisible(cell);
	}

	#getVisibleRowCount = () => {
		const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
		const viewportHeight = bodyViewport.clientHeight - (bodyViewport.querySelector('thead')?.offsetHeight || 0);
		const rowHeight = this.#sheet.rowManager.getRowHeight();

		// 뷰포트 높이에 들어오는 행 개수 계산 (소수점 버림)
		return Math.max(1, Math.floor(viewportHeight / rowHeight));
	}

	#initEvents() {
		this.#sheet.addEventListener('mousedown', (e) => {
			if (e.button !== 0) return;
			const cell = e.target.closest('td, th');
			if (!cell) return;
			if (cell.dataset.index === undefined || cell.dataset.col === undefined) return;
			this.currentCell = cell;
		});

		this.#sheet.addEventListener('keydown', (e) => {
			if (["Enter", "Tab", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
				this.moveCell(e);
			}
		});
	}
}