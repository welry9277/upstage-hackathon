import { getDbClient } from '../db/client';
import { Document, DocumentRequest, DocumentSearchResult } from '../types/document';
import { v4 as uuidv4 } from 'uuid';

export class DocumentRepository {
  /**
   * Create a new document record
   */
  async createDocument(
    fileName: string,
    filePath: string,
    parsedText: string | null,
    parsedMetadata: any,
    accessLevel: string = 'public',
    allowedDepartments: string[] = []
  ): Promise<Document | null> {
    const client = await getDbClient();

    try {
      const query = `
        INSERT INTO documents (file_name, file_path, parsed_text, parsed_metadata, access_level, allowed_departments)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        fileName,
        filePath,
        parsedText,
        JSON.stringify(parsedMetadata),
        accessLevel,
        allowedDepartments,
      ];

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Search documents by keyword using full-text search
   */
  async searchDocuments(
    keyword: string,
    department?: string,
    limit: number = 10
  ): Promise<DocumentSearchResult[]> {
    const client = await getDbClient();

    try {
      let query = `
        SELECT *,
               ts_rank(to_tsvector('english', parsed_text), plainto_tsquery('english', $1)) as relevance
        FROM documents
        WHERE to_tsvector('english', parsed_text) @@ plainto_tsquery('english', $1)
      `;

      const values: any[] = [keyword];
      let paramIndex = 2;

      // Filter by department access if specified
      if (department) {
        query += ` AND (access_level = 'public' OR $${paramIndex} = ANY(allowed_departments))`;
        values.push(department);
        paramIndex++;
      }

      query += ` ORDER BY relevance DESC LIMIT $${paramIndex}`;
      values.push(limit);

      const result = await client.query(query, values);

      return result.rows.map((row) => ({
        document: row,
        relevance_score: parseFloat(row.relevance),
      }));
    } catch (error) {
      console.error('Error searching documents:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Get document by ID
   */
  async getDocumentById(documentId: string): Promise<Document | null> {
    const client = await getDbClient();

    try {
      const query = 'SELECT * FROM documents WHERE id = $1';
      const result = await client.query(query, [documentId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting document by ID:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Update document
   */
  async updateDocument(
    documentId: string,
    updates: Partial<Document>
  ): Promise<Document | null> {
    const client = await getDbClient();

    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key !== 'id' && key !== 'created_at' && key !== 'updated_at') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (fields.length === 0) return null;

      values.push(documentId);
      const query = `
        UPDATE documents
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating document:', error);
      return null;
    } finally {
      client.release();
    }
  }
}

export class DocumentRequestRepository {
  /**
   * Create a new document request
   */
  async createRequest(
    requesterEmail: string,
    keyword: string,
    approverEmail: string,
    requesterDepartment?: string,
    urgency: string = 'normal'
  ): Promise<DocumentRequest | null> {
    const client = await getDbClient();

    try {
      const query = `
        INSERT INTO document_requests (requester_email, requester_department, keyword, approver_email, urgency, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
      `;

      const values = [
        requesterEmail,
        requesterDepartment || null,
        keyword,
        approverEmail,
        urgency,
      ];

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error creating document request:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Get request by ID
   */
  async getRequestById(requestId: string): Promise<DocumentRequest | null> {
    const client = await getDbClient();

    try {
      const query = 'SELECT * FROM document_requests WHERE id = $1';
      const result = await client.query(query, [requestId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting request by ID:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: string,
    approvedDocumentId?: string,
    rejectionReason?: string,
    sharingLink?: string
  ): Promise<DocumentRequest | null> {
    const client = await getDbClient();

    try {
      const query = `
        UPDATE document_requests
        SET status = $1,
            approved_document_id = $2,
            rejection_reason = $3,
            sharing_link = $4
        WHERE id = $5
        RETURNING *
      `;

      const values = [
        status,
        approvedDocumentId || null,
        rejectionReason || null,
        sharingLink || null,
        requestId,
      ];

      const result = await client.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating request status:', error);
      return null;
    } finally {
      client.release();
    }
  }

  /**
   * Get all requests for a specific approver
   */
  async getRequestsByApprover(
    approverEmail: string,
    status?: string
  ): Promise<DocumentRequest[]> {
    const client = await getDbClient();

    try {
      let query = 'SELECT * FROM document_requests WHERE approver_email = $1';
      const values: any[] = [approverEmail];

      if (status) {
        query += ' AND status = $2';
        values.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error getting requests by approver:', error);
      return [];
    } finally {
      client.release();
    }
  }

  /**
   * Get all requests by a specific requester
   */
  async getRequestsByRequester(
    requesterEmail: string
  ): Promise<DocumentRequest[]> {
    const client = await getDbClient();

    try {
      const query = `
        SELECT * FROM document_requests
        WHERE requester_email = $1
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [requesterEmail]);
      return result.rows;
    } catch (error) {
      console.error('Error getting requests by requester:', error);
      return [];
    } finally {
      client.release();
    }
  }
}
