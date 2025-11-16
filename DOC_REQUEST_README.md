# Document Request Automation System

A comprehensive document request and approval system built with Next.js, integrating Upstage Document Parse API for intelligent document indexing and n8n for workflow automation.

## Features

- **Intelligent Document Indexing**: Automatically parse and index documents (PDF, DOCX, XLSX) using Upstage AI
- **Full-Text Search**: Search documents using keywords with PostgreSQL full-text search
- **Automated Request Workflow**: Submit document requests that automatically find matching documents
- **Email Notifications**: Automated email notifications for approvers and requesters
- **One-Click Approval**: Approve or reject requests via email links
- **n8n Integration**: Webhook support for advanced workflow automation
- **Department-Based Permissions**: Control document access by department

## System Architecture

### Components

1. **Upstage Document Parse API**: Processes documents and extracts searchable text
2. **PostgreSQL Database**: Stores documents, parsed text, and request logs
3. **Next.js Application**: Web interface and API endpoints
4. **Email Service**: SMTP-based notification system
5. **n8n Workflows**: Optional automation engine for advanced workflows

### Database Schema

#### `documents` Table
- Stores document metadata and parsed text
- Full-text search index for efficient keyword matching
- Department-based access control

#### `document_requests` Table
- Tracks all document requests
- Stores approval status and sharing links
- Links requests to approved documents

## Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Upstage API Key ([Get one here](https://upstage.ai))
- SMTP email account (Gmail, SendGrid, etc.)
- (Optional) n8n instance for workflow automation

### Setup Steps

1. **Clone and Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Database**
   ```bash
   # Create PostgreSQL database
   createdb document_request_db

   # Run schema
   psql document_request_db < lib/db/schema.sql
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string
   - `UPSTAGE_API_KEY`: Your Upstage API key
   - `SMTP_*`: Email server configuration
   - `N8N_*`: n8n webhook URLs (optional)
   - `NEXT_PUBLIC_BASE_URL`: Your application URL

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Usage

### Workflow 1: Document Indexing

When a new document is uploaded to your DMS (Document Management System):

1. **Trigger**: POST request to `/api/documents/index` with:
   - `file`: Document file (PDF, DOCX, XLSX)
   - `filePath`: Path to original file
   - `accessLevel`: `public`, `department`, or `restricted`
   - `allowedDepartments`: Comma-separated list of departments

2. **Process**:
   - Document is sent to Upstage API for parsing
   - Extracted text is stored in database with search index
   - Webhook notification sent to n8n (if configured)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/documents/index \
  -F "file=@document.pdf" \
  -F "filePath=/shared/docs/document.pdf" \
  -F "accessLevel=department" \
  -F "allowedDepartments=Engineering,Product"
```

### Workflow 2: Document Request

Users can submit document requests via web form:

1. **Access Form**: Navigate to `/document-request`

2. **Submit Request**:
   - Enter your email
   - Specify department (optional)
   - Enter search keyword
   - Provide approver's email
   - Select urgency level

3. **System Actions**:
   - Searches database for matching documents
   - Creates request record
   - Sends email to approver with matching documents
   - Provides Approve/Reject links in email

### Workflow 3: Approval Processing

Approvers receive email notifications:

1. **Approve Flow**:
   - Click "Approve" link in email
   - Redirected to approval form
   - Enter document ID and sharing link
   - Submit approval
   - Requester receives email with document link

2. **Reject Flow**:
   - Click "Reject" link in email
   - Redirected to rejection form
   - Enter rejection reason
   - Submit rejection
   - Requester receives notification with reason

## API Endpoints

### POST `/api/documents/index`
Index a new document with Upstage parsing.

**Request:**
```json
{
  "file": "<file>",
  "filePath": "/path/to/document.pdf",
  "accessLevel": "department",
  "allowedDepartments": "Engineering,Sales"
}
```

**Response:**
```json
{
  "success": true,
  "document": {
    "id": "uuid",
    "fileName": "document.pdf",
    "parsedTextLength": 1234
  }
}
```

### POST `/api/documents/request`
Submit a document request.

**Request:**
```json
{
  "requester_email": "user@company.com",
  "requester_department": "Marketing",
  "keyword": "Q4 budget report",
  "approver_email": "approver@company.com",
  "urgency": "high"
}
```

