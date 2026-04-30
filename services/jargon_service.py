import textwrap
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM


peft_model_id = "kyu5KIm/skn24-3rd-3team_finetuned_model"

_tokenizer = None
_model = None


def load_term_normalizer():
    global _tokenizer, _model

    if _tokenizer is None:
        _tokenizer = AutoTokenizer.from_pretrained(
            peft_model_id,
            trust_remote_code=True
        )

        if _tokenizer.pad_token is None:
            _tokenizer.pad_token = _tokenizer.eos_token

    if _model is None:
        _model = AutoModelForCausalLM.from_pretrained(
            peft_model_id,
            trust_remote_code=True,
            dtype=torch.float16,
            device_map="auto",
        )

        _model.eval()

    return _tokenizer, _model


def build_eeve_prompt(user_query: str) -> str:
    instruction = textwrap.dedent(f"""
    너는 건설 현장 은어, 일본식 외래어, 현장 오타를 표준 건설 용어로 바꾸는 정규화 모델이다.

    규칙:
    1. 입력 문장의 의미는 유지한다.
    2. STT 결과에 포함된 오타, 띄어쓰기, 문법 오류는 자연스럽게 수정한다.
    3. 건설 현장 은어와 비표준 표현은 표준 건설 용어로 바꾼다.
    4. 지역명, 수량, 작업자, 공종, 날씨, 작업 행위는 보존한다.
    5. 원문에 없는 작업 내용, 장비, 인원, 위험요소는 추가하지 않는다.
    6. 설명하지 말고 변환된 문장만 출력한다.
    7. 바꿀 은어가 없으면 문법과 띄어쓰기만 정리해서 출력한다.

    입력: {user_query}
    출력:
    """).strip()

    return (
        "A chat between a curious user and an artificial intelligence assistant. "
        "The assistant gives helpful, detailed, and polite answers to the user's questions.\n"
        f"Human: {instruction}\n"
        "Assistant:"
    )

@torch.inference_mode()
def normalize_query(query: str, max_new_tokens: int = 512) -> str:
    if not query or not query.strip():
        return ""

    tokenizer, model = load_term_normalizer()

    prompt = build_eeve_prompt(query)
    inputs = tokenizer(prompt, return_tensors="pt")

    input_device = model.get_input_embeddings().weight.device
    inputs = {k: v.to(input_device) for k, v in inputs.items()}

    output_ids = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.pad_token_id,
        use_cache=True,
    )

    gen_ids = output_ids[0][inputs["input_ids"].shape[1]:]

    normalized_text = tokenizer.decode(
        gen_ids,
        skip_special_tokens=True,
    ).strip()

    return normalized_text if normalized_text else query