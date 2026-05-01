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
    

