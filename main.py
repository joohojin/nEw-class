#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import absolute_import
import logging
from datetime import datetime, timezone
from dateutil import parser as date_parser        # pip install python-dateutil
from canvasapi import Canvas
import requests
import re
import html
import sys
import os
from pathlib import Path
import time

# --- 설정 ---
API_URL = "https://eclass3.cau.ac.kr"
API_KEY = ""

# 로깅 초기화
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# Canvas API 에서 이것 저것 가져오기
def fetch_current_user(canvas):
    return canvas.get_current_user()

def fetch_active_courses(user):
    return list(user.get_courses(enrollment_state="active", per_page=100))

def select_course(courses, raw_input):
    if raw_input.isdigit():
        cid = int(raw_input)
        matches = [c for c in courses if c.id == cid]
    else:
        matches = [c for c in courses if getattr(c, 'course_code', None) == raw_input]
    return matches[0] if matches else None

def fetch_course_syllabus(canvas, course_id):
    return canvas.get_course(course_id, include="syllabus_body")

def fetch_assignments(course):
    return course.get_assignments()

def fetch_announcements(canvas, course_id):
    return canvas.get_announcements(context_codes=[f"course_{course_id}"])

def fetch_weekly_tool_url(course):
    try:
        tool = course.get_external_tool(211)
        return getattr(tool, 'url', '')
    except:
        return ""

# === iframe URL 추출 ===
def extract_pdf_url_from_iframe(html_body):
    if not html_body:
        return None
    
    iframe_match = re.search(r'<iframe[^>]+src="([^"]+)"', html_body)
    if not iframe_match:
        return None
    
    iframe_url = html.unescape(iframe_match.group(1))
    logging.debug(f"iframe URL 추출: {iframe_url}")
    return iframe_url

# === 브라우저 창 열기 ===
def open_browser_window(iframe_url):
    """
    강의계획서 iframe URL을 브라우저에서 엽니다.
    
    Args:
        iframe_url (str): PDF가 포함된 iframe URL
        
    Returns:
        bool: 성공 여부
    """
    # 모듈 임포트 (여기서 직접 임포트)
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
    except ImportError as e:
        print(f"오류: 필요한 모듈이 설치되지 않았습니다. {e}")
        print("pip install selenium 명령으로 설치해주세요.")
        return False
    
    # Chrome 옵션 설정 - 창을 표시하도록 설정
    options = Options()
    options.add_argument("--start-maximized")  # 창 최대화
    
    # WebDriver 초기화
    try:
        driver = webdriver.Chrome(options=options)
    except Exception as e:
        print(f"ChromeDriver 초기화 실패: {e}")
        print("Chrome 브라우저와 호환되는 ChromeDriver가 설치되어 있는지 확인하세요.")
        return False
    
    try:
        print(f"브라우저로 iframe URL 열기: {iframe_url}")
        
        # iframe URL로 이동
        driver.get(iframe_url)
        
        print("브라우저 창이 열렸습니다. 확인 후 창을 직접 닫아주세요.")
        print("또는 이 프로그램을 종료하면 브라우저 창도 함께 닫힙니다.")
        
        # 사용자가 창을 보는 동안 프로그램 종료 방지
        try:
            # 브라우저 창이 닫힐 때까지 대기
            while len(driver.window_handles) > 0:
                time.sleep(1)
        except:
            # 사용자가 Ctrl+C로 종료하거나 다른 예외가 발생할 경우
            pass
        
        return True
    
    except Exception as e:
        print(f"브라우저 창 열기 중 오류: {e}")
        return False
    
    finally:
        try:
            driver.quit()  # 프로그램 종료 시 드라이버도 정리
        except:
            pass  # 이미 닫혔다면 무시

