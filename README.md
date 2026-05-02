# SKN24-4th-3Team


> AI를 활용한 건설 현장 TBM 자동화 및 안전 관리 플랫폼 개발 <br>
> **프로젝트 기간: 2026.04.30 ~ 2026.05.01 (2일)**



# 1. 팀 소개

## **Team: S-Link (에스링크)**
'안전(Safety)과 사람을 기술로 잇는다'는 의미의 팀명입니다.
현장의 목소리를 데이터로 연결하여, 관리자의 서류 부담을 덜고 안전의 본질에 집중하게 합니다.

## 팀원 소개
 
| 김규호 | 박수영 | 박세현 | 이동민 | 최하진 |
| :---: | :---: | :---: | :---: | :---: |
| <img width="228" height="291" alt="image" src="./assets/images/안전보이즈1.png" /> | <img width="228" height="291" alt="image" src="./assets/images/안전보이즈2.png" /> | <img width="228" height="291" alt="image" src="./assets/images/안전보이즈3.png" /> | <img width="228" height="291" alt="image" src="./assets/images/안전보이즈4.png" /> | <img width="228" height="291" alt="image" src="./assets/images/안전보이즈5.png" /> |
| [![GitHub](https://img.shields.io/badge/GitHub-kyu5KIm-181717?style=flat&logo=github&logoColor=white)](https://github.com/kyu5KIm) | [![GitHub](https://img.shields.io/badge/GitHub-suyoung6279-181717?style=flat&logo=github&logoColor=white)](https://github.com/suyoung6279) | [![GitHub](https://img.shields.io/badge/GitHub-parksay-181717?style=flat&logo=github&logoColor=white)](https://github.com/parksay) | [![GitHub](https://img.shields.io/badge/GitHub-LeeDongMin0115-181717?style=flat&logo=github&logoColor=white)](https://github.com/LeeDongMin0115) | [![GitHub](https://img.shields.io/badge/GitHub-hun6684-181717?style=flat&logo=github&logoColor=white)](https://github.com/hun6684) |
> AI로 생성된 이미지입니다.


## 2. 프로젝트 개요 📑

### **2.1 프로젝트 명**
**HelpMet (헬프멧)** : Help (도움) + Helmet (안전모), 헬멧이 머리를 지키듯, 우리는 현장의 안전을 지킨다는 의미를 담고 있습니다.

### **2.2 프로젝트 소개**
**"현장 중심의 안전 활동을 디지털로 전환하는 AI TBM 비서"**

*   **TBM(Tool Box Meeting)이란?**
    *   작업 직전, 현장 근처에서 관리감독자를 중심으로 작업자들이 모여 오늘의 작업 내용과 안전한 작업 방법에 대해 서로 확인하고 논의·공유하는 핵심 활동입니다.
*   **AI 기반 TBM 초안 작성 서비스**
    *   고용노동부가 어플리케이션, 동영상 등 다양한 방식의 TBM 기록을 인정함에 따라, IT 기술을 접목하여 현장의 기록 부담을 혁신적으로 줄여주는 솔루션입니다.
    > **출처:** [고용노동부 보도자료: 작업 전 안전점검회의(TBM) 활성화를 위한 안전교육 인정](https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=16488)

### **2.3 프로젝트 필요성 및 배경**
*   **법상 안전교육 인정**: 고용노동부는 2023년 12월부터 '작업 전 안전점검회의(TBM)'를 법정 안전보건 정기교육 시간으로 인정하고 있습니다. 이에 따라 내실 있는 TBM 진행과 객관적인 기록 관리가 필수적인 과제가 되었습니다.
*   **실질적인 안전 전달**: 위험성평가를 아무리 잘해도 현장 근로자에게 제대로 전달되지 않으면 무용지물입니다. HelpMet은 가장 현장성 높은 안전교육인 TBM의 활성화를 돕습니다.
*   **반복 업무의 효율화**: 매일 실행되는 반복적인 TBM 일지 작성 업무를 AI로 자동화하여 관리자의 업무 효율을 극대화합니다.
*   **전문성 확보**: KOSHA Guide(안전보건기술지침) 데이터를 기반으로 위험성 평가와 안전 지침을 한 번에 제공합니다.

### **2.4 프로젝트 목표**
*   음성 인식(STT) 기술을 통한 TBM 일지 자동 생성 및 기록 자산화.
*   KOSHA Guide 기반 안전 가이드를 통한 위험성 평가 정확도 향상.
*   직관적인 UI와 챗봇 서비스를 통한 관리자와 근로자 간의 안전 소통 활성화.

# 3. 기술 스택 & 사용 모델 (Tech Stack & Models)

<table>
  <thead>
    <tr>
      <th style="text-align:center;">분류</th>
      <th style="text-align:center;">기술 스택 & 모델</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><b>Framework</b></td>
      <td>
        <img src="https://img.shields.io/badge/Django-092E20?style=for-the-badge&logo=django&logoColor=white">
        <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white">
        <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white">
      </td>
    </tr>
    <tr>
      <td align="center"><b>LLM & Embedding</b></td>
      <td>
        <img src="https://img.shields.io/badge/GPT--4o--mini-74aa9c?style=for-the-badge&logo=openai&logoColor=white">
        <img src="https://img.shields.io/badge/text--embedding--3--small-412991?style=for-the-badge&logo=openai&logoColor=white">
      </td>
    </tr>
    <tr>
      <td align="center"><b>Database</b></td>
      <td>
        <img src="https://img.shields.io/badge/AWS_RDS_(MySQL)-527FFF?style=for-the-badge&logo=amazon-rds&logoColor=white">
        <img src="https://img.shields.io/badge/Pinecone_(VDB)-000000?style=for-the-badge&logo=pinecone&logoColor=white">
      </td>
    </tr>
    <tr>
      <td align="center"><b>Infrastructure</b></td>
      <td>
        <img src="https://img.shields.io/badge/RunPod-673AB7?style=for-the-badge&logo=runpod&logoColor=white">
        <img src="https://img.shields.io/badge/AWS_EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white">
        <img src="https://img.shields.io/badge/AWS_SES-DD344C?style=for-the-badge&logo=amazonsqs&logoColor=white">
      </td>
    </tr>
    <tr>
      <td align="center"><b>협업 & 형상 관리</b></td>
      <td>
        <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white">
        <img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white">
        <img src="https://img.shields.io/badge/Figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white">
      </td>
    </tr>
  </tbody>
</table>

## 4. 시스템 구성도
![시스템 구성도](이미지_경로_또는_URL)

## 5. 요구사항 정의서
![요구사항 정의서](이미지_경로_또는_URL)

## 6. 화면설계서
![화면설계서](이미지_경로_또는_URL)

## 7. WBS
![WBS](이미지_경로_또는_URL)

## 8. 테스트 계획 및 결과 보고서
![테스트 결과 보고서](이미지_경로_또는_URL)

## 9. 수행결과 (테스트/시연 페이지)
* **시연 영상 또는 배포 링크:** [링크 입력]

## 10. 한 줄 회고
| 이름 | 한 줄 회고 |
| :--- | :--- |
| **김규호** | |
| **박수영** | |
| **박세현** | AWS를 많이 써볼 수 있어서 좋았다. 평소에 이름을 많이 들어봤지만 실제로 써볼 기회가 많이 없었다. 이번 기회에 AWS를 최대한 써보려고 했다. EC2, S3, RDS, SES, 등을 연동해보았다. 그 과정에서 필요한 IAM, 리전, VPC 등 AWS 개념도 함께 익힐 수 있었다. |
| **이동민** | |
| **최하진** | |
