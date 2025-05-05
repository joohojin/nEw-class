
---

## 주요 기능

| 분류 | 하이라이트 |
| --- | --- |
| **데이터 동기화** | Canvas API → CSV 내보내기(`main.py`) |
| **시각화** | 순수 **HTML + JS** 달력 & 시간표 인터페이스 |
| **오프라인 우선** | `localStorage` 이용, 한 번 로드 후 네트워크 불필요 |
| **더미 데이터** | _assignments.csv_ & _timetable.csv_ 기본 포함으로 즉시 데모 가능 |
---

## 프로젝트 구조

```text
├── backend/
│   ├── main.py               # Canvas → CSV 동기화 스크립트
│   └── Syllabuscsvmake.py    # 교내 강의계획서 → timetable.csv 변환
├── frontend/
│   ├── calendar.html         # 달력·시간표 SPA
│   ├── calendar.css          # 스타일시트
│   ├── calendar.js           # 달력 로직
│   ├── timetable.js          # 시간표 그리드 렌더러
│   ├── assignment.js         # 과제 목록 뷰
│   ├── course_parser.js      # timetable.csv → scheduleData
│   └── assignments_parser.js # assignments.csv → assignmentData
├── data/
│   ├── assignments.csv       # 📦 더미 과제 (주모 학생의 데이터 제공이 있었읍니다...)
│   └── timetable.csv         # 📦 더미 과목 (마찬가지로...)
└── README.md                 # 바로 이 파일
```

---

---

## 데모 실행 방법

### 1. 실데이터 동기화(선택)

```bash
"main.py" 를 실행!  # assignments.csv, timetable.csv 생성
```

> **건너뛰어도 무방합니다.** 이미 제공된 더미 데이터로 바로 UI를 확인할 수 있습니다. (물론 자신의 과목이 없으면... 저런!)

### 4. 프런트엔드 실행

웹 서버가 필요 없습니다. **`calendar.html`** 파일을 브라우저로 열어보세요. 

---

## 더미 데이터

| 파일 | 설명 |
| --- | --- |
| `data/assignments.csv` | 실제 주모 학생의 과제로 구성된 예시 데이터 |
| `data/timetable.csv` | 마찬가지로 한 학기 수강 과목 더미 데이터  |

더미 데이터는 파서·UI가 정상적으로 작동하는지 즉시 확인하기 위한 용도로 제공됩니다. 언제든지 자신의 CSV로 교체할 수 있습니다.

---

## 스크립트 & 유틸리티

| 스크립트 | 설명 |
| --- | --- |
| `main.py` | Canvas API에서 강좌·과제·공지 수집 후 CSV 저장 |
| `Syllabuscsvmake.py` | 교내 수강편람 TXT → timetable.csv 변환 |
---