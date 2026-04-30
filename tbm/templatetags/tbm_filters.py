from django import template

register = template.Library()

WEEKDAY_KO = ['월', '화', '수', '목', '금', '토', '일']

@register.filter
def korean_date(value):
    """
    date 객체 → 'YYYY년 M월 D일 (요일)' 변환
    예: 2026년 11월 11일 (수)
    """
    if not value:
        return ''
    weekday = WEEKDAY_KO[value.weekday()]
    return f"{value.year}년 {value.month}월 {value.day}일 ({weekday})"