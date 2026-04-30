# Create your models here.
from django.db import models
from django.conf import settings

# Create your models here.

class Draft(models.Model):
    draft_id = models.BigAutoField(primary_key=True, help_text="초안 고유 식별자")
    # 외부키 설정 (User 테이블 참조)
    # User 모델의 PK인 user_id를 자동으로 외래키로 참조합니다.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        db_column='user_id', # DB 컬럼명은 여전히 user_id
        related_name='drafts',
        help_text="초안을 작성한 유저 ID"
    )

    work_date = models.DateField(help_text="작업이 수행된 날짜")
    task_name = models.CharField(max_length=100, null=True, blank=True, help_text="수행 작업명")
    region_large = models.CharField(max_length=60, null=True, blank=True, help_text="작업 지역의 대분류")
    region_middle = models.CharField(max_length=60, null=True, blank=True, help_text="작업 지역의 중분류")
    region_detail = models.CharField(max_length=100, null=True, blank=True, help_text="작업 위치 상세 정보")
    recording_text = models.TextField(null=True, blank=True, help_text="음성 인식 원문")
    recording_duration_sec = models.IntegerField(null=True, blank=True, help_text="녹음 시간(초)")
    draft_text = models.TextField(null=True, blank=True, help_text="생성된 작업 초안")
    safety_guide_text = models.TextField(null=True, blank=True, help_text="안전 가이드")
    created_at = models.DateTimeField(auto_now_add=True, help_text="초안 생성 일시")
    updated_at = models.DateTimeField(auto_now=True, help_text="초안 마지막 수정 일시")

    class Meta:
        db_table = 'drafts'




class WeatherInfo(models.Model):
    weather_id = models.BigAutoField(primary_key=True, help_text="날씨 정보 고유 식별자")
    # 1:1 관계 및 유니크 제약 조건
    draft = models.OneToOneField(Draft, on_delete=models.CASCADE, db_column='draft_id', help_text="연결된 초안 ID")
    weather_status = models.CharField(max_length=60, null=True, blank=True, help_text="날씨 상태")
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="섭씨 기온")
    humidity = models.IntegerField(null=True, blank=True, help_text="습도(%)")
    precipitation = models.DecimalField(max_digits=2, decimal_places=0, null=True, blank=True, help_text="강수량(mm)")
    wind_speed = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="풍속(m/s)")
    created_at = models.DateTimeField(auto_now_add=True, help_text="저장 일시")

    class Meta:
        db_table = 'weather_info'