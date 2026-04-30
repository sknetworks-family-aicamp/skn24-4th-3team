from django.db import models

from django.db import models


class AIUsageLog(models.Model):
    endpoint = models.CharField(max_length=200, help_text="호출한 AI 엔드포인트")
    request_payload = models.JSONField(default=dict, help_text="요청 데이터")
    response_payload = models.JSONField(default=dict, help_text="응답 데이터")
    status_code = models.IntegerField(null=True, blank=True, help_text="HTTP 상태 코드")
    elapsed_ms = models.IntegerField(null=True, blank=True, help_text="응답 시간(ms)")
    success = models.BooleanField(default=False, help_text="성공 여부")
    error_message = models.TextField(blank=True, default="", help_text="에러 메시지")
    created_at = models.DateTimeField(auto_now_add=True, help_text="로그 생성 일시")

    class Meta:
        db_table = 'ai_usage_log'
        ordering = ['-created_at']