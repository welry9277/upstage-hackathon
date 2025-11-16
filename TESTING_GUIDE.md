# Testing Guide for Document Request System

## Quick Start for Testing (User: 홍길동)

This guide will help you quickly test the Document Request Automation System with pre-loaded mock data.

### Prerequisites

- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Dependencies installed (`npm install`)

### Step 1: Set Up Database

```bash
# Create database
createdb document_request_db

# Run schema
psql document_request_db < lib/db/schema.sql

# Load mock data
psql document_request_db < lib/db/seed-mock-data.sql
```

### Step 2: Configure Environment

Create `.env.local` file (or copy from `.env.example`):

```bash
# Minimal configuration for testing
DATABASE_URL=postgresql://localhost:5432/document_request_db
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional: Add these if you want to test email/API features
UPSTAGE_API_KEY=your_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
SMTP_FROM=noreply@company.com
```

### Step 3: Start Development Server

```bash
npm run dev
```

The application will be available at http://localhost:3000

### Step 4: Access Test Pages

#### 1. Test Dashboard
**URL:** http://localhost:3000/test-doc-request

This page shows:
- **Documents Tab**: All 6 mock documents in the system
- **Requests Tab**: 4 mock requests from 홍길동
  - 1 pending (예산 보고서)
  - 1 approved (마케팅 캠페인) ✅
  - 1 rejected (인사 규정) ❌
  - 1 pending (보안 정책)
- **Search Test Tab**: Interactive document search

#### 2. Document Request Form
**URL:** http://localhost:3000/document-request

Test submitting a new request:
- **Your Email:** hong@company.com
- **Department:** 개발팀
- **Keyword:** Try searching for:
  - "예산" (should find budget report)
  - "프로젝트" (should find project plan)
  - "마케팅" (should find marketing analysis)
  - "보안" (should find security guide)
- **Approver Email:** approver@company.com
- **Urgency:** Choose any

#### 3. Original Task Management
**URL:** http://localhost:3000

The original NodeTask application with task graph visualization.

## Mock Data Overview

### Documents (6 items)

1. **2024_Q4_예산_보고서.pdf**
   - Access: Department (재무팀, 경영지원팀)
   - Keywords: 예산, 보고서, 5억원

2. **노드태스크_프로젝트_계획서.docx**
   - Access: Department (개발팀, 기획팀)
   - Keywords: 프로젝트, 노드태스크, 홍길동, 도현

3. **인사_규정_개정안.pdf**
   - Access: Restricted (인사팀 only)
   - Keywords: 인사, 규정, 재택근무, 연차

4. **마케팅_캠페인_결과_분석.xlsx**
   - Access: Public
   - Keywords: 마케팅, 캠페인, ROI, 고객

5. **기술_스택_선정_가이드.pdf**
   - Access: Department (개발팀)
   - Keywords: Next.js, React, PostgreSQL, n8n

6. **보안_정책_가이드라인.pdf**
   - Access: Department (IT보안팀, 개발팀)
   - Keywords: 보안, 정책, 비밀번호, VPN

### Document Requests (4 items for 홍길동)

1. **Request 1**: "예산 보고서" - ⏳ Pending (High urgency)
2. **Request 2**: "마케팅 캠페인" - ✅ Approved
3. **Request 3**: "인사 규정" - ❌ Rejected
4. **Request 4**: "보안 정책" - ⏳ Pending (Normal urgency)

## Testing Scenarios

### Scenario 1: Search Test (No Database Required)

1. Go to http://localhost:3000/test-doc-request
2. Click "검색 테스트" tab
3. Try these searches:
   - "예산" → Should find budget report
   - "프로젝트" → Should find project plan
   - "홍길동" → Should find project plan
   - "보안" → Should find security guide

### Scenario 2: View Existing Requests

1. Go to http://localhost:3000/test-doc-request
2. Click "내 요청" tab
3. You should see 4 requests:
   - One approved with sharing link
   - One rejected with reason
   - Two pending

### Scenario 3: Submit New Request

1. Go to http://localhost:3000/document-request
2. Fill in the form:
   ```
   Your Email: hong@company.com
   Department: 개발팀
   Search Keyword: 프로젝트
   Approver Email: manager@company.com
   Urgency: Normal
   ```
3. Click "Submit Request"
4. You should see a success message with number of matching documents

### Scenario 4: Test API Endpoints

#### Test Document Search
```bash
curl -X POST http://localhost:3000/api/documents/request \
  -H "Content-Type: application/json" \
  -d '{
    "requester_email": "hong@company.com",
    "requester_department": "개발팀",
    "keyword": "예산",
    "approver_email": "finance@company.com",
    "urgency": "high"
  }'
```

Expected response:
```json
{
  "success": true,
  "request": {
    "id": "uuid-here",
    "status": "pending"
  },
  "matchingDocuments": 1
}
```

#### Test Approval (Mock)
```bash
curl -X POST http://localhost:3000/api/documents/approve \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "11111111-2222-3333-4444-555555555551",
    "action": "approve",
    "document_id": "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    "sharing_link": "https://docs.company.com/share/test123"
  }'
```

### Scenario 5: Test Approval Forms

#### Approve a Request
1. Manually navigate to: http://localhost:3000/approve-form?request_id=11111111-2222-3333-4444-555555555551
2. Enter:
   - Document ID: a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
   - Sharing Link: https://docs.company.com/share/test456
3. Click "Approve Request"

#### Reject a Request
1. Navigate to: http://localhost:3000/reject-form?request_id=11111111-2222-3333-4444-555555555554
2. Enter rejection reason: "문서가 현재 검토 중입니다."
3. Click "Reject Request"

## Verifying Database Changes

### Check Documents
```sql
SELECT id, file_name, access_level, array_length(allowed_departments, 1) as dept_count
FROM documents
ORDER BY created_at DESC;
```

### Check Requests
```sql
SELECT id, keyword, status, urgency, created_at
FROM document_requests
WHERE requester_email = 'hong@company.com'
ORDER BY created_at DESC;
```

### Check Search Functionality
```sql
SELECT file_name, ts_rank(to_tsvector('english', parsed_text), plainto_tsquery('english', '예산')) as rank
FROM documents
WHERE to_tsvector('english', parsed_text) @@ plainto_tsquery('english', '예산')
ORDER BY rank DESC;
```

## Troubleshooting

### Database Connection Error
```bash
# Check if PostgreSQL is running
psql -l

# Verify database exists
psql -d document_request_db -c "SELECT COUNT(*) FROM documents;"
```

### No Mock Data Showing
```bash
# Re-run seed script
psql document_request_db < lib/db/seed-mock-data.sql
```

### API Errors
- Check browser console for detailed error messages
- Verify `.env.local` is properly configured
- Ensure DATABASE_URL is correct

## Next Steps

After testing with mock data:

1. **Set up Upstage API**: Add real UPSTAGE_API_KEY to index real documents
2. **Configure Email**: Add SMTP settings to test email notifications
3. **Set up n8n**: Configure webhook URLs for workflow automation
4. **Production Database**: Move to production PostgreSQL instance
5. **Deploy**: Deploy to Vercel or your preferred hosting platform

## User Credentials for Testing

- **Name:** 홍길동
- **Email:** hong@company.com
- **Department:** 개발팀
- **Role:** Developer

## Mock Approvers

- finance@company.com (재무팀)
- marketing@company.com (마케팅팀)
- hr@company.com (인사팀)
- security@company.com (보안팀)

---

**Happy Testing!** 🚀

For questions or issues, refer to [DOC_REQUEST_README.md](./DOC_REQUEST_README.md) for detailed documentation.
