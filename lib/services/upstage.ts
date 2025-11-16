import { UpstageParseResponse, UpstageMetadata } from '../types/document';

const UPSTAGE_API_URL = 'https://api.upstage.ai/v1/document-ai/document-parse';

export interface UpstageApiConfig {
  apiKey: string;
}

export class UpstageService {
  private apiKey: string;

  constructor(config: UpstageApiConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Parse a document using Upstage Document Parse API
   * @param file - File buffer or path to file
   * @param fileName - Original file name
   * @returns Parsed document data
   */
  async parseDocument(
    file: Buffer | File,
    fileName: string
  ): Promise<UpstageParseResponse> {
    try {
      const formData = new FormData();

      if (file instanceof Buffer) {
        const blob = new Blob([file], {
          type: this.getMimeType(fileName)
        });
        formData.append('document', blob, fileName);
      } else {
        formData.append('document', file, fileName);
      }

      const response = await fetch(UPSTAGE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upstage API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return this.transformUpstageResponse(data);
    } catch (error) {
      console.error('Error parsing document with Upstage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Parse a document from URL
   * @param documentUrl - URL to the document
   * @returns Parsed document data
   */
  async parseDocumentFromUrl(documentUrl: string): Promise<UpstageParseResponse> {
    try {
      const formData = new FormData();
      formData.append('document', documentUrl);

      const response = await fetch(UPSTAGE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upstage API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return this.transformUpstageResponse(data);
    } catch (error) {
      console.error('Error parsing document from URL with Upstage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Transform Upstage API response to our internal format
   */
  private transformUpstageResponse(data: any): UpstageParseResponse {
    try {
      // Extract full text from pages
      let fullText = '';
      const pages: Array<{ page: number; text: string }> = [];

      if (data.content && Array.isArray(data.content.pages)) {
        data.content.pages.forEach((page: any, index: number) => {
          const pageText = page.text || '';
          pages.push({
            page: index + 1,
            text: pageText,
          });
          fullText += pageText + '\n';
        });
      }

      // Extract tables
      const tables: Array<{ page: number; data: any }> = [];
      if (data.content && Array.isArray(data.content.tables)) {
        data.content.tables.forEach((table: any) => {
          tables.push({
            page: table.page || 0,
            data: table.data || table,
          });
        });
      }

      // Build metadata
      const metadata: UpstageMetadata = {
        pages: pages.length,
        tables: tables.map(t => ({
          page: t.page,
          rows: t.data?.rows || 0,
          cols: t.data?.cols || 0,
          data: t.data,
        })),
      };

      return {
        success: true,
        fullText: fullText.trim(),
        pages,
        tables,
        metadata,
      };
    } catch (error) {
      console.error('Error transforming Upstage response:', error);
      return {
        success: false,
        error: 'Failed to transform API response',
      };
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'txt': 'text/plain',
    };

    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}

/**
 * Create a singleton instance of UpstageService
 */
export function createUpstageService(): UpstageService | null {
  const apiKey = process.env.UPSTAGE_API_KEY;

  if (!apiKey) {
    console.warn('UPSTAGE_API_KEY not found in environment variables');
    return null;
  }

  return new UpstageService({ apiKey });
}
