-- Documents Table
-- Stores parsed documents with search index from Upstage API
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    parsed_text TEXT,  -- Full text extracted by Upstage (Search Target)
    parsed_metadata JSONB,  -- Parsing result metadata (page count, table info, etc.)
    access_level VARCHAR(50) DEFAULT 'public',  -- public, department, restricted
    allowed_departments TEXT[],  -- List of accessible departments
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create full-text search index for Korean text
CREATE INDEX IF NOT EXISTS idx_documents_text
ON documents
USING gin(to_tsvector('english', parsed_text));

-- Document Requests Table
-- Stores document request logs and status
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_email VARCHAR(255) NOT NULL,
    requester_department VARCHAR(100),
    keyword TEXT NOT NULL,
    approver_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, approved, rejected
    approved_document_id UUID REFERENCES documents(id),
    rejection_reason TEXT,
    sharing_link TEXT,  -- Generated sharing link for approved documents
    urgency VARCHAR(20) DEFAULT 'normal',  -- low, normal, high
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_requests_status
ON document_requests(status);

CREATE INDEX IF NOT EXISTS idx_document_requests_requester
ON document_requests(requester_email);

CREATE INDEX IF NOT EXISTS idx_document_requests_approver
ON document_requests(approver_email);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_requests_updated_at
BEFORE UPDATE ON document_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
