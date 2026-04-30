from django.db import models


class AIUsageLog(models.Model):
    endpoint = models.CharField(max_length=100)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    status_code = models.PositiveIntegerField(null=True, blank=True)
    elapsed_ms = models.PositiveIntegerField(null=True, blank=True)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.endpoint} ({self.status_code})"
