import { trace } from "@nopeer";

export class CellComboPanel extends HTMLElement {
	#parent;
	#keyName;
	#valueName;
	#isOpen = false;

	constructor() {
		super();
	}

	connectedCallback() {
		this.#renderer();
		this.#initEvents();
	}

	#initData = (dataSource, keyName, valueName, multi, separator) => {
		const grd = this.querySelector("nine-table-simple");
		if (!grd || !dataSource || dataSource.length === 0) return;

		// 1. 부모(parent)의 items 속성 확인 (예: "CODE,NAME,DESC" 형태)
		const itemsAttr = this.#parent.getAttribute("items");
		let fieldKeys = [];

		if (itemsAttr) {
			fieldKeys = itemsAttr.split(",").map(s => s.trim());
		} else {
			fieldKeys = [valueName].filter(Boolean);
		}

		const activeColumnCount = fieldKeys.length;

		// 2. 🎯 [수정] multi 모드 여부에 따라 0번 컬럼(체크박스) 가시성 제어
		//trace.log(grd.shadowRoot, grd.shadowRoot.querySelectorAll('nine-table-body table'));
		grd.shadowRoot.querySelector(".ng-container-left").style.display = multi ? '' : 'none';

		grd.shadowRoot.querySelectorAll('table colgroup col, tbody td').forEach(($el, idx) => {
			trace.log($el);

			const col = parseInt($el.dataset.col, 10);
			if (col >= 2) {	// row-indicator, checkbox 제외
				$el.style.display = (col - 2 >= activeColumnCount) ? 'none' : '';
			}
		});

		// 3. 동적 데이터 매핑 (dataSource 원본 객체에서 fieldKeys 순서대로 tmp1 ~ tmpN에 매핑)
		const formattedData = dataSource.map(item => {
			const row = {
				CHK: "N",
				k: keyName && item[keyName] !== undefined ? item[keyName] : (item[0] !== undefined ? item[0] : "")
			};

			fieldKeys.forEach((key, idx) => {
				row[`tmp${idx + 1}`] = item[key] !== undefined ? item[key] : (item[idx] !== undefined ? item[idx] : "");
			});
			return row;
		});

		grd.data.set(formattedData);

		// 4. 멀티 모드일 때 기존 선택값 반영
		if (multi && this.#parent.value) {
			const selectedKeys = String(this.#parent.value).split(separator || ",");
			grd.data.getValidData().forEach(m => {
				if (selectedKeys.includes(String(m.v[1]))) {
					m.v[0] = "Y";
				}
			});
			grd.refreshData();
		}
	};

	open = (parent, dataSource, keyName, valueName, multi, separator) => {
		this.#parent = parent;
		this.#keyName = keyName;
		this.#valueName = valueName;
		this.#isOpen = true;

		trace.log(new Date());

		this.classList.add("active");

		const grd = this.querySelector("nine-table-simple");
		if (!grd || !dataSource) return;

		// 🎯 패널을 열자마자 active를 주어 레이아웃(offsetHeight) 확보 및 초기화 수행


		// 검색어 초기화 및 체크박스 기본값 설정
		this.querySelector(".search-input").value = "";
		this.querySelector("#chkAll").checked = true;

		// 데이터 개수 및 모드에 따른 클래스 제어
		if (dataSource.length > 10) {
			this.classList.add("expand");
		} else {
			this.classList.remove("expand");
		}

		if (multi) {
			this.classList.add("multi");
		} else {
			this.classList.remove("multi");
		}

		// 데이터 및 멀티컬럼 구조 초기화 실행

		// 🎯 [필터 패널 방식 위치 정렬 적용] 시트(sheet) 기준 상대 좌표계산
		const sheet = parent.closest("nine-table-sheet");
		const btnEl = parent.querySelector(".btn1");
		if (!btnEl || !sheet) return;

		const btnRect = btnEl.getBoundingClientRect();
		const sheetRect = sheet.getBoundingClientRect();

		let left = btnRect.left - sheetRect.left;
		let top = btnRect.bottom - sheetRect.top + 2;

		// 화면 오른쪽 밖으로 넘칠 경우 보정
		const panelWidth = this.offsetWidth || 250;
		const panelHeight = this.offsetHeight || 250;
		if (left + panelWidth > sheetRect.width) {
			left = Math.max(0, sheetRect.width - panelWidth - 5);
		}

		if (left < 0) {
			left = 5;
		}

		if (top + panelHeight > sheetRect.height) {
			const upwardTop = (btnRect.top - sheetRect.top) - panelHeight - 2;
			if (upwardTop >= 0) {
				top = upwardTop; // 위쪽 공간이 있으면 위로 팝업
			} else {
				top = Math.max(0, sheetRect.height - panelHeight - 5); // 위아래 다 부족하면 시트 하단에 밀착
			}
		}

		this.style.left = `${left}px`;
		this.style.top = `${top}px`;

		// 내부 그리드 행 클릭 이벤트 바인딩 (싱글 모드용)
		trace.log(new Date());

		setTimeout(() => {
			trace.log(new Date());
			this.#initData(dataSource, keyName, valueName, multi, separator);
			trace.log(new Date());
			const viewContainer = grd.shadowRoot.querySelector(".ng-container-body table tbody.body");

			// 중복 바인딩 방지를 위한 플래그 체크 또는 기존 리스너 관리
			if (!viewContainer.__hasClickEvent) {

				viewContainer.addEventListener("mousedown", (e) => {
					trace.log("==========================================", e.target);

					const tr = e.target.closest("tr");
					if (!tr) return;

					trace.log("==========================================", multi);

					if (!multi) {
						this.#onClickRow(e);
					}
				});
				viewContainer.__hasClickEvent = true;
			}

			trace.log(new Date());
		}, 100);
	}

