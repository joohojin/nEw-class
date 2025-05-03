// ===================== timetable.js (re‑revised 2025‑05‑03, v2) =====================
// 📌 09:30 시작 / 1 시간 단위 전제 + 교수·강의실 표시 지원
// ─────────────────────────────────────────────────────────────────────────────
//  ✔ course_parser.js 에서 subject\nprofessor\nroom 형식으로 전달하면 줄바꿈 표시
//  ✔ white-space:pre-line 추가로 \n 줄바꿈 유지
//  ✔ signature 동일: displayScheduleOnTable(label, day, start, end, color [,url])

// ---------------------------------------------------------------------------
// 설정값
const BASE_HOUR  = 9;      // 1교시 시작 시각 09시
const BASE_MIN   = 30;     // 1교시 시작 분 30분
const PERIOD_LEN = 60;     // 교시 길이 (분)

// 데이터 구조
let scheduleData = {};     // { key: {subject, day, startTime, endTime, color, url} }
let colorList    = {};     // 과목별 고유 색상 유지용

// ─────────────────────────────────────────────────────────────────────────────
// 유틸 함수
function getRandomColor () {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue} 70% 60%)`; // 파스텔 계열
}

// 교시 번호(1 기준) → [startTime, endTime] (HH:MM 문자열)
function periodToTimes (period) {
    const startTotal = (BASE_HOUR * 60 + BASE_MIN) + (period - 1) * PERIOD_LEN;
    const endTotal   = startTotal + PERIOD_LEN;
    return [ minutesToStr(startTotal), minutesToStr(endTotal) ];
}

function minutesToStr(total) {
    const h = String(Math.floor(total / 60)).padStart(2,'0');
    const m = String(total % 60).padStart(2,'0');
    return `${h}:${m}`;
}

function strToMinutes(str) {
    const [h,m] = str.split(':').map(Number);
    return h*60 + m;
}

// 09:30 ~ 23:30 까지 30분 간격 배열
window.getTimesList = function () {
    const list = [];
    let t = BASE_HOUR*60 + BASE_MIN;   // 570 = 09:30
    const last = 24*60;                // 1440 = 24:00 (exclusive)
    while (t < last) {
        list.push(minutesToStr(t));
        t += 30;
    }
    return list;
};

// ---------------------------------------------------------------------------
// 테이블 생성
window.createScheduleTable = function (container) {
    if (!container) return;
    const days  = ['월','화','수','목','금','토','일'];
    const times = window.getTimesList();

    let html = '<table class="schedule-table">';
    html += '<tr class="schedule-header"><th class="time-header">시간/요일</th>';
    days.forEach(d=> html += `<th class="day-header">${d}</th>`);
    html += '</tr>';

    times.forEach(t => {
        html += '<tr>';   
        html += `<th class="time-cell">${t}</th>`;
        days.forEach(d => html += `<td class="schedule-cell" id="${d}_${t.replace(':','_')}"></td>`);
        html += '</tr>';
    });
    html += '</table>';

    container.innerHTML = html;
};

// ---------------------------------------------------------------------------
// 시간표 표시 블록 생성 (label = 과목/교수/강의실 줄바꿈 포함 문자열)
window.displayScheduleOnTable = function (label, day, startTime, endTime, color, url='') {
    const times = window.getTimesList();

    // 그리드 보정 (+30 분) – 기존 호환
    function adjustToGrid (t) {
        if (times.includes(t)) return t;
        const m = strToMinutes(t) + 30;
        return minutesToStr(m);
    }
    startTime = adjustToGrid(startTime);
    endTime   = adjustToGrid(endTime);

    const startIdx = times.indexOf(startTime);
    const endIdx   = times.indexOf(endTime);
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return;

    const rowspan = endIdx - startIdx;
    const anchorId = `${day}_${times[startIdx].replace(':','_')}`;
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    // 셀 병합 설정
    anchor.innerHTML = '';
    anchor.setAttribute('rowspan', rowspan);
    anchor.style.position = 'relative';
    anchor.style.padding = '0';

    for (let i=1;i<rowspan;i++) {
        const hideId = `${day}_${times[startIdx+i].replace(':','_')}`;
        const c = document.getElementById(hideId);
        if (c) c.style.display='none';
    }

    // 블록 요소
    const block = document.createElement('div');
    block.textContent = label;
    block.style = `position:absolute;inset:2px;background:${color};color:#fff;border-radius:8px;
                   display:flex;align-items:center;justify-content:center;text-align:center;
                   white-space:pre-line;cursor:${url?'pointer':'default'};padding:8px;box-sizing:border-box;
                   transition:transform .2s,filter .2s;`;
    if (url) block.addEventListener('click', ()=> window.open(url,'_blank'));
    block.addEventListener('mouseenter', ()=> block.style.transform='scale(1.03)');
    block.addEventListener('mouseleave', ()=> block.style.transform='scale(1)');

    anchor.appendChild(block);
};

// ---------------------------------------------------------------------------
// LocalStorage 헬퍼
function saveTimeTable () {
    localStorage.setItem('scheduleData', JSON.stringify(scheduleData));
}
function loadTimeTable () {
    try {
        const json = localStorage.getItem('scheduleData');
        if (!json) return;
        scheduleData = JSON.parse(json) || {};
        Object.values(scheduleData).forEach(({subject,day,startTime,endTime,color,url,professor='',room=''})=>{
            const label = professor || room ? `${subject}\n${professor}\n${room}`.trim() : subject;
            displayScheduleOnTable(label,day,startTime,endTime,color,url);
        });
    } catch(e) {
        console.warn('시간표 로드 오류:',e);
    }
}
function clearScheduleTable () {
    document.querySelectorAll('.schedule-cell').forEach(c=>{
        c.style.display='';
        c.removeAttribute('rowspan');
        c.innerHTML='';
    });
    scheduleData = {};
    saveTimeTable();
}
window.clearSchedule = clearScheduleTable; // calendar.js 버튼용

// ---------------------------------------------------------------------------
// showTimetableSection 호환용 init/stub
window.initTimeTable = function() {
    // 별도 초기화 필요 시 작성
};

// ---------------------------------------------------------------------------
// 초기 렌더
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('schedule-table');
    if (container) {
        createScheduleTable(container);
        loadTimeTable();
    }
});
