/**
 * 월세 수납 관리 시스템 메인 애플리케이션
 */

const STORAGE_KEY = 'rent_manager_app_data_v2';
const VISIBLE_MONTHS_KEY = 'rent_manager_visible_months_v3';

// 상태 객체
const state = {
    rooms: [],
    months: [],
    visibleMonths: localStorage.getItem(VISIBLE_MONTHS_KEY) || '3',
    monthEndIndex: null, // 월 윈도우 탐색용 (null이면 최신 월까지)
    searchKeyword: '',
    lastUpdated: '',
    activeCell: null // { roomId, monthKey }
};

// DOM 요소
const elements = {
    rentTable: document.getElementById('rentTable'),
    tableHeaderRow: document.getElementById('tableHeaderRow'),
    tableBody: document.getElementById('tableBody'),
    tableFooterRow: document.getElementById('tableFooterRow'),
    updateTimeDisplay: document.getElementById('updateTimeDisplay'),
    roomCountBadge: document.getElementById('roomCountBadge'),
    topTotalDeposit: document.getElementById('topTotalDeposit'),
    topTotalRent: document.getElementById('topTotalRent'),
    barRoomCount: document.getElementById('barRoomCount'),
    barTotalDeposit: document.getElementById('barTotalDeposit'),
    barTotalRent: document.getElementById('barTotalRent'),
    footTotalDeposit: document.getElementById('footTotalDeposit'),
    footTotalRent: document.getElementById('footTotalRent'),
    searchInput: document.getElementById('searchInput'),
    // 입금 달 필터
    monthCountSelect: document.getElementById('monthCountSelect'),
    btnPrevMonth: document.getElementById('btnPrevMonth'),
    btnNextMonth: document.getElementById('btnNextMonth'),
    customMonthBox: document.getElementById('customMonthBox'),
    customMonthInput: document.getElementById('customMonthInput'),
    btnApplyCustomMonth: document.getElementById('btnApplyCustomMonth'),
    monthPeriodBadge: document.getElementById('monthPeriodBadge'),
    btnToggleDetail: document.getElementById('btnToggleDetail'),
    detailIcon: document.getElementById('detailIcon'),
    detailLabel: document.getElementById('detailLabel'),
    btnExportJson: document.getElementById('btnExportJson'),
    btnImportJson: document.getElementById('btnImportJson'),
    restoreFileInput: document.getElementById('restoreFileInput'),
    btnExportCsv: document.getElementById('btnExportCsv'),
    // 모달
    roomModal: document.getElementById('roomModal'),
    roomForm: document.getElementById('roomForm'),
    roomModalTitle: document.getElementById('roomModalTitle'),
    formRoomId: document.getElementById('formRoomId'),
    formNo: document.getElementById('formNo'),
    formRoomNumber: document.getElementById('formRoomNumber'),
    formTenant: document.getElementById('formTenant'),
    formPhone: document.getElementById('formPhone'),
    formRent: document.getElementById('formRent'),
    formPayDay: document.getElementById('formPayDay'),
    formDeposit: document.getElementById('formDeposit'),
    formRoomType: document.getElementById('formRoomType'),
    formContractStart: document.getElementById('formContractStart'),
    formContractEnd: document.getElementById('formContractEnd'),
    formMemo: document.getElementById('formMemo'),
    // 수납 모달
    payModal: document.getElementById('payModal'),
    payModalTitle: document.getElementById('payModalTitle'),
    payModalInfo: document.getElementById('payModalInfo'),
    customPayDate: document.getElementById('customPayDate'),
    btnApplyCustomPay: document.getElementById('btnApplyCustomPay'),
    btnQuickPayToday: document.getElementById('btnQuickPayToday'),
    btnSetUnpaid: document.getElementById('btnSetUnpaid'),
    btnClearPayment: document.getElementById('btnClearPayment'),
    toastContainer: document.getElementById('toastContainer')
};

// 날짜 포맷 함수
function formatDateTime(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
}