# === txt 보고서 작성 ===
def compile_report(course, syllabus, assignments, announcements, weekly_url):
    lines = [
        f"Course: {course.id} - {course.name} ({course.course_code})",
        "",
        "--- Syllabus (HTML) ---",
        syllabus.syllabus_body or "[강의 계획서 없음]",
        "",
        "--- Assignments ---"
    ]
    for a in assignments:
        created = date_parser.isoparse(a.created_at).date() if a.created_at else ''
        due = date_parser.isoparse(a.due_at).date() if a.due_at else '미정'
        lines.append(f"[{a.id}] {a.name} (created: {created}, due: {due})")
        desc = a.description or '[설명 없음]'
        desc_text = re.sub(r'<[^>]+>', '', desc)
        lines.append(f"    Description: {desc_text}")
    lines += [
        "",
        "--- Announcements ---"
    ]
    for ann in announcements:
        created = date_parser.isoparse(ann.created_at).date() if hasattr(ann, 'created_at') else ''
        posted = date_parser.isoparse(ann.posted_at).date() if hasattr(ann, 'posted_at') else ''
        lines.append(f"[{ann.id}] {ann.title} (created: {created}, posted: {posted})")
    lines += [
        "",
        "--- Weekly Learning Tool (ID:211) ---",
        weekly_url or "[주차 학습 URL 없음]"
    ]
    return lines

def save_report_to_file(lines, filename):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

# 메인인
if __name__ == "__main__":
    canvas = Canvas(API_URL, API_KEY)
    session = requests.Session()
    session.headers.update({"Authorization": f"Bearer {API_KEY}"})

    # 토큰 유효성 테스트 및 사용자
    user = fetch_current_user(canvas)
    if not user:
        raise SystemExit("[ERROR] 사용자 인증에 실패했습니다.")

    # 미리 작성된: 2025-02-01 이후 생성된 강의 목록 표시
    start_dt = datetime(2025, 2, 1, tzinfo=timezone.utc)
    end_dt   = datetime(2025, 6, 30, 23, 59, 59, tzinfo=timezone.utc)
    try:
        all_courses = user.get_courses(enrollment_state="active")
        print("\n=== 2025‑1학기 생성 강의 목록 (2월 이후) ===")
        for c in all_courses:
            created = date_parser.isoparse(c.created_at)
            if start_dt <= created <= end_dt:
                print(f"{c.id:<8} {created.date()}  {c.name}")
    except Exception as e:
        logging.warning(f"[WARNING] 강의 목록 조회 실패: {e}")

    # 대상 강의 선택
    choice = input("\n조회할 강의 ID 또는 코드 입력: ").strip()
    courses = fetch_active_courses(user)
    course = select_course(courses, choice)
    if not course:
        raise SystemExit(f"[ERROR] '{choice}'에 해당하는 강의를 찾을 수 없습니다.")

    # 강의 계획서 iframe URL 추출
    syllabus = fetch_course_syllabus(canvas, course.id)
    iframe_url = extract_pdf_url_from_iframe(syllabus.syllabus_body or "")
    
    if iframe_url:
        try:
            # URL이 상대 경로인 경우 절대 경로로 변환
            if not iframe_url.startswith(('http://', 'https://')):
                iframe_url = f"{API_URL}{iframe_url if iframe_url.startswith('/') else '/' + iframe_url}"
            
            print(f"강의 계획서 iframe URL: {iframe_url}")
            
            # 브라우저 창으로 강의계획서 열기
            print("브라우저 창으로 강의계획서를 엽니다...")
            open_browser_window(iframe_url)
            
        except Exception as e:
            logging.warning(f"[WARNING] 강의 계획서 처리 중 오류: {e}", exc_info=True)
    else:
        logging.warning("강의 계획서 iframe URL을 찾을 수 없습니다.")
        
    # 자료 수집 및 보고서 작성
    assignments   = fetch_assignments(course)
    announcements = fetch_announcements(canvas, course.id)
    weekly_url    = fetch_weekly_tool_url(course)

    report_lines = compile_report(course, syllabus, assignments, announcements, weekly_url)
    report_filename = f"course_{course.id}.txt"
    save_report_to_file(report_lines, report_filename)
    print(f"텍스트 보고서를 '{report_filename}' 파일로 저장했습니다.")