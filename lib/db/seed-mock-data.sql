-- Mock Data for Document Request System Testing
-- User: 홍길동 (hong@company.com) - 개발팀

-- Insert Mock Documents
INSERT INTO documents (id, file_name, file_path, parsed_text, parsed_metadata, access_level, allowed_departments, created_at)
VALUES
  (
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
    '2024_Q4_예산_보고서.pdf',
    '/shared/finance/2024_Q4_예산_보고서.pdf',
    '2024년 4분기 예산 보고서입니다. 전체 예산은 5억원이며, 주요 항목별 배분 내역은 다음과 같습니다. 인건비 2억원, 마케팅비 1.5억원, 운영비 1억원, 연구개발비 5천만원으로 구성되어 있습니다.',
    '{"pages": 5, "tables": [{"page": 2, "rows": 10, "cols": 4}]}',
    'department',
    ARRAY['재무팀', '경영지원팀'],
    '2024-11-01 09:00:00+00'
  ),
  (
    'b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e',
    '노드태스크_프로젝트_계획서.docx',
    '/shared/projects/노드태스크_프로젝트_계획서.docx',
    '노드태스크 프로젝트 개발 계획서. 목표: 업무 관리 시스템 구축. 담당자: 홍길동, 도현. 개발 기간: 2024년 10월 ~ 12월. 주요 기능: 작업 그래프 시각화, n8n 연동, 알림 시스템, 문서 요청 자동화.',
    '{"pages": 8, "tables": [{"page": 4, "rows": 5, "cols": 3}]}',
    'department',
    ARRAY['개발팀', '기획팀'],
    '2024-10-15 14:30:00+00'
  ),
  (
    'c3d4e5f6-a7b8-4c5d-0e1f-2a3b4c5d6e7f',
    '인사_규정_개정안.pdf',
    '/shared/hr/인사_규정_개정안.pdf',
    '2024년 인사 규정 개정안입니다. 주요 변경사항: 재택근무 정책 - 주 2회 재택근무 허용, 연차 사용 규정 - 반차 단위 사용 가능, 육아휴직 기간 연장 - 최대 2년까지 가능.',
    '{"pages": 12, "tables": [{"page": 6, "rows": 8, "cols": 2}]}',
    'restricted',
    ARRAY['인사팀'],
    '2024-09-20 10:00:00+00'
  ),
  (
    'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
    '마케팅_캠페인_결과_분석.xlsx',
    '/shared/marketing/마케팅_캠페인_결과_분석.xlsx',
    '2024년 상반기 마케팅 캠페인 결과 분석 보고서. ROI 350%, 신규 고객 1,500명 확보. 주요 채널: 소셜미디어 40%, 검색광고 30%, 이메일 마케팅 20%, 기타 10%. 총 광고비 대비 매출 3.5배 증가.',
    '{"pages": 1, "tables": [{"page": 1, "rows": 20, "cols": 8}]}',
    'public',
    ARRAY[]::text[],
    '2024-08-10 16:45:00+00'
  ),
  (
    'e5f6a7b8-c9d0-4e5f-2a3b-4c5d6e7f8a9b',
    '기술_스택_선정_가이드.pdf',
    '/shared/tech/기술_스택_선정_가이드.pdf',
    '프로젝트 기술 스택 선정 가이드. Next.js 14 - 서버 사이드 렌더링 및 API Routes, React 18 - UI 컴포넌트 개발, PostgreSQL - 데이터베이스, n8n - 워크플로우 자동화, Upstage AI - 문서 파싱.',
    '{"pages": 15, "tables": [{"page": 8, "rows": 12, "cols": 4}]}',
    'department',
    ARRAY['개발팀'],
    '2024-07-25 11:20:00+00'
  ),
  (
    'f6a7b8c9-d0e1-4f5a-3b4c-5d6e7f8a9b0c',
    '보안_정책_가이드라인.pdf',
    '/shared/security/보안_정책_가이드라인.pdf',
    '회사 보안 정책 가이드라인. 비밀번호 정책: 최소 12자 이상, 특수문자 포함. 2단계 인증 필수. VPN 사용 필수. 민감 정보 암호화 저장. 정기 보안 교육 이수.',
    '{"pages": 20, "tables": [{"page": 10, "rows": 15, "cols": 3}]}',
    'department',
    ARRAY['IT보안팀', '개발팀'],
    '2024-06-30 13:00:00+00'
  );

-- Insert Mock Document Requests for 홍길동
INSERT INTO document_requests (id, requester_email, requester_department, keyword, approver_email, status, urgency, created_at)
VALUES
  (
    '11111111-2222-3333-4444-555555555551',
    'hong@company.com',
    '개발팀',
    '예산 보고서',
    'finance@company.com',
    'pending',
    'high',
    '2024-11-15 09:30:00+00'
  ),
  (
    '11111111-2222-3333-4444-555555555552',
    'hong@company.com',
    '개발팀',
    '마케팅 캠페인',
    'marketing@company.com',
    'approved',
    'normal',
    '2024-11-10 14:00:00+00'
  ),
  (
    '11111111-2222-3333-4444-555555555553',
    'hong@company.com',
    '개발팀',
    '인사 규정',
    'hr@company.com',
    'rejected',
    'low',
    '2024-11-05 10:15:00+00'
  ),
  (
    '11111111-2222-3333-4444-555555555554',
    'hong@company.com',
    '개발팀',
    '보안 정책',
    'security@company.com',
    'pending',
    'normal',
    '2024-11-12 16:20:00+00'
  );

-- Update approved request with sharing link
UPDATE document_requests
SET
  approved_document_id = 'd4e5f6a7-b8c9-4d5e-1f2a-3b4c5d6e7f8a',
  sharing_link = 'https://docs.company.com/share/abc123xyz'
WHERE id = '11111111-2222-3333-4444-555555555552';

-- Update rejected request with reason
UPDATE document_requests
SET rejection_reason = '기밀 문서로 외부 공유가 제한됩니다. 인사팀에 직접 문의하시기 바랍니다.'
WHERE id = '11111111-2222-3333-4444-555555555553';

-- Verify data insertion
SELECT
  '문서' as type,
  COUNT(*) as count,
  string_agg(file_name, ', ') as items
FROM documents
UNION ALL
SELECT
  '요청' as type,
  COUNT(*) as count,
  string_agg(keyword, ', ') as items
FROM document_requests
WHERE requester_email = 'hong@company.com';