function formatDateMMDD(date = new Date()) {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}/${d}`;
}

// 토스트 메시지
function showToast(message, type = 'normal') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 250);
    }, 2800);
}

// 데이터 로드 & 저장
function initData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    let needLoadSample = true;
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            const hasValidRooms = parsed.rooms && Array.isArray(parsed.rooms) && parsed.rooms.length >= 17;
            const hasPayments = hasValidRooms && parsed.rooms.some(r => r.payments && Object.keys(r.payments).length > 0);
            if (hasValidRooms && hasPayments) {
                state.rooms = parsed.rooms;
                state.months = (parsed.months && parsed.months.length > 0) ? parsed.months : JSON.parse(JSON.stringify(INITIAL_MONTHS));
                state.lastUpdated = parsed.lastUpdated || "2025-05-08 16:39";
                needLoadSample = false;
            }
        } catch (e) {
            console.error('저장 데이터 파싱 에러, 기본 데이터 로드:', e);
        }
    }
    if (needLoadSample) {
        loadSampleData();
    }
}

function loadSampleData() {
    state.rooms = JSON.parse(JSON.stringify(INITIAL_ROOMS));
    state.months = JSON.parse(JSON.stringify(INITIAL_MONTHS));
    state.visibleMonths = '3';
    state.monthEndIndex = state.months.length;
    localStorage.setItem(VISIBLE_MONTHS_KEY, 'all');
    state.lastUpdated = "2025-05-08 16:39"; // 이미지 원본 기준 날짜
    saveData(false);
}

function saveData(updateTime = true) {
    if (updateTime) {
        state.lastUpdated = formatDateTime();
    }
    const payload = {
        rooms: state.rooms,
        months: state.months,
        lastUpdated: state.lastUpdated,
        version: "2.0.0"
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    updateHeaderTime();
}

function updateHeaderTime() {
    elements.updateTimeDisplay.textContent = `최종 업데이트: ${state.lastUpdated || '-'}`;
}

// 표시할 최근 입금 월 목록 반환
function getVisibleMonths() {
    if (!state.months || state.months.length === 0) return [];
    if (state.visibleMonths === 'all') {
        return state.months;
    }
    if (state.visibleMonths === 'recent-paid') {
        // 실제 입금 기록이 집중된 최근 3달 (2025-02 ~ 2025-04)
        const idx = state.months.findIndex(m => m.key === '2025-04');
        if (idx !== -1) {
            const start = Math.max(0, idx - 2);
            return state.months.slice(start, idx + 1);
        }
    }
    const count = parseInt(state.visibleMonths, 10);
    if (isNaN(count) || count <= 0) {
        return state.months;
    }
    if (count >= state.months.length) {
        return state.months;
    }

    const end = (state.monthEndIndex !== null && state.monthEndIndex !== undefined)
        ? Math.min(Math.max(count, state.monthEndIndex), state.months.length)
        : state.months.length;
    const start = Math.max(0, end - count);
    return state.months.slice(start, end);
}

// 상단 표시 기간 뱃지 업데이트
function updateMonthPeriodBadge(visibleMonths) {
    if (!elements.monthPeriodBadge) return;
    if (!visibleMonths || visibleMonths.length === 0) {
        elements.monthPeriodBadge.textContent = '표시할 월 없음';
        return;
    }
    const first = visibleMonths[0].key;
    const last = visibleMonths[visibleMonths.length - 1].key;
    const count = visibleMonths.length;
    let countLabel = '';
    if (state.visibleMonths === 'all' || count === state.months.length) {
        countLabel = `전체 ${count}달`;
    } else if (state.visibleMonths === 'recent-paid') {
        countLabel = '최근 입금 3달';
    } else {
        countLabel = `최근 ${count}달`;
    }

    if (first === last) {
        elements.monthPeriodBadge.textContent = `${first} (${countLabel})`;
    } else {
        elements.monthPeriodBadge.textContent = `${first} ~ ${last} (${countLabel})`;
    }
}

// 렌더링 함수
function render() {
    const visibleMonths = getVisibleMonths();
    updateHeaderTime();
    updateMonthPeriodBadge(visibleMonths);
    renderMonthHeaders(visibleMonths);
    renderTableRows(visibleMonths);
    calculateTotals(visibleMonths);
}

// 월별 컬럼 헤더 렌더링
function renderMonthHeaders(visibleMonths = getVisibleMonths()) {
    // 기존 동적 월별 th 제거
    const existingMonthThs = elements.tableHeaderRow.querySelectorAll('.col-month-th');
    existingMonthThs.forEach(th => th.remove());

    visibleMonths.forEach(m => {
        const th = document.createElement('th');
        th.className = 'col-month col-month-th';
        const parts = m.key ? m.key.split('-') : [];
        const year = parts[0] ? parts[0].slice(2) : '';
        th.innerHTML = `
            <div class="col-month-year">${year ? year + '년' : ''}</div>
            <div class="col-month-title">${m.label}월</div>
        `;
        th.title = `${m.key} (${m.label}월)`;
        elements.tableHeaderRow.appendChild(th);
    });
}

// 테이블 본문 렌더링
function renderTableRows(visibleMonths = getVisibleMonths()) {
    elements.tableBody.innerHTML = '';

    const keyword = state.searchKeyword.toLowerCase().trim();
    const filteredRooms = state.rooms.filter(room => {
        if (!keyword) return true;
        return (
            String(room.roomNumber).toLowerCase().includes(keyword) ||
            String(room.tenant).toLowerCase().includes(keyword) ||
            String(room.phone).toLowerCase().includes(keyword) ||
            String(room.memo).toLowerCase().includes(keyword)
        );
    });

    // 뱃지 및 상태 업데이트
    elements.roomCountBadge.textContent = `${filteredRooms.length}세대`;
    elements.barRoomCount.textContent = `${filteredRooms.length}세대`;

    if (filteredRooms.length === 0) {
        const tr = document.createElement('tr');
        const totalCols = 11 + visibleMonths.length;
        tr.innerHTML = `<td colspan="${totalCols}" style="padding: 30px; text-align: center; color: var(--gray-400);">
            검색 결과가 없습니다.
        </td>`;
        elements.tableBody.appendChild(tr);
        return;
    }

    filteredRooms.forEach((room, index) => {
        const tr = document.createElement('tr');

        // 기본 정보 열들
        tr.innerHTML = `
            <td class="col-sticky-1">${index + 1}</td>
            <td class="col-sticky-2">${room.roomNumber}</td>
            <td class="col-sticky-3">${room.tenant}</td>
            <td class="col-rent">${room.rent}</td>
            <td class="col-payday">${room.payDay ? room.payDay + (String(room.payDay).endsWith('일') ? '' : '일') : '-'}</td>
            <td class="col-phone col-detail">${room.phone || '-'}</td>
            <td class="col-deposit">${Number(room.deposit || 0).toLocaleString()}</td>
            <td class="col-period col-detail">${room.contractPeriod || '-'}</td>
            <td class="col-roomtype">${room.roomType || '-'}</td>
            <td class="col-memo col-detail">${room.memo || ''}</td>
            <td class="col-actions col-detail">
                <div class="action-btn-group">
                    <button class="btn btn-sm btn-edit-room" data-room-id="${room.id}">수정</button>
                    <button class="btn btn-sm btn-delete-room" data-room-id="${room.id}" style="color: var(--danger);">삭제</button>
                </div>
            </td>
        `;

        // 월별 수납 열들 (선택된 최근 월만 표시)
        visibleMonths.forEach(m => {
            const td = document.createElement('td');
            td.className = 'col-month';
            const payVal = room.payments ? room.payments[m.key] : null;

            if (payVal === 'X' || payVal === 'x') {
                td.innerHTML = `<span class="pay-unpaid">X</span>`;
                td.title = `${m.key} 미납 (클릭하여 수정)`;
            } else if (payVal) {
                td.innerHTML = `<span class="pay-paid">${payVal}</span>`;
                td.title = `${m.key} 납부: ${payVal} (클릭하여 수정)`;
            } else {
                td.innerHTML = `<button type="button" class="pay-empty-btn">입력</button>`;
                td.title = `${m.key} 수납 입력하기`;
            }

            // 셀 클릭 이벤트 -> 빠른 납부 모달 호출
            td.addEventListener('click', (e) => {
                openPayModal(room.id, m.key);
            });

            tr.appendChild(td);
        });

        elements.tableBody.appendChild(tr);
    });

    // 방 수정 / 삭제 이벤트 위임
    elements.tableBody.querySelectorAll('.btn-edit-room').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const roomId = btn.getAttribute('data-room-id');
            openRoomModal(roomId);
        });
    });

    elements.tableBody.querySelectorAll('.btn-delete-room').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const roomId = btn.getAttribute('data-room-id');
            deleteRoom(roomId);
        });
    });
}

// 합계 계산 및 푸터 렌더링
function calculateTotals(visibleMonths = getVisibleMonths()) {
    let totalDeposit = 0;
    let totalRent = 0;

    state.rooms.forEach(room => {
        totalDeposit += Number(room.deposit) || 0;
        totalRent += Number(room.rent) || 0;
    });

    // 헤더/하단 보증금 및 월세
    elements.topTotalDeposit.textContent = totalDeposit.toLocaleString();
    elements.topTotalRent.textContent = totalRent.toLocaleString();
    elements.barTotalDeposit.textContent = totalDeposit.toLocaleString();
    elements.barTotalRent.textContent = totalRent.toLocaleString();

    elements.footTotalDeposit.textContent = totalDeposit.toLocaleString();
    elements.footTotalRent.textContent = totalRent.toLocaleString();

    // 월별 수납 현황 집계 (tfoot)
    const existingFootMonthTds = elements.tableFooterRow.querySelectorAll('.col-month-foot');
    existingFootMonthTds.forEach(td => td.remove());

    visibleMonths.forEach(m => {
        let monthExpected = 0;
        let monthCollected = 0;

        state.rooms.forEach(room => {
            const rent = Number(room.rent) || 0;
            monthExpected += rent;

            const pay = room.payments ? room.payments[m.key] : null;
            if (pay && pay !== 'X' && pay !== 'x') {
                monthCollected += rent;
            }
        });

        const td = document.createElement('td');
        td.className = 'col-month col-month-foot foot-stat';
        
        // 이미지의 표시 형태: "315/315" 또는 수납 완료/예정액
        if (monthCollected > 0 || monthExpected > 0) {
            td.innerHTML = `
                <div class="stat-collected">${monthCollected}</div>
                <div class="stat-total">/${monthExpected}</div>
            `;
            td.title = `${m.label}월 합계: ${monthCollected}만 수납 / ${monthExpected}만 청구`;
        } else {
            td.textContent = '-';
        }

        elements.tableFooterRow.appendChild(td);
    });
}

// 호실 추가 / 수정 모달 로직
function openRoomModal(roomId = null) {
    if (roomId) {
        const room = state.rooms.find(r => r.id === roomId);
        if (!room) return;
        elements.roomModalTitle.textContent = `${room.roomNumber}호 정보 수정`;
        elements.formRoomId.value = room.id;
        elements.formNo.value = room.no || '';
        elements.formRoomNumber.value = room.roomNumber || '';
        elements.formTenant.value = room.tenant || '';
        elements.formPhone.value = room.phone || '';
        elements.formRent.value = room.rent || '';
        elements.formPayDay.value = room.payDay || '';
        elements.formDeposit.value = room.deposit || '';
        elements.formRoomType.value = room.roomType || '원룸';
        const contractDates = (room.contractPeriod || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s*~\s*(\d{4})-(\d{1,2})-(\d{1,2})$/);
        elements.formContractStart.value = contractDates
            ? `${contractDates[1]}-${contractDates[2].padStart(2, '0')}-${contractDates[3].padStart(2, '0')}`
            : '';
        elements.formContractEnd.value = contractDates
            ? `${contractDates[4]}-${contractDates[5].padStart(2, '0')}-${contractDates[6].padStart(2, '0')}`
            : '';
        elements.formMemo.value = room.memo || '';
    } else {
        elements.roomModalTitle.textContent = '새 호실 등록';
        elements.roomForm.reset();
        elements.formRoomId.value = '';
        // 추천 번호 자동 계산
        const maxNo = state.rooms.reduce((max, r) => Math.max(max, Number(r.no) || 0), 0);
        elements.formNo.value = maxNo + 1;
    }
    elements.roomModal.classList.add('active');
}

function closeRoomModal() {
    elements.roomModal.classList.remove('active');
}

elements.roomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomId = elements.formRoomId.value;
    const roomData = {
        no: Number(elements.formNo.value) || state.rooms.length + 1,
        roomNumber: elements.formRoomNumber.value.trim(),
        tenant: elements.formTenant.value.trim(),
        phone: elements.formPhone.value.trim(),
        rent: Number(elements.formRent.value) || 0,
        payDay: elements.formPayDay.value.trim(),
        deposit: Number(elements.formDeposit.value) || 0,
        roomType: elements.formRoomType.value,
        contractPeriod: elements.formContractStart.value && elements.formContractEnd.value
            ? `${elements.formContractStart.value} ~ ${elements.formContractEnd.value}`
            : '',
        memo: elements.formMemo.value.trim()
    };

    if (roomId) {
        // 수정
        const index = state.rooms.findIndex(r => r.id === roomId);
        if (index !== -1) {
            state.rooms[index] = { ...state.rooms[index], ...roomData };
            showToast(`${roomData.roomNumber}호 정보가 수정되었습니다.`, 'success');
        }
    } else {
        // 추가
        const newId = `room_${Date.now()}`;
        state.rooms.push({
            id: newId,
            ...roomData,
            payments: {}
        });
        showToast(`${roomData.roomNumber}호가 등록되었습니다.`, 'success');
    }

    saveData();
    render();
    closeRoomModal();
});

function deleteRoom(roomId) {
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return;
    if (confirm(`${room.roomNumber}호 (${room.tenant}) 데이터를 삭제하시겠습니까?`)) {
        state.rooms = state.rooms.filter(r => r.id !== roomId);
        saveData();
        render();
        showToast(`${room.roomNumber}호가 삭제되었습니다.`);
    }
}

// 수납 관리 빠른 모달 로직
function openPayModal(roomId, monthKey) {
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return;

    state.activeCell = { roomId, monthKey };
    const monthObj = state.months.find(m => m.key === monthKey);
    const monthLabel = monthObj ? monthObj.label : monthKey;
    const currentVal = room.payments ? room.payments[monthKey] : '';

    elements.payModalTitle.textContent = `${room.roomNumber}호 ${monthLabel}월 수납 관리`;
    elements.payModalInfo.innerHTML = `
        <strong>세입자:</strong> ${room.tenant} &nbsp;|&nbsp; 
        <strong>월세:</strong> ${room.rent}만원<br>
        <strong>약정일:</strong> 매월 ${room.payDay}일 &nbsp;|&nbsp; 
        <strong>현재 상태:</strong> <span style="color: var(--primary); font-weight: 700;">${currentVal || '미입력'}</span>
    `;

    configurePaymentDatePicker(monthKey, currentVal);
    elements.payModal.classList.add('active');
}

function closePayModal() {
    elements.payModal.classList.remove('active');
    state.activeCell = null;
}

function getPaymentDateValue(value, monthKey) {
    if (!value || value === 'X' || value === 'x') return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.startsWith(monthKey) ? value : '';

    const shortDate = value.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (shortDate) {
        return `${monthKey}-${shortDate[2].padStart(2, '0')}`;
    }

    return '';
}

function configurePaymentDatePicker(monthKey, currentValue) {
    const [year, month] = monthKey.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const firstDate = `${monthKey}-01`;
    const lastDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

    elements.customPayDate.min = firstDate;
    elements.customPayDate.max = lastDate;
    elements.customPayDate.value = getPaymentDateValue(currentValue, monthKey);
}

function updatePayment(value) {
    if (!state.activeCell) return;
    const { roomId, monthKey } = state.activeCell;
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return;

    if (!room.payments) room.payments = {};

    if (value === null) {
        delete room.payments[monthKey];
        showToast(`${room.roomNumber}호 수납 기록이 초기화되었습니다.`);
    } else {
        room.payments[monthKey] = value;
        showToast(`${room.roomNumber}호 [${value}] 처리 완료`, 'success');
    }

    saveData();
    render();
    closePayModal();
}

// 수납 모달 버튼 이벤트
elements.btnApplyCustomPay.addEventListener('click', () => {
    const val = elements.customPayDate.value;
    if (val) updatePayment(val);
});

elements.btnQuickPayToday.addEventListener('click', () => {
    updatePayment(formatDateMMDD());
});

elements.btnSetUnpaid.addEventListener('click', () => {
    updatePayment('X');
});

elements.btnClearPayment.addEventListener('click', () => {
    updatePayment(null);
});

// 기본 정보와 상세 정보 표시 전환
elements.btnToggleDetail.addEventListener('click', () => {
    const isDetailVisible = elements.rentTable.classList.toggle('detail-view');
    elements.rentTable.classList.toggle('compact-view', !isDetailVisible);
    elements.btnToggleDetail.classList.toggle('active', isDetailVisible);
    elements.detailIcon.textContent = isDetailVisible ? '📋' : '📄';
    elements.detailLabel.textContent = isDetailVisible ? '상세 정보 숨기기' : '상세 정보 보기';
});

// 검색 이벤트
elements.searchInput.addEventListener('input', (e) => {
    state.searchKeyword = e.target.value;
    renderTableRows();
});

// 모달 닫기 공통 처리
document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        document.getElementById(modalId).classList.remove('active');
    });
});

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});

// ==========================================
// 입금 달 수 필터 관리
// ==========================================

function syncMonthFilterUI() {
    const val = String(state.visibleMonths);
    
    // 퀵 버튼 활성화 상태
    const quickBtns = document.querySelectorAll('.btn-month-quick');
    quickBtns.forEach(btn => {
        const btnVal = btn.getAttribute('data-months');
        if (btnVal === val) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 이전/다음 네비게이션 버튼 활성화/비활성화
    if (elements.btnPrevMonth && elements.btnNextMonth) {
        if (state.visibleMonths === 'all' || state.visibleMonths === 'recent-paid') {
            elements.btnPrevMonth.disabled = true;
            elements.btnNextMonth.disabled = true;
            elements.btnPrevMonth.style.opacity = '0.35';
            elements.btnNextMonth.style.opacity = '0.35';
        } else {
            const count = parseInt(state.visibleMonths, 10) || 3;
            const currentEnd = (state.monthEndIndex !== null && state.monthEndIndex !== undefined)
                ? state.monthEndIndex
                : state.months.length;

            elements.btnPrevMonth.disabled = (currentEnd <= count);
            elements.btnPrevMonth.style.opacity = (currentEnd <= count) ? '0.35' : '1';

            elements.btnNextMonth.disabled = (currentEnd >= state.months.length);
            elements.btnNextMonth.style.opacity = (currentEnd >= state.months.length) ? '0.35' : '1';
        }
    }

    // 드롭다운 셀렉트 동기화
    if (elements.monthCountSelect) {
        const options = Array.from(elements.monthCountSelect.options).map(o => o.value);
        if (options.includes(val)) {
            elements.monthCountSelect.value = val;
            if (elements.customMonthBox) {
                elements.customMonthBox.style.display = 'none';
            }
        } else {
            elements.monthCountSelect.value = 'custom';
            if (elements.customMonthBox) {
                elements.customMonthBox.style.display = 'inline-flex';
            }
            if (elements.customMonthInput) {
                elements.customMonthInput.value = val;
            }
        }
    }
}

function setVisibleMonthCount(val, showToastMsg = true) {
    state.visibleMonths = String(val);
    state.monthEndIndex = state.months.length; // 최신 끝으로 리셋
    localStorage.setItem(VISIBLE_MONTHS_KEY, state.visibleMonths);
    syncMonthFilterUI();
    render();
    if (showToastMsg) {
        const visibleMonths = getVisibleMonths();
        let msg = '';
        if (state.visibleMonths === 'all' || visibleMonths.length === state.months.length) {
            msg = `전체 ${visibleMonths.length}달 수납 내역을 표시합니다.`;
        } else if (state.visibleMonths === 'recent-paid') {
            msg = `수납 기록이 있는 최근 3달(2025.02 ~ 2025.04)을 표시합니다.`;
        } else {
            msg = `최근 ${visibleMonths.length}달 수납 내역을 표시합니다.`;
        }
        showToast(msg);
    }
}

// 입금 달 퀵 버튼 이벤트
document.querySelectorAll('.btn-month-quick').forEach(btn => {
    btn.addEventListener('click', () => {
        const months = btn.getAttribute('data-months');
        setVisibleMonthCount(months);
    });
});

// 이전/다음 월 윈도우 이동 버튼
if (elements.btnPrevMonth) {
    elements.btnPrevMonth.addEventListener('click', () => {
        if (state.visibleMonths === 'all' || state.visibleMonths === 'recent-paid') return;
        const count = parseInt(state.visibleMonths, 10) || 3;
        let currentEnd = (state.monthEndIndex !== null && state.monthEndIndex !== undefined)
            ? state.monthEndIndex
            : state.months.length;
        if (currentEnd > count) {
            state.monthEndIndex = currentEnd - 1;
            syncMonthFilterUI();
            render();
        }
    });
}

if (elements.btnNextMonth) {
    elements.btnNextMonth.addEventListener('click', () => {
        if (state.visibleMonths === 'all' || state.visibleMonths === 'recent-paid') return;
        let currentEnd = (state.monthEndIndex !== null && state.monthEndIndex !== undefined)
            ? state.monthEndIndex
            : state.months.length;
        if (currentEnd < state.months.length) {
            state.monthEndIndex = currentEnd + 1;
            syncMonthFilterUI();
            render();
        }
    });
}

// 입금 달 셀렉트 박스 이벤트
if (elements.monthCountSelect) {
    elements.monthCountSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            if (elements.customMonthBox) {
                elements.customMonthBox.style.display = 'inline-flex';
            }
            if (elements.customMonthInput) {
                elements.customMonthInput.focus();
                elements.customMonthInput.select();
            }
        } else {
            if (elements.customMonthBox) {
                elements.customMonthBox.style.display = 'none';
            }
            setVisibleMonthCount(val);
        }
    });
}

// 직접 입력 적용 함수
function applyCustomMonthInput() {
    if (!elements.customMonthInput) return;
    let count = parseInt(elements.customMonthInput.value, 10);
    if (isNaN(count) || count <= 0) count = 1;
    if (count > state.months.length) count = state.months.length;
    elements.customMonthInput.value = count;
    setVisibleMonthCount(count);
}

if (elements.btnApplyCustomMonth) {
    elements.btnApplyCustomMonth.addEventListener('click', applyCustomMonthInput);
}

if (elements.customMonthInput) {
    elements.customMonthInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyCustomMonthInput();
        }
    });
}

// ==========================================
// 백업 & 복원 & 내보내기 기능
// ==========================================

// 1. JSON 백업 다운로드
elements.btnExportJson.addEventListener('click', () => {
    const backupData = {
        version: "1.0.0",
        exportDate: formatDateTime(),
        rooms: state.rooms,
        months: state.months,
        lastUpdated: state.lastUpdated
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `월세관리_백업_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showToast('전체 데이터가 JSON 백업 파일로 저장되었습니다.', 'success');
});

