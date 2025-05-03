// ===================== course_parser.js (updated 2025‑05‑03) =====================
// CSV → window.scheduleData 반영 + timetable.js 렌더러 호출
// 교시‑시간 매핑 : 1교시 = 09:30‑10:30, 2교시 = 10:30‑11:30 … 시 간격 = 60 분
// 표시에 교수/강의실 정보를 함께 넣어 블록에 3줄(과목/교수/강의실)로 나타나도록 함
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.course_data = [];

    // ─────────────────────────────────────────────────────────────────────────
    // CSV 로드 버튼 (calendar.html header 영역에 자동 삽입)
    function addTimeTableLoadButton () {
        const header = document.querySelector('.timetable-header .buttons');
        if (!header || document.getElementById('load-courses-btn')) return;

        const btn = document.createElement('button');
        btn.id   = 'load-courses-btn';
        btn.textContent = '시간표 파일 로드';
        btn.className   = 'btn';
        btn.style.backgroundColor = '#17a2b8';
        btn.style.marginRight     = '10px';
        btn.onclick = () => loadCoursesCSV();
        header.prepend(btn);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CSV 파일 읽기 (Papa Parse)
    async function loadCoursesCSV () {
        try {
            const res = await fetch('timetable.csv');
            if (!res.ok) throw new Error('CSV 파일을 찾을 수 없습니다.');
            const csvText = await res.text();
            Papa.parse(csvText, {
                header : true,
                skipEmptyLines : true,
                dynamicTyping  : true,
                complete ({data}) {
                    if (data?.length) processCourses(data);
                    else alert('CSV 데이터가 비어있습니다.');
                }
            });
        } catch(e) {
            console.error(e);
            alert('CSV 로드 실패 – 콘솔 로그 참조');
        }
    }
    window.loadCoursesCSV = loadCoursesCSV; // 외부에서 버튼 없이 호출 가능

    // ─────────────────────────────────────────────────────────────────────────
    // CSV → window.scheduleData 변환
    function processCourses (rows) {
        if (typeof window.scheduleData === 'undefined') window.scheduleData = {};
        let added = 0;

        rows.forEach(row => {
            if (!row.lecture_name) return;

            // times : "수1,2,3 | 목7,8" 형식 지원
            const timesArr = Array.isArray(row.times)
                            ? row.times
                            : (typeof row.times === 'string' ? row.times.split(' | ') : []);
            if (!timesArr.length) return;

            timesArr.forEach(one => {
                if (!one) return;
                const parsed = parseKoreanTime(one.trim());
                if (!parsed) return;

                const {day, periods} = parsed;
                const startP = Math.min(...periods);
                const endP   = Math.max(...periods);
                const startT = periodToTime(startP);
                const endT   = periodToTime(endP + 1); // 끝 교시 다음 시작 시각
                if (!startT || !endT) return;

                const professor = row.professor ? String(row.professor).trim() : '';
                const rooms = Array.isArray(row.rooms) ? row.rooms.join(', ') : (row.rooms || '');

                const scheduleKey = `${day}_${startT}_${endT}`;
                if (window.scheduleData[scheduleKey]) return; // 중복 건너뛰기

                const color = getRandomColor();
                // URL 열을 row.url 로 읽어서 넣습니다.
                const url = row.url ? row.url.trim() : '';

                window.scheduleData[scheduleKey] = {
                    subject   : row.lecture_name,
                    day,
                    startTime : startT,
                    endTime   : endT,
                    color,
                    professor,
                    room      : rooms,
                    url       : url
                };

                // 블록 라벨 : 과목\n교수\n강의실 (줄바꿈 포함)
                const labelParts = [row.lecture_name];
                if (professor) labelParts.push(professor);
                if (rooms)     labelParts.push(rooms);
                const label = labelParts.join('\n');

                if (typeof window.displayScheduleOnTable === 'function') {
                    window.displayScheduleOnTable(label, day, startT, endT, color, url);
                }
                added++;
            });
        });

        if (typeof window.saveTimeTable === 'function') window.saveTimeTable();

        alert(added ? `${added}개 강의가 추가되었습니다.` : '추가할 새 강의가 없습니다.');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 요일·교시 파서   "수1,2,3" | "목7,8" | "MON1,2"
    function parseKoreanTime (str) {
        const kor = str.match(/([월화수목금토일])([0-9,\-]+)/);
        if (kor) {
            return {day: kor[1], periods: expandPeriods(kor[2])};
        }
        const eng = str.match(/(MON|TUE|WED|THU|FRI|SAT|SUN)([0-9,\-]+)/i);
        if (eng) {
            const map = {MON:'월',TUE:'화',WED:'수',THU:'목',FRI:'금',SAT:'토',SUN:'일'};
            return {day: map[eng[1].toUpperCase()], periods: expandPeriods(eng[2])};
        }
        return null;
    }

    // "1,2,3" or "7-9" → [1,2,3]
    function expandPeriods (seq) {
        return seq.split(',').flatMap(part => {
            if (part.includes('-')) {
                const [s,e] = part.split('-').map(Number);
                return Array.from({length: e-s+1}, (_,i)=>s+i);
            }
            return [Number(part)];
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 교시 → 시각   (1교시=09:30, 2교시=10:30 ...)
    function periodToTime (period) {
        if (!Number.isFinite(period) || period < 1) return null;
        const base = 9*60 + 30;           // 09:30 => 570분
        const mins = base + (period-1)*60;
        return minutesToStr(mins);
    }

    function minutesToStr (m) {
        const h = String(Math.floor(m/60)).padStart(2,'0');
        const min = String(m%60).padStart(2,'0');
        return `${h}:${min}`;
    }

    // timetable.js 와 동일한 색상 생성기 복사
    function getRandomColor () {
        const hue = Math.floor(Math.random()*360);
        return `hsl(${hue} 70% 60%)`;
    }

    // DOMContentLoaded 후 버튼 삽입 시도
    setTimeout(addTimeTableLoadButton, 500);
});
