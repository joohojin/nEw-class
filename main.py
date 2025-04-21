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
import tempfile
from pathlib import Path
from PyPDF2 import PdfReader                     # pip install PyPDF2

# --- 설정 ---
API_URL = "https://eclass3.cau.ac.kr"
API_KEY = "hRJj9VApatMu1qNRvV91F0oT0PvRGeRbObnMbdeHnM73UVIqrDPvR2teKut9sSlz"

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

# === PDF 다운로드 === ( 그런데 작동 안함 )

def extract_pdf_url_from_iframe(html_body):
    match = re.search(r'<iframe[^>]+src="([^"]+)"', html_body)
    return html.unescape(match.group(1)) if match else None

def download_pdf(session, iframe_url):
    resp = session.get(iframe_url)
    resp.raise_for_status()
    pdf_match = re.search(r'<object[^>]+data="([^"]+\.pdf)"', resp.text)
    if not pdf_match:
        raise RuntimeError("PDF URL not found in viewer page")
    pdf_url = html.unescape(pdf_match.group(1))
    pdf_resp = session.get(pdf_url)
    pdf_resp.raise_for_status()
    return pdf_resp.content

def save_pdf_to_file(pdf_bytes, filename):
    with open(filename, 'wb') as f:
        f.write(pdf_bytes)

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

    # 강의 목록 필터: 2025-02-01 이후 생성 및 강의 계획서가 존재하는 강의만 표시
    start_dt = datetime(2025, 2, 1, tzinfo=timezone.utc)
    end_dt   = datetime(2025, 6, 30, 23, 59, 59, tzinfo=timezone.utc)
    all_courses = user.get_courses(enrollment_state="active")
    filtered_courses = []

    # 강의 필터링
    for c in all_courses:
        created = date_parser.isoparse(c.created_at)
        if start_dt <= created <= end_dt:
            syllabus = fetch_course_syllabus(canvas, c.id)
            if syllabus and syllabus.syllabus_body:
                filtered_courses.append((c, created.date()))

    if not filtered_courses:
        raise SystemExit("[ERROR] 조회 가능한 강의가 없습니다.")

    # 필터된 강의 목록을 보기 쉽게 한번에 출력
    print("\n=== 2025‑1학기 생성 강의 목록 (강의 계획서가 있는 강의만 표시) ===")
    for course_item, created_date in filtered_courses:
        print(f"ID: {course_item.id:<8} 생성일: {created_date}  강의명: {course_item.name}")

    choice = input("\n조회할 강의 ID 또는 코드 입력: ").strip()
    # filtered_courses에서 강의 객체만 추출하여 검색
    course = select_course([c for c, _ in filtered_courses], choice)
    if not course:
        raise SystemExit(f"[ERROR] '{choice}'에 해당하는 강의를 찾을 수 없습니다.")

    # 강의 계획서 PDF 저장
    syllabus = fetch_course_syllabus(canvas, course.id)
    iframe_url = extract_pdf_url_from_iframe(syllabus.syllabus_body or "")
    if iframe_url:
        try:
            pdf_bytes = download_pdf(session, iframe_url)
            pdf_filename = f"{course.name.replace('/', '_')} 강의 계획서.pdf"
            save_pdf_to_file(pdf_bytes, pdf_filename)
            print(f"PDF를 '{pdf_filename}' 파일로 저장했습니다.")
        except Exception as e:
            logging.warning(f"[WARNING] PDF 다운로드 실패: {e}")
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