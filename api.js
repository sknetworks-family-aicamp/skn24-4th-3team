/**
 * TBM Project API 설계서
 *
 * status 값
 * - implemented: 현재 코드에서 동작
 * - partial: 화면 또는 일부 로직만 존재
 * - planned: 아직 구현 필요
 * - restore_needed: 이전에 있었지만 현재 FastAPI 분리 과정에서 제거되어 복구 필요
 *
 * 현재 실행 구조
 * - Django: HTML 화면, 세션 로그인, DB, FastAPI 호출, AI 사용 로그 저장
 * - FastAPI(ai_server): STT, 날씨 조회, TBM 초안 생성
 */

const API_SPEC = [
  // 로그인
  {
    name: "로그인",
    status: "partial",
    method: "POST",
    path: "/account/login/",
    actualBehavior: "Django 세션 로그인 후 dashboard로 redirect",
    note: "현재 JSON API가 아니라 HTML form 기반. 프론트 JSON API로 쓰려면 JsonResponse 분기 추가 필요",
    request: {
      body: {
        email: "user@example.com",
        password: "Password123!",
      },
    },
    response: {
      success: true,
      message: "로그인 성공",
      data: {
        memberId: 1,
        name: "홍길동",
      },
    },
  },

  // 로그아웃
  {
    name: "로그아웃",
    status: "partial",
    method: "GET",
    path: "/account/logout/",
    actualBehavior: "Django 세션 로그아웃 후 login으로 redirect",
    note: "JSON API로 쓰려면 POST + JsonResponse 방식 추가 권장",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "로그아웃 되었습니다.",
      data: null,
    },
  },

  // 토큰 재발급
  {
    name: "토큰 재발급",
    status: "planned",
    method: "POST",
    path: "/api/v1/auth/reissue",
    note: "현재 프로젝트는 JWT가 아니라 Django 세션 기반이므로 미구현",
    request: {
      headers: {
        Cookie: "refreshToken=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "토큰이 재발급되었습니다.",
      data: null,
    },
  },

  // 이메일 중복 확인
  {
    name: "이메일 중복 확인",
    status: "planned",
    method: "GET",
    path: "/api/v1/members/email-check",
    note: "회원가입 저장 로직과 함께 구현 필요",
    request: {
      query: {
        email: "user@example.com",
      },
      body: null,
    },
    response: {
      success: true,
      message: "사용 가능한 이메일입니다.",
      data: {
        available: true,
      },
    },
  },

  // 회원가입 인증번호 발송
  {
    name: "회원가입 인증번호 발송",
    status: "planned",
    method: "POST",
    path: "/api/v1/auth/email/send",
    note: "이메일 발송 서비스 필요",
    request: {
      body: {
        email: "user@example.com",
      },
    },
    response: {
      success: true,
      message: "인증번호가 발송되었습니다.",
      data: {
        expiresIn: 600,
        resendRemaining: 4,
      },
    },
  },

  // 회원가입 인증번호 확인
  {
    name: "회원가입 인증번호 확인",
    status: "planned",
    method: "POST",
    path: "/api/v1/auth/email/verify",
    request: {
      body: {
        email: "user@example.com",
        code: "123456",
      },
    },
    response: {
      success: true,
      message: "이메일 인증이 완료되었습니다.",
      data: {
        verified: true,
      },
    },
  },

  // 회원가입 완료
  {
    name: "회원가입 완료",
    status: "partial",
    method: "POST",
    path: "/account/signup/",
    actualBehavior: "현재 signup.html 렌더링만 존재. 저장 로직 미구현",
    request: {
      body: {
        email: "user@example.com",
        password: "Password123!",
        name: "홍길동",
        companyName: "이룸건설",
        position: "현장소장",
        agreedTerms: true,
        privacyAgreed: true,
      },
    },
    response: {
      success: true,
      message: "회원가입이 완료되었습니다.",
      data: {
        memberId: 1,
      },
    },
  },

  // 비밀번호 찾기 인증번호 발송
  {
    name: "비밀번호 찾기 인증번호 발송",
    status: "planned",
    method: "POST",
    path: "/api/v1/auth/password/email/send",
    request: {
      body: {
        email: "user@example.com",
      },
    },
    response: {
      success: true,
      message: "비밀번호 재설정 인증번호가 발송되었습니다.",
      data: {
        expiresIn: 600,
      },
    },
  },

  // 비밀번호 찾기 인증번호 확인
  {
    name: "비밀번호 찾기 인증번호 확인",
    status: "planned",
    method: "POST",
    path: "/api/v1/auth/password/email/verify",
    request: {
      body: {
        email: "user@example.com",
        code: "123456",
      },
    },
    response: {
      success: true,
      message: "인증번호가 확인되었습니다.",
      data: {
        resetToken: "temporary-reset-token",
      },
    },
  },

  // 비밀번호 재설정
  {
    name: "비밀번호 재설정",
    status: "planned",
    method: "POST",
    path: "/api/v1/auth/password/reset",
    request: {
      headers: {
        Authorization: "Bearer temporary-reset-token",
      },
      body: {
        newPassword: "NewPassword123!",
        newPasswordConfirm: "NewPassword123!",
      },
    },
    response: {
      success: true,
      message: "비밀번호가 변경되었습니다.",
      data: null,
    },
  },

  // 내 정보 조회
  {
    name: "내 정보 조회",
    status: "partial",
    method: "GET",
    path: "/account/mypage/",
    actualBehavior: "Django HTML 마이페이지 렌더링",
    note: "JSON 조회 API는 별도 구현 필요",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "내 정보 조회 성공",
      data: {
        email: "user@example.com",
        name: "홍길동",
        companyName: "이룸건설",
        position: "현장소장",
      },
    },
  },

  // 회원 정보 수정
  {
    name: "회원 정보 수정",
    status: "partial",
    method: "POST",
    path: "/account/mypage/",
    actualBehavior: "action=update_info form POST 처리",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: {
        action: "update_info",
        name: "홍길동",
        companyName: "이룸건설",
        position: "안전관리자",
      },
    },
    response: {
      success: true,
      message: "회원 정보가 수정되었습니다.",
      data: {
        name: "홍길동",
        companyName: "이룸건설",
        position: "안전관리자",
      },
    },
  },

  // 비밀번호 변경
  {
    name: "비밀번호 변경",
    status: "partial",
    method: "POST",
    path: "/account/mypage/",
    actualBehavior: "action=change_password form POST 처리",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: {
        action: "change_password",
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
        newPasswordConfirm: "NewPassword123!",
      },
    },
    response: {
      success: true,
      message: "비밀번호가 변경되었습니다.",
      data: null,
    },
  },

  // 회원 탈퇴
  {
    name: "회원 탈퇴",
    status: "partial",
    method: "POST",
    path: "/account/mypage/",
    actualBehavior: "action=withdraw form POST 처리",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: {
        action: "withdraw",
        confirmText: "회원탈퇴",
      },
    },
    response: {
      success: true,
      message: "회원 탈퇴가 완료되었습니다.",
      data: null,
    },
  },

  // 최근 작업 정보 조회
  {
    name: "최근 작업 정보 조회",
    status: "planned",
    method: "GET",
    path: "/api/v1/work/recent",
    note: "작업 정보 모델 필요",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "최근 작업 정보 조회 성공",
      data: {
        workName: "콘크리트 작업",
        region: "서울특별시",
        district: "금천구",
        detailPlace: "101동 앞",
      },
    },
  },

  // TBM 초안 생성 요청
  {
    name: "TBM 초안 생성 요청",
    status: "implemented",
    method: "POST",
    path: {
      djangoHtml: "/tbm/create/",
      aiServer: "/tbm/draft",
    },
    contentType: "multipart/form-data",
    actualBehavior: [
      "Django /tbm/create/가 HTML form 요청 수신",
      "core.ai_client.create_tbm_draft가 AI_SERVER_BASE_URL/tbm/draft 호출",
      "FastAPI가 STT, 날씨 조회, OpenAI TBM 초안 생성 수행",
      "Django가 templates/tbm/tbm_form.html에 결과 렌더링",
      "core_aiusagelog에 요청/응답 로그 저장",
    ],
    request: {
      headers: {
        Cookie: "sessionid=...",
        "Content-Type": "multipart/form-data",
      },
      body: {
        audio_file: "tbm-recording.wav",
        lat: 37.5665,
        lon: 126.978,
        sido: "서울특별시",
        sigungu: "금천구",
      },
      deprecatedFieldsFromOldSpec: {
        workName: "현재 요청에는 직접 사용하지 않음",
        region: "현재는 sido로 전달",
        district: "현재는 sigungu로 전달",
        detailPlace: "현재 미사용",
        audioFile: "현재 필드명은 audio_file",
      },
    },
    response: {
      success: true,
      message: "TBM 초안이 생성되었습니다.",
      data: {
        draftId: null,
        draft: "OpenAI가 생성한 TBM 초안 문자열",
        transcript: "STT 변환 결과",
        meetingText: "현재는 STT 변환 결과와 동일",
        weatherText: "현재 날씨: 기온 23도, 체감온도 23도, 습도 65%, 날씨 구름, 풍속 2.5m/s",
        audioPath: "ai_server/media/audio/저장파일.webm",
        transcriptPath: "ai_server/media/transcripts/저장파일.txt",
      },
      rawAiServerResponse: {
        success: true,
        data: {
          stt_text: "STT 변환 결과",
          meeting_text: "현재는 STT 변환 결과와 동일",
          weather_text: "날씨 텍스트 또는 null",
          draft: "TBM 초안 문자열",
          audio_path: "저장된 음성 파일 경로",
          transcript_path: "저장된 STT 파일 경로",
        },
      },
    },
  },

  // TBM 초안 상세 조회
  {
    name: "TBM 초안 상세 조회",
    status: "planned",
    method: "GET",
    path: "/api/v1/tbm/drafts/{draftId}",
    note: "현재 초안 저장 모델이 없으므로 draftId 기반 조회 불가",
    request: {
      path: {
        draftId: 1,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "TBM 초안 조회 성공",
      data: {
        draftId: 1,
        draft: "TBM 초안 문자열",
        transcript: "STT 변환 결과",
        weatherText: "날씨 텍스트",
      },
    },
  },

  // TBM 최종 저장
  {
    name: "TBM 최종 저장",
    status: "planned",
    method: "POST",
    path: "/api/v1/tbm",
    note: "TBM 저장용 모델/폼/API 필요",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: {
        draftId: 1,
        companyName: "이룸건설",
        workSummary: "콘크리트 타설 작업 예정",
        healthStatus: "작업자 건강 이상 없음",
        riskFactor: "추락 및 미끄러짐 위험",
        safetyMeasure: "안전모 착용 및 작업 전 주변 정리",
      },
    },
    response: {
      success: true,
      message: "TBM 기록이 저장되었습니다.",
      data: {
        tbmId: 1,
      },
    },
  },

  // 녹음 안내말 조회
  {
    name: "녹음 안내말 조회",
    status: "planned",
    method: "GET",
    path: "/api/v1/tbm/recording-help",
    note: "정적 안내 문구 API. 필요 시 Django view 또는 JSON 파일로 구현 가능",
    request: {
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "녹음 안내말 조회 성공",
      data: {
        helpItems: [
          "작업 내용 및 공종",
          "작업자 건강 상태",
          "현장 위험 요인",
          "안전 대책 및 주의사항",
        ],
      },
    },
  },

  // 작업장소 날씨 조회
  {
    name: "작업장소 날씨 조회",
    status: "partial",
    method: "GET",
    path: "/api/v1/weather",
    actualBehavior: "현재는 단독 API가 아니라 FastAPI /tbm/draft 내부에서 weather_service 사용",
    request: {
      query: {
        lat: 37.5665,
        lon: 126.978,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "날씨 정보 조회 성공",
      data: {
        condition: "구름 조금",
        temperature: 23,
        humidity: 65,
        windSpeed: 2.5,
      },
    },
  },

  // 챗봇 질문
  {
    name: "챗봇 질문",
    status: "restore_needed",
    method: "POST",
    path: "/chatbot/ask",
    note: "현재 ai_server에서는 챗봇/RAG/jargon을 제거한 상태. 복구하려면 chatbot_service.py, rag_service.py, jargon_service.py 필요",
    request: {
      path: {
        tbmId: 1,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: {
        message: "오늘 작업에서 추락 위험이 있는 인원은 있어?",
        thread_id: "optional-thread-id",
        reset: false,
      },
    },
    response: {
      success: true,
      message: "챗봇 응답 성공",
      data: {
        answer: "RAG 검색 기반 안전 규정 답변",
        thread_id: "thread-id",
        sources: [
          {
            title: "KOSHA 안전보건 가이드",
            content: "추락 위험 작업 시 안전모 및 안전대 착용 필요",
          },
        ],
      },
    },
  },

  // 챗봇 이력 삭제
  {
    name: "챗봇 이력 삭제",
    status: "planned",
    method: "DELETE",
    path: "/api/v1/chat/sessions/{chatSessionId}",
    note: "현재 채팅 세션 DB 모델 없음",
    request: {
      path: {
        chatSessionId: 1,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "챗봇 대화 이력이 삭제되었습니다.",
      data: null,
    },
  },

  // 월별 TBM 캘린더 조회
  {
    name: "월별 TBM 캘린더 조회",
    status: "planned",
    method: "GET",
    path: "/api/v1/tbm/calendar",
    note: "TBM 저장 모델 구현 후 가능",
    request: {
      query: {
        year: 2026,
        month: 4,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "월별 TBM 캘린더 조회 성공",
      data: {
        datesWithRecords: [
          "2026-04-04",
          "2026-04-06",
          "2026-04-09",
          "2026-04-11",
        ],
      },
    },
  },

  // TBM 목록 조회
  {
    name: "TBM 목록 조회",
    status: "planned",
    method: "GET",
    path: "/api/v1/tbm",
    note: "TBM 저장 모델 구현 후 가능",
    request: {
      query: {
        date: "2026-04-30",
        page: 0,
        size: 10,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "TBM 목록 조회 성공",
      data: {
        items: [
          {
            tbmId: 1,
            workName: "콘크리트 작업",
            region: "서울특별시",
            district: "금천구",
            workDate: "2026-04-30",
            workTime: "07:04",
            editable: true,
          },
        ],
        page: {
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
          first: true,
          last: true,
        },
      },
    },
  },

  // TBM 상세 조회
  {
    name: "TBM 상세 조회",
    status: "planned",
    method: "GET",
    path: "/api/v1/tbm/{tbmId}",
    note: "TBM 저장 모델 구현 후 가능",
    request: {
      path: {
        tbmId: 1,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "TBM 상세 조회 성공",
      data: {
        tbmDetail: {
          tbmId: 1,
          companyName: "이룸건설",
          workName: "콘크리트 작업",
          workDate: "2026-04-30",
          workTime: "07:04",
          region: "서울특별시",
          district: "금천구",
          workSummary: "콘크리트 타설 작업",
          healthStatus: "작업자 건강 이상 없음",
          riskFactor: "추락 및 미끄러짐 위험",
          safetyMeasure: "안전모 착용 및 작업 전 주변 정리",
          editable: true,
        },
        transcript: "오늘 작업은 콘크리트 타설 작업입니다.",
        weather: {
          condition: "구름 조금",
          temperature: 23,
          humidity: 65,
          windSpeed: 2.5,
        },
      },
    },
  },

  // TBM 수정
  {
    name: "TBM 수정",
    status: "planned",
    method: "PATCH",
    path: "/api/v1/tbm/{tbmId}",
    note: "TBM 저장 모델 구현 후 가능",
    request: {
      path: {
        tbmId: 1,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: {
        companyName: "이룸건설",
        workSummary: "콘크리트 타설 및 주변 정리 작업",
        healthStatus: "작업자 건강 이상 없음",
        riskFactor: "미끄러짐 및 낙하물 위험",
        safetyMeasure: "안전모 착용, 작업 전 주변 정리, 신호수 배치",
      },
    },
    response: {
      success: true,
      message: "TBM 기록이 수정되었습니다.",
      data: {
        tbmId: 1,
        updatedAt: "2026-04-30T09:30:00",
      },
    },
  },

  // TBM 삭제
  {
    name: "TBM 삭제",
    status: "planned",
    method: "DELETE",
    path: "/api/v1/tbm/{tbmId}",
    note: "TBM 저장 모델 구현 후 가능",
    request: {
      path: {
        tbmId: 1,
      },
      headers: {
        Cookie: "sessionid=...",
      },
      body: null,
    },
    response: {
      success: true,
      message: "TBM 기록이 삭제되었습니다.",
      data: null,
    },
  },

  // API 404 공통 에러 응답
  {
    name: "API 404 공통 에러 응답",
    status: "planned",
    method: "ANY",
    path: "/api/v1/not-found-url",
    request: {
      path: "/api/v1/not-found-url",
      body: null,
    },
    response: {
      success: false,
      errorCode: "NOT_FOUND",
      message: "요청하신 API를 찾을 수 없습니다.",
    },
  },
];

if (typeof module !== "undefined") {
  module.exports = API_SPEC;
}
