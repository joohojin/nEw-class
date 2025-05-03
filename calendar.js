document.addEventListener('DOMContentLoaded', function() {
    // DOM 요소
    const daysContainer = document.getElementById('days-container');
    const currentDateDisplay = document.getElementById('current-date-display');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    
    // 모달 요소
    const datePickerModal = document.getElementById('date-picker-modal');
    const closeDatePicker = document.getElementById('close-date-picker');
    const applyDateBtn = document.getElementById('apply-date');
    
    const todoModal = document.getElementById('todo-modal');
    const closeTodo = document.getElementById('close-todo');
    const selectedDateElem = document.getElementById('selected-date');
    const todoTitleInput = document.getElementById('todo-title');
    const todoDescInput = document.getElementById('todo-description');
    const todoImportantCheckbox = document.getElementById('todo-important');
    const addTodoBtn = document.getElementById('add-todo');
    
    const todosListModal = document.getElementById('todos-list-modal');
    const closeTodosList = document.getElementById('close-todos-list');
    const todosDateElem = document.getElementById('todos-date');
    const todosContainer = document.getElementById('todos-container');
    const addNewTodoBtn = document.getElementById('add-new-todo');
    
    // 편집 모달 요소
    const editTodoModal = document.getElementById('edit-todo-modal');
    const closeEditTodo = document.getElementById('close-edit-todo');
    const editSelectedDateElem = document.getElementById('edit-selected-date');
    const editTodoTitleInput = document.getElementById('edit-todo-title');
    const editTodoDescInput = document.getElementById('edit-todo-description');
    const editTodoImportantCheckbox = document.getElementById('edit-todo-important');
    const updateTodoBtn = document.getElementById('update-todo');
    let editingTodoIndex = -1;
    
    // 섹션 요소
    const calendarSection = document.getElementById('calendar-section');
    const timetableSection = document.getElementById('timetable-section');
    
    // 시간표 관련 요소
    const timeTableBtn = document.getElementById('time-btn');
    const calendarBtn = document.getElementById('calendar-btn');
    const todoBtn = document.getElementById('todo-btn');
    const clearScheduleBtn = document.getElementById('clear-schedule-btn');
    const timetableYearMonth = document.getElementById('timetable-year-month');
    
    // 현재 날짜 정보
    const today = new Date();
    let currentYear = today.getFullYear();
    let currentMonth = today.getMonth();
    let selectedDate = null;
    
    // 지역 정보
    const monthNames = [
        '1월', '2월', '3월', '4월', '5월', '6월',
        '7월', '8월', '9월', '10월', '11월', '12월'
    ];
    
    // 로컬 스토리지에서 일정 데이터 가져오기
    let todoData = JSON.parse(localStorage.getItem('calendarTodos')) || {};
    
    // 연도 선택 옵션 생성 (현재 연도 ±5년)
    function populateYearOptions() {
        const currentYear = today.getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year + '년';
            if (year === currentYear) {
                option.selected = true;
            }
            yearSelect.appendChild(option);
        }
    }
    
    // 현재 날짜 표시 업데이트
    function updateCurrentDateDisplay() {
        if (currentDateDisplay) {
            currentDateDisplay.textContent = `${currentYear}년 ${monthNames[currentMonth]}`;
        }
        
        // 시간표 연월 업데이트
        if (timetableYearMonth) {
            timetableYearMonth.textContent = `${currentYear}년 ${monthNames[currentMonth]}`;
        }
    }
    
    // 일정 표시기 생성
    function getTodoIndicator(dateKey) {
        if (!todoData[dateKey]) return '';
        
        // 중요 일정만 찾기
        const importantTodos = todoData[dateKey].filter(todo => todo.important);
        
        if (importantTodos.length > 0) {
            return `<span class="todo-indicator important-todo">${importantTodos[0].title}</span>`;
        }
        
        return ''; // 중요 일정이 없으면 표시하지 않음
    }
    
    // 달력 생성 함수
    function generateCalendar() {
        if (!daysContainer) {
            console.error('days-container를 찾을 수 없습니다');
            return;
        }
        
        // 선택한 달의 첫날
        const firstDay = new Date(currentYear, currentMonth, 1);
        
        // 첫날의 요일 (0: 일요일, 6: 토요일)
        const firstDayOfWeek = firstDay.getDay();
        
        // 이전 달의 마지막 날 구하기
        const lastDayOfPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
        
        // 현재 달의 마지막 날 구하기
        const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // 오늘 날짜 확인
        const nowDate = new Date();
        const isCurrentMonth = nowDate.getFullYear() === currentYear && nowDate.getMonth() === currentMonth;
        const todayDate = nowDate.getDate();
        
        let calendarHTML = '';
        
        // 이전 달의 날짜 표시
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const prevDate = lastDayOfPrevMonth - i;
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            const dateKey = `${prevYear}-${prevMonth + 1}-${prevDate}`;
            
            calendarHTML += `
                <div class="day other-month" data-date="${dateKey}">
                    <span class="day-number">${prevDate}</span>
                    ${getTodoIndicator(dateKey)}
                    ${getAssignmentProgressBar(dateKey)}
                </div>
            `;
        }
        
        // 현재 달의 날짜 표시
        for (let i = 1; i <= lastDayOfMonth; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const dayOfWeek = date.getDay();
            const dateKey = `${currentYear}-${currentMonth + 1}-${i}`;
            
            let dayClass = '';
            if (dayOfWeek === 0) dayClass += ' sunday';
            if (dayOfWeek === 6) dayClass += ' saturday';
            if (isCurrentMonth && i === todayDate) dayClass += ' today';
            
            calendarHTML += `
                <div class="day${dayClass}" data-date="${dateKey}">
                    <span class="day-number">${i}</span>
                    ${getAssignmentIndicator(dateKey)}
                    ${getAssignmentProgressBar(dateKey)}
                    ${getTodoIndicator(dateKey)}
                </div>
            `;
        }
        
        // 다음 달의 날짜 표시
        const totalDaysDisplayed = firstDayOfWeek + lastDayOfMonth;
        const rowsNeeded = Math.ceil(totalDaysDisplayed / 7);
        const totalCells = rowsNeeded * 7;
        const remainingDays = totalCells - totalDaysDisplayed;
        
        for (let i = 1; i <= remainingDays; i++) {
            const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
            const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
            const dateKey = `${nextYear}-${nextMonth + 1}-${i}`;
            
            calendarHTML += `
                <div class="day other-month" data-date="${dateKey}">
                    <span class="day-number">${i}</span>
                    ${getTodoIndicator(dateKey)}
                    ${getAssignmentProgressBar(dateKey)}
                </div>
            `;
        }
        
        daysContainer.innerHTML = calendarHTML;
        
        // 날짜 클릭 이벤트 추가
        const dayElements = document.querySelectorAll('.day');
        dayElements.forEach(day => {
            day.addEventListener('click', handleDayClick);
        });
    }
    
    // 날짜 클릭 이벤트 핸들러
    function handleDayClick() {
        selectedDate = this.getAttribute('data-date');
        showTodosListModal(selectedDate);
    }
    
    // 일정 목록 모달 표시
    function showTodosListModal(dateKey) {
        if (!todosListModal || !todosDateElem) {
            console.error('일정 목록 모달 요소를 찾을 수 없습니다');
            return;
        }
        
        const [year, month, day] = dateKey.split('-');
        todosDateElem.textContent = `${year}년 ${month}월 ${day}일`;
        
        // 일정 목록 렌더링
        renderTodosList(dateKey);
        
        todosListModal.style.display = 'block';
    }
    
    // 일정 목록 렌더링
    function renderTodosList(dateKey) {
        if (!todosContainer) {
            console.error('일정 컨테이너를 찾을 수 없습니다');
            return;
        }
        
        const todos = todoData[dateKey] || [];
        
        if (todos.length === 0) {
            todosContainer.innerHTML = '<p>등록된 일정이 없습니다.</p>';
            return;
        }
        
        let todosHTML = '';
        todos.forEach((todo, index) => {
            todosHTML += `
                <div class="todo-item ${todo.important ? 'important' : ''}">
                    <div class="todo-content" data-index="${index}">
                        <div class="todo-title">${todo.title}</div>
                        <div class="todo-desc">${todo.description || ''}</div>
                        <div class="edit-hint">클릭하여 수정</div>
                    </div>
                    <div class="todo-actions">
                        <span class="todo-delete" data-index="${index}">삭제</span>
                    </div>
                </div>
            `;
        });
        
        todosContainer.innerHTML = todosHTML;
        
        // 삭제 버튼 이벤트 리스너 추가
        const deleteButtons = document.querySelectorAll('.todo-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                deleteTodo(dateKey, index);
            });
        });
        
        // 일정 내용 클릭 시 수정 모달 열기
        const todoContents = document.querySelectorAll('.todo-content');
        todoContents.forEach(content => {
            content.addEventListener('click', function(e) {
                const index = parseInt(this.getAttribute('data-index'));
                showEditTodoModal(dateKey, index);
            });
        });
    }
    
    // 일정 삭제
    function deleteTodo(dateKey, index) {
        if (confirm('이 일정을 삭제하시겠습니까?')) {
            todoData[dateKey].splice(index, 1);
            
            // 빈 배열이면 키 자체 삭제
            if (todoData[dateKey].length === 0) {
                delete todoData[dateKey];
            }
            
            // 로컬 스토리지 업데이트
            localStorage.setItem('calendarTodos', JSON.stringify(todoData));
            
            // 일정 목록 다시 렌더링
            renderTodosList(dateKey);
            
            // 달력 다시 생성
            generateCalendar();
        }
    }
    
    // To Do 모달 표시
    function showTodoModal() {
        if (!todoModal || !selectedDateElem || !todoTitleInput) {
            console.error('To Do 모달 요소를 찾을 수 없습니다');
            return;
        }
        
        // 모달 초기화
        todoTitleInput.value = '';
        todoDescInput.value = '';
        todoImportantCheckbox.checked = false;
        
        if (selectedDate) {
            const [year, month, day] = selectedDate.split('-');
            selectedDateElem.textContent = `${year}년 ${month}월 ${day}일`;
        } else {
            const now = new Date();
            selectedDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
            selectedDateElem.textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
        }
        
        todoModal.style.display = 'block';
        todoTitleInput.focus();
    }
    
    // 일정 추가
    function addTodo() {
        if (!todoTitleInput) {
            console.error('일정 제목 입력 요소를 찾을 수 없습니다');
            return;
        }
        
        const title = todoTitleInput.value.trim();
        const description = todoDescInput ? todoDescInput.value.trim() : '';
        const important = todoImportantCheckbox ? todoImportantCheckbox.checked : false;
        
        if (title === '') {
            alert('일정 제목을 입력해주세요.');
            return;
        }
        
        // 새 일정 객체
        const newTodo = {
            title,
            description,
            important,
            createdAt: new Date().toISOString()
        };
        
        // 날짜별 일정 데이터 업데이트
        if (!todoData[selectedDate]) {
            todoData[selectedDate] = [];
        }
        
        todoData[selectedDate].push(newTodo);
        
        // 로컬 스토리지에 저장
        localStorage.setItem('calendarTodos', JSON.stringify(todoData));
        
        // 모달 닫기
        if (todoModal) {
            todoModal.style.display = 'none';
        }
        
        // 일정 목록 모달 보이기
        showTodosListModal(selectedDate);
        
        // 달력 다시 생성
        generateCalendar();
    }
    
    // 일정 수정 모달 표시
    function showEditTodoModal(dateKey, index) {
        if (!editTodoModal || !editSelectedDateElem) {
            console.error('일정 수정 모달 요소를 찾을 수 없습니다');
            return;
        }
        
        editingTodoIndex = index;
        selectedDate = dateKey;
        const todo = todoData[dateKey][index];
        
        // 모달에 값 설정
        const [year, month, day] = dateKey.split('-');
        editSelectedDateElem.textContent = `${year}년 ${month}월 ${day}일`;
        
        if (editTodoTitleInput) editTodoTitleInput.value = todo.title;
        if (editTodoDescInput) editTodoDescInput.value = todo.description || '';
        if (editTodoImportantCheckbox) editTodoImportantCheckbox.checked = todo.important;
        
        // 모달 표시
        if (todosListModal) todosListModal.style.display = 'none'; // 목록 모달 닫기
        editTodoModal.style.display = 'block';
        if (editTodoTitleInput) editTodoTitleInput.focus();
    }
    
    // 일정 업데이트
    function updateTodo() {
        if (!editTodoTitleInput) {
            console.error('일정 수정 제목 입력 요소를 찾을 수 없습니다');
            return;
        }
        
        const title = editTodoTitleInput.value.trim();
        const description = editTodoDescInput ? editTodoDescInput.value.trim() : '';
        const important = editTodoImportantCheckbox ? editTodoImportantCheckbox.checked : false;
        
        if (title === '') {
            alert('일정 제목을 입력해주세요.');
            return;
        }
        
        // 일정 업데이트
        if (todoData[selectedDate] && todoData[selectedDate][editingTodoIndex]) {
            todoData[selectedDate][editingTodoIndex] = {
                ...todoData[selectedDate][editingTodoIndex],
                title,
                description,
                important,
                updatedAt: new Date().toISOString()
            };
            
            // 로컬 스토리지에 저장
            localStorage.setItem('calendarTodos', JSON.stringify(todoData));
            
            // 모달 닫기
            if (editTodoModal) {
                editTodoModal.style.display = 'none';
            }
            
            // 일정 목록 업데이트
            showTodosListModal(selectedDate);
            
            // 달력 다시 생성 (중요 일정 표시 업데이트를 위해)
            generateCalendar();
        }
    }
    
    // 날짜 변경 모달 표시
    function showDatePickerModal() {
        if (!datePickerModal || !yearSelect || !monthSelect) {
            console.error('날짜 선택 모달 요소를 찾을 수 없습니다');
            return;
        }
        
        // 현재 선택된 연도, 월로 셀렉트 박스 설정
        for (let i = 0; i < yearSelect.options.length; i++) {
            if (parseInt(yearSelect.options[i].value) === currentYear) {
                yearSelect.selectedIndex = i;
                break;
            }
        }
        monthSelect.selectedIndex = currentMonth;
        
        datePickerModal.style.display = 'block';
    }
    
    // 날짜 변경 적용
    function applyDateChange() {
        if (!yearSelect || !monthSelect) {
            console.error('날짜 선택 요소를 찾을 수 없습니다');
            return;
        }
        
        currentYear = parseInt(yearSelect.value);
        currentMonth = parseInt(monthSelect.value);
        
        updateCurrentDateDisplay();
        generateCalendar();
        
        if (datePickerModal) {
            datePickerModal.style.display = 'none';
        }
    }
    
    // 시간표 섹션 표시
    function showTimetableSection() {
        console.log('시간표 섹션 표시 시도');
        if (!calendarSection || !timetableSection) {
            console.error('섹션 요소를 찾을 수 없습니다');
            return;
        }
        
        calendarSection.style.display = 'none';
        timetableSection.style.display = 'block';
        
        // 시간표 연월 업데이트
        if (timetableYearMonth) {
            timetableYearMonth.textContent = `${currentYear}년 ${monthNames[currentMonth]}`;
        }
        
        // 시간표 초기화 및 표시
        if (typeof window.initTimeTable === 'function') {
            window.initTimeTable();
            
            const scheduleTableContainer = document.getElementById('schedule-table');
            if (scheduleTableContainer && typeof window.createScheduleTable === 'function') {
                window.createScheduleTable(scheduleTableContainer);
                
                if (typeof window.populateScheduleTable === 'function') {
                    window.populateScheduleTable();
                }
            } else {
                console.error('시간표 컨테이너를 찾을 수 없거나 함수가 정의되지 않았습니다');
            }
        } else {
            console.error('initTimeTable 함수가 정의되지 않았습니다');
        }
        
        console.log('시간표 섹션 표시 완료');
    }
    
    // 달력 섹션 표시
    function showCalendarSection() {
        console.log('달력 섹션 표시');
        if (!calendarSection || !timetableSection) {
            console.error('섹션 요소를 찾을 수 없습니다');
            return;
        }
        
        timetableSection.style.display = 'none';
        calendarSection.style.display = 'block';
        
        // 달력 업데이트
        updateCurrentDateDisplay();
        generateCalendar();
    }
    
    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 날짜 표시 클릭 시 날짜 변경 모달 표시
        if (currentDateDisplay) {
            currentDateDisplay.addEventListener('click', showDatePickerModal);
        }
        
        // 날짜 변경 모달 닫기
        if (closeDatePicker) {
            closeDatePicker.addEventListener('click', () => {
                if (datePickerModal) datePickerModal.style.display = 'none';
            });
        }
        
        // 날짜 변경 적용
        if (applyDateBtn) {
            applyDateBtn.addEventListener('click', applyDateChange);
        }
        
        // To Do 버튼 클릭 - 바로 일정 목록 모달 표시
        if (todoBtn) {
            todoBtn.addEventListener('click', function() {
                const now = new Date();
                const todayDateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
                selectedDate = todayDateKey;
                showTodosListModal(todayDateKey);
            });
        }
        
        // To Do 모달 닫기
        if (closeTodo) {
            closeTodo.addEventListener('click', () => {
                if (todoModal) todoModal.style.display = 'none';
            });
        }
        
        // 일정 추가
        if (addTodoBtn) {
            addTodoBtn.addEventListener('click', addTodo);
        }
        
        // 일정 목록 모달 닫기
        if (closeTodosList) {
            closeTodosList.addEventListener('click', () => {
                if (todosListModal) todosListModal.style.display = 'none';
            });
        }
        
        // 새 일정 추가 버튼
        if (addNewTodoBtn) {
            addNewTodoBtn.addEventListener('click', () => {
                if (todosListModal) todosListModal.style.display = 'none';
                showTodoModal();
            });
        }
        
        // 일정 수정 모달 닫기
        if (closeEditTodo) {
            closeEditTodo.addEventListener('click', () => {
                if (editTodoModal) editTodoModal.style.display = 'none';
                showTodosListModal(selectedDate); // 목록 모달 다시 표시
            });
        }
        
        // 일정 업데이트
        if (updateTodoBtn) {
            updateTodoBtn.addEventListener('click', updateTodo);
        }
        
        // 편집 폼에서 엔터 키 처리
        if (editTodoTitleInput) {
            editTodoTitleInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && editTodoDescInput) {
                    editTodoDescInput.focus();
                }
            });
        }
        
        if (editTodoDescInput) {
            editTodoDescInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    updateTodo();
                }
            });
        }
        
        // To Do 추가 폼에서 엔터 키 처리
        if (todoTitleInput) {
            todoTitleInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && todoDescInput) {
                    todoDescInput.focus();
                }
            });
        }
        
        if (todoDescInput) {
            todoDescInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter' && e.ctrlKey) {
                    addTodo();
                }
            });
        }
        
        // 시간표 버튼 클릭 이벤트 - 섹션 전환
        if (timeTableBtn) {
            timeTableBtn.addEventListener('click', showTimetableSection);
            console.log('시간표 버튼에 이벤트 리스너 연결됨');
        } else {
            console.error('시간표 버튼을 찾을 수 없습니다');
        }
        
        // 달력 버튼 클릭 이벤트 - 섹션 전환
        if (calendarBtn) {
            calendarBtn.addEventListener('click', showCalendarSection);
            console.log('달력 버튼에 이벤트 리스너 연결됨');
        } else {
            console.error('달력 버튼을 찾을 수 없습니다');
        }
        
        // 시간표 초기화 버튼
        if (clearScheduleBtn) {
            clearScheduleBtn.addEventListener('click', () => {
                if (confirm('시간표를 초기화하시겠습니까?')) {
                    if (typeof window.clearSchedule === 'function') {
                        window.clearSchedule();
                    } else {
                        console.error('clearSchedule 함수가 정의되지 않았습니다');
                    }
                }
            });
        }
        


        // calendar.js 파일에 추가해야 할 코드

    // 기존 getTodoIndicator 함수 아래에 추가할 코드
        // 변경된 getAssignmentIndicator 함수
    function getAssignmentIndicator(dateKey) {
    if (!window.assignmentData) return '';

    const [year, month, day] = dateKey.split('-');
    const dateStart = new Date(year, month - 1, day, 0, 0, 0);
    const dateEnd = new Date(year, month - 1, day, 23, 59, 59);

    // "마감일만" 확인하도록 필터링
    const assignmentsForDate = window.assignmentData.filter(assignment => {
        if (!assignment.deadline) return false;
        const deadline = new Date(assignment.deadline);
        // 생성일(dateKey)에는 표시하지 않고, 마감일만 범위 내에 있으면 표시
        return deadline >= dateStart && deadline <= dateEnd;
    });

    if (assignmentsForDate.length === 0) return '';

    assignmentsForDate.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return `<span class="assignment-indicator">${assignmentsForDate[0].title}</span>`;
}
    // generateCalendar 함수 수정 (일부만 표시)
    // 아래 코드는 변경해야 할 부분만 표시한 것입니다.
    // 기존 함수에서 해당 부분을 찾아 수정해주세요.

    // 현재 달의 날짜 표시 부분 수정
    for (let i = 1; i <= lastDayOfMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const dayOfWeek = date.getDay();
        const dateKey = `${currentYear}-${currentMonth + 1}-${i}`;
        
        let dayClass = '';
        if (dayOfWeek === 0) dayClass += ' sunday';
        if (dayOfWeek === 6) dayClass += ' saturday';
        if (isCurrentMonth && i === todayDate) dayClass += ' today';
        
        calendarHTML += `
            <div class="day${dayClass}" data-date="${dateKey}">
                <span class="day-number">${i}</span>
                ${''}
                ${''}
                ${getTodoIndicator(dateKey)}
            </div>
        `;
    }

    // 이전 달과 다음 달 날짜 부분도 비슷하게 수정해야 합니다.
    // 이전 달 날짜 표시 부분 수정
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const prevDate = lastDayOfPrevMonth - i;
        const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const dateKey = `${prevYear}-${prevMonth + 1}-${prevDate}`;
        
        calendarHTML += `
            <div class="day other-month" data-date="${dateKey}">
                <span class="day-number">${prevDate}</span>
                ${getTodoIndicator(dateKey)}
                ${''}
            </div>
        `;
    }

    // 다음 달 날짜 표시 부분 수정
    for (let i = 1; i <= remainingDays; i++) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const dateKey = `${nextYear}-${nextMonth + 1}-${i}`;
        
        calendarHTML += `
            <div class="day other-month" data-date="${dateKey}">
                <span class="day-number">${i}</span>
                ${getTodoIndicator(dateKey)}
                ${''}
            </div>
        `;
    }
            
            // 모달 바깥 클릭 시 닫기
            window.addEventListener('click', function(event) {
                if (datePickerModal && event.target === datePickerModal) {
                    datePickerModal.style.display = 'none';
                }
                if (todoModal && event.target === todoModal) {
                    todoModal.style.display = 'none';
                }
                if (todosListModal && event.target === todosListModal) {
                    todosListModal.style.display = 'none';
                }
                if (editTodoModal && event.target === editTodoModal) {
                    editTodoModal.style.display = 'none';
                }
            });
        }
        
    // 초기화
    function init() {
        try {
            populateYearOptions();
            updateCurrentDateDisplay();
            generateCalendar();
            setupEventListeners();
            
            // 시간표 섹션 기본 숨김
            if (timetableSection) {
                timetableSection.style.display = 'none';
            }
            if (calendarSection) {
                calendarSection.style.display = 'block';
            }
            
            console.log('달력 초기화 완료');
        } catch (e) {
            console.error('초기화 중 오류 발생:', e);
        }
    }

    function getAssignmentProgressBar(dateKey) {
        if (!window.assignmentData) return '';
        
        const [year, month, day] = dateKey.split('-');
        const dateStart = new Date(year, month - 1, day, 0, 0, 0);
        const dateEnd = new Date(year, month - 1, day, 23, 59, 59);
        
        // 해당 날짜에 생성일과 마감일이 있는 과제 선택
        const assignmentsForDate = window.assignmentData.filter(assignment => {
            if (!assignment.deadline || !assignment.createdAt) return false;
            const deadline = new Date(assignment.deadline);
            return deadline >= dateStart && deadline <= dateEnd;
        });
        
        if (assignmentsForDate.length === 0) return '';
        
        // 우선순위가 높은 과제 정렬
        assignmentsForDate.sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        const assignment = assignmentsForDate[0];
        const creation = new Date(assignment.createdAt);
        const deadline = new Date(assignment.deadline);
        const now = new Date();
        let progress = 0;
        
        if (now >= deadline) {
            progress = 100;
        } else if (now <= creation) {
            progress = 0;
        } else {
            progress = ((now - creation) / (deadline - creation)) * 100;
            progress = Math.floor(progress);
        }
        
        // 날짜 비교 (마감 당일과 마감일 이후 구분)
        const todayNoTime = new Date(now.toISOString().split('T')[0]);
        const deadlineNoTime = new Date(deadline.toISOString().split('T')[0]);
        
        let barColor = '#28a745';  // 기본 색상 (녹색)
        if (todayNoTime.getTime() === deadlineNoTime.getTime()) {
            barColor = '#dc3545';  // 마감 당일: 붉은색
        } else if (todayNoTime.getTime() > deadlineNoTime.getTime()) {
            barColor = '#000000';  // 마감일 이후: 검은색
        }
        
        return `
            <div class="assignment-progress-container">
                <div class="assignment-progress">
                    <div class="progress-bar" style="width: ${progress}%; background-color: ${barColor};"></div>
                </div>
            </div>
        `;
    }
    
    // 초기화 실행
    init();
});