**Response:**
```json
{
  "success": true,
  "request": {
    "id": "uuid",
    "status": "pending"
  },
  "matchingDocuments": 3
}
```

### GET `/api/documents/approve?request_id=<uuid>&action=<approve|reject>`
Handle approval/rejection link clicks (redirects to forms).

### POST `/api/documents/approve`
Process approval or rejection with details.

**Approve Request:**
```json
{
  "request_id": "uuid",
  "action": "approve",
  "document_id": "uuid",
  "sharing_link": "https://..."
}
```

**Reject Request:**
```json
{
  "request_id": "uuid",
  "action": "reject",
  "rejection_reason": "Document contains confidential information"
}
```

## n8n Integration

### Webhook Events

The system sends webhooks to n8n for the following events:

1. **document_indexed**
   - Triggered when a document is successfully indexed
   - Payload includes document ID, filename, and metadata

2. **request_created**
   - Triggered when a new request is submitted
   - Payload includes requester, keyword, and matching document count

3. **request_approved**
   - Triggered when a request is approved
   - Payload includes document ID and sharing link

4. **request_rejected**
   - Triggered when a request is rejected
   - Payload includes rejection reason

### n8n Workflow Examples

Configure n8n workflows to:
- Send Slack notifications for high-urgency requests
- Create Jira tickets for rejected requests
- Log all activities to analytics platforms
- Integrate with SharePoint or Google Drive for document sharing

## Email Templates

The system includes professionally designed email templates:

- **Approval Request**: Sent to approvers with document list and action links
- **Approval Confirmation**: Sent to requesters with document access link
- **Rejection Notification**: Sent to requesters with rejection reason
- **Document Not Found**: Sent when no matching documents are found

All templates are mobile-responsive with modern design.

## Security Considerations

1. **Access Control**: Documents are filtered by department permissions
2. **Email Validation**: All email addresses are validated
3. **Link Security**: Approval links include request IDs to prevent unauthorized access
4. **Database**: Use parameterized queries to prevent SQL injection
5. **Environment Variables**: Sensitive data stored in environment variables

## Development

### Project Structure

```
nodetask/
├── app/
│   ├── api/
│   │   └── documents/
│   │       ├── index/route.ts      # Document indexing endpoint
│   │       ├── request/route.ts    # Request submission endpoint
│   │       └── approve/route.ts    # Approval processing endpoint
│   ├── document-request/page.tsx   # Request form page
│   ├── approve-form/page.tsx       # Approval form page
│   └── reject-form/page.tsx        # Rejection form page
├── lib/
│   ├── db/
│   │   ├── schema.sql              # Database schema
│   │   └── client.ts               # PostgreSQL client
│   ├── services/
│   │   ├── upstage.ts              # Upstage API integration
│   │   └── email.ts                # Email service
│   ├── repositories/
│   │   └── document.ts             # Database operations
│   └── types/
│       └── document.ts             # TypeScript types
└── .env.example                     # Environment variables template
```

### Adding New Features

1. **Custom Search Algorithms**: Modify `DocumentRepository.searchDocuments()`
2. **Additional Document Types**: Update `UpstageService.getMimeType()`
3. **Custom Email Templates**: Edit methods in `EmailService`
4. **Additional Webhooks**: Add new webhook calls in API routes

## Troubleshooting

### Document Indexing Issues
- Verify Upstage API key is correct
- Check file format is supported (PDF, DOCX, XLSX)
- Review API logs for Upstage errors

### Email Not Sending
- Verify SMTP configuration
- Check firewall allows SMTP port (usually 587 or 465)
- For Gmail, use App Passwords instead of regular password

### Database Connection Errors
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure database exists and schema is loaded

### Search Not Finding Documents
- Confirm documents have been indexed with parsed_text
- Check department permissions
- Verify full-text search index exists

## Performance Optimization

1. **Database Indexing**: Ensure GIN index on `parsed_text` column
2. **Connection Pooling**: Configured with max 20 connections
3. **Caching**: Consider adding Redis for frequently accessed documents
4. **Background Jobs**: Use n8n for async document processing

## Contributing

This is an internal system. For questions or improvements, contact the development team.

## License

Internal use only - Company Proprietary

---

**Document Request Automation System** - Powered by Upstage AI & n8n
