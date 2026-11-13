export interface RobaseSendOtpOptions {
  to: string;
  code: string;
  channel: 'sms' | 'whatsapp';
}

export interface RobaseSendOtpResponse {
  success: boolean;
  messageId?: string;
  providerCost?: number;
  error?: string;
}

/**
 * Robase Integration Service
 * Live integration adapter for SMS & WhatsApp OTP delivery
 */
export class RobaseService {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly senderId: string;

  constructor() {
    this.apiUrl = process.env.ROBASE_API_URL || 'https://api.robase.io/v1';
    this.apiKey = process.env.ROBASE_API_KEY || '';
    this.senderId = process.env.ROBASE_SENDER_ID || 'FundedGiants';
  }

  async sendOtp(options: RobaseSendOtpOptions): Promise<RobaseSendOtpResponse> {
    if (!this.apiKey) {
      // In live architecture, missing keys must throw an explicit configuration error
      return {
        success: false,
        error: 'ROBASE_API_KEY is not configured in environment',
      };
    }

    try {
      const endpoint = options.channel === 'whatsapp' ? `${this.apiUrl}/whatsapp/send` : `${this.apiUrl}/sms/send`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          to: options.to,
          from: this.senderId,
          text: `Your FundedGiants verification code is: ${options.code}. Valid for 5 minutes. Do not share this code.`,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Robase error: HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.messageId || data.id,
        providerCost: data.cost ? Number(data.cost) : undefined,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network error reaching Robase API',
      };
    }
  }
}
