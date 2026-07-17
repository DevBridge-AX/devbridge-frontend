# 🌉 DevBridge AX (Frontend)

<p align="center">
  <strong>문서 · Git 커밋 · 업무 · 회의 · 채팅을 하나의 워크스페이스 흐름으로 연결하는 사용자 인터페이스</strong><br />
  DevBridge AX의 Dashboard, Tasks, Documents, AI Chat, Workspace Navigation을 담당하는 Vue.js 기반 Frontend Web Application입니다.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue.js_3-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Pinia-F7D336?style=for-the-badge&logo=vue.js&logoColor=black" />
  <img src="https://img.shields.io/badge/Vue_Router-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" />
</p>

---

<a id="quick-links"></a>
## 🔗 Quick Links

- 🖥️ [Frontend Repository](https://github.com/DevBridge-AX/devbridge-frontend)
- ⚙️ [Backend Repository](https://github.com/DevBridge-AX/devbridge-backend)
- 🤖 [AI Engine Repository](https://github.com/DevBridge-AX/devbridge-ai-engine)
- 🎨 Figma / 화면 설계: 링크 연결 예정
- 📝 Notion / API 명세서: 링크 연결 예정
- 📘 [Frontend 상세 기술 문서](https://app.notion.com/p/26-352ae979d3a78056a468ee52dfe1d05d?p=3a0ae979d3a7806685b8d9ae04f46e35&pm=s)

---

<a id="table-of-contents"></a>
## 📚 Table of Contents

- [Wireframe & Screenshots](#wireframe--screenshots)
- [Frontend Features](#frontend-features)
- [User Flow](#user-flow)
- [Role-based UI](#role-based-ui)
- [Frontend Architecture](#frontend-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Routes](#routes)

---

<a id="wireframe--screenshots"></a>
## 🖼️ Wireframe & Screenshots

### Wireframe Overview

<p align="center">
  <img src="docs/images/wireframe-overview.png" alt="Wireframe Overview" width="900" />
</p>

### Login / Signup

<p align="center">
  <img src="docs/images/login.png" alt="Login Screenshot" width="800" />
</p>

### Workspace / Permission UI

<p align="center">
  <img src="docs/images/workspace.png" alt="Workspace Screenshot" width="800" />
</p>

### Dashboard

<p align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard Screenshot" width="800" />
</p>

### Tasks

<p align="center">
  <img src="docs/images/tasks.png" alt="Tasks Screenshot" width="800" />
</p>

### Documents

<p align="center">
  <img src="docs/images/documents.png" alt="Documents Screenshot" width="800" />
</p>

### AI Chat

<p align="center">
  <img src="docs/images/chat.png" alt="AI Chat Screenshot" width="800" />
</p>

---

<a id="frontend-features"></a>
## 🧩 Frontend Features

Frontend는 사용자가 워크스페이스 단위로 프로젝트 데이터를 조회하고, 필요한 액션을 바로 수행할 수 있도록 화면 흐름을 구성합니다.

| Feature | Frontend Responsibility |
| :--- | :--- |
| **Auth** | 로그인, 회원가입, 인증 상태 관리, 인증 필요 페이지 접근 제어 |
| **Workspace** | 워크스페이스 목록 조회, 워크스페이스 선택, 생성 버튼, 초대 수락/거절 UI |
| **Permission UI** | 사용자 권한과 초대 상태에 따라 버튼, 메뉴, 관리 액션 노출 제어 |
| **Dashboard** | 업무 통계, 최근 업무, 최근 문서, 최근 Git commit, 지연 업무, AI Summary 표시 |
| **Tasks** | 업무 목록 조회, 업무 생성/수정/삭제, 상태 변경, 담당자/마감일 표시 |
| **Documents** | 문서 업로드, 문서 목록/상세 조회, 미리보기, 다운로드, AI 분석 상태 표시 |
| **Data Sources / Git** | Git 저장소 등록, 연동 상태 확인, commit 데이터 화면 표시 |
| **AI Chat** | 채팅 세션, 메시지 목록, Markdown 답변 렌더링, 문서/Git 기반 질의응답 화면 제공 |
| **Owner Question** | AI 답변이 부족한 경우 담당자 확인 요청 흐름 제공 |
| **Schedule / Notification** | 회의 일정, 초대, 업무, 담당자 확인 요청 등 주요 이벤트 표시 |
| **Settings** | 사용자 프로필 및 워크스페이스 설정 화면 제공 |

---

<a id="user-flow"></a>
## 🚀 User Flow

```text
로그인 / 회원가입
  ↓
워크스페이스 목록 확인
  ↓
권한에 따라 Workspace 생성 또는 초대 수락
  ↓
선택한 Workspace 진입
  ↓
Dashboard에서 프로젝트 현황 확인
  ↓
Tasks / Documents / Data Sources에서 업무·문서·Git 데이터 관리
  ↓
AI Chat에서 프로젝트 문맥 기반 질문
  ↓
Owner Question / Notification / Schedule로 후속 협업
```

| Step | User Action | UI Response |
| :--- | :--- | :--- |
| Auth | 로그인 또는 회원가입 | 인증 성공 후 워크스페이스 화면으로 이동 |
| Workspace | 워크스페이스 카드 클릭 | 선택한 `workspaceId` 기준 Dashboard 진입 |
| Invitation | 초대 수락 / 거절 클릭 | 참여 가능 워크스페이스 목록 또는 초대 상태 갱신 |
| Dashboard | 프로젝트 현황 확인 | 업무·문서·Git 요약 카드와 리스트 표시 |
| Tasks | 업무 생성 / 상태 변경 | 업무 목록과 상태 badge 갱신 |
| Documents | 문서 업로드 / 미리보기 / 다운로드 | 문서 목록과 분석 상태 badge 갱신 |
| AI Chat | 질문 입력 | Markdown 기반 AI 답변 표시 |
| Follow-up | 담당자 확인 요청 / 일정 확인 | 알림, 일정, 담당자 확인 흐름으로 연결 |

---

<a id="role-based-ui"></a>
## 🔐 Role-based UI

사용자의 권한, 워크스페이스 참여 상태, 초대 상태에 따라 화면에 표시되는 버튼과 메뉴를 다르게 구성합니다.

| User State / Role | Visible UI |
| :--- | :--- |
| 신규 사용자 | 워크스페이스 생성 또는 초대 수락 안내 |
| 워크스페이스 생성 가능 사용자 | `Workspace 생성` 버튼 |
| 초대받은 사용자 | `초대 수락` / `거절` 버튼 |
| 워크스페이스 멤버 | Dashboard, Tasks, Documents, AI Chat 등 주요 메뉴 |
| 관리자 / Owner | 멤버 관리, 설정 변경, 데이터소스 등록 등 관리 액션 |
| 일반 멤버 | 업무 조회, 상태 변경, 문서 확인 등 참여 중심 액션 |

```text
현재 사용자 정보 조회
  ↓
워크스페이스 참여 상태 / 권한 확인
  ↓
역할에 따라 버튼·메뉴·관리 액션 노출 여부 결정
  ↓
사용자 액션 실행
  ↓
Backend 권한 검증 후 결과 반영
```

---

<a id="frontend-architecture"></a>
## 🏗️ Frontend Architecture

```text
[User Action]
      ↓
[View / Component]
      ↓
[Service]
      ↓
[API Module]
      ↓
[Axios Client]
      ↓
[Backend API]
      ↓
[State / UI Update]
```

### Auth & Workspace Flow

```text
Login
  ↓
accessToken 저장
  ↓
Router Guard로 인증 필요 페이지 접근 확인
  ↓
워크스페이스 목록 / 초대 상태 조회
  ↓
/workspaces/:workspaceId/... 진입
  ↓
workspaceStore에 workspaceId 저장
  ↓
Axios Interceptor가 Authorization / X-Workspace-Id 헤더 자동 주입
```

### API Layer

| Layer | Role |
| :--- | :--- |
| `views/` | 라우트 단위 화면 구성 |
| `components/` | 공통 UI와 도메인 UI 컴포넌트 |
| `services/` | 화면에서 필요한 데이터 가공 및 API 호출 흐름 관리 |
| `api/` | Axios 기반 Backend API 요청 함수 관리 |
| `state/` | Pinia 기반 인증, 워크스페이스, 채팅 등 전역 상태 관리 |

---

<a id="tech-stack"></a>
## 🛠️ Tech Stack

| Category | Stack | Purpose |
| :--- | :--- | :--- |
| **Framework** | `Vue.js 3` | Composition API 기반 반응형 UI 구현 |
| **Language** | `TypeScript` | API 응답 타입, 도메인 모델, 컴포넌트 props 안정성 확보 |
| **Build Tool** | `Vite` | 빠른 로컬 개발 서버 및 빌드 환경 구성 |
| **State Management** | `Pinia` | 인증 상태, 워크스페이스 상태, 채팅 상태 등 전역 상태 관리 |
| **Routing** | `Vue Router` | 로그인/워크스페이스/기능별 페이지 라우팅 및 접근 제어 |
| **HTTP Client** | `Axios` | Backend REST API 통신, JWT 및 workspaceId 헤더 처리 |
| **Markdown Rendering** | `marked`, `DOMPurify` | AI Chat 답변 Markdown 렌더링 및 XSS 방어 |
| **Type Check** | `vue-tsc`, `TypeScript` | 빌드 전 타입 검증 |
| **Package Manager** | `npm` | 의존성 및 실행 스크립트 관리 |
| **Styling** | `CSS`, `Component-based UI` | 화면별 UI 구성 및 공통 컴포넌트 관리 |

---

<a id="project-structure"></a>
## 📂 Project Structure

```text
devbridge-frontend/
├── public/                         # 정적 리소스
├── src/
│   ├── api/                        # Axios 기반 API 통신 계층
│   │   ├── axiosClient.ts          # 공통 Axios 인스턴스, JWT / workspaceId 인터셉터
│   │   ├── authApi.ts
│   │   ├── dashboardApi.ts
│   │   ├── dataSourceApi.ts
│   │   ├── documentApi.ts
│   │   ├── gitApi.ts
│   │   ├── notificationApi.ts
│   │   ├── ownerConfirmationApi.ts
│   │   ├── scheduleApi.ts
│   │   ├── settingApi.ts
│   │   ├── taskApi.ts
│   │   └── workspaceApi.ts
│   │
│   ├── services/                   # 화면과 API 사이의 비즈니스 로직 계층
│   ├── state/                      # Pinia 전역 상태 관리
│   ├── router/                     # Vue Router 및 인증/워크스페이스 라우트 가드
│   ├── layouts/                    # 공통 레이아웃
│   ├── components/                 # 공통/도메인 UI 컴포넌트
│   ├── views/                      # 라우트 단위 페이지
│   │   ├── auth/
│   │   ├── chat/
│   │   ├── dataSource/
│   │   ├── document/
│   │   ├── schedule/
│   │   ├── settings/
│   │   ├── task/
│   │   └── workspace/
│   │
│   ├── assets/                     # 스타일, 이미지, 아이콘 등 리소스
│   ├── composables/                # 재사용 가능한 Composition 함수
│   ├── App.vue                     # 루트 컴포넌트
│   └── main.ts                     # Vue 앱 진입점
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

<a id="routes"></a>
## 🧭 Routes

주요 화면은 `workspaceId`를 기준으로 동작합니다.

| Path | Description |
| :--- | :--- |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/workspace` | 워크스페이스 목록 및 초대 상태 확인 |
| `/workspaces/:workspaceId/dashboard` | 워크스페이스 대시보드 |
| `/workspaces/:workspaceId/tasks` | 업무 관리 |
| `/workspaces/:workspaceId/documents` | 문서 관리 |
| `/workspaces/:workspaceId/chat` | AI Chat |
| `/workspaces/:workspaceId/datasources` | 데이터소스 관리 |
| `/workspaces/:workspaceId/schedule` | 일정 관리 |
| `/settings/profile` | 사용자 프로필 설정 |

---

## 🧭 Project Message

DevBridge AX Frontend는 프로젝트의 문서, 업무, Git 변경사항, AI Chat을 사용자가 하나의 워크스페이스 흐름 안에서 탐색하고 관리할 수 있도록 설계된 사용자 인터페이스입니다.

사용자 권한과 워크스페이스 맥락에 따라 필요한 버튼과 화면을 제공하고, 프로젝트 산출물이 실제 협업 흐름으로 이어지도록 돕는 화면 계층을 목표로 합니다.
