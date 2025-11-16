import { NextRequest, NextResponse } from 'next/server';
import { createUpstageService } from '@/lib/services/upstage';
import { DocumentRepository } from '@/lib/repositories/document';

/**
 * POST /api/documents/index
 * Webhook endpoint for document indexing
 * Receives file upload, parses with Upstage, and stores in database
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string || file?.name;
    const filePath = formData.get('filePath') as string;
    const accessLevel = formData.get('accessLevel') as string || 'public';
    const allowedDepartments = formData.get('allowedDepartments') as string;

    if (!file || !filePath) {
      return NextResponse.json(
        { success: false, error: 'File and filePath are required' },
        { status: 400 }
      );
    }

    // Parse document with Upstage
    const upstageService = createUpstageService();
    if (!upstageService) {
      return NextResponse.json(
        { success: false, error: 'Upstage service not configured' },
        { status: 500 }
      );
    }

    const parseResult = await upstageService.parseDocument(file, fileName);

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error },
        { status: 500 }
      );
    }

    // Store in database
    const documentRepo = new DocumentRepository();
    const departments = allowedDepartments
      ? allowedDepartments.split(',').map((d) => d.trim())
      : [];

    const document = await documentRepo.createDocument(
      fileName,
      filePath,
      parseResult.fullText || null,
      parseResult.metadata,
      accessLevel,
      departments
    );

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Failed to store document in database' },
        { status: 500 }
      );
    }

    // Send webhook to n8n if configured
    const n8nWebhookUrl = process.env.N8N_DOCUMENT_INDEXED_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'document_indexed',
            timestamp: new Date().toISOString(),
            data: {
              documentId: document.id,
              fileName: document.file_name,
              filePath: document.file_path,
              accessLevel: document.access_level,
              parsedTextLength: parseResult.fullText?.length || 0,
            },
          }),
        });
      } catch (error) {
        console.error('Error sending n8n webhook:', error);
        // Continue even if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        fileName: document.file_name,
        filePath: document.file_path,
        parsedTextLength: parseResult.fullText?.length || 0,
        metadata: parseResult.metadata,
      },
    });
  } catch (error) {
    console.error('Error in document indexing:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
