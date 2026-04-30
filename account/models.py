from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class User(AbstractUser):
    # 1. user_id를 PK로 사용 (자동 증가하는 BIGINT)
    user_id = models.BigAutoField(primary_key=True, help_text="유저 고유 식별자")
    
    # 2. email 필드를 필수 및 유니크하게 설정 (로그인용)
    email = models.EmailField(max_length=100, unique=True, help_text="로그인 아이디로 사용하는 이메일")
    username = None

    # 3. 커스텀 필드
    name = models.CharField(max_length=60, help_text="사용자 이름")
    company_name = models.CharField(max_length=150, null=True, blank=True, help_text="사용자가 소속된 업체명")
    position = models.CharField(max_length=150, null=True, blank=True, help_text="사용자의 직책")

    # --- 핵심 설정 ---
    USERNAME_FIELD = 'email'      # 로그인을 이메일로 하겠다고 선언
    REQUIRED_FIELDS = ['name']  # 이메일 외에 필수 입력받을 필드(관리자 계정 생성 시 필요)
    # ----------------

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email
    


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
    precipitation_probability = models.IntegerField(null=True, blank=True, help_text="강수확률(%)")
    wind_speed = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text="풍속(m/s)")
    created_at = models.DateTimeField(auto_now_add=True, help_text="저장 일시")

    class Meta:
        db_table = 'weather_info'