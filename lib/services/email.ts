import nodemailer from 'nodemailer';
import { EmailNotificationData } from '../types/document';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    this.from = config.from;
  }

  /**
   * Send an email notification
   */
  async sendEmail(notification: EmailNotificationData): Promise<boolean> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: notification.to,
        subject: notification.subject,
        text: notification.textBody || notification.htmlBody,
        html: notification.htmlBody,
      });

      console.log('Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Generate approval notification email HTML
   */
  generateApprovalEmail(
    requesterEmail: string,
    keyword: string,
    documents: Array<{ id: string; file_name: string; file_path: string }>,
    requestId: string,
    approveUrl: string,
    rejectUrl: string
  ): string {
    const documentList = documents
      .map(
        (doc, index) =>
          `<li><strong>${index + 1}. ${doc.file_name}</strong><br/>
           <small style="color: #666;">Path: ${doc.file_path}</small></li>`
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .document-list { background: white; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; margin: 10px 5px; text-decoration: none; border-radius: 6px; font-weight: 600; }
    .approve { background: #10b981; color: white; }
    .reject { background: #ef4444; color: white; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Document Request Notification</h2>
    </div>
    <div class="content">
      <p>A document request has been submitted and requires your approval.</p>

      <div style="background: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
        <p><strong>Requester:</strong> ${requesterEmail}</p>
        <p><strong>Search Keyword:</strong> "${keyword}"</p>
        <p><strong>Request ID:</strong> ${requestId}</p>
      </div>

      <div class="document-list">
        <h3 style="margin-top: 0; color: #1f2937;">Matching Documents:</h3>
        <ul style="padding-left: 20px;">
          ${documentList}
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${approveUrl}" class="button approve">✅ Approve Request</a>
        <a href="${rejectUrl}" class="button reject">❌ Reject Request</a>
      </div>

      <div class="footer">
        <p>This is an automated notification from the Document Request System.</p>
        <p>If you did not expect this email, please contact your system administrator.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate approval confirmation email HTML
   */
  generateApprovalConfirmationEmail(
    requesterEmail: string,
    keyword: string,
    documentName: string,
    sharingLink: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; padding: 12px 24px; margin: 10px 0; text-decoration: none; border-radius: 6px; font-weight: 600; background: #3b82f6; color: white; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">✅ Document Request Approved</h2>
    </div>
    <div class="content">
      <p>Good news! Your document request has been approved.</p>

      <div style="background: white; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0;">
        <p><strong>Search Keyword:</strong> "${keyword}"</p>
        <p><strong>Document:</strong> ${documentName}</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${sharingLink}" class="button">📄 Access Document</a>
      </div>

      <div class="footer">
        <p>This link may expire based on your organization's security policies.</p>
        <p>Document Request Automation System</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate rejection notification email HTML
   */
  generateRejectionEmail(
    requesterEmail: string,
    keyword: string,
    rejectionReason: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">❌ Document Request Rejected</h2>
    </div>
    <div class="content">
      <p>Your document request has been reviewed and rejected.</p>

      <div style="background: white; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
        <p><strong>Search Keyword:</strong> "${keyword}"</p>
        <p><strong>Reason:</strong> ${rejectionReason || 'No reason provided'}</p>
      </div>

      <p>If you believe this is an error or need further clarification, please contact the approver directly.</p>

      <div class="footer">
        <p>Document Request Automation System</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate document not found email HTML
   */
  generateDocumentNotFoundEmail(
    requesterEmail: string,
    keyword: string
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">⚠️ No Documents Found</h2>
    </div>
    <div class="content">
      <p>We were unable to find any documents matching your search criteria.</p>

      <div style="background: white; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
        <p><strong>Search Keyword:</strong> "${keyword}"</p>
      </div>

      <p>Please try the following:</p>
      <ul>
        <li>Check your search keyword for typos</li>
        <li>Use more general search terms</li>
        <li>Contact the document owner directly</li>
      </ul>

      <div class="footer">
        <p>Document Request Automation System</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }
}

/**
 * Create a singleton instance of EmailService
 */
export function createEmailService(): EmailService | null {
  const config = {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || '',
  };

  if (!config.host || !config.auth.user || !config.auth.pass) {
    console.warn('Email configuration incomplete. Email service disabled.');
    return null;
  }

  return new EmailService(config);
}
