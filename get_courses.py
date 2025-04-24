#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import absolute_import
import logging
from datetime import datetime, timezone
from dateutil import parser as date_parser  # pip install python-dateutil
from canvasapi import Canvas

# 1) 디버그 로깅 활성화
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

# 2) API 접속 정보
API_URL = "https://eclass3.cau.ac.kr"  # CAU E-Class API URL
API_KEY = "토큰"

# 3) Canvas 인스턴스 생성
canvas = Canvas(API_URL, API_KEY)

# 4) 토큰 유효성 테스트
try:
    user = canvas.get_current_user()
    print(f"[OK] 토큰 유효: {user.id} - {user.name}")
except Exception as e:
    print(f"[WARNING] 토큰 검증 실패: {e} — 계속 진행합니다.")
    user = None

if not user:
    exit(1)

# 5) 기간 필터 정의 (2025‑03‑01 ~ 2025‑06‑30)
start_dt = datetime(2025, 2, 1, tzinfo=timezone.utc)
end_dt   = datetime(2025, 6, 30, 23, 59, 59, tzinfo=timezone.utc)

# 6) 내 활성 강의 목록 조회 및 기간 필터 적용
try:
    courses = user.get_courses(enrollment_state="active")
    print("\n=== 2025‑1 학기 강의 생성 목록 ===")
    for c in courses:
        # created_at 은 ISO 8601 문자열이므로 파싱 필요
        created = date_parser.isoparse(c.created_at)
        if start_dt <= created <= end_dt:
            print(f"{c.id:<8} {created.date()}  {c.name}")
except Exception as e:
    print(f"[ERROR] 강의 목록 조회 실패: {e}")


