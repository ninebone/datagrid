import { useScreen, useState, useEffect, useRef } from 'react';
import { nine, trace } from '@ninebone/util'
import { NINE_TABLE } from '@ninebone/table'
// 상대 경로 대신 별칭 사용
import { exampleData } from '../_data/example-data.js';

const LayoutBasic = () => {
	const DATA_CNT = 10000;

	const tabRef = useRef(null);
	const tableRef = useRef(null);

	const selectList = async (params = {}) => {
		tableRef.current.loading = true;
		//setTimeout( () => {
			try {
				const mockList = exampleData.generateRandomData(DATA_CNT);
				tableRef.current.data.set(mockList);
			} finally {
				tableRef.current.loading = false;
			}
		//}, 300);
	};

	const selectCode = async () => {
		setTimeout( () => {
			tableRef.current.getCommonCode = (group) => {
				return exampleData.generateCommonCode(group);
			};
		}, 3000);
	};

	const handleCellButtonClick = (e) => {
		const {row, column, value, cell} = e.detail;
		// 💡 타임스탬프와 이벤트 고유 객체를 함께 출력해봅니다.
		console.log("🔥 [이벤트 감지 타임스탬프]:", e.timeStamp, e);
	};

	useEffect(() => {

		selectCode();
		selectList();

		tableRef?.current?.addEventListener(NINE_TABLE.EVENT.CELL_BUTTON_CLICK, handleCellButtonClick);

		return () => {
			tableRef?.current?.removeEventListener(NINE_TABLE.EVENT.CELL_BUTTON_CLICK, handleCellButtonClick);
		};
	}, []);

	return (
		<nine-table show-footer="true" style={{width: '90%', height: '700px'}} ref={tableRef} auto-height={"false"} col-movable="true"
					filtering={"true"}
					onmenu-click={(e) => {
						const {menuId, targetCell, targetTable} = e.detail;
						console.log("선택된 메뉴:", menuId, "대상 시트:", targetTable?.id);

						if (menuId === 'sheet1-article') {
							// sheet-1 전용 로직 실행
						}
					}}
		>

			<nine-table-menu use-default-menu="true">
				<ul>
					<li id="common-refresh">refresh</li>
					<li id="common-excel">excel download</li>
					<hr/>
				</ul>
				<ul target-table="sheet-1">
					<li id="sheet1-detail">경기 상세 분석 보기</li>
					<li id="sheet1-article">선택 경기 기사 자동 생성</li>
					<hr/>
				</ul>
				<ul target-table="sheet-2">
					<li id="sheet2-quick-edit">빠른 요약 수정</li>
					<hr/>
				</ul>
			</nine-table-menu>

			<table row-indicator="true" caption="red">
				<colgroup>
					<col width="50" fixed="left" background='red'/>
					<col width="100" fixed="left" background='red'/>
					<col width="80" fixed="left" background='red'/>
					<col width="120" fixed="left" background='red'/>
					<col width="120"/>
					<col width="280"/>
					<col width="100"/>
					<col width="100" fixed="right" background='blue'/>
				</colgroup>
				<thead>
				<tr>
					<th rowSpan="2"></th>
					<th rowSpan="2" collapsed="true">선택</th>
					<th>NAME</th>
					<th collapsible="true" filtering="true">경기일</th>
					<th colSpan="2" collapsible="true">대진 (팀1 vs 팀2)</th>
					<th>기사 제목</th>
					<th>...</th>
				</tr>
				<tr>
					<th colSpan="2">ID 상세</th>
					<th>기사 제목</th>
					<th colSpan="2">생성 여부</th>
					<th>...</th>
				</tr>
				</thead>
				<tbody>

				<tr>
					<td rowSpan="2"></td>
					<td rowSpan="2" data-bind="sel"></td>
					<td data-bind="NAME" text-align="right" color="data.AGE > 50 ? 'red' : 'blue'"></td>
					<td data-bind="AGE" text-align="center" data-expr="data.NAME + '(' + data.AGE + ')'" ></td>
					<td colSpan="2" data-bind="matchDate" data-expr="data.team1 + ' vs ' + data.team2"></td>
					<td data-bind="generationStatus"
						data-expr="data.generationStatus === 'COMPLETED' ? '생성 완료' : '대기 중'"></td>
					<td data-bind="generationStatus"></td>
				</tr>
				<tr>
					<td colSpan="2" cell-type="input" data-bind="matchResultId"></td>
					<td data-bind="matchTitle"> </td>
					<td colSpan="2" data-bind="generationStatus" data-expr="data.generationStatus === 'COMPLETED' ? '생성 완료' : '대기 중'"></td>
					<td data-bind="generationStatus"></td>
				</tr>
				</tbody>
				<tfoot>
				<tr style={{height: '32px'}}>
					<th>
						<ng-row-indicator/>
					</th>
					<td data-bind="sel">
						<ng-checkbox></ng-checkbox>
					</td>
					<td data-bind="matchResultId"></td>
					<td data-bind="matchDate" data-expr="nine.formatDate(data.matchDate, 'YYYY-MM-DD')"></td>
					<td colSpan={2} data-bind="matchDate" data-expr="data.team1 + ' vs ' + data.team2"></td>
					<td data-bind="generationStatus"
						data-expr="data.generationStatus === 'COMPLETED' ? '생성 완료' : '대기 중'"></td>
					<td data-bind="generationStatus"></td>
				</tr>
				</tfoot>
			</table>
			<table auto-fit-col="false">
				<colgroup>
					<col width="50" fixed="left" background-color="gray"/>
					<col width="100" fixed="left"/>
					<col width="50" fixed="left"/>
					<col width="120"/>
					<col width="120"/>
					<col width="280"/>
					<col width="100"/>
				</colgroup>
				<thead>
				<tr style={{height: '40px'}}>
					<th>No.1</th>
					<th></th>
					<th>ID</th>
					<th collapsed="true" collapsible="true">경기일</th>
					<th>대진 (팀1 vs 팀2)</th>
					<th>기사 제목</th>
					<th>생성 여부</th>
				</tr>
				</thead>
				<tbody>
				<tr style={{height: '50px'}} grouping="true">
					<th></th>
					<td data-bind="matchDate"></td>
					<td cell-type="tree" data-bind="team1" colSpan={2}></td>
					<td data-bind="matchDate"></td>
					<td data-bind="matchDate" data-expr="groupRecord.length"></td>
					<td data-bind="matchDate" data-expr="data.length"></td>
				</tr>
				<tr style={{height: '40px'}} grouping="true">
					<th></th>
					<td data-bind="matchDate"></td>
					<td cell-type="tree" data-bind="team2"></td>
					<td data-bind="matchDate"></td>
					<td data-bind="matchDate"></td>
				</tr>
				<tr style={{height: '40px'}}>
					<th>
						<ng-row-indicator/>
					</th>
					<td data-bind="sel">
					</td>
					<td cell-type="input" data-bind="matchResultId"></td>
					<td data-bind="matchDate"
						data-expr="nine.formatDate(data.matchDate, 'YYYY-MM-DD')"></td>
					<td data-bind="matchDate" data-expr="data.team1 + ' vs ' + data.team2"></td>
					<td cell-type="input" data-bind="matchTitle"></td>
					<td data-bind="generationStatus"
						data-expr="data.generationStatus === 'COMPLETED' ? '생성 완료' : '대기 중'"></td>
				</tr>
				</tbody>
				<tfoot>
				<tr>
					<th>
						<ng-row-indicator/>
					</th>
					<td data-bind="sel">
						<ng-checkbox></ng-checkbox>
					</td>
					<td data-bind="matchResultId"></td>
					<td data-bind="matchDate"
						data-expr="nine.formatDate(data.matchDate, 'YYYY-MM-DD')"></td>
					<td data-bind="matchDate" data-expr="data.team1 + ' vs ' + data.team2"></td>
					<td data-bind="matchTitle">
						<ng-renderer link="true"/>
					</td>
					<td data-bind="generationStatus"
						data-expr="data.generationStatus === 'COMPLETED' ? '생성 완료' : '대기 중'"></td>
				</tr>
				</tfoot>
			</table>
			<table caption="xx" row-indicator="true" filtering="false">
				<colgroup>
					<col width="50"></col>
					<col width="50"></col>
					<col width="50"></col>
					<col width="80"></col>
					<col width="50"></col>
					<col width="80"></col>
					<col width="200"></col>
					<col width="200"></col>
					<col width="200"></col>
					<col width="200"></col>
					<col width="80"></col>
					<col width="80"></col>
					<col width="80"></col>
					<col width="80"></col>
					<col width="80"></col>
					<col width="80"></col>
					<col width="120"></col>
					<col width="180"></col>

					<col width="100"></col>
					<col width="120"></col>
					<col width="100"></col>
				</colgroup>
				<thead>
				<tr style={{height: '48px'}}>
					<th>설명</th>
					<th cell-type="checkbox">All</th>
					<th>checkbox</th>
					<th>checkbox</th>
					<th>checkbox</th>
					<th>button</th>
					<th>radio</th>
					<th>radio</th>
					<th>combo</th>
					<th>combo</th>
					<th>기본 입력</th>
					<th>나이 (Min/Max 제한)</th>
					<th>가격 (소수점 Scale 제한)</th>
					<th>우측 정렬 & 마이너스 허용 안 함</th>
					<th>color renderer</th>
					<th>input-color</th>
					<th>input-date</th>
					<th>input-date</th>
					<th>input-date</th>
					<th>input-date</th>
					<th>input-date</th>
				</tr>
				</thead>
				<tbody>
				<tr style={{height: '32px'}}>
					<td data-bind="NAME" data-expr="data.REC1 + ':' + data.NAME"></td>
					<td cell-type="checkbox" data-bind="sel" enable="data.REC1 > 70 ? true : false;"></td>
					<td cell-type="checkbox" data-bind="CHK1" true-value="남" false-value="여"></td>
					<td cell-type="checkbox" data-bind="CHK1" text-align="right" true-value="남" false-value="여" true-text="남자" false-text="여자"></td>
					<td cell-type="checkbox" data-bind="CHK1" true-value="남" false-value="여" is-radio="true"></td>
					<td cell-type="button" data-bind="DEPART" data-expr="data.REC1 + ':' + data.NAME"></td>
					<td cell-type="radio" data-bind="DEPART" data-source="host.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>
					<td cell-type="radio" data-bind="DEPART" visible="data.REC1 > 50 ? true : false;" enable="data.REC1 > 70 ? true : false;">
						<datalist>
							<option k="A" v="aaa a"/>
							<option k="B" v="bb b"/>
							<option k="C" v="c c"/>
						</datalist>
					</td>
					<td cell-type="combo" data-bind="DEPART" data-source="host.getCommonCode('DEPART')" key-name="code" value-name="codename"></td>
					<td cell-type="combo" data-bind="DEPART" visible="data.REC1 > 50 ? true : false;" enable="data.REC1 > 70 ? true : false;">
						<datalist>
							<option k="A" v="aaa a"/>
							<option k="B" v="bb b"/>
							<option k="C" v="c c"/>
						</datalist>
					</td>


					<td cell-type="input" data-bind="NAME" maxbyte="6" enable="data.REC1 > 70 ? true : false;"></td>
					<td cell-type="input-number" data-bind="AGE" min="0" max="50" visible="data.REC1 > 50 ? true : false;" enable="data.REC1 > 70 ? true : false;"></td>
					<td cell-type="input-number" data-bind="AGE" scale="2" max="100"></td>
					<td cell-type="input-number" data-bind="AGE" scale="1" min="0" max="100" text-align="left"></td>
					<td data-bind="COLOR" background-color="data.COLOR" color="nine.oppositeColor(data.COLOR)"></td>
					<td cell-type="input-color" data-bind="COLOR" visible="data.REC1 > 50 ? true : false;" enable="data.REC1 > 70 ? true : false;"></td>
					<td cell-type="input-date" data-bind="BIRTH_DT" min="1980-05-10" max="2029-05-20" visible="data.REC1 > 50 ? true : false;" enable="data.REC1 > 70 ? true : false;"></td>
					<td cell-type="input-date" data-bind="BIRTH_DT" date-type="datetime-local"></td>
					<td cell-type="input-date" data-bind="BIRTH_DT" date-type="time"></td>
					<td cell-type="input-date" data-bind="BIRTH_DT" date-type="month"></td>
					<td data-bind="BIRTH_DT" date-type="week"></td>
				</tr>
				</tbody>
			</table>
		</nine-table>
	);
};

/**
 *
 *
 */
export default LayoutBasic;