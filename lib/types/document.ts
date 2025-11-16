// Document types for the Document Request Automation System

export type AccessLevel = 'public' | 'department' | 'restricted';
export type RequestStatus = 'pending' | 'approved' | 'rejected';
export type UrgencyLevel = 'low' | 'normal' | 'high';

export interface Document {
  id: string;
  file_name: string;
  file_path: string;
  parsed_text: string | null;
  parsed_metadata: UpstageMetadata | null;
  access_level: AccessLevel;
  allowed_departments: string[];
  created_at: string;
  updated_at: string;
}

export interface UpstageMetadata {
  pages?: number;
  tables?: Array<{
    page: number;
    rows: number;
    cols: number;
    data?: any;
  }>;
  images?: Array<{
    page: number;
    bbox?: number[];
  }>;
  [key: string]: any;
}

export interface UpstageParseResponse {
  success: boolean;
  fullText?: string;
  pages?: Array<{
    page: number;
    text: string;
  }>;
  tables?: Array<{
    page: number;
    data: any;
  }>;
  metadata?: UpstageMetadata;
  error?: string;
}

export interface DocumentRequest {
  id: string;
  requester_email: string;
  requester_department?: string;
  keyword: string;
  approver_email: string;
  status: RequestStatus;
  approved_document_id?: string;
  rejection_reason?: string;
  sharing_link?: string;
  urgency: UrgencyLevel;
  created_at: string;
  updated_at: string;
}

export interface DocumentSearchResult {
  document: Document;
  relevance_score?: number;
}

export interface DocumentRequestFormData {
  requester_email: string;
  requester_department?: string;
  keyword: string;
  urgency?: UrgencyLevel;
}

export interface ApprovalActionPayload {
  request_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

export interface EmailNotificationData {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface N8nWebhookPayload {
  event: 'document_indexed' | 'request_created' | 'request_approved' | 'request_rejected';
  timestamp: string;
  data: any;
}
