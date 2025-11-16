import { NextRequest, NextResponse } from 'next/server';
import { DocumentRequestRepository, DocumentRepository } from '@/lib/repositories/document';
import { createEmailService } from '@/lib/services/email';

/**
 * GET /api/documents/approve
 * Handle approve/reject actions from email links
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get('request_id');
    const action = searchParams.get('action');

    if (!requestId || !action) {
      return NextResponse.json(
        { success: false, error: 'request_id and action are required' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const requestRepo = new DocumentRequestRepository();
    const documentRequest = await requestRepo.getRequestById(requestId);

    if (!documentRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (documentRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // For approve, redirect to approval form to select document
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/approve-form?request_id=${requestId}`);
    } else {
      // For reject, redirect to rejection form
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/reject-form?request_id=${requestId}`);
    }
  } catch (error) {
    console.error('Error in approval handler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documents/approve
 * Process approval/rejection with details
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { request_id, action, document_id, rejection_reason, sharing_link } = body;

    if (!request_id || !action) {
      return NextResponse.json(
        { success: false, error: 'request_id and action are required' },
        { status: 400 }
      );
    }

    const requestRepo = new DocumentRequestRepository();
    const documentRequest = await requestRepo.getRequestById(request_id);

    if (!documentRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (documentRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      if (!document_id || !sharing_link) {
        return NextResponse.json(
          { success: false, error: 'document_id and sharing_link are required for approval' },
          { status: 400 }
        );
      }

      // Update request status to approved
      const updatedRequest = await requestRepo.updateRequestStatus(
        request_id,
        'approved',
        document_id,
        undefined,
        sharing_link
      );

      if (!updatedRequest) {
        return NextResponse.json(
          { success: false, error: 'Failed to update request status' },
          { status: 500 }
        );
      }

      // Get document details
      const documentRepo = new DocumentRepository();
      const document = await documentRepo.getDocumentById(document_id);

      // Send approval confirmation email to requester
      const emailService = createEmailService();
      if (emailService && document) {
        const emailHtml = emailService.generateApprovalConfirmationEmail(
          documentRequest.requester_email,
          documentRequest.keyword,
          document.file_name,
          sharing_link
        );

        await emailService.sendEmail({
          to: documentRequest.requester_email,
          subject: 'Document Request Approved',
          htmlBody: emailHtml,
        });
      }

      // Send webhook to n8n
      const n8nWebhookUrl = process.env.N8N_REQUEST_APPROVED_WEBHOOK_URL;
      if (n8nWebhookUrl) {
        try {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'request_approved',
              timestamp: new Date().toISOString(),
              data: {
                requestId: request_id,
                requesterEmail: documentRequest.requester_email,
                documentId: document_id,
                sharingLink: sharing_link,
              },
            }),
          });
        } catch (error) {
          console.error('Error sending n8n webhook:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Request approved successfully',
        request: updatedRequest,
      });
    } else if (action === 'reject') {
      // Update request status to rejected
      const updatedRequest = await requestRepo.updateRequestStatus(
        request_id,
        'rejected',
        undefined,
        rejection_reason || 'No reason provided'
      );

      if (!updatedRequest) {
        return NextResponse.json(
          { success: false, error: 'Failed to update request status' },
          { status: 500 }
        );
      }

      // Send rejection email to requester
      const emailService = createEmailService();
      if (emailService) {
        const emailHtml = emailService.generateRejectionEmail(
          documentRequest.requester_email,
          documentRequest.keyword,
          rejection_reason || 'No reason provided'
        );

        await emailService.sendEmail({
          to: documentRequest.requester_email,
          subject: 'Document Request Rejected',
          htmlBody: emailHtml,
        });
      }

      // Send webhook to n8n
      const n8nWebhookUrl = process.env.N8N_REQUEST_REJECTED_WEBHOOK_URL;
      if (n8nWebhookUrl) {
        try {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'request_rejected',
              timestamp: new Date().toISOString(),
              data: {
                requestId: request_id,
                requesterEmail: documentRequest.requester_email,
                rejectionReason: rejection_reason,
              },
            }),
          });
        } catch (error) {
          console.error('Error sending n8n webhook:', error);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Request rejected successfully',
        request: updatedRequest,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing approval:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
