import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/documents/request
 * Create a new document request (stores question for approver)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      requester_email,
      requester_department,
      keyword, // This is actually the question
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

    // Generate a unique request ID
    const requestId = `req-${Date.now()}`;

    // Store request in memory (나중에 DB로 교체)
    const newRequest = {
      id: requestId,
      requester_email,
      requester_department,
      question: keyword,
      approver_email,
      status: 'pending',
      urgency,
      created_at: new Date().toISOString(),
    };

    // TODO: DB에 저장하는 로직으로 교체
    // For now, just log it
    console.log('New document request:', newRequest);

    // Return success - approver will see this in their notifications
    return NextResponse.json({
      success: true,
      request: newRequest,
      message: '질문이 승인자에게 전달되었습니다.',
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
