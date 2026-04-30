import json
import os
from pathlib import Path

import chromadb
import cohere
from dotenv import load_dotenv
from langchain_core.tools import tool
from rank_bm25 import BM25Okapi
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

try:
    from kiwipiepy import Kiwi
except ImportError:
    Kiwi = None


load_dotenv()


# ----------------------------
# 1) 기본 설정
# ----------------------------

COLLECTION_NAME = "kosha_child_chunks_BGE"
EMBEDDING_MODEL_NAME = "jhgan/ko-sroberta-multitask"

BM25_TOP_K = 50
DENSE_TOP_K = 50
RRF_TOP_N = 40
RERANK_TOP_N = 5


# ----------------------------
# 2) 경로 헬퍼 (lazy - Django 초기화 후 호출)
# ----------------------------

def get_data_dir() -> Path:
    from django.conf import settings
    return Path(settings.BASE_DIR) / "data"

def get_chroma_dir() -> Path:
    return get_data_dir() / "chroma"

def get_chunk_json_path() -> Path:
    return get_data_dir() / "chunks" / "kosha_chunks.json"


# ----------------------------
# 3) 전역 캐시
# ----------------------------

_embedding_function = None
_chroma_client = None
_collection = None

_parent_map = None
_child_map = None

_bm25 = None
_bm25_child_ids = None
_kiwi = None

_cohere_client = None


# ----------------------------
# 4) ChromaDB 연결
# ----------------------------

def get_embedding_function():
    global _embedding_function

    if _embedding_function is None:
        _embedding_function = SentenceTransformerEmbeddingFunction(
            model_name=EMBEDDING_MODEL_NAME
        )

    return _embedding_function


def get_collection():
    global _chroma_client, _collection

    if _collection is None:
        _chroma_client = chromadb.PersistentClient(
            path=str(get_chroma_dir())  # lazy 호출
        )

        _collection = _chroma_client.get_collection(
            name=COLLECTION_NAME,
            embedding_function=get_embedding_function(),
        )

    return _collection


# ----------------------------
# 5) chunk 데이터 로드
# ----------------------------

def load_chunks():
    global _parent_map, _child_map

    if _parent_map is not None and _child_map is not None:
        return _parent_map, _child_map

    chunk_json_path = get_chunk_json_path()  # lazy 호출

    if not chunk_json_path.exists():
        raise FileNotFoundError(
            f"chunk JSON 파일을 찾을 수 없습니다: {chunk_json_path}"
        )

    with open(chunk_json_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)

    parent_map = {}
    child_map = {}

    for chunk in chunks:
        chunk_id = chunk.get("chunk_id")
        chunk_type = chunk.get("chunk_type")

        if not chunk_id:
            continue

        if chunk_type == "parent":
            parent_map[chunk_id] = chunk

        elif chunk_type == "child":
            child_map[chunk_id] = chunk

    _parent_map = parent_map
    _child_map = child_map

    return _parent_map, _child_map


# ----------------------------
# 6) BM25 토큰화
# ----------------------------

def tokenize_korean(text: str) -> list[str]:
    if not text:
        return []

    if Kiwi is None:
        return text.split()

    global _kiwi

    if _kiwi is None:
        _kiwi = Kiwi()

    tokens = []

    for token in _kiwi.tokenize(text):
        if token.tag.startswith(("N", "V", "M", "SL", "SN")):
            tokens.append(token.form)

    return tokens


def get_bm25_index():
    global _bm25, _bm25_child_ids

    if _bm25 is not None and _bm25_child_ids is not None:
        return _bm25, _bm25_child_ids

    _, child_map = load_chunks()

    child_ids = []
    corpus_tokens = []

    for child_id, child in child_map.items():
        content = child.get("content", "")
        tokens = tokenize_korean(content)

        child_ids.append(child_id)
        corpus_tokens.append(tokens)

    _bm25 = BM25Okapi(corpus_tokens)
    _bm25_child_ids = child_ids

    return _bm25, _bm25_child_ids


# ----------------------------
# 7) BM25 검색
# ----------------------------

def bm25_search(query: str, top_k: int = BM25_TOP_K) -> list[dict]:
    bm25, child_ids = get_bm25_index()

    query_tokens = tokenize_korean(query)
    scores = bm25.get_scores(query_tokens)

    ranked = sorted(
        zip(child_ids, scores),
        key=lambda x: x[1],
        reverse=True,
    )

    return [
        {
            "chunk_id": child_id,
            "score": float(score),
        }
        for child_id, score in ranked[:top_k]
    ]


# ----------------------------
# 8) Dense 검색
# ----------------------------

def dense_search(query: str, top_k: int = DENSE_TOP_K) -> list[str]:
    collection = get_collection()

    result = collection.query(
        query_texts=[query],
        n_results=top_k,
    )

    return result["ids"][0]