	close = () => {
		this.classList.remove("active");
		this.#isOpen = false;
		if (this.#parent && this.#parent.cell) {
			this.#parent.cell.focus();
		}
	}

	#onClickRow = (e) => {

		const sheet = e.target.closest("nine-table-sheet");
		const tr = e.target.closest("tr");

		const rowIndex = parseInt(tr.dataset.row, 10);
		const record = sheet.view.get(rowIndex);

		this.#parent.value = record.k;

		//this.#parent.sheet.invalidate();
		this.#parent.sheet.rowManager.refresh(true);

		this.close();
	}

	#onOk = () => {
		const grd = this.querySelector("nine-table-simple");
		const data = grd.data.getValidData();

		const selectedKeys = [];
		data.forEach(o => {
			if (o.v[0] === "Y") {
				selectedKeys.push(o.v[1]);
			}
		});

		this.#parent.value = selectedKeys.join(this.#parent.getAttribute("multi-separator") || ",");
		//this.#parent.sheet.invalidate();
		this.#parent.sheet.rowManager.refresh(true);

		this.close();
	}

	#onSelectAll = (e) => {
		const grd = this.querySelector("nine-table-simple");
		const isChecked = e.target.checked ? "Y" : "N";
		grd.data.getValidData().forEach(m => { m.v[0] = isChecked; });
		grd.refreshData();
	}

	#onInput = (e) => {
		const keyword = e.target.value.toLowerCase();
		const grd = this.querySelector("nine-table-simple");

		// 동적 컬럼(모든 밸류) 대상 검색 대응
		grd.data.getValidDataNF().forEach(m => {
			const match = Object.values(m.v).some(val =>
				val !== null && val !== undefined && String(val).toLowerCase().includes(keyword)
			);
			m.__ng.filtered = !match;
		});

		grd.data.resetRecords();
		grd.dataManager.viewRecords.reset();
	}

	get isOpen() {
		return this.#isOpen;
	}

	get targetCell() {
		return this.#parent;
	}

	#initEvents = () => {
		this.querySelector(".search-input").addEventListener("input", this.#onInput);
		this.querySelector("#btnOk").addEventListener("click", this.#onOk);
		this.querySelector("#chkAll").addEventListener("change", this.#onSelectAll);



		// 🎯 [개선] open() 할 때마다 붙일 필요 없이, 내부 그리드 영역에 이벤트 위임 처리

		/**
		// shadowRoot 내부 또는 컴포넌트 전체 영역을 감싸는 리스너 등록
		this.querySelector("nine-table-simple").addEventListener("click", (e) => {
			trace.log(e);

			const tr = e.target.closest("tr");
			if (!tr) return;

			// 멀티 모드가 아닐 때만 행 클릭 동작 수행
			const isMulti = this.classList.contains("multi");
			if (!isMulti) {
				this.#onClickRow(e, false, grd);
			}
		}); */

		// 패널 외부 클릭 시 닫기
		document.addEventListener("mousedown", (e) => {
			const path = e.composedPath ? e.composedPath() : [];

			// 패널 자신이나 현재 열려 있는 필터 버튼이 경로에 포함되어 있다면 닫지 않음
			if (path.includes(this)) {
				return;
			}
			this.close();
		});
	}

	#renderer = () => {
		this.innerHTML = `
            <div class="head">
                <input type="text" class="search-input" placeholder="Search..." />
            </div>
            
            <nine-table-simple class="combo-list" theme="simple">
                <table auto-fit-col="true">
                    <colgroup>
                        <col width="30" fixed="left" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="100" />
                        <col width="0" />
                    </colgroup>
                    <tbody>
                        <tr>
                            <td cell-type="checkbox" data-bind="CHK"></td>
                            <td data-bind="tmp1" />
                            <td data-bind="tmp2" />
                            <td data-bind="tmp3" />
                            <td data-bind="tmp4" />
                            <td data-bind="tmp5" />
                            <td data-bind="tmp6" />
                            <td data-bind="tmp7" />
                            <td data-bind="tmp8" />
                            <td data-bind="tmp9" />
                            <td data-bind="tmp10" />
                            <td data-bind="k" />
                        </tr>
                    </tbody>
                </table>
            </nine-table-simple>
            
            <div class="footer">
                <div>
                    <input id="chkAll" type="checkbox" checked>
                    <label for="chkAll">Select All</label>
                </div>
                <button id="btnOk">OK</button>
            </div>
        `;
	};
}

if (!customElements.get('cell-combo-panel')) {
	customElements.define("cell-combo-panel", CellComboPanel);
}