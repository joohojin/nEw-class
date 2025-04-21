import os
import time
import shutil
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    StaleElementReferenceException,
    ElementNotInteractableException,
    TimeoutException
)

# 다운로드 경로 설정
DOWNLOAD_DIR = os.path.join(os.getcwd(), "downloads")
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# Chrome 옵션 설정
chrome_options = webdriver.ChromeOptions()
prefs = {
    "download.default_directory": DOWNLOAD_DIR,
    "download.prompt_for_download": False,
    "plugins.always_open_pdf_externally": True
}
chrome_options.add_experimental_option("prefs", prefs)

# Chrome 드라이버 초기화
service = Service()
driver = webdriver.Chrome(service=service, options=chrome_options)
wait = WebDriverWait(driver, 20)

try:
    # VIEWER_URL 접속
    VIEWER_URL = "https://rpt80.cau.ac.kr/oz80/ozViewer.jsp?ozr_path=TIS/prof/usk&ozr_nm=pUskLei008&param_odi=year=2025,shtm=1,camp_cd=2,sust=3E720,sbjt_no=54605,clss_no=01&param_form=new#"
    driver.get(VIEWER_URL)

    # 다운로드 버튼 클릭
    save_button_xpath = "/html/body/div[1]/div[1]/input[4]"
    save_button = wait.until(EC.element_to_be_clickable((By.XPATH, save_button_xpath)))
    save_button.click()
    time.sleep(1)

    # Enter 키 입력하여 다운로드 트리거
    save_button.send_keys(Keys.ENTER)

    # 다운로드 시작 시간 기록
    download_start_time = datetime.now()

    # 다운로드 완료 대기
    timeout = 30  # 최대 대기 시간 (초)
    poll_interval = 1  # 폴링 간격 (초)
    elapsed = 0
    downloaded_file = None

    while elapsed < timeout:
        files = os.listdir(DOWNLOAD_DIR)
        files = [f for f in files if not f.endswith(".crdownload")]
        if files:
            # 가장 최근에 생성된 파일 찾기
            files_with_ctime = [
                (f, os.path.getctime(os.path.join(DOWNLOAD_DIR, f))) for f in files
            ]
            files_with_ctime.sort(key=lambda x: x[1], reverse=True)
            latest_file, ctime = files_with_ctime[0]
            file_time = datetime.fromtimestamp(ctime)
            if file_time > download_start_time:
                downloaded_file = latest_file
                break
        time.sleep(poll_interval)
        elapsed += poll_interval

    if downloaded_file:
        print(f"다운로드 완료: {downloaded_file}")
    else:
        print("다운로드된 파일을 찾을 수 없습니다.")

except (StaleElementReferenceException, ElementNotInteractableException, TimeoutException) as e:
    print(f"오류 발생: {e}")

finally:
    driver.quit()
