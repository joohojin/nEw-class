import logging
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("selenium_downloader")

def download_syllabus_pdf(iframe_url, output_path, canvas_url=None, username=None, password=None):
    """
    Selenium을 사용하여 강의계획서 PDF를 다운로드합니다.
    
    Args:
        iframe_url (str): PDF가 포함된 iframe URL
        output_path (str): 저장할 PDF 파일 경로
        canvas_url (str, optional): Canvas LMS URL (로그인 필요한 경우)
        username (str, optional): 로그인 사용자명
        password (str, optional): 로그인 비밀번호
        
    Returns:
        bool: 다운로드 성공 여부
    """
    options = Options()
    options.add_argument("--headless")  # 화면 표시 없이 실행
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920x1080")
    
    # PDF 다운로드 설정 - 다운로드 경로를 현재 작업 디렉토리로 설정
    download_dir = str(Path('.').resolve())
    prefs = {
        "download.default_directory": download_dir,
        "download.prompt_for_download": False,
        "plugins.always_open_pdf_externally": True,
        "download.directory_upgrade": True
    }
    options.add_experimental_option("prefs", prefs)
    
    # WebDriver 초기화
    driver = webdriver.Chrome(options=options)
    
    try:
        logger.info(f"Selenium으로 iframe URL 접근: {iframe_url}")
        
        # 로그인이 필요한 경우
        if canvas_url and username and password:
            logger.info(f"Canvas {canvas_url}에 로그인 시도")
            driver.get(f"{canvas_url}/login/canvas")
            
            # 로그인 폼 찾기 및 입력
            try:
                username_field = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.ID, "username"))
                )
                password_field = driver.find_element(By.ID, "password")
                
                username_field.send_keys(username)
                password_field.send_keys(password)
                
                login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                login_button.click()
                
                # 로그인 완료 대기
                WebDriverWait(driver, 15).until(
                    lambda d: "login" not in d.current_url.lower()
                )
                logger.info("로그인 성공")
            except Exception as e:
                logger.error(f"로그인 실패: {e}")
        
        # iframe URL로 이동
        driver.get(iframe_url)
        
        # OZ Viewer 로딩 대기
        logger.info("OZ Viewer 로딩 대기 중...")
        time.sleep(5)  # 뷰어 로딩 시간을 충분히 주기
        
        # 페이지 스크린샷 찍기 (디버깅용)
        driver.save_screenshot("ozviewer_screenshot.png")
        logger.info("스크린샷 저장: ozviewer_screenshot.png")
        
        # PDF 다운로드 버튼 찾기 시도
        pdf_button_found = False
        pdf_button_selectors = [
            "#ozToolButton_PDF",           # 일반적인 ID
            "#ozToolButton_PDFSave",       # 대체 ID 1
            ".oz-toolbar-button-pdf",      # CSS 클래스
            "[title='PDF로 저장']",         # 타이틀 속성
            "[title='PDF']",               # 축약 타이틀
            "#toolbar button:nth-child(5)", # 툴바 내 위치
            "button.oz-button-pdf",         # 버튼 클래스
            "img[alt='PDF']",               # 이미지 대체 텍스트
        ]
        
        # 모든 가능한 PDF 버튼 셀렉터 시도
        for selector in pdf_button_selectors:
            try:
                logger.info(f"PDF 버튼 셀렉터 시도: {selector}")
                pdf_button = WebDriverWait(driver, 3).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                pdf_button.click()
                pdf_button_found = True
                logger.info(f"PDF 버튼 발견 및 클릭: {selector}")
                break
            except Exception:
                logger.debug(f"셀렉터 {selector}에서 버튼을 찾을 수 없음")
                continue
        
        # JavaScript 실행으로 PDF 버튼 찾기 (플랜 B)
        
        if not pdf_button_found:
            try:
                logger.info("JavaScript로 PDF 다운로드 시도")
                # OZ Viewer에서 PDF 저장 함수를 직접 호출 시도
                driver.execute_script("ozviewer.ozhtml5.ZTransferSaveAsPdf();")
                pdf_button_found = True
                logger.info("JavaScript로 PDF 함수 호출 성공")
            except Exception as e:
                logger.warning(f"JavaScript로 PDF 함수 호출 실패: {e}")

        
        # iframe 내부의 요소 찾기 (플랜 C)
        if not pdf_button_found:
            try:
                logger.info("iframe 내부 탐색")
                # iframe으로 전환
                iframes = driver.find_elements(By.TAG_NAME, "iframe")
                if iframes:
                    for idx, iframe in enumerate(iframes):
                        try:
                            driver.switch_to.frame(iframe)
                            logger.info(f"iframe {idx+1} 전환 성공")
                            
                            # iframe 내에서 PDF 버튼 찾기
                            for selector in pdf_button_selectors:
                                try:
                                    pdf_button = WebDriverWait(driver, 2).until(
                                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                                    )
                                    pdf_button.click()
                                    pdf_button_found = True
                                    logger.info(f"iframe 내부에서 PDF 버튼 발견: {selector}")
                                    break
                                except:
                                    continue
                            
                            # 버튼을 찾았으면 iframe 루프 종료
                            if pdf_button_found:
                                break
                                
                            # 현재 iframe에서 못 찾았으면 기본 컨텐츠로 돌아가기
                            driver.switch_to.default_content()
                        except:
                            driver.switch_to.default_content()
                            continue
            except Exception as e:
                logger.warning(f"iframe 탐색 중 오류: {e}")
                driver.switch_to.default_content()
        
        # 페이지 소스 저장 (디버깅용)
        with open("ozviewer_page_source.html", "w", encoding="utf-8") as f:
            f.write(driver.page_source)
        logger.info("페이지 소스 저장: ozviewer_page_source.html")
        
        if pdf_button_found:
            # 다운로드 대기
            logger.info("PDF 다운로드 완료 대기 중...")
            time.sleep(10)  # 다운로드 완료까지 시간 제공
            
            # 다운로드 폴더에서 가장 최근 PDF 파일 찾기
            pdf_files = list(Path(download_dir).glob("*.pdf"))
            if pdf_files:
                # 수정 시간 기준으로 가장 최근 파일 선택
                latest_pdf = max(pdf_files, key=lambda p: p.stat().st_mtime)
                
                # 지정된 출력 경로로 이동
                output_path = Path(output_path)
                if latest_pdf.exists():
                    if output_path.exists():
                        output_path.unlink()  # 기존 파일 삭제
                    latest_pdf.rename(output_path)
                    logger.info(f"PDF를 '{output_path}'로 저장했습니다.")
                    return True
                else:
                    logger.warning("다운로드된 PDF 파일을 찾을 수 없습니다.")
            else:
                logger.warning("다운로드 폴더에서 PDF 파일을 찾을 수 없습니다.")
        
        return False
    except Exception as e:
        logger.error(f"Selenium을 사용한 PDF 다운로드 중 오류: {e}")
        return False
    finally:
        driver.quit()

if __name__ == "__main__":
    # 단독 실행 테스트
    import argparse
    
    parser = argparse.ArgumentParser(description='OZ Viewer PDF 다운로더')
    parser.add_argument('url', help='OZ Viewer iframe URL')
    parser.add_argument('output', help='저장할 PDF 파일 경로')
    parser.add_argument('--canvas', help='Canvas URL (로그인 필요시)')
    parser.add_argument('--username', help='로그인 사용자명')
    parser.add_argument('--password', help='로그인 비밀번호')
    
    args = parser.parse_args()
    
    success = download_syllabus_pdf(
        args.url, 
        args.output,
        canvas_url=args.canvas,
        username=args.username,
        password=args.password
    )
    
    if success:
        print(f"PDF 다운로드 성공: {args.output}")
    else:
        print("PDF 다운로드 실패")