# MUBU Infra Roadmap & 운영 가이드

## 1. 개요

MUBU는 현장 촬영 기반 가격 비교 앱으로, 간편성과 글로벌 확장을 동시에 목표로 합니다.
이 문서는 개발 초기부터 정식 글로벌 배포까지 단계별 인프라 전략을 정리한 가이드입니다.

## 2. 단계별 인프라 로드맵

| 단계 | 코드/배포 | DB | 특징 | 비용 |
|------|-----------|----|----|------|
| 개발 (지금) | Replit (서버+클라 올인원)<br>GitHub 수동 push | In-memory / JSON 저장 | 기능 빠른 구현, 팀 협업 준비 | Replit Pro $20/월 |
| MVP 출시 (소규모 유저) | Replit 배포 유지 | 필요 시 MongoDB Atlas Free / Supabase Free | 초기 유저 피드백 확보, 결제 기능 실험 | 무료 수준 |
| 정식 출시 (한국/해외 동시) | 클라: GitHub → Cloudflare Pages/Netlify (무료 CDN)<br>서버: Render/Fly.io (무료→$7~/월) | Supabase (Postgres) or MongoDB Atlas (글로벌 리전) | 글로벌 CDN + 확장 가능한 서버 + 관리형 DB | 저렴, 사용량 기반 |
| 스케일업 (수천~수만 유저) | 클라: CDN 그대로<br>서버: 오토스케일 (K8s, AWS ECS/Fargate 고려)<br>백엔드 API 모듈화 (인증, 결제, 분석) | Supabase Pro / MongoDB Atlas Cluster | 대규모 유저 트래픽 대응, 안정성 확보 | 월 수십~백만원 |

## 3. GitHub & Replit 워크플로우

**Replit = 개발/테스트 환경**
- Secrets 관리, 빠른 수정/실행

**GitHub = 코드 저장소/배포 기준**
- Replit에서 개발 → 수동 push → GitHub 업데이트
- Netlify/Cloudflare는 GitHub를 자동 감시 → 코드 변경 시 자동 배포(CI/CD)

## 4. 데이터베이스 전략

**MVP**: In-memory / JSON → 개발 속도 최우선

**정식 서비스**:
- **Supabase(Postgres)**: 인증 + DB + 파일 스토리지 일체 제공
- **MongoDB Atlas**: Node.js 친화적, 글로벌 클러스터 지원

**리전 배치**: 서울 + 싱가포르 동시 사용 → 한국인 + 동남아 관광객 모두 커버

## 5. 결제 시스템

**국내 사용자**: 아임포트 → 네이버페이, 카카오페이, 토스 지원

**해외 사용자**: Stripe Checkout → 카드, Apple Pay, Google Pay

**MVP 단계**: Replit 서버에서 `/api/pay/*` 엔드포인트로 통합 구현 완료

**정식 서비스**: Webhook → DB에 결제 상태 기록 → 유료 기능 개방

## 6. 출시 전략

### MVP (Replit)
- 앱 핵심 기능(사진 → 가격 비교) 검증
- 소규모 한국/일본/태국 사용자 대상 테스트

### 정식 출시 (CDN + 클라우드 DB)
- Cloudflare/Netlify CDN + Render/Fly.io 서버 + Supabase/MongoDB Atlas DB
- 한국/해외 동시 서비스 가능

### 스케일업 (Growth)
- 글로벌 트래픽 대응 (Auto Scaling)
- 데이터 분석/추천 시스템 확장 (예: Must Buy 지도 기능)

## 7. 핵심 원칙

- **간편성 유지**: 가입 최소화, 게스트 모드 → Soft wall 유도
- **확장성 전제**: MVP 이후 바로 글로벌 전환 가능하도록 설계
- **비용 효율**: MVP는 최소 비용, 정식 서비스는 사용량 기반 확장

---

💡 **이 문서는 Replit/GitHub 저장소에 INFRA-ROADMAP.md 또는 README.md 하위 섹션으로 포함 권장**