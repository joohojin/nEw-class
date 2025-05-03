// assignment.js - 과제 관련 기능 구현

document.addEventListener('DOMContentLoaded', function() {
    // 과제 관련 변수들
    window.assignmentData = JSON.parse(localStorage.getItem('calendarAssignments')) || [];

// === 통합 스토리지 백필 및 중복 정리 ===
function normalizeKeyStr(s){
    return (s||'').replace(/\s+/g,' ').trim().toLowerCase();
}
function makeKey(a){
    return `${normalizeKeyStr(a.subject)}__${normalizeKeyStr(a.title)}`;
}
function dedupAssignments(arr){
    const m = new Map();
    arr.forEach(a=>{
        const k = makeKey(a);
        m.set(k, {...m.get(k), ...a});
    });
    return [...m.values()];
}

// legacy 'assignments_data' → 'calendarAssignments' 이전
const legacyAssignments = JSON.parse(localStorage.getItem('assignments_data') || 'null');
if (legacyAssignments && Array.isArray(legacyAssignments) && legacyAssignments.length){
    window.assignmentData = dedupAssignments([...legacyAssignments, ...window.assignmentData]);
    window.assignmentData = dedupAssignments(window.assignmentData);
        localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
    localStorage.removeItem('assignments_data');
} else {
    // 최초 로드 시에도 중복 한번 정리
    window.assignmentData = dedupAssignments(window.assignmentData);
    localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
}

    let currentAssignmentIndex = -1;

    // DOM 요소들
    const assignmentBtn = document.querySelector('.assignment-btn');
    const assignmentModal = document.getElementById('assignment-modal');
    const closeAssignment = document.getElementById('close-assignment');
    const assignmentList = document.getElementById('assignment-list');
    const addAssignmentBtn = document.getElementById('add-assignment-btn');

    const addAssignmentModal = document.getElementById('add-assignment-modal');
    const closeAddAssignment = document.getElementById('close-add-assignment');
    const assignmentSubjectInput = document.getElementById('assignment-subject');
    const assignmentTitleInput = document.getElementById('assignment-title');
    const assignmentContentInput = document.getElementById('assignment-content');
    const assignmentUrlInput = document.getElementById('assignment-url');
    const saveAssignmentBtn = document.getElementById('save-assignment-btn');

    const assignmentDetailModal = document.getElementById('assignment-detail-modal');
    const closeAssignmentDetail = document.getElementById('close-assignment-detail');
    const assignmentDetail = document.getElementById('assignment-detail');
    const deleteAssignmentBtn = document.getElementById('delete-assignment-btn');

    const editAssignmentModal = document.getElementById('edit-assignment-modal');
    const closeEditAssignment = document.getElementById('close-edit-assignment');
    const editAssignmentSubjectInput = document.getElementById('edit-assignment-subject');
    const editAssignmentTitleInput = document.getElementById('edit-assignment-title');
    const editAssignmentContentInput = document.getElementById('edit-assignment-content');
    const editAssignmentUrlInput = document.getElementById('edit-assignment-url');
    const updateAssignmentBtn = document.getElementById('update-assignment-btn');

    // 날짜 형식 함수
    function formatDate(dateString) {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        return `${year}.${month}.${day}`;
    }

    // 과제 목록 표시 함수
    function showAssignmentModal() {
        renderAssignmentList();
        assignmentModal.style.display = 'block';
    }

    // 과제 목록 렌더링 함수
    // 과제 목록 렌더링 함수 수정
    function renderAssignmentList() {
        if (!assignmentList) return;
        
        if (window.assignmentData.length === 0) {
            assignmentList.innerHTML = '<p>등록된 과제가 없습니다.</p>';
            return;
        }
        
        // 정렬 로직 수정 - 오늘 자정 기준으로 마감 여부 판단
        const sortedAssignments = [...window.assignmentData].sort((a, b) => {
            const now = new Date();
            now.setHours(0, 0, 0, 0); // 오늘 자정 기준
            const deadlineA = a.deadline ? new Date(a.deadline) : new Date(a.createdAt);
            const deadlineB = b.deadline ? new Date(b.deadline) : new Date(b.createdAt);
            deadlineA.setHours(0, 0, 0, 0);
            deadlineB.setHours(0, 0, 0, 0);
            const isOverdueA = deadlineA < now;
            const isOverdueB = deadlineB < now;
            
            if (isOverdueA !== isOverdueB) {
                return isOverdueA ? 1 : -1;
            }
            return deadlineA - deadlineB;
        });
        
        let assignmentsHTML = '';
        
        sortedAssignments.forEach((assignment, index) => {
            // 우선순위 클래스 설정
            const priorityClass = assignment.priority ? 
                `${assignment.priority}-priority` : 
                (assignment.deadline ? calculatePriorityClass(assignment.deadline) : '');
            
            // 마감일 관련 정보 - 마감일이 있는 경우에만 표시
            let deadlineHtml = '';
            if (assignment.deadline) {
                const daysLeft = getDaysLeft(assignment.deadline);
                let deadlineLabel = '';
                if (daysLeft < 0) {
                    deadlineLabel = '<span class="urgent">마감됨!</span>';
                } else {
                    // 남은 일수가 1일 이상이면 초록빛(active) 라벨
                    deadlineLabel = `<span class="active">마감 ${daysLeft}일 전</span>`;
                }
                
                deadlineHtml = `
                    <div class="assignment-deadline">
                        ${deadlineLabel} (${formatDate(assignment.deadline)})
                    </div>
                `;
            }
            
            // 생성일 표시 - 생성일이 있는 경우에만 표시
            let createdHtml = '';
            if (assignment.createdAt) {
                createdHtml = `
                    <div class="assignment-created">
                        생성일: ${formatDate(assignment.createdAt)}
                    </div>
                `;
            }
            
            assignmentsHTML += `
                <div class="assignment-item ${priorityClass}" data-index="${index}">
                    <div class="assignment-subject">${assignment.subject}</div>
                    <div class="assignment-title">${assignment.title}</div>
                    ...
                </div>
            `;
        });
        
        assignmentList.innerHTML = assignmentsHTML;
        
        // 과제 항목 클릭 이벤트
        const assignmentItems = document.querySelectorAll('.assignment-item');
        assignmentItems.forEach(item => {
            item.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-index'));
                const originalIndex = window.assignmentData.findIndex(
                    a => a === sortedAssignments[index]
                );
                showAssignmentDetail(originalIndex);
            });
        });
    }

        // 수정된 우선순위 클래스 계산 함수
    function calculatePriorityClass(deadlineStr) {
        if (!deadlineStr) return '';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadline = new Date(deadlineStr);
        deadline.setHours(0, 0, 0, 0);
        
        // diff가 오늘이면 0, 내일이면 1, ...
        const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        
        if (diff < 0) return 'high-priority';  // 마감됨!
        if (diff === 0) return 'active-priority'; // 당일: 아직 마감 전 (초록 스타일)
        if (diff <= 3) return 'high-priority';   // 남은 기간이 3일 이내면 위험
        if (diff <= 7) return 'medium-priority'; // 7일 이내면 보통
        return 'low-priority';                  // 그 외는 낮은 우선순위
    }

    // 수정된 남은 일수 계산 함수
    function getDaysLeft(deadlineStr) {
        if (!deadlineStr) return 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0); // 오늘 자정 기준
        
        const deadline = new Date(deadlineStr);
        deadline.setHours(0, 0, 0, 0); // 마감일 자정 기준
        
        // 마감일 당일이면 1로, 그 다음날부터 0 이하로 계산되도록 +1일 적용
        const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)) + 1;
        return diff;
    }

    // 과제 추가 모달 표시 함수
    function showAddAssignmentModal() {
        // 입력 필드 초기화
        assignmentSubjectInput.value = '';
        assignmentTitleInput.value = '';
        assignmentContentInput.value = '';
        assignmentUrlInput.value = '';
        
        assignmentModal.style.display = 'none';
        addAssignmentModal.style.display = 'block';
    }

    // 과제 저장 함수 - 수정됨: 개별 날짜 지정을 위한 입력 필드 추가
    function saveAssignment() {
        const subject = assignmentSubjectInput.value.trim();
        const title = assignmentTitleInput.value.trim();
        const content = assignmentContentInput.value.trim();
        const url = assignmentUrlInput.value.trim();
        
        if (!subject || !title) {
            alert('과목과 과제명은 필수 입력 항목입니다.');
            return;
        }
        
        // 현재 날짜
        const now = new Date();
        
        // 새 과제 객체 - 생성일은 현재 날짜, 마감일은 사용자가 입력한 날짜 또는 기본값으로 현재 날짜 + 7일
        // 실제 구현에서는 마감일 선택 UI가 필요
        const newAssignment = {
            subject,
            title,
            content,
            url,
            createdAt: now.toISOString(),
            // 마감일 선택 UI가 없으므로 기본값 사용
            deadline: (() => {
                const deadline = new Date(now);
                deadline.setDate(deadline.getDate() + 7);
                return deadline.toISOString();
            })(),
            priority: 'medium' // 기본 우선순위
        };
        
        window.assignmentData.push(newAssignment);
        // 중복 정리 후 저장
        window.assignmentData = dedupAssignments(window.assignmentData);
        localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
        localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
        // 중복 정리 후 저장
        window.assignmentData = dedupAssignments(window.assignmentData);
        localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
        
        addAssignmentModal.style.display = 'none';
        showAssignmentModal();
        
        // 달력에 과제 표시 업데이트
        if (typeof generateCalendar === 'function') {
            generateCalendar();
        }
    }

    // 과제 상세 정보 표시 함수
    function showAssignmentDetail(index) {
        if (index < 0 || index >= window.assignmentData.length || !assignmentDetail) return;
        
        currentAssignmentIndex = index;
        const assignment = window.assignmentData[index];
        
        // URL이 있으면 링크 만들기
        let urlHtml = '';
        if (assignment.url && assignment.url.trim() !== '') {
            urlHtml = `
                <div class="assignment-detail-url">
                    <a href="${assignment.url}" target="_blank" rel="noopener noreferrer">과제 링크 열기</a>
                </div>
            `;
        }
        
        // 마감일 관련 정보
        let deadlineHtml = '';
        if (assignment.deadline) {
            const daysLeft = getDaysLeft(assignment.deadline);
            const deadlineClass = daysLeft <= 3 ? 'urgent' : '';
            const deadlineStatus = daysLeft <= 0 ? '마감됨!' : `마감까지 ${daysLeft}일 남음`;
            
            deadlineHtml = `
                <div class="assignment-detail-deadline ${deadlineClass}">
                    마감일: ${formatDate(assignment.deadline)} (${deadlineStatus})
                </div>
            `;
        }
        
        // 생성일 표시 - 생성일이 있는 경우에만 표시
        let createdHtml = '';
        if (assignment.createdAt) {
            createdHtml = `
                <div class="assignment-detail-created">
                    생성일: ${formatDate(assignment.createdAt)}
                </div>
            `;
        }
            
        const detailHTML = `
            <div class="assignment-detail-header">
                <div class="assignment-detail-subject">${assignment.subject}</div>
                <div class="assignment-detail-title">${assignment.title}</div>
            </div>
            <div class="assignment-detail-content">${assignment.content || '내용 없음'}</div>
            ${urlHtml}
            <div class="assignment-detail-meta">
                ${createdHtml}
                ${deadlineHtml}
            </div>
        `;
    
        assignmentDetail.innerHTML = detailHTML;
        
        assignmentModal.style.display = 'none';
        assignmentDetailModal.style.display = 'block';
    }

    // 과제 삭제 함수
    function deleteAssignment() {
        if (currentAssignmentIndex < 0 || currentAssignmentIndex >= window.assignmentData.length) return;
        
        if (confirm('이 과제를 삭제하시겠습니까?')) {
            window.assignmentData.splice(currentAssignmentIndex, 1);
            localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
            
            assignmentDetailModal.style.display = 'none';
            showAssignmentModal();
            
            // 달력에 과제 표시 업데이트
            if (typeof generateCalendar === 'function') {
                generateCalendar();
            }
        }
    }

    // 과제 수정 모달 표시 함수
    function showEditAssignmentModal() {
        if (currentAssignmentIndex < 0 || currentAssignmentIndex >= window.assignmentData.length) return;
        
        const assignment = window.assignmentData[currentAssignmentIndex];
        
        editAssignmentSubjectInput.value = assignment.subject;
        editAssignmentTitleInput.value = assignment.title;
        editAssignmentContentInput.value = assignment.content || '';
        editAssignmentUrlInput.value = assignment.url || '';
        
        assignmentDetailModal.style.display = 'none';
        editAssignmentModal.style.display = 'block';
    }

    // 과제 업데이트 함수
    function updateAssignment() {
        if (currentAssignmentIndex < 0 || currentAssignmentIndex >= window.assignmentData.length) return;
        
        const subject = editAssignmentSubjectInput.value.trim();
        const title = editAssignmentTitleInput.value.trim();
        const content = editAssignmentContentInput.value.trim();
        const url = editAssignmentUrlInput.value.trim();
        
        if (!subject || !title) {
            alert('과목과 과제명은 필수 입력 항목입니다.');
            return;
        }
        
        window.assignmentData[currentAssignmentIndex] = {
            ...window.assignmentData[currentAssignmentIndex],
            subject,
            title,
            content,
            url,
            updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem('calendarAssignments', JSON.stringify(window.assignmentData));
        
        editAssignmentModal.style.display = 'none';
        showAssignmentDetail(currentAssignmentIndex);
        
        // 달력에 과제 표시 업데이트
        if (typeof generateCalendar === 'function') {
            generateCalendar();
        }
    }

    // 이벤트 리스너 설정
    function setupAssignmentEventListeners() {
        // 과제 버튼 클릭
        if (assignmentBtn) {
            assignmentBtn.addEventListener('click', showAssignmentModal);
        }
        
        // 과제 모달 닫기
        if (closeAssignment) {
            closeAssignment.addEventListener('click', () => {
                assignmentModal.style.display = 'none';
            });
        }
        
        // 새 과제 추가 버튼
        if (addAssignmentBtn) {
            addAssignmentBtn.addEventListener('click', showAddAssignmentModal);
        }
        
        // 과제 추가 모달 닫기
        if (closeAddAssignment) {
            closeAddAssignment.addEventListener('click', () => {
                addAssignmentModal.style.display = 'none';
                showAssignmentModal();
            });
        }
        
        // 과제 저장 버튼
        if (saveAssignmentBtn) {
            saveAssignmentBtn.addEventListener('click', saveAssignment);
        }
        
        // 과제 상세 모달 닫기
        if (closeAssignmentDetail) {
            closeAssignmentDetail.addEventListener('click', () => {
                assignmentDetailModal.style.display = 'none';
                showAssignmentModal();
            });
        }
        
        // 과제 삭제 버튼
        if (deleteAssignmentBtn) {
            deleteAssignmentBtn.addEventListener('click', deleteAssignment);
        }
        
        // 과제 수정 버튼
        if (document.getElementById('edit-assignment-btn')) {
            document.getElementById('edit-assignment-btn').addEventListener('click', showEditAssignmentModal);
        }
        
        // 과제 수정 모달 닫기
        if (closeEditAssignment) {
            closeEditAssignment.addEventListener('click', () => {
                editAssignmentModal.style.display = 'none';
                showAssignmentDetail(currentAssignmentIndex);
            });
        }
        
        // 과제 업데이트 버튼
        if (updateAssignmentBtn) {
            updateAssignmentBtn.addEventListener('click', updateAssignment);
        }
        
        // 모달 바깥 클릭 시 닫기
        window.addEventListener('click', function(event) {
            if (event.target === assignmentModal) {
                assignmentModal.style.display = 'none';
            }
            if (event.target === addAssignmentModal) {
                addAssignmentModal.style.display = 'none';
                showAssignmentModal();
            }
            if (event.target === assignmentDetailModal) {
                assignmentDetailModal.style.display = 'none';
                showAssignmentModal();
            }
            if (event.target === editAssignmentModal) {
                editAssignmentModal.style.display = 'none';
                showAssignmentDetail(currentAssignmentIndex);
            }
        });
    }

    // 초기화
    setupAssignmentEventListeners();
    
    // 전역 함수로 노출
    window.getAssignmentIndicator = function(dateKey) {
        if (!window.assignmentData || window.assignmentData.length === 0) return '';
        
        const [year, month, day] = dateKey.split('-');
        const dateStart = new Date(year, month - 1, day, 0, 0, 0);
        const dateEnd = new Date(year, month - 1, day, 23, 59, 59);
        
        // 해당 날짜가 마감일인 과제 찾기
        const deadlineAssignments = window.assignmentData.filter(assignment => {
            if (!assignment.deadline) return false;
            
            const deadline = new Date(assignment.deadline);
            return deadline >= dateStart && deadline <= dateEnd;
        });
        
        // 해당 날짜가 생성일인 과제 찾기
        const createdAssignments = window.assignmentData.filter(assignment => {
            if (!assignment.createdAt) return false;
            
            const createdAt = new Date(assignment.createdAt);
            return createdAt >= dateStart && createdAt <= dateEnd && 
                   !deadlineAssignments.some(a => a === assignment); // 마감일 과제와 중복 제거
        });
        
        // 마감일 과제가 있으면 우선 표시
        if (deadlineAssignments.length > 0) {
            // 우선순위 높은 과제 먼저 표시
            const sortedAssignments = [...deadlineAssignments].sort((a, b) => {
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                const priorityA = a.priority || 'low';
                const priorityB = b.priority || 'low';
                return priorityOrder[priorityA] - priorityOrder[priorityB];
            });
            
            return `<span class="assignment-indicator deadline-indicator">마감: ${sortedAssignments[0].title}</span>`;
        }
        
        // 생성일 과제 표시
        if (createdAssignments.length > 0) {
            return `<span class="assignment-indicator created-indicator">생성: ${createdAssignments[0].title}</span>`;
        }
        
        return '';
    };
    
    // 전역 함수로 노출 - 과제 목록 렌더링
    window.renderAssignmentList = renderAssignmentList;
});