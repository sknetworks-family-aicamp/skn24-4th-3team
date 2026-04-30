from dotenv import load_dotenv
from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage, ToolMessage
from services.rag_service import search_safety_regulation 

load_dotenv()

# ----------------------------
# 1. LLM 설정 + tool 바인딩
# ----------------------------

llm = init_chat_model("openai:gpt-4.1-mini")
llm_with_tools = llm.bind_tools([search_safety_regulation])

# ----------------------------
# 2. TBM 초안 생성 프롬프트
# ----------------------------

SYSTEM_PROMPT = """
[상황]
당신은 20년차 건설현장 서류 작성 전문가입니다.
당신은 50억 미만 중소규모 공사현장의 현장소장이 TBM을 작성하기 위해 초안을 작성해 주어야 합니다.
반드시 회의 내용만 답변에 사용해야하고 [TBM 작성 규칙]에 의거해 번호와 함깨 순대로 답변하세요.
회의 내용에 안전 관련 내용이 나오면 search_safety_regulation 도구로 검색한 내용의 출처만 반영하세요.

[TBM 작성 규칙]
(1) 작업자의 건강 이상 여부 (발열, 호흡곤란, 구토 등)
    - 예시: 박수영 발열
    
(2) 예상 위험 요인 (고소 작업 -> 추락 위험 -> 안전대 착용, 작업 구역 안전망 설치 등)
    회의록을 바탕으로 예상 위험요인과 대책을 작성하세요. 총 3개 이상 작성이 권장됩니다.
    안전 대책을 작성할 때는 반드시 search_safety_regulation 도구로 검색한 내용을 기반으로 적으세요, 
    출처에 기반하되, 명시하지마세요
    - 예시: [위험요인] 고소작업 [안전 대책]안전대 착용 및 작업 구역 안전망 설치

(3) 중점 위험요인 
    예상 위험 요인과 대책 중에서 가장 위험하다고 판단되는 것을 1개 선정하여 중점 위험요인으로 작성하세요.
    중점 위험 요인의 선정 기준은 위험의 심각성, 발생 가능성, 현장 상황 등을 종합적으로 고려하여 판단하세요.
    중점 위험 요인 작성 사항은 최대한 상세하게 작성하세요. 
    - 예시: 크레인 작업이 예정되어 있으므로, 크레인 붐이 작업자에게 접근할 때 감전 위험이 있으니, 
    작업 구역 내 크레인 접근 금지 및 전기 안전 교육 실시 권고
    
(4) 사전 위험성 평가 복기(위험성 평가 사항)
    회의에서 논의된 사전 위험성 평가에 대해서 복기하는 형식으로 작성하세요.
    이는 회의에서 논의된 위험성 평가 사항을 다시 한 번 명확하게 정리하여 현장 작업자들이 이해하기 쉽도록 하기 위함입니다.
    - 예시 1: 상부 자재 인양 시 하부 통제구역 설정 및 작업자 진입 차단 상태 유지 
    - 예시 2: 밀폐공간 진입 전 산소 농도 측정값 공유 및 환기 설비 상시 가동 확인

(5) 작업 전 안전조치(안전조치 여부 재확인)
    - 예시: 고소작업 전 안전대 착용 여부 재확인
    
[도구 사용 규칙]
- 안전 규정 질문 -> search_safety_regulation 사용
- 검색 결과가 없으면 없는 범위까지만 답하고, 추정하지 마세요.

[응답 규칙]
안전 규정 질문에 출처가 없으면 표시하지마세요.
핵심적인 내용 위주로 간결하게 답변하세요.
항상 답변 마지막에 참조한 출처를 표시하세요.
없는 내용은 추론하지말고 답변에 반영하지 마세요.
"""


# ----------------------------
# 3. 사용자 프롬프트 생성
# ----------------------------

def build_tbm_draft_prompt(
    meeting_text: str,
    weather_text: str | None = None,
) -> str:
    weather_part = weather_text if weather_text else "제공된 날씨 정보 없음"

    return f"""
[회의 내용]
{meeting_text}

[날씨 정보]
{weather_part}

위 회의 내용과 날씨 정보를 바탕으로 TBM 초안을 작성하세요.
"""

# ----------------------------
# 4. TBM 초안 생성 함수
# ----------------------------

def generate_tbm_draft(
    meeting_text: str,
    weather_text: str | None = None,
) -> str:
    if not meeting_text or not meeting_text.strip():
        return "회의 내용이 없어 TBM 초안을 생성할 수 없습니다."

    try:
        prompt = build_tbm_draft_prompt(
            meeting_text=meeting_text,
            weather_text=weather_text,
        )

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(content=prompt),
        ]


        while True:
            response = llm_with_tools.invoke(messages)
            messages.append(response)

            if not response.tool_calls:
                break

            for tool_call in response.tool_calls:
                if tool_call["name"] == "search_safety_regulation":
                    rag_result = search_safety_regulation.invoke(
                        tool_call["args"]
                    )
                    messages.append(
                        ToolMessage(
                            content=rag_result,
                            tool_call_id=tool_call["id"],
                        )
                    )

        return response.content

    except Exception as e:
        return f"TBM 초안 생성 중 오류가 발생했습니다: {e}"