import { NextRequest, NextResponse } from 'next/server';
import { DocumentRepository, DocumentRequestRepository } from '@/lib/repositories/document';
import { createEmailService } from '@/lib/services/email';

/**
 * POST /api/documents/request
 * Create a new document request
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      requester_email,
      requester_department,
      keyword,
      approver_email,
      urgency = 'normal',
    } = body;

    if (!requester_email || !keyword || !approver_email) {
      return NextResponse.json(
        {
          success: false,
          error: 'requester_email, keyword, and approver_email are required',
        },
        { status: 400 }
      );
    }

    // Search for documents
    const documentRepo = new DocumentRepository();
    const searchResults = await documentRepo.searchDocuments(
      keyword,
      requester_department
    );

    // If no documents found, send notification and return
    if (searchResults.length === 0) {
      const emailService = createEmailService();
      if (emailService) {
        const emailHtml = emailService.generateDocumentNotFoundEmail(
          requester_email,
          keyword
        );

        await emailService.sendEmail({
          to: requester_email,
          subject: 'Document Request - No Documents Found',
          htmlBody: emailHtml,
        });
      }

      return NextResponse.json({
        success: false,
        error: 'No documents found matching the search criteria',
        searchResults: [],
      });
    }

    // Create request
    const requestRepo = new DocumentRequestRepository();
    const documentRequest = await requestRepo.createRequest(
      requester_email,
      keyword,
      approver_email,
      requester_department,
      urgency
    );

    if (!documentRequest) {
      return NextResponse.json(
        { success: false, error: 'Failed to create document request' },
        { status: 500 }
      );
    }

    // Send approval email
    const emailService = createEmailService();
    if (emailService) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const approveUrl = `${baseUrl}/api/documents/approve?request_id=${documentRequest.id}&action=approve`;
      const rejectUrl = `${baseUrl}/api/documents/approve?request_id=${documentRequest.id}&action=reject`;

      const documents = searchResults.map((result) => ({
        id: result.document.id,
        file_name: result.document.file_name,
        file_path: result.document.file_path,
      }));

      const emailHtml = emailService.generateApprovalEmail(
        requester_email,
        keyword,
        documents,
        documentRequest.id,
        approveUrl,
        rejectUrl
      );

      await emailService.sendEmail({
        to: approver_email,
        subject: `Document Request Approval Needed - ${keyword}`,
        htmlBody: emailHtml,
      });
    }

    // Send webhook to n8n if configured
    const n8nWebhookUrl = process.env.N8N_REQUEST_CREATED_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'request_created',
            timestamp: new Date().toISOString(),
            data: {
              requestId: documentRequest.id,
              requesterEmail: requester_email,
              keyword,
              approverEmail: approver_email,
              matchingDocuments: searchResults.length,
            },
          }),
        });
      } catch (error) {
        console.error('Error sending n8n webhook:', error);
      }
    }

    return NextResponse.json({
      success: true,
      request: documentRequest,
      matchingDocuments: searchResults.length,
    });
  } catch (error) {
    console.error('Error creating document request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