// 2. JSON 복원 업로드
elements.btnImportJson.addEventListener('click', () => {
    elements.restoreFileInput.value = '';
    elements.restoreFileInput.click();
});

elements.restoreFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (!data.rooms || !Array.isArray(data.rooms)) {
                alert('올바른 월세 관리 백업 JSON 파일이 아닙니다.');
                return;
            }

            if (confirm(`백업 파일(${file.name})의 데이터(${data.rooms.length}개 세대)를 불러와 복원하시겠습니까?\n현재 브라우저의 데이터는 대체됩니다.`)) {
                state.rooms = data.rooms;
                if (data.months && Array.isArray(data.months)) {
                    state.months = data.months;
                }
                state.lastUpdated = data.lastUpdated || formatDateTime();
                saveData(false);
                syncMonthFilterUI();
                render();
                showToast(`성공적으로 복원되었습니다. (${state.rooms.length}세대)`, 'success');
            }
        } catch (err) {
            console.error(err);
            alert('파일을 읽는 중 오류가 발생했습니다: ' + err.message);
        }
    };
    reader.readAsText(file);
});

// 3. 엑셀 호환 CSV 내보내기 (화면에 표시 중인 최근 월 기준)
elements.btnExportCsv.addEventListener('click', () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM (엑셀 한글 깨짐 방지)
    const visibleMonths = getVisibleMonths();
    
    // 헤더 행
    const headers = ["번호", "호수", "세입자", "월세(만)", "입금일", "연락처", "보증금(만)", "계약기간", "룸", "비고"];
    visibleMonths.forEach(m => {
        const parts = m.key ? m.key.split('-') : [];
        const year = parts[0] ? parts[0].slice(2) + '년 ' : '';
        headers.push(`${year}${m.label}월`);
    });
    csvContent += headers.map(h => `"${h}"`).join(",") + "\r\n";

    // 데이터 행
    state.rooms.forEach((r, idx) => {
        const row = [
            r.no || (idx + 1),
            r.roomNumber,
            r.tenant,
            r.rent,
            r.payDay,
            r.phone,
            r.deposit,
            r.contractPeriod,
            r.roomType,
            (r.memo || '').replace(/"/g, '""')
        ];

        visibleMonths.forEach(m => {
            const val = (r.payments && r.payments[m.key]) ? r.payments[m.key] : '';
            row.push(val);
        });

        csvContent += row.map(v => `"${v}"`).join(",") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10);
    const countLabel = state.visibleMonths === 'all' ? '전체' : `최근${visibleMonths.length}달`;
    link.setAttribute("href", url);
    link.setAttribute("download", `월세관리_${countLabel}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`엑셀(CSV) 파일로 내보냈습니다. (${countLabel})`, 'success');
});

// 앱 시작
window.addEventListener('DOMContentLoaded', () => {
    initData();
    syncMonthFilterUI();
    render();
});