# ----------------------------
# 9) RRF 결합
# ----------------------------

def rrf_rank(
    bm25_ids: list[str],
    dense_ids: list[str],
    k: int = 60,
) -> list[tuple[str, float]]:
    scores = {}

    for rank, doc_id in enumerate(bm25_ids):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)

    for rank, doc_id in enumerate(dense_ids):
        scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank + 1)

    return sorted(
        scores.items(),
        key=lambda x: x[1],
        reverse=True,
    )


# ----------------------------
# 10) Cohere Rerank (ClientV2로 수정)
# ----------------------------

def get_cohere_client():
    global _cohere_client

    if _cohere_client is None:
        api_key = os.getenv("COHERE_API_KEY")

        if not api_key:
            return None

        _cohere_client = cohere.ClientV2(api_key)  # v1 → v2로 수정

    return _cohere_client


def cohere_rerank(
    query: str,
    top_child_ids: list[str],
    child_map: dict,
    parent_map: dict,
) -> list[str]:
    client = get_cohere_client()

    documents = []
    valid_child_ids = []

    for child_id in top_child_ids:
        child = child_map.get(child_id)

        if not child:
            continue

        content = child.get("content", "")

        if not content:
            continue

        documents.append(content)
        valid_child_ids.append(child_id)

    if not documents:
        return []

    # Cohere API 키가 없으면 rerank 없이 상위 child의 parent만 사용
    if client is None:
        import logging
        logging.warning("[RAG] COHERE_API_KEY 없음 - rerank 생략, 상위 %d개로 대체", RERANK_TOP_N)
        return get_parent_ids_from_child_ids(valid_child_ids[:RERANK_TOP_N], child_map)

    rerank_result = client.rerank(
        model="rerank-multilingual-v3.0",
        query=query,
        documents=documents,
        top_n=min(RERANK_TOP_N, len(documents)),
    )

    reranked_child_ids = [
        valid_child_ids[result.index]
        for result in rerank_result.results
    ]

    return get_parent_ids_from_child_ids(reranked_child_ids, child_map)


def get_parent_ids_from_child_ids(
    child_ids: list[str],
    child_map: dict,
) -> list[str]:
    parent_ids = []

    for child_id in child_ids:
        child = child_map.get(child_id, {})
        parent_id = child.get("parent_id")

        if parent_id and parent_id not in parent_ids:
            parent_ids.append(parent_id)

    return parent_ids


# ----------------------------
# 11) context 구성
# ----------------------------

def build_context_from_parent_ids(
    parent_ids: list[str],
    parent_map: dict,
) -> str:
    context_chunks = []

    for parent_id in parent_ids:
        parent = parent_map.get(parent_id, {})
        content = parent.get("content", "")

        if not content:
            continue

        source = parent.get("source", "")
        depth_1 = parent.get("depth_1", "")
        depth_2 = parent.get("depth_2", "")
        depth_3 = parent.get("depth_3", "")

        context_chunks.append(
            f"[출처: {source} / {depth_1} {depth_2} {depth_3}]\n{content}"
        )

    if not context_chunks:
        return "관련 내용을 찾을 수 없습니다."

    return "\n\n".join(context_chunks)


# ----------------------------
# 12) 실제 RAG 검색 함수
# ----------------------------

def search_safety_context(query: str) -> str:
    """
    정규화된 질문을 받아 KOSHA 안전규정 관련 context를 반환한다.
    Django 코드에서 직접 호출할 때 사용하는 함수.
    """

    parent_map, child_map = load_chunks()

    # 1. BM25 + Dense
    bm25_top = [
        result["chunk_id"]
        for result in bm25_search(query, top_k=BM25_TOP_K)
    ]

    dense_top = dense_search(query, top_k=DENSE_TOP_K)

    # 2. RRF
    rrf_list = rrf_rank(bm25_top, dense_top)
    top_child_ids = [
        doc_id
        for doc_id, score in rrf_list[:RRF_TOP_N]
    ]

    # 3. Rerank
    reranked_parent_ids = cohere_rerank(
        query=query,
        top_child_ids=top_child_ids,
        child_map=child_map,
        parent_map=parent_map,
    )

    # 4. context 구성
    return build_context_from_parent_ids(
        parent_ids=reranked_parent_ids,
        parent_map=parent_map,
    )


# ----------------------------
# 13) LangChain 챗봇용 tool
# ----------------------------

@tool
def search_safety_regulation(query: str) -> str:
    """
    건설현장 안전 규정을 검색합니다.
    안전 관련 질문이 들어오면 이 도구를 사용하세요.
    """

    return search_safety_context(query)
