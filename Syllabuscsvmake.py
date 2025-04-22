import pandas as pd
import re
from pathlib import Path
from typing import List, Union

# ——————————————————————————————————————————————
# 0) 기본 경로 설정
# ——————————————————————————————————————————————
DEFAULT_DOWNLOADS    = Path.home() / "Downloads"
DEFAULT_INPUT_FILE   = DEFAULT_DOWNLOADS / "noname.txt"     # .txt 파일 이름만 필요하면 바꿔주세요
DEFAULT_OUTPUT_FILE  = Path.cwd()      / "timetable.csv"   # 또는 원하는 경로로 변경

# ——————————————————————————————————————————————
# 1) 원본 데이터 읽어서 파싱하는 함수
# ——————————————————————————————————————————————
def parse_timetable(
    txt_path: Union[str, Path] = DEFAULT_INPUT_FILE
) -> pd.DataFrame:
    """
    :param txt_path: 탭 구분 텍스트(.txt) 파일 경로. 기본값은 ~/Downloads/noname.txt
    :return: lecture_name, professor, rooms, times, course.id 컬럼만 있는 DataFrame
    """
    # encoding='cp949' 로 인코딩 지정 (파일 인코딩에 따라 다를 수 있음)
    df = pd.read_csv(txt_path, sep='\t', encoding='cp949')
  
    # 강의명(SBJTNM)과 LTBDRM 값이 없는(공백 혹은 NaN) 행은 제외
    df = df[df['SBJTNM'].notna() & df['LTBDRM'].notna()]
    df = df[(df['SBJTNM'].astype(str).str.strip() != "") & (df['LTBDRM'].astype(str).str.strip() != "")]
  
    # course.id 칼럼은 빈 문자열로 초기화
    df = df.assign(
        lecture_name = df['SBJTNM'],
        professor    = df['PROFNM'],
        **{"course.id": ""}
    )

    def extract_rooms(s: str) -> List[str]:
        if not isinstance(s, str):
            s = ""
        return re.findall(r'\d+관\(.*?\)\s*\d+호|\d+호', s)

    def extract_times(s: str) -> List[str]:
        if not isinstance(s, str):
            s = ""
        kor = re.findall(r'([월화수목금토일]\d+(?:,\d+)*)', s)
        eng = re.findall(r'\b(?:MON|TUE|WED|THU|FRI|SAT|SUN)\d+(?:,\d+)*', s)
        return kor + eng

    df = df.assign(
        rooms = df['LTBDRM'].apply(extract_rooms),
        times = df['LTBDRM'].apply(extract_times)
    )
    
    # 강의실(rooms)와 시간(times) 정보가 모두 없는 행은 제외
    df = df[(df['rooms'].apply(len) > 0) | (df['times'].apply(len) > 0)]

    return df[['lecture_name','professor','rooms','times','course.id']]

# ——————————————————————————————————————————————
# 2) CSV 저장/불러오기 함수
# ——————————————————————————————————————————————
def save_timetable(
    df: pd.DataFrame,
    path: Union[str, Path] = DEFAULT_OUTPUT_FILE
) -> None:
    """
    DataFrame을 CSV 파일로 저장합니다.
    파일이 이미 존재하면 헤더를 비교하여 일치하지 않으면 파일을 삭제한 후,
    아니면 새 행만 추가합니다.
    리스트 타입 칼럼은 문자열로 변환해 저장됩니다.
    """
    expected_columns = ['lecture_name','professor','rooms','times','course.id']
    df_to_save = df.copy()
    df_to_save['rooms'] = df_to_save['rooms'].apply(lambda lst: " | ".join(lst))
    df_to_save['times'] = df_to_save['times'].apply(lambda lst: " | ".join(lst))
    
    file_path = Path(path)
    
    # 파일이 이미 존재한다면 헤더가 일치하는지 확인
    if file_path.exists():
        try:
            existing_df = pd.read_csv(file_path, nrows=0, encoding='utf-8-sig')
            if list(existing_df.columns) != expected_columns:
                print("기존 CSV의 헤더가 변경되어 파일을 삭제 후 재생성합니다.")
                file_path.unlink()  # 파일 삭제
        except Exception as e:
            print(f"CSV 헤더 읽기 실패: {e}. 파일을 삭제 후 재생성합니다.")
            file_path.unlink()
    
    # 파일이 존재하면 새 행만 append, 아니면 헤더 포함하여 저장
    if file_path.exists():
        df_to_save.to_csv(file_path, index=False, encoding='utf-8-sig',
                          mode='a', header=False)
    else:
        df_to_save.to_csv(file_path, index=False, encoding='utf-8-sig')
        
    print(f"Saved timetable to {file_path}")

def load_timetable(
    path: Union[str, Path] = DEFAULT_OUTPUT_FILE
) -> pd.DataFrame:
    """
    CSV 으로부터 DataFrame 복원.
    rooms/times 컬럼은 " | " 로 join된 문자열 상태입니다.
    """
    df = pd.read_csv(path, encoding='utf-8-sig')
    # 필요시 split 적용:
    df['rooms'] = df['rooms'].fillna("").apply(lambda s: s.split(" | ") if s else [])
    df['times'] = df['times'].fillna("").apply(lambda s: s.split(" | ") if s else [])
    return df

# ——————————————————————————————————————————————
# 3) 실행 예시
# ——————————————————————————————————————————————
if __name__ == '__main__':
    import sys
    # 1) 파싱 (기본값: ~/Downloads/noname.txt)
    df_tt = parse_timetable()

    # 만약 course.id 인자가 있다면, 이를 각 행의 "course.id" 칼럼에 저장합니다.
    if len(sys.argv) > 1:
        course_id_arg = sys.argv[1]
        df_tt["course.id"] = course_id_arg
        print(f"course.id가 '{course_id_arg}' 로 설정되었습니다.")

    # 2) CSV 저장 (기본값: ./timetable.csv)
    save_timetable(df_tt)

    # 3) 나중에 불러오기
    df_loaded = load_timetable()
    print(df_loaded.head())

    # 4) 데이터 입력 후 noname.txt 삭제
    noname_path = DEFAULT_INPUT_FILE
    if noname_path.exists():
        noname_path.unlink()
        print(f"Deleted {noname_path}")
