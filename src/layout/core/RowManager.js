import { trace } from "@nopeer";
import { NINE_TABLE } from "@/core/constants.js";
import { GROUP_IDX } from "@/data/Grouping.js";

export class RowManager {
    #BUFFER_ROW_COUNT = 3;

    #host;
    #sheet;
    #element;

    #chchedAllRecords;
    #containerTemplates = new Map();

    #resizeObserver = null;
    #sheetHeight = 0;
    #cachedRowCount;

    #isProgrammaticScroll = false;

    constructor(sheet) {
        this.#host = sheet.getRootNode().host;
        this.#sheet = sheet;

        this.#initResizeObserver();
    }

    getRowHeight() {
        return this.#sheet.template.height;
    }

    refresh = (force = false) => {

        if (!this.#sheet.classList.contains('active')) return;

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
        if (!bodyViewport) return;

        const wasInvalidHeight = !this.#sheet.template.height || this.#sheet.template.height <= 0;

        if (wasInvalidHeight) {
            this.#measureAndCacheHeight();
            if (this.#sheet.template.height && this.#sheet.template.height > 0) {
                this.#renderAllContainers();
            }
        }

        this.#chchedAllRecords = this.#host.data.getArray();

        this.#handleScroll(bodyViewport.scrollTop, force);

        this.#refreshFixed();

        this.#sheet.querySelector('nine-table-vscrollbar')?.refresh();
    };

    #refreshFixed = () => {

        this.#sheet.querySelectorAll("thead tr, tfoot tr").forEach(($tr) => {
            Array.from($tr.cells).forEach(($cell) => {
                const customComp = Array.from($cell.children).find($el =>
                    $el.tagName.toLowerCase().startsWith('cell-') || typeof $el.refresh === 'function'
                );
                customComp?.refresh?.();
            });
        });
    }

    #handleScroll = (scrollTop, force = false) => {

        const rowHeight = this.#sheet.template.height;
        if (!rowHeight || rowHeight <= 0) return;

        if (this.#sheet.isGroupBy) {
            this.#handleGroupedScroll(scrollTop, force);
            return;
        }

        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords.length;

        if (totalCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }

        const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
            (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
            this.#sheet.elements.body.tbody.head.offsetHeight;

        const viewHeight = this.#sheet.querySelector('.ng-sheet-body').offsetHeight || 0;
        const rawTotalVirtualHeight = Math.max(totalCount * rowHeight - (viewHeight - fixedHeight - rowHeight) - rowHeight, 0);

        const MAX_BROWSER_HEIGHT = 15000000;
        const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

        let scaleFactor = 1;
        let totalVirtualHeight = rawTotalVirtualHeight;

        if (useScaling) {
            scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            totalVirtualHeight = MAX_BROWSER_HEIGHT;
        }

        this.#sheet.elements.scrollHolder.style.height = `${totalVirtualHeight}px`;

        const actualScrollTop = useScaling ? (scrollTop / scaleFactor) : scrollTop;

        const maxStartIndex = Math.max(0, totalCount - 1);
        const clampedScrollTop = Math.min(actualScrollTop, rawTotalVirtualHeight);
        const startIndex = Math.max(0, Math.min(Math.floor(clampedScrollTop / rowHeight), maxStartIndex));

        //trace.log(clampedScrollTop % rowHeight, rowHeight);

        /*
         * FIX: Use GPU-accelerated transform3d instead of 'top' positioning.
         * On mobile devices (iOS Safari), direct 'top' updates trigger expensive
         * layout reflows and cause severe scrolling lag during inertia touch scrolls.
         * translate3d forces hardware compositing for buttery-smooth performance.
         */
        this.#sheet.elements.left.tbody.body.style.transform =
            this.#sheet.elements.body.tbody.body.style.transform =
                this.#sheet.elements.right.tbody.body.style.transform = `translate3d(0px, -${clampedScrollTop % rowHeight}px, 0px)`;


        const firstTr = this.#element.firstTr;
        const currentStartIndex = firstTr && firstTr.dataset.row !== undefined ? parseInt(firstTr.dataset.row, 10) : -1;

        if (!force && currentStartIndex === startIndex) {
            return;
        }

        [
            this.#sheet.elements.left.tbody.body,
            this.#sheet.elements.body.tbody.body,
            this.#sheet.elements.right.tbody.body
        ].forEach(($tbody, tbodyIdx) => {
            if (!$tbody) return;

            //const rows = $tbody.querySelectorAll('tbody.body tr');

            $tbody.trs.forEach(($tr, index) => {
                const dataIndex = startIndex + Math.floor(index / this.#sheet.template.length);

                if (dataIndex >= totalCount) {
                    $tr.style.display = 'none';
                    $tr.dataset.matrixRow = null;
                    $tr.dataset.row = null;
                    $tr.dataset.index = null;
                    return;
                }

                const record = viewRecords[dataIndex];//this.#sheet.view.getArray(dataIndex);

                if (!record) {
                    $tr.style.display = 'none';
                    return;
                }

                const rowid = record.m._[NINE_TABLE.META.INDEX.ROWID];

                $tr.style.display = '';

                this.#bindRowData($tr, record, rowid, dataIndex);
            });
        });

        this.#sheet.selection.refresh();
    };

    #getPreviousSiblingGroupId = (groupId) => {
        if (!groupId) return null;

        const parts = groupId.split('_'); // 예: ['g', '0', '1', '2']
        const lastIdx = parts.length - 1;
        const lastVal = parseInt(parts[lastIdx], 10);

        // 마지막 순번이 0보다 커야 바로 윗형제가 존재함
        if (lastVal > 0) {
            let siblingParts = [...parts];
            siblingParts[lastIdx] = lastVal - 1;
            return siblingParts.join('_');
        }

        return null; // 바로 윗형제가 없는 경우 (예: 'g_0', 'g_0_0' 등)
    };

    #getRootAncestorGroupId = (groupId) => {
        if (!groupId) return null;

        const parts = groupId.split('_'); // 예: ['g', '0', '1', '2']

        // 최소한 'g'와 최상위 번호(예: ['g', '0'])가 있어야 함
        if (parts.length > 2) {
            return parts.slice(0, 2).join('_'); // 항상 ['g', '0'] 형태인 최상위 조상 반환
        }

        return groupId; // 이미 최상위이거나 형식이 다른 경우
    };

    #getAllAncestorGroupIds = (groupId) => {
        if (!groupId) return [];

        const parts = groupId.split('_'); // 예: ['g', '0', '1', '2']
        let ancestors = [];

        // 'g'를 제외하고 최상위부터 바로 직전 부모까지 조상 ID들을 순서대로 수집
        // 예: 'g_0_1_2' -> ['g_0', 'g_0_1']
        for (let i = 2; i < parts.length; i++) {
            ancestors.push(parts.slice(0, i).join('_'));
        }

        return ancestors;
    };

    #getLastDescendantGroupIds = (groupId, allRenderItems) => {
        if (!groupId || !allRenderItems) return [];

        let descendantIds = [];
        let currentId = groupId;

        while (true) {
            const prefix = currentId + '_';
            const currentDepth = currentId.split('_').length;

            // 1. 현재 뎁스보다 딱 1단계 깊은 직속 자식들만 색출
            const children = allRenderItems.filter(item => {
                if (!item.groupId || item.type !== 'group') return false;
                if (!item.groupId.startsWith(prefix)) return false;
                return item.groupId.split('_').length === currentDepth + 1;
            });

            // 2. 더 이상 자식이 없으면 탐색 종료
            if (children.length === 0) {
                break;
            }

            // 3. 자식들 중 번호가 가장 큰 녀석(막내) 선택
            children.sort((a, b) => {
                const partsA = a.groupId.split('_');
                const partsB = b.groupId.split('_');
                const valA = parseInt(partsA[partsA.length - 1], 10);
                const valB = parseInt(partsB[partsB.length - 1], 10);
                return valB - valA;
            });

            const youngestChildId = children[0].groupId;

            // 4. 찾은 막내를 배열에 추가
            descendantIds.push(youngestChildId);

            // 5. 그 막내를 기준으로 다음 단계(자식의 자식) 탐색 진행
            currentId = youngestChildId;
        }

        return descendantIds; // 막내들의 체인 배열 리턴
    };


    #getParentGroupIds = (renderedItems, allRenderItems) => {
        let headerGroupIds = [];

        const firstItem = renderedItems[0];
        if (!firstItem || !firstItem.groupId) return headerGroupIds;

        const parts = firstItem.groupId.split('_'); // 예: ["g", "1"] 또는 ["g", "0", "1"]

        if (firstItem.type === 'data') {
            // 1. 데이터 행인 경우: 조상 그룹 ID들만 순서대로 모두 수집
            for (let i = 1; i < parts.length; i++) {
                headerGroupIds.push(parts.slice(0, i + 1).join('_'));
            }
        } else {
            // 2. 그룹인 경우:
            // A. 나의 직속 부모/조상들 수집 (말단 본인 제외)
            if (parts.length > 2) {
                for (let i = 1; i < parts.length - 1; i++) {
                    //headerGroupIds.push(parts.slice(0, i + 1).join('_'));
                }
            }

            const rootGroupId = this.#getRootAncestorGroupId(firstItem.groupId);
            //const siblingGroupId = this.#getPreviousSiblingGroupId(rootGroupId);
            const siblingGroupId = this.#getPreviousSiblingGroupId(firstItem.groupId);
trace.log(firstItem.groupId, siblingGroupId);
            if (siblingGroupId) {
                // 1. 조상 배열들을 1차원으로 펼쳐서 추가
                headerGroupIds.push(...this.#getAllAncestorGroupIds(siblingGroupId));

                //trace.log(siblingGroupId, this.#getLastDescendantGroupIds(siblingGroupId, allRenderItems));
                // 2. 바로 윗형제 본인 추가
                headerGroupIds.push(siblingGroupId);
                // 3. 윗형제의 막내 후손 추가 (allRenderItems 인자 전달 필요 여부 확인)
                //const lastDescendant = this.#getLastDescendantGroupIds(siblingGroupId, allRenderItems);
                //trace.log(siblingGroupId, lastDescendant);
                headerGroupIds.push(...this.#getLastDescendantGroupIds(siblingGroupId, allRenderItems));

            }
            else {
                headerGroupIds.push(...this.#getAllAncestorGroupIds(firstItem.groupId));
            }

        }

        // ❌ [범인 색출 완료] renderedItems(본문 항목들)를 헤드로 긁어모으던 3번 루프는 완전히 삭제했습니다!
        // 헤드는 오직 위에서 계산된 조상과 윗형제 체인만 가지면 충분합니다.

        // 3. 짧은 조상부터 깊은 자식 순으로 정렬
        headerGroupIds.sort((a, b) => a.length - b.length || a.localeCompare(b));

        return headerGroupIds;
    };

    #isShouldHoldHeader = (renderedItems) => {

        return false;

        const $activeFooterTrs = Array.from(this.#sheet.querySelectorAll('thead.foot tr'))
            .filter(tr => tr.style.display !== 'none' && tr.dataset.groupId);

        const lastFooterTr = $activeFooterTrs[$activeFooterTrs.length - 1];
        const lastHeaderGroupId = lastFooterTr?.dataset.groupId;
        const lastHeaderDepth = lastHeaderGroupId ? lastHeaderGroupId.split("_").length - 2 : -1;

        const firstItem = renderedItems[0];
        const isFirstItemGroup = firstItem.type === 'group';
        const firstItemDepth = isFirstItemGroup && firstItem.groupId
            ? firstItem.groupId.split("_").length - 2
            : -1;

        // 유지 조건: 데이터 행이거나, 헤더 마지막 뎁스가 첫 행 뎁스보다 크거나 같을 때 홀드
        const shouldHoldHeader = !isFirstItemGroup || (lastHeaderDepth >= firstItemDepth);

        return shouldHoldHeader;
    };

    #findScrollTargetTrs = (renderedItems, allRenderItems) => {
        // 1. 헤드에 현재 살아있는(display: none이 아닌) 모든 footer tr 추출
        const $activeFooterTrs = Array.from(this.#sheet.querySelectorAll('.ng-container-body thead.foot tr'))
            .filter(tr => tr.style.display !== 'none' && tr.dataset.groupId);

        if ($activeFooterTrs.length === 0) return [];

        // 2. 바디에서 현재 화면에 보이는 첫 번째 실물 tr 찾기
        const $visibleTrs = Array.from(this.#sheet.querySelectorAll('.ng-container-body tbody.body tr'));
        const $firstRealTr = $visibleTrs.find(tr => tr.style.display !== 'none');

        if (!$firstRealTr) return [];

        // 3. 스크롤 위치 및 바디 첫 행과의 충돌 거리 계산
        const $theadFoot = this.#sheet.querySelector('.ng-container-body thead.foot');
        const footRect = $theadFoot.getBoundingClientRect();
        const trRect = $firstRealTr.getBoundingClientRect();
        const distance = Math.max(0, footRect.bottom - trRect.top);

        if (distance === 0) return []; // 충돌하지 않으면 움직일 필요 없음

        // 4. 어떤 tr들을 밀어 올려야 할지 타겟팅
        // (예: 현재 헤드에 쌓여 있는 tr들 중 바디 첫 행의 뎁스와 맞물리거나 밀어내야 하는 대상 필터링)
        const targets = [];

        for (const $tr of $activeFooterTrs) {
            const groupId = $tr.dataset.groupId;
            const headerItem = allRenderItems.find(item => item.groupId === groupId);
            if (!headerItem) continue;

            const headerDepth = headerItem.record[GROUP_IDX.DEPTH];
            const firstItem = renderedItems[0];
            const firstItemDepth = firstItem.type === 'group'
                ? firstItem.record[GROUP_IDX.DEPTH]
                : headerDepth;

            // 밀어 올려야 하는 조건식 판별
            if (headerDepth >= firstItemDepth) {
                targets.push({
                    tr: $tr,
                    depth: headerDepth,
                    distance: distance
                });

                //trace.log($tr);
            }
        }

        return targets;
    };

    #adjustHeaderGroup = (renderedItems, allRenderItems) => {
        const firstItem = renderedItems[0];

        const trs = this.#findScrollTargetTrs(renderedItems, allRenderItems);

        const $activeFooterTrs = Array.from(this.#sheet.querySelectorAll('.ng-container-body thead.foot tr'))
            .filter(tr => tr.style.display !== 'none' && tr.dataset.groupId);

        const lastFooterTr = $activeFooterTrs[$activeFooterTrs.length - 1];
        const lastHeaderGroupId = lastFooterTr?.dataset.groupId;
        const lastHeaderItem = lastHeaderGroupId ? allRenderItems.find(item => item.groupId === lastHeaderGroupId) : null;

        // 초기화: 모든 헤더의 transform 제거
        this.#sheet.querySelectorAll('thead.foot tr').forEach(($tr) => {
            $tr.style.transform = ``;
        });

        if (lastHeaderItem && firstItem) {
            const lastHeaderDepth = lastHeaderItem.record[GROUP_IDX.DEPTH];
            const firstItemDepth = firstItem.type === 'group'
                ? firstItem.record[GROUP_IDX.DEPTH]
                : lastHeaderDepth;

            const $visibleTrs = Array.from(this.#sheet.querySelectorAll('.ng-container-body tbody.body tr'));
            const $firstRealTr = $visibleTrs.find(tr => tr.style.display !== 'none');

            if ($firstRealTr) {
                const targetSectionRowIndex = lastHeaderDepth;

                // 헤더 뎁스가 바디 첫 번째 뎁스보다 크거나 같고 가문이 다를 때 밀어 올림
                if (lastHeaderDepth >= firstItemDepth) {
                    const trRect = $firstRealTr.getBoundingClientRect();
                    const $theadFoot = this.#sheet.querySelector('.ng-container-body thead.foot');
                    const distance = Math.max(0, $theadFoot.getBoundingClientRect().bottom - trRect.top);
                    //trace.log(distance)
                    this.#sheet.querySelectorAll('thead.foot tr').forEach(($tr) => {
                        if ($tr.sectionRowIndex === targetSectionRowIndex) {
                            $tr.style.transform = `translateY(-${distance}px)`;
                        }
                    });
                }
            }
        }
    };

    #handleGroupedScroll = (scrollTop, force = false) => {

        //trace.log(scrollTop);
        const allRenderItems = this.#sheet.view.getArray() || [];
        const totalVirtualCount = allRenderItems.length;
        if (totalVirtualCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }

        const findItemByGroupId = (allRenderItems, targetGroupId) => {
            return allRenderItems.find(item => item.groupId === targetGroupId && item.type === 'group');
        };

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
        const bodyContent = this.#sheet.querySelector('.ng-sheet-body .ng-sheet-body-content');
        const templateLength = this.#sheet.template.length;

        const getItemHeight = (item) => {
            if (item.type === 'group') {
                const depth = item.record[GROUP_IDX.DEPTH];
                return this.#sheet.template.heights[depth];
            } else {
                const dataRowsHeight = this.#sheet.template.height - this.#sheet.template.group.height;
                return dataRowsHeight > 0 ? dataRowsHeight : this.#sheet.template.height;
            }
        };

        let sumHeight = 0;
        const itemHeights = new Array(totalVirtualCount);
        for (let i = 0; i < totalVirtualCount; i++) {
            const h = getItemHeight(allRenderItems[i]);
            itemHeights[i] = h;
            sumHeight += h;
        }

        const rawTotalVirtualHeight = Math.max(sumHeight - this.#sheet.viewport.height + this.#sheet.viewport.fixedHeight, 0);

        //trace.log(allRenderItems.length);
        //const rawTotalVirtualHeight = Math.max(sumHeight, 0);



        const MAX_BROWSER_HEIGHT = 15000000;
        const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

        let scaleFactor = 1;
        let totalVirtualHeight = rawTotalVirtualHeight;

        if (useScaling) {
            scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            totalVirtualHeight = MAX_BROWSER_HEIGHT;
        }

        this.#sheet.elements.scrollHolder.style.height = `${totalVirtualHeight}px`;

        const actualScrollTop = useScaling ? (scrollTop / scaleFactor) : scrollTop;
        const clampedScrollTop = Math.min(actualScrollTop, rawTotalVirtualHeight);
        //const clampedScrollTop = Math.min(rawTotalVirtualHeight, rawTotalVirtualHeight);

        let accumulatedHeight = 0;
        let startIndex = 0;

        for (let i = 0; i < totalVirtualCount; i++) {
            const h = itemHeights[i];
            if (accumulatedHeight + h > clampedScrollTop) {
                startIndex = i;
                break;
            }
            accumulatedHeight += h;
            startIndex = i;
        }

        const offsetY = clampedScrollTop - accumulatedHeight;
        //trace.log(offsetY, scrollTop, actualScrollTop, rawTotalVirtualHeight, clampedScrollTop, accumulatedHeight);
        if (bodyContent) {
            bodyContent.querySelectorAll("tbody.body").forEach(($tbody) => {
                $tbody.style.top = `-${Math.max(0, offsetY)}px`;
            });
        }

        const targetEnd = Math.min(totalVirtualCount, startIndex + this.#sheet.viewport.tr.length);
        const renderedItems = allRenderItems.slice(startIndex, targetEnd);


        //trace.log(allRenderItems.length, renderedItems.length, rawTotalVirtualHeight, sumHeight, this.#sheet.viewport.height, this.#sheet.viewport.fixedHeight);
        //trace.log(renderedItems.length, allRenderItems.length, this.#cachedRowCount, totalVirtualCount, startIndex, this.#sheet.viewport.tr.length);


        if (renderedItems.length === 0) return;


        const headerGroupIds = [];//this.#getParentGroupIds(renderedItems, allRenderItems);

        const shouldHoldHeader = true;//this.#isShouldHoldHeader(renderedItems);

        //trace.log(renderedItems[0].groupId, headerGroupIds);

        if (!shouldHoldHeader) {
            ['.ng-container-left', '.ng-container-body', '.ng-container-right'].forEach(selector => {
                const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
                if (!container) return;

                container.querySelectorAll('thead.foot tr').forEach(($tr, rowIndex) => {
                    const targetGroupId = headerGroupIds[rowIndex];

                    if (targetGroupId) {
                        $tr.style.display = '';
                        const targetGroup = allRenderItems.find(item => item.groupId === targetGroupId && item.type === 'group');
                        if (targetGroup) {
                            const actualIndex = allRenderItems.indexOf(targetGroup);
                            this.#bindGroupRowData($tr, allRenderItems, targetGroup.record, actualIndex);
                        }
                    } else {
                        $tr.style.display = 'none';
                    }
                });
            });
        }


        const trueFirstItem = renderedItems.find(item => {
            // 만약 group 타입이고 headerGroupIds에 포함되어 있다면 본문에서 숨겨지므로 제외
            if (item.type === 'group' && headerGroupIds.includes(item.groupId)) {
                return false;
            }
            return true;
        });

        // ==========================================
        // 💡 2단계: 본문(tbody.body) 렌더링 (모든 아이템 빠짐없이 출력)
        // ==========================================
        [
            this.#sheet.elements.left.tbody.body,
            this.#sheet.elements.body.tbody.body,
            this.#sheet.elements.right.tbody.body
        ].forEach(($tbody, tbodyIdx) => {
            if (!$tbody) return;

            let vIndex = startIndex;

            for (let i = 0; i < $tbody.trs.length; i += templateLength) {
                const itemIndex = Math.floor(i / templateLength);
                const item = renderedItems[itemIndex];
                const chunkTrs = $tbody.trs.slice(i, i + templateLength);

                if (!item || itemIndex >= renderedItems.length) {
                    chunkTrs.forEach(tr => {
                        tr.style.display = 'none';
                        tr.dataset.matrixRow = null;
                        tr.dataset.row = null;
                        tr.dataset.index = null;
                    });
                    continue;
                }

                const dataIndex = startIndex + itemIndex;

                chunkTrs.forEach((tr, subIdx) => {
                    tr.dataset.virtualIndex = vIndex;
                    tr.dataset.row = (item.type === 'data') ? dataIndex : '';

                    const isTrGroup = tr.getAttribute('group-by') ? true : false;

                    if (item.type === 'group') {
                        if (isTrGroup) {
                            const depth = item.record[GROUP_IDX.DEPTH];
                            if (subIdx === depth) {
                                tr.style.display = '';

                                this.#bindGroupRowData(tr, allRenderItems, item.record, startIndex + itemIndex);
                            } else {
                                tr.style.display = 'none';
                                tr.dataset.matrixRow = null;
                                tr.dataset.row = null;
                                tr.dataset.index = null;
                            }
                        } else {
                            tr.style.display = 'none';
                            tr.dataset.matrixRow = null;
                            tr.dataset.row = null;
                            tr.dataset.index = null;
                        }
                    } else {
                        if (isTrGroup) {
                            tr.style.display = 'none';
                            tr.dataset.matrixRow = null;
                            tr.dataset.row = null;
                            tr.dataset.index = null;
                        } else {
                            tr.style.display = '';
                            const rowid = item.record.m._[NINE_TABLE.META.INDEX.ROWID];
                            this.#bindRowData(tr, item.record, rowid, startIndex + itemIndex);
                            //if (subIdx === templateLength - 1) vIndex++;
                        }
                    }
                });
            }
        });

        //this.#adjustHeaderGroup(renderedItems, allRenderItems);
        /**
        const firstItem = trueFirstItem || renderedItems[0];
        const lastHeaderGroupId = headerGroupIds[headerGroupIds.length - 1];
        const lastHeaderItem = allRenderItems.find(item => item.groupId === lastHeaderGroupId);

        if (lastHeaderItem && firstItem) {
            const lastHeaderDepth = lastHeaderItem.record[GROUP_IDX.DEPTH];

            const firstItemDepth = firstItem.type === 'group'
                ? firstItem.record[GROUP_IDX.DEPTH]
                : lastHeaderDepth;

            const $visibleTrs = Array.from(this.#sheet.querySelectorAll('.ng-container-body tbody.body tr'));
            const $firstRealTr = $visibleTrs.find(tr => tr.style.display !== 'none');
            const sectionRowIndex = $firstRealTr.dataset.groupId?.split("_").length - 2;

            if (lastHeaderDepth === firstItemDepth && lastHeaderItem.groupId !== firstItem.groupId) {
                const trRect = $firstRealTr.getBoundingClientRect();
                const $theadFoot = this.#sheet.querySelector('.ng-container-body thead.foot');
                const distance = $theadFoot.getBoundingClientRect().bottom - trRect.top;

                this.#sheet.querySelectorAll('thead.foot tr').forEach(($tr) => {
                    if ($tr.sectionRowIndex === sectionRowIndex) {
                        $tr.style.transform = `translateY(-${distance}px)`;
                    }
                });
            } else {
                this.#sheet.querySelectorAll('thead.foot tr').forEach(($tr) => {
                    $tr.style.transform = ``;
                });
            }
        }
        */
        this.#sheet.selection.refresh();
    };



    #handleGroupedScroll_BAK = (scrollTop, force = false) => {

        trace.log(scrollTop);
        const allRenderItems = this.#sheet.view.getArray() || [];
        const totalVirtualCount = allRenderItems.length;
        if (totalVirtualCount === 0) {
            this.#sheet.elements.scrollHolder.style.height = '0px';
            return;
        }

        const findItemByGroupId = (allRenderItems, targetGroupId) => {
            return allRenderItems.find(item => item.groupId === targetGroupId && item.type === 'group');
        };

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
        const bodyContent = this.#sheet.querySelector('.ng-sheet-body .ng-sheet-body-content');
        const templateLength = this.#sheet.template.length;

        const getItemHeight = (item) => {
            if (item.type === 'group') {
                const depth = item.record[GROUP_IDX.DEPTH];
                return this.#sheet.template.heights[depth];
            } else {
                const dataRowsHeight = this.#sheet.template.height - this.#sheet.template.group.height;
                return dataRowsHeight > 0 ? dataRowsHeight : this.#sheet.template.height;
            }
        };

        let sumHeight = 0;
        const itemHeights = new Array(totalVirtualCount);
        for (let i = 0; i < totalVirtualCount; i++) {
            const h = getItemHeight(allRenderItems[i]);
            itemHeights[i] = h;
            sumHeight += h;
        }

        //const rawTotalVirtualHeight = Math.max(sumHeight - this.#sheet.viewport.height + this.#sheet.viewport.fixedHeight, 0);

        const rawTotalVirtualHeight = Math.max(sumHeight, 0);



        const MAX_BROWSER_HEIGHT = 15000000;
        const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

        let scaleFactor = 1;
        let totalVirtualHeight = rawTotalVirtualHeight;

        if (useScaling) {
            scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            totalVirtualHeight = MAX_BROWSER_HEIGHT;
        }

        this.#sheet.elements.scrollHolder.style.height = `${totalVirtualHeight}px`;

        const actualScrollTop = useScaling ? (scrollTop / scaleFactor) : scrollTop;
        const clampedScrollTop = Math.min(actualScrollTop, rawTotalVirtualHeight);
        //const clampedScrollTop = Math.min(rawTotalVirtualHeight, rawTotalVirtualHeight);

        let accumulatedHeight = 0;
        let startIndex = 0;

        for (let i = 0; i < totalVirtualCount; i++) {
            const h = itemHeights[i];
            if (accumulatedHeight + h > clampedScrollTop) {
                startIndex = i;
                break;
            }
            accumulatedHeight += h;
            startIndex = i;
        }

        const offsetY = clampedScrollTop - accumulatedHeight;
        //trace.log(offsetY, scrollTop, actualScrollTop, rawTotalVirtualHeight, clampedScrollTop, accumulatedHeight);
        if (bodyContent) {
            bodyContent.querySelectorAll("tbody.body").forEach(($tbody) => {
                $tbody.style.top = `-${Math.max(0, offsetY)}px`;
            });
        }

        const targetEnd = Math.min(totalVirtualCount, startIndex + this.#sheet.viewport.tr.length);
        const renderedItems = allRenderItems.slice(startIndex, targetEnd);


        //trace.log(allRenderItems.length, renderedItems.length, rawTotalVirtualHeight, sumHeight, this.#sheet.viewport.height, this.#sheet.viewport.fixedHeight);
        //trace.log(renderedItems.length, allRenderItems.length, this.#cachedRowCount, totalVirtualCount, startIndex, this.#sheet.viewport.tr.length);


        if (renderedItems.length === 0) return;

        // ==========================================
        // 💡 1단계: thead.foot로 올릴 상위 그룹 아이템 선별 (모든 상위 부모 완전 누적)
        // ==========================================
        let headerGroupIds = [];
        //const firstItem = renderedItems[0];
        const firstItemGroupId = renderedItems[0].groupId;
        const firstItemdepth = firstItemGroupId.split("_").length - 2;

        trace.log(firstItemGroupId, firstItemdepth);

        if (firstItemGroupId) {
            const parts = firstItemGroupId.split('_'); // 예: ["g", "1", "0"]
            let ids = [];

            if (renderedItems[0].type === 'group') {
                // 2. 그룹 행인 경우: 부모 조상들 + (윗형제가 존재할 때만 바로 윗형제 추가)

                // A. 부모 조상들 수집 (마지막 말단 그룹 제외)
                if (parts.length > 2) {
                    for (let i = 1; i < parts.length - 1; i++) {
                        ids.push(parts.slice(0, i + 1).join('_'));
                    }
                }

                // B. 말단 그룹의 윗형제 처리
                const lastIdx = parts.length - 1;
                const lastVal = parseInt(parts[lastIdx], 10);

                // 💡 핵심: lastVal이 0보다 클 때만 윗형제(lastVal - 1) 존재함!
                // 0인 경우(첫 번째 그룹 또는 첫째 자식)는 윗형제가 없으므로 아무것도 추가하지 않음 (g_0 사단 방지)
                if (lastVal > 0) {
                    let siblingParts = [...parts];
                    siblingParts[lastIdx] = lastVal - 1;
                    ids.push(siblingParts.join('_'));
                }
            } else {
                // type이 data인 경우: groupId 자체가 조상들 체인
                ids = parts.map((_, index) => parts.slice(0, index + 1).join('_')).slice(1);
            }

            headerGroupIds = ids;
        }

        //trace.log(headerGroupIds);

        for (const item of renderedItems) {

            const itemDepth = item.groupId.split("_").length - 2;
            //firstItemGroupId
            trace.log(firstItemdepth, itemDepth);
            if (firstItemdepth >= itemDepth) break;

            if (item.type === 'group') {
                if (item.groupId && !headerGroupIds.includes(item.groupId)) {
                    headerGroupIds.push(item.groupId);
                }
            } else {
                break; // 데이터 행을 만나면 중단
            }
        }


        if (headerGroupIds.length === 0) {
            for (const item of renderedItems) {
                const itemDepth = item.groupId.split("_") - 1;

                if (item.type === 'group') {
                    if (item.groupId && !headerGroupIds.includes(item.groupId)) {
                        headerGroupIds.push(item.groupId);
                    }
                } else {
                    break; // 데이터 행을 만나면 중단
                }
            }
        }

        trace.log(headerGroupIds);

        // 💡 thead.foot에 올라가서 본문에서 숨겨질(excluded) 아이템들을 제외하고,
        // 사용자 눈에 실제로 맨 처음에 보이는 '진짜 첫 번째 아이템'을 찾습니다.
        const trueFirstItem = renderedItems.find(item => {
            // 만약 group 타입이고 headerGroupIds에 포함되어 있다면 본문에서 숨겨지므로 제외
            if (item.type === 'group' && headerGroupIds.includes(item.groupId)) {
                return false;
            }
            return true;
        });


        ['.ng-container-left', '.ng-container-body', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (!container) return;

            container.querySelectorAll('thead.foot tr').forEach(($tr, rowIndex) => {
                const targetGroupId = headerGroupIds[rowIndex];

                if (targetGroupId) {
                    $tr.style.display = '';
                    const targetGroup = allRenderItems.find(item => item.groupId === targetGroupId && item.type === 'group');
                    if (targetGroup) {
                        const actualIndex = allRenderItems.indexOf(targetGroup);
                        this.#bindGroupRowData($tr, allRenderItems, targetGroup.record, actualIndex);
                    }
                } else {
                    $tr.style.display = 'none';
                }
            });
        });

        // ==========================================
        // 💡 2단계: 본문(tbody.body) 렌더링 (모든 아이템 빠짐없이 출력)
        // ==========================================
        [
            this.#sheet.elements.left.tbody.body,
            this.#sheet.elements.body.tbody.body,
            this.#sheet.elements.right.tbody.body
        ].forEach(($tbody, tbodyIdx) => {
            if (!$tbody) return;

            let vIndex = startIndex;

            for (let i = 0; i < $tbody.trs.length; i += templateLength) {
                const itemIndex = Math.floor(i / templateLength);
                const item = renderedItems[itemIndex];
                const chunkTrs = $tbody.trs.slice(i, i + templateLength);

                if (!item || itemIndex >= renderedItems.length) {
                    chunkTrs.forEach(tr => {
                        tr.style.display = 'none';
                        tr.dataset.matrixRow = null;
                        tr.dataset.row = null;
                        tr.dataset.index = null;
                    });
                    continue;
                }

                const dataIndex = startIndex + itemIndex;

                chunkTrs.forEach((tr, subIdx) => {
                    tr.dataset.virtualIndex = vIndex;
                    tr.dataset.row = (item.type === 'data') ? dataIndex : '';

                    const isTrGroup = tr.getAttribute('group-by') ? true : false;

                    if (item.type === 'group') {
                        if (isTrGroup) {
                            const depth = item.record[GROUP_IDX.DEPTH];
                            if (subIdx === depth) {
                                tr.style.display = '';

                                this.#bindGroupRowData(tr, allRenderItems, item.record, startIndex + itemIndex);
                            } else {
                                tr.style.display = 'none';
                                tr.dataset.matrixRow = null;
                                tr.dataset.row = null;
                                tr.dataset.index = null;
                            }
                        } else {
                            tr.style.display = 'none';
                            tr.dataset.matrixRow = null;
                            tr.dataset.row = null;
                            tr.dataset.index = null;
                        }
                    } else {
                        if (isTrGroup) {
                            tr.style.display = 'none';
                            tr.dataset.matrixRow = null;
                            tr.dataset.row = null;
                            tr.dataset.index = null;
                        } else {
                            tr.style.display = '';
                            const rowid = item.record.m._[NINE_TABLE.META.INDEX.ROWID];
                            this.#bindRowData(tr, item.record, rowid, startIndex + itemIndex);
                            //if (subIdx === templateLength - 1) vIndex++;
                        }
                    }
                });
            }
        });

        const firstItem = trueFirstItem || renderedItems[0];
        const lastHeaderGroupId = headerGroupIds[headerGroupIds.length - 1];
        const lastHeaderItem = allRenderItems.find(item => item.groupId === lastHeaderGroupId);

        if (lastHeaderItem && firstItem) {
            const lastHeaderDepth = lastHeaderItem.record[GROUP_IDX.DEPTH];

            const firstItemDepth = firstItem.type === 'group'
                ? firstItem.record[GROUP_IDX.DEPTH]
                : lastHeaderDepth;

            const $visibleTrs = Array.from(this.#sheet.querySelectorAll('.ng-container-body tbody.body tr'));
            const $firstRealTr = $visibleTrs.find(tr => tr.style.display !== 'none');
            const sectionRowIndex = $firstRealTr.dataset.groupId?.split("_").length - 2;

            if (lastHeaderDepth === firstItemDepth && lastHeaderItem.groupId !== firstItem.groupId) {
                const trRect = $firstRealTr.getBoundingClientRect();
                const $theadFoot = this.#sheet.querySelector('.ng-container-body thead.foot');
                const distance = $theadFoot.getBoundingClientRect().bottom - trRect.top;

                this.#sheet.querySelectorAll('thead.foot tr').forEach(($tr) => {
                    if ($tr.sectionRowIndex === sectionRowIndex) {
                        $tr.style.transform = `translateY(-${distance}px)`;
                    }
                });
            } else {
                this.#sheet.querySelectorAll('thead.foot tr').forEach(($tr) => {
                    $tr.style.transform = ``;
                });
            }
        }

        this.#sheet.selection.refresh();
    };


    #bindRowData = ($tr, record, rowid, dataIndex) => {
        const templateLength = this.#sheet.templateLength || 1;
        const subRowIndex = parseInt($tr.dataset.subrow, 10) || 0;
        const matrixRow = (dataIndex * templateLength) + subRowIndex;

        $tr.dataset.index = dataIndex;
        $tr.dataset.row = rowid;
        $tr.dataset.matrixRow = matrixRow;
        $tr.data = record;

        Array.from($tr.cells).forEach(($cell) => {
            $cell.dataset.index = dataIndex;
            $cell.dataset.row = rowid;

            const customComp = Array.from($cell.children).find($el =>
                $el.tagName.toLowerCase().startsWith('cell-') && typeof $el.refresh === 'function'
            );

            customComp?.refresh();
        });
    };

    #bindGroupRowData = ($tr, allRenderItems, groupRecord, virtualIndex) => {

        const templateLength = this.#sheet.templateLength || 1;
        const subRowIndex = parseInt($tr.dataset.subrow, 10) || 0;
        const matrixRow = (virtualIndex * templateLength) + subRowIndex;

        //trace.log(matrixRow);

        const indices = groupRecord[GROUP_IDX.CHILDREN];
        //const allRecords = this.#host.data.getArray();
        //trace.log(this.#chchedAllRecords, indices);
        const childrenRecords = indices ? indices.map(idx => this.#chchedAllRecords[idx]).filter(Boolean) : [];

        $tr.dataset.virtualIndex = virtualIndex;
        $tr.dataset.index = virtualIndex;
        $tr.dataset.row = '';
        $tr.dataset.matrixRow = matrixRow;
        $tr.data = childrenRecords;//groupRecord;
        $tr.dataset.groupId = groupRecord[GROUP_IDX.ID];

        Array.from($tr.cells).forEach(($cell) => {
            $cell.dataset.index = virtualIndex;
            $cell.dataset.row = virtualIndex;
            //$cell.dataset.row = virtualIndex;

            const customComp = Array.from($cell.children).find($el =>
                $el.tagName.toLowerCase().startsWith('cell-') || typeof $el.refresh === 'function'
            );


            //if (customComp !== undefined && typeof customComp.refresh === 'function') {
            customComp?.refresh?.();
            //}
        });
    };

    initialize = () => {

        //this.#cachedTemplateHeight = null;
        this.#containerTemplates.clear();

        this.#element = {
            scrollTables: this.#sheet.querySelectorAll('.ng-sheet-body table'),
            firstTr: this.#sheet.querySelector('.ng-sheet-body .ng-container-body tbody.body tr'),
        };

        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (!container) return;

            const tableEl = container.querySelector('table');
            if (!tableEl) return;

            const tbody = tableEl.querySelector('tbody.body');
            if (!tbody) return;

            const trs = Array.from(tbody.querySelectorAll('tr'));
            const templateTrs = trs.map(tr => tr.cloneNode(true));
            this.#containerTemplates.set(selector, templateTrs);
        });

        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');

        if (bodyViewport) {
            this.#sheetHeight = bodyViewport.clientHeight;
            //trace.log("this.#sheetHeight", this.#sheetHeight, this.#sheet);

            this.#measureAndCacheHeight();
            this.#renderAllContainers();

            this.#handleScroll(bodyViewport.scrollTop, true);

            bodyViewport.addEventListener('scroll', (e) => {

                this.#sheet.querySelectorAll("cell-combo-panel").forEach($el => {
                    $el.classList.remove('active');
                });


                if (this.#isProgrammaticScroll) return;

                const rowHeight = this.#sheet.template.height || 0;
                const totalCount = this.#sheet.view.getArray()?.length || 0;
                const rawTotalVirtualHeight = totalCount * rowHeight;

                if (rawTotalVirtualHeight <= bodyViewport.clientHeight) {
                    return;
                }

                this.#handleScroll(bodyViewport.scrollTop);

                this.#sheet.querySelector('nine-table-vscrollbar').refresh();

            }, { passive: true });
        }
    };

    scrollToDataRow(dataRow, align = 'top', onRendered) {
        const bodyViewport = this.#sheet.querySelector('.ng-sheet-body');
        const viewRecords = this.#sheet.view.getArray();
        const totalCount = viewRecords?.length || 0;

        const targetRow = Math.max(0, Math.min(dataRow, totalCount - 1));
        let targetScrollTop = 0;

        const MAX_BROWSER_HEIGHT = 15000000;

        if (this.#sheet.isGroupBy) {
            const allRenderItems = this.#sheet.view.getArray() || [];
            const templateTrs = Array.from(this.#sheet.sourceTable?.querySelectorAll('tbody.body tr') || []);
            const templateLength = templateTrs.length || 1;

            let accumulatedHeight = 0;
            let currentDataCount = 0;

            // 1. 전체 가상 높이(rawTotalVirtualHeight)를 구하기 위한 전체 높이 측정 또는 targetRow까지의 누적 높이
            // 💡 주의: scaleFactor를 정확히 구하려면 "전체 콘텐츠의 총 높이"가 필요하므로
            // 전체 뷰 아이템들의 총 높이를 먼저 구하거나 누적해야 합니다.
            let totalGroupVirtualHeight = 0;
            let targetAccumulatedHeight = 0;

            for (let i = 0; i < targetRow; i++) {
                const item = allRenderItems[i];

                let itemTotalHeight = 0;
                for (let subIdx = 0; subIdx < templateLength; subIdx++) {
                    const tmplTr = templateTrs[subIdx];
                    if (!tmplTr) continue;

                    const isTrGroup = tmplTr.getAttribute('group-by') ? true : false;
                    let isVisible = false;

                    if (item.type === 'group') {
                        if (isTrGroup) {
                            const depth = item.record[GROUP_IDX.DEPTH];
                            if (subIdx === depth) isVisible = true;
                        }
                    } else {
                        if (!isTrGroup) isVisible = true;
                    }

                    if (isVisible) {
                        if (isTrGroup) {
                            const depth = item.record[GROUP_IDX.DEPTH];
                            itemTotalHeight += this.#sheet.template.group.heights[depth];
                        } else {
                            const dataRowsHeight = this.#sheet.template.height - this.#sheet.template.group.height;
                            itemTotalHeight += (this.#sheet.template.height - this.#sheet.template.group.height) / (this.#sheet.template.length - this.#sheet.template.group.length);
                        }
                    }
                }

                if (item.type === 'data') {
                    if (currentDataCount === targetRow) {
                        targetAccumulatedHeight = totalGroupVirtualHeight;
                    }
                    currentDataCount++;
                }

                totalGroupVirtualHeight += itemTotalHeight;
            }

            // 만약 targetRow가 마지막 인덱스이거나 하다면 보정
            if (currentDataCount <= targetRow) {
                targetAccumulatedHeight = totalGroupVirtualHeight;
            }

            // 2. 스케일링 적용 (MAX_BROWSER_HEIGHT 초과 시 압축)
            const useScaling = totalGroupVirtualHeight > MAX_BROWSER_HEIGHT;
            let scaleFactor = 1;
            if (useScaling) {
                scaleFactor = MAX_BROWSER_HEIGHT / totalGroupVirtualHeight;
            }

            targetScrollTop = Math.max(0, targetAccumulatedHeight * scaleFactor);

        } else {
            const rowHeight = this.#sheet.template.height;
            const rawTargetScrollTop = targetRow * rowHeight;

            const fixedHeight = (this.#sheet.elements.body.thead?.offsetHeight || 0) +
                (this.#sheet.elements.body.tfoot?.offsetHeight || 0) +
                this.#sheet.elements.body.tbody.head.offsetHeight;

            const viewHeight = bodyViewport.offsetHeight || 0;
            const rawTotalVirtualHeight = Math.max(totalCount * rowHeight - rowHeight + fixedHeight - viewHeight - rowHeight, 0);

            const useScaling = rawTotalVirtualHeight > MAX_BROWSER_HEIGHT;

            let scaleFactor = 1;
            if (useScaling) {
                scaleFactor = MAX_BROWSER_HEIGHT / rawTotalVirtualHeight;
            }

            targetScrollTop = rawTargetScrollTop * scaleFactor;
        }

        this.#isProgrammaticScroll = true;
        bodyViewport.scrollTop = targetScrollTop;
        this.#handleScroll(targetScrollTop);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.#isProgrammaticScroll = false;
                if (typeof onRendered === 'function') onRendered();
            });
        });
    }



    destroy = () => {
        if (this.#resizeObserver) {
            this.#resizeObserver.disconnect();
            this.#resizeObserver = null;
        }
    };

    #measureAndCacheHeight = () => {
        this.#updateRowCount();
        return;
        if (!this.#sheet.classList.contains('active')) return;

        if (!this.#sheet.sourceTable) return;

        const trTemplates = this.#sheet.sourceTable?.querySelectorAll('tbody.body tr');

        const $tbody = this.#sheet.querySelector('.ng-container-body tbody.body');
        if (!$tbody) return;

        $tbody?.querySelectorAll('tr')?.forEach(tr => tr.remove());

        const fragment = document.createDocumentFragment();
        trTemplates.forEach($tr => fragment.appendChild($tr.cloneNode(true)));
        $tbody?.appendChild(fragment);

        const renderedTrs = $tbody.querySelectorAll('tr');

        renderedTrs.forEach(tr => tr.remove());

        this.#updateRowCount();
    };

    #updateRowCount = () => {

        if (this.#sheet.viewport.innerHeight > 0 && this.#sheet.template.height > 0) {
            const visibleRows = Math.ceil(this.#sheet.viewport.innerHeight / (this.#sheet.template.height - this.#sheet.template.group.height));

            let dynamicBuffer = this.#BUFFER_ROW_COUNT;
            if (this.#sheet.isGroupBy) {
                const groupRows = Math.ceil(this.#sheet.viewport.innerHeight / this.#sheet.template.group.height) + this.#BUFFER_ROW_COUNT;
                dynamicBuffer += (this.#sheet.viewport.group.length * groupRows);
            }

            this.#cachedRowCount = visibleRows + dynamicBuffer;
        }
    };

    #renderAllContainers = () => {

        ['.ng-container-body', '.ng-container-left', '.ng-container-right'].forEach(selector => {
            const container = this.#sheet.querySelector(`.ng-sheet-body ${selector}`);
            if (container && container.querySelector('tbody')) {
                this.#renderRows(container);
            }
        });

        this.#syncRowHeights();
    };

    #renderRows = (container) => {

        let targetFixedType = null;
        if (container.classList.contains('ng-container-left')) targetFixedType = 'left';
        else if (container.classList.contains('ng-container-right')) targetFixedType = 'right';

        const templateTrs = Array.from(this.#sheet.sourceTable.querySelectorAll('tbody.body tr')).map(tr => {
            const clonedTr = tr.cloneNode(true);

            if (targetFixedType === 'left') {
                clonedTr.querySelectorAll('th,td').forEach($cell => {
                    if ($cell.getAttribute('fixed') !== 'left') $cell.remove();
                });
            } else if (targetFixedType === 'right') {
                clonedTr.querySelectorAll('th,td').forEach($cell => {
                    if ($cell.getAttribute('fixed') !== 'right') $cell.remove();
                });
            } else {
                clonedTr.querySelectorAll('[fixed=left], [fixed=right]').forEach($cell => {
                    $cell.remove();
                });
            }

            return clonedTr;
        });

        if (templateTrs.length === 0) return;

        const targetTbody = container.querySelector('tbody.body');

        targetTbody.querySelectorAll("tr").forEach(tr => tr.remove());

        const fragment = document.createDocumentFragment();
        for (let i = 0; i < this.#cachedRowCount; i++) {
            templateTrs.forEach(tmpl => fragment.appendChild(tmpl.cloneNode(true)));
        }

        targetTbody.appendChild(fragment);

        const fragment2 = document.createDocumentFragment();
        let trIndex = 0;

        const groupingTrs = templateTrs.filter(tmpl => tmpl.getAttribute('group-by') ? true : false);
        const totalGroupingCount = groupingTrs.length;

        templateTrs.forEach(tmpl => {
            if (tmpl.getAttribute('group-by')) {
                const $clonedTr = tmpl.cloneNode(true);

                $clonedTr.style.position = 'relative';
                $clonedTr.style.zIndex = (totalGroupingCount - trIndex) * 10;

                fragment2.appendChild($clonedTr);
                trIndex++;
            }
        });

        const thead = container.querySelector('thead.foot');
        if (thead) {
            thead.querySelectorAll("tr").forEach(tr => tr.remove());
            thead.appendChild(fragment2);
        }


        if (container.classList.contains('ng-container-body')) {
            this.#element.firstTr = targetTbody.querySelector('tr');
        }

        targetTbody.trs = Array.from(container.querySelectorAll('tbody.body tr'));
    };



    #syncRowHeights = () => {
        const leftTable = this.#sheet.querySelector('.ng-sheet-body .ng-container-left table');
        const bodyTable = this.#sheet.querySelector('.ng-sheet-body .ng-container-body table');
        const rightTable = this.#sheet.querySelector('.ng-sheet-body .ng-container-right table');

        if (bodyTable) {
            const leftRows = leftTable ? Array.from(leftTable.querySelectorAll('tbody tr')) : [];
            const bodyRows = Array.from(bodyTable.querySelectorAll('tbody tr'));
            const rightRows = rightTable ? Array.from(rightTable.querySelectorAll('tbody tr')) : [];

            const maxRows = Math.max(leftRows.length, bodyRows.length, rightRows.length);

            for (let i = 0; i < maxRows; i++) {
                const heights = [
                    leftRows[i]?.getBoundingClientRect().height || 0,
                    bodyRows[i]?.getBoundingClientRect().height || 0,
                    rightRows[i]?.getBoundingClientRect().height || 0
                ];
                const maxHeight = Math.max(...heights);

                if (maxHeight > 0) {
                    if (leftRows[i]) leftRows[i].style.height = `${maxHeight}px`;
                    if (bodyRows[i]) bodyRows[i].style.height = `${maxHeight}px`;
                    if (rightRows[i]) rightRows[i].style.height = `${maxHeight}px`;
                }
            }
        }
    };

    #initResizeObserver = () => {

        if (!this.#sheet || !(this.#sheet instanceof HTMLElement)) return;

        this.#resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {

                const sheetEl = entry.target;
                if (!sheetEl.classList.contains('active')) continue;

                const height = entry.contentRect.height;
                const width = entry.contentRect.width;

                if (width > 0 && this.#sheet.isAutoFitCol) {
                    this.#sheet.autoFit(true);
                }

                if (height > 0 && this.#sheetHeight !== height) {
                    this.#sheetHeight = height;
                    //trace.log("this.#sheetHeight", this.#sheetHeight);
                    this.#updateRowCount();

                    if (this.#sheet.template.height !== null) {
                        this.#renderAllContainers();
                        this.refresh();
                    }
                }
            }
        });

        this.#resizeObserver.observe(this.#sheet);
    };
}