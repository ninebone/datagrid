import { ngRow, ngData } from "./ngData.js";

export class ngDataManager {
	#host;

	constructor(host) {
		this.#host = host;

		this.row = new ngRow(this);
		this.data = new ngData(this.#host, this);

		this.rawRecords = [];
		this.viewRecords = [];
		this.delRecords = [];
		this.pageCnt = 25;

		this.viewRecords.reset = () => {
			if (this.#host.view?.redraw) this.#host.view.redraw();
		};

		this.setDataSource = (ds) => {
			if (this.data) this.data.reset();

			this.rawRecords = [];
			this.viewRecords = [];
			this.delRecords = [];

			this.data.set(ds || []);
		};

		this.getRowState = (nRow) => {
			const rowIdx = parseInt(nRow, 10);
			if (rowIdx >= this.data.count()) return;
			return this.data.getValidData()[rowIdx]?.__ng?.rowState;
		};

		this.getRowPosition = () => this.row.at;
		this.setRowPosition = (nRow) => { this.row.at = nRow; };

		this.scrollTo_V1 = (nRow) => {
			if (nRow < 0) nRow = 0;
			if (nRow >= this.rawRecords.length) nRow = this.rawRecords.length - 1;

			this.viewRecords.rawIndex = nRow;
			if (this.viewRecords.reset) this.viewRecords.reset();

			return (nRow <= 0 || nRow >= this.rawRecords.length - 1) ? false : true;
		};

		this.getColumn = (rowidx, colnm) => this.data.get(rowidx, colnm);

		this.setColumn = (rowidx, colnm, v) => {
			rowidx = parseInt(rowidx, 10);
			this.data.setValue(rowidx, colnm, v);
		};

		// 초기 빈 데이터 바인딩
		this.setDataSource([]);
	}
}