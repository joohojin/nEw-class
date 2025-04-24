#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import time
import logging
import http.client as http_client
import requests                              # Session, HTTP 요청 처리 :contentReference[oaicite:4]{index=4}
from bs4 import BeautifulSoup                # HTML 파싱 :contentReference[oaicite:5]{index=5}

# --- 설정 영역 ---
USER_ID    = 'ID'  # 사용자 ID
PASSWORD   = '비밀번호'  # 사용자 비밀번호
LOGIN_URL  = 'https://mportal.cau.ac.kr/common/auth/SSOlogin.do'
TARGET_URL = 'https://mportal.cau.ac.kr/std/usk/sUskCap003/index.do'


def scrape_with_requests(user_id: str, password: str) -> BeautifulSoup:
    # 1) 세션 & 디버그 로깅 설정
    session = requests.Session()  
    # HTTPConnection 디버그 레벨 활성화 :contentReference[oaicite:6]{index=6}
    http_client.HTTPConnection.debuglevel = 1
    logging.basicConfig(level=logging.DEBUG)
    
    # 2) 로그인 폼 페이지 GET → hidden inputs & action 파싱 :contentReference[oaicite:7]{index=7}
    resp_login_page = session.get(
        LOGIN_URL, 
        params={'redirectUrl': '/std/usk/sUskCap003/index.do'}
    )
    resp_login_page.raise_for_status()
    soup_form = BeautifulSoup(resp_login_page.text, 'html.parser')
    form = soup_form.find('form')
    action = form.get('action') or LOGIN_URL
    
    # 3) 모든 input(name, value) 수집 후 payload 생성
    payload = {}
    for inp in form.find_all('input'):
        name = inp.get('name')
        if not name:
            continue
        payload[name] = inp.get('value', '')
    
    # 4) 사용자 인증 정보 삽입
    payload['userId']   = user_id
    payload['password'] = password

    # 5) User-Agent 헤더 업데이트 :contentReference[oaicite:8]{index=8}
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                      'AppleWebKit/537.36 (KHTML, like Gecko) '
                      'Chrome/112.0.0.0 Safari/537.36'
    })

    # 6) 로그인 요청 및 리다이렉션 처리 :contentReference[oaicite:9]{index=9}
    login_resp = session.post(action, data=payload)
    login_resp.raise_for_status()

    # 7) 로그인 성공 검증
    if '로그아웃' not in login_resp.text:
        raise RuntimeError('로그인 실패: 아이디/비밀번호를 확인하세요')

    # 8) 목표 페이지 요청
    data_resp = session.get(TARGET_URL)
    data_resp.raise_for_status()
    return BeautifulSoup(data_resp.text, 'html.parser')


def parse_data(soup: BeautifulSoup) -> None:
    """
    파싱된 HTML에서 테이블 데이터를 콘솔에 출력
    """
    table = soup.select_one('table tbody')
    if not table:
        print('테이블을 찾을 수 없습니다.')
        return

    for row in table.select('tr'):
        cols = [td.get_text(strip=True) for td in row.find_all('td')]
        print(cols)


def main():
    try:
        soup = scrape_with_requests(USER_ID, PASSWORD)
        parse_data(soup)
    except Exception as e:
        print('Error:', e)
        sys.exit(1)


if __name__ == '__main__':
    main()


# --- Selenium 대체 예제 (필요 시 주석 해제) ---
# from selenium import webdriver
# from selenium.webdriver.chrome.options import Options
# from selenium.webdriver.common.by import By
# from selenium.webdriver.support.ui import WebDriverWait
# from selenium.webdriver.support import expected_conditions as EC
#
# def scrape_with_selenium(user_id: str, password: str) -> BeautifulSoup:
#     opts = Options()
#     opts.add_argument('--headless=new')  # Chrome ≥109용 신규 헤드리스 모드 :contentReference[oaicite:10]{index=10}
#     opts.add_argument('--no-sandbox')
#     opts.add_argument('--disable-dev-shm-usage')
#
#     driver = webdriver.Chrome(options=opts)
#     try:
#         driver.get(f"{LOGIN_URL}?redirectUrl=/std/usk/sUskCap003/index.do")
#         driver.find_element(By.NAME, 'userId').send_keys(user_id)
#         driver.find_element(By.NAME, 'password').send_keys(password)
#         driver.find_element(By.CSS_SELECTOR, 'button.login-btn').click()
#         WebDriverWait(driver, 10).until(
#             EC.url_contains('/std/usk/sUskCap003/index.do')  # URL 변경 대기 :contentReference[oaicite:11]{index=11}
#         )
#         html = driver.page_source
#         return BeautifulSoup(html, 'html.parser')
#     finally:
#         driver.quit()  # 드라이버 완전 종료 :contentReference[oaicite:12]{index=12}
