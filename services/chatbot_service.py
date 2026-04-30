import uuid

from langchain.chat_models import init_chat_model
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, START
from langgraph.prebuilt import tools_condition, ToolNode
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from typing import TypedDict, Annotated, List

from services.jargon_service import normalize_query
from services.rag_service import search_safety_regulation


# ----------------------------
# 1. LLM 설정
# ----------------------------

llm = init_chat_model("openai:gpt-4.1-mini")

tools = [
    search_safety_regulation,
]

llm_with_tools = llm.bind_tools(tools)


# ----------------------------
# 2. 챗봇 시스템 프롬프트
# ----------------------------

SYSTEM_PROMPT = """
[상황]
당신은 20년차 건설현장 안전 규정 전문가입니다.
당신은 50억 미만 중소규모 공사현장의 현장소장에게 안전에 관한 조언을 해주어야 합니다.

안전 관련 질문은 반드시 search_safety_regulation 도구로 검색한 내용을 기반으로 답변하세요.
사용자 질문은 normalize_query 함수를 통해 건설 현장 은어, 오타, 비표준 표현을 표준어로 정규화한 뒤 처리됩니다.

[날씨 정보 사용 규칙]
- 현재 날씨 정보가 제공된 경우에만 답변에 반영합니다.
- 직접 날씨를 검색하거나 임의로 날씨를 추정하지 않습니다.
- 날씨 정보는 작업 주의사항을 보완하는 참고 정보로만 사용합니다.
- 날씨만으로 작업 가능/불가능을 단정하지 말고, “주의 필요”, “현장 확인 필요” 수준으로 안내합니다.

[도구 사용 규칙]
- 안전 규정 질문 -> search_safety_regulation 사용
- 검색 결과가 없으면 없는 범위까지만 답하고, 추정하지 마세요.

[응답 규칙]
검색 결과에 없는 내용은 추론하지 말고 '해당 내용을 찾을 수 없습니다'라고 답하세요.
핵심적인 내용 위주로 간결하게 답변하세요.
가능하면 답변 마지막에 참조한 출처를 표시하세요.
"""


# ----------------------------
# 3. LangGraph State
# ----------------------------

class State(TypedDict):
    messages: Annotated[List, add_messages]


# ----------------------------
# 4. 챗봇 노드
# ----------------------------

def chatbot_node(state: State):
    response = llm_with_tools.invoke(state["messages"])
    return {"messages": [response]}


# ----------------------------
# 5. 그래프 생성
# ----------------------------

tool_node = ToolNode(tools)
checkpointer = MemorySaver()

builder = StateGraph(State)
builder.add_node("chatbot", chatbot_node)
builder.add_node("tools", tool_node)

builder.add_edge(START, "chatbot")
builder.add_conditional_edges("chatbot", tools_condition)
builder.add_edge("tools", "chatbot")

graph = builder.compile(checkpointer=checkpointer)


# ----------------------------
# 6. 외부 호출 함수
# ----------------------------

def answer_safety_question(user_input: str, thread_id: str | None = None) -> str:
    thread_id = thread_id or str(uuid.uuid4())
    """
    사용자 안전규정 질문을 받아
    은어 정규화 → RAG tool 검색 → LLM 답변을 반환한다.
    """

    try:
        normalized_input = normalize_query(user_input)

        thread_id = thread_id or str(uuid.uuid4())
        config = {
            "configurable": {
                "thread_id": thread_id
            }
        }

        result = graph.invoke(
            {
                "messages": [
                    SystemMessage(content=SYSTEM_PROMPT),
                    HumanMessage(content=normalized_input),
                ]
            },
            config=config,
        )

        return result["messages"][-1].content

    except Exception as e:
        return f"챗봇 답변 생성 중 오류가 발생했습니다: {e}"