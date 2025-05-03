// assignments_parser.js - CSV 파싱 문제 해결 (2025‑05‑03 수정본, "미정" 제외 규칙 추가)

/*
  변경 요약
  1) makeKey() – subject+title 기반의 안정적인 식별자 추가
  2) mergeAssignmentData() – deadline을 키에서 제외하도록 로직 교체
  3) deadline 값이 "미정"(혹은 "미정"이 포함된 경우)인 행은 완전히 제외
  4) deadline이 비어 있을 때 즉시 +7 일 생성하지 않음(렌더링 시 계산)
*/

document.addEventListener('DOMContentLoaded', () => {
    // 전역 변수
    window.assignments_data = [];

    // ================= CSV 자동 로드 =================
    window.autoLoadAssignmentsCSV = async function() {
        try {
            const response = await fetch('assignments.csv');
            if (!response.ok) {
                console.log('assignments.csv 파일을 찾을 수 없습니다.');
                return;
            }
            const csvText = await response.text();
            const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
            if (parsed.errors.length) {
                console.error('CSV 파싱 오류:', parsed.errors);
                return;
            }
            processAssignments(parsed.data);
        } catch (err) {
            console.error('CSV 자동 로드 중 오류:', err);
        }
    };

    // ================ CSV 파싱 및 처리 ================
    function processAssignments(csvData) {
        if (!Array.isArray(csvData) || csvData.length === 0) return false;

        // 열 매핑
        const columnMapping = {
            subject: ['강의 제목'],
            title:   ['과제 제목'],
            content: ['과제 내용'],
            url:     ['과제 URL'],
            createdAt:['과제 생성일'],
            deadline:['과제 마감일']
        };
        const columns = Object.keys(csvData[0]);
        const findCol = type => columns.find(c => columnMapping[type].includes(c));

        const mapCol = {
            subject: findCol('subject'),
            title: findCol('title'),
            content: findCol('content'),
            url: findCol('url'),
            createdAt: findCol('createdAt'),
            deadline: findCol('deadline')
        };

        const parsedAssignments = csvData.map((row, idx) => {
            const subject = row[mapCol.subject]?.trim() || '';
            const title   = row[mapCol.title]?.trim() || '';
            const content = row[mapCol.content]?.trim() || '';
            const url     = row[mapCol.url]?.trim() || '';
            const createdAt = row[mapCol.createdAt] ? new Date(row[mapCol.createdAt]).toISOString() : new Date().toISOString();
            const rawDeadline = row[mapCol.deadline] ? row[mapCol.deadline].trim() : '';

            // "미정" 문자열 포함 시 완전히 제외
            if (rawDeadline.replace(/\s/g,'').includes('미정')) {
                console.log(`행 ${idx+1} 제외 - 마감일이 "미정"`);
                return null;
            }

            const deadline = rawDeadline ? new Date(rawDeadline).toISOString() : null;

            return { subject, title, content, url, createdAt, deadline };
        }).filter(Boolean);

        const existing = JSON.parse(localStorage.getItem('assignments_data') || '[]');
        const merged = mergeAssignmentData(existing, parsedAssignments);

        window.assignments_data = merged;
        localStorage.setItem('assignments_data', JSON.stringify(merged));

// === 통합 스토리지 ===
window.assignmentData = merged;
localStorage.setItem('calendarAssignments', JSON.stringify(merged));

// UI 동기화
if (typeof window.renderAssignmentList === 'function') {
    window.renderAssignmentList();
}

        updateAssignmentUI();
        return true;
    }

    // ============ 중복 판정 키 ============
    const makeKey = item => `${(item.subject||'').trim()}__${(item.title||'').trim()}`.toLowerCase();

    // ============ 병합 로직 ===============
    function mergeAssignmentData(orig, add) {
        const map = new Map();
        orig.forEach(i => map.set(makeKey(i), i));
        add.forEach(i => map.set(makeKey(i), { ...map.get(makeKey(i)), ...i }));
        return [...map.values()];
    }

    // =========== UI 업데이트 ==============
    function updateAssignmentUI() {
        const assignmentModal = document.getElementById('assignmentModal');
        if (!assignmentModal || assignmentModal.style.display !== 'block') return;

        const list = assignmentModal.querySelector('.assignment-list');
        list.innerHTML = '';

        window.assignments_data.forEach(a => {
            const deadlineDate = a.deadline ? new Date(a.deadline) : new Date(new Date(a.createdAt).getTime() + 7*24*60*60*1000);
            const li = document.createElement('li');
            li.textContent = `${a.subject} | ${a.title} | 마감: ${deadlineDate.toLocaleDateString()}`;
            list.appendChild(li);
        });
    }

    // 초기화
    autoLoadAssignmentsCSV();
});
