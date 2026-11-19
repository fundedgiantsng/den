import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { DeviceBindingGuard } from '../../admin/device-binding.guard';
import { SendbabaService } from './sendbaba.service';
import { Request } from 'express';

@Controller()
export class SendbabaController {
  private readonly logger = new Logger(SendbabaController.name);

  constructor(private readonly sendbabaService: SendbabaService) {}

  /**
   * Admin Endpoint: Bulk sync all traders from database to SendBaba
   * POST /api/v1/admin/integrations/sendbaba/sync-all
   */
  @Post('admin/integrations/sendbaba/sync-all')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.OK)
  async syncAllTraders() {
    this.logger.log('Admin triggered bulk trader sync to SendBaba audience');
    const result = await this.sendbabaService.syncAllTradersToPlatform();
    return {
      success: true,
      message: `Sync completed: ${result.synced} traders synced to SendBaba (${result.failed} failed, ${result.skipped} skipped).`,
      data: result,
    };
  }

  /**
   * Admin Endpoint: Send a live test email via SendBaba to verify inbox delivery
   * POST /api/v1/admin/integrations/sendbaba/test-email
   */
  @Post('admin/integrations/sendbaba/test-email')
  @UseGuards(DeviceBindingGuard)
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(
    @Body() body: { toEmail: string; subject?: string; message?: string }
  ) {
    const recipient = body.toEmail?.trim();
    if (!recipient || !recipient.includes('@')) {
      return {
        success: false,
        error: 'Please provide a valid recipient email address',
      };
    }

    const subject = body.subject?.trim() || 'FundedGiants SendBaba Live Delivery Test';
    const message =
      body.message?.trim() ||
      'This is an official live delivery verification email sent via SendBaba Transactional Infrastructure.';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #070a08; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #1b3322;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #10b981; margin: 0; font-size: 24px;">FundedGiants</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Live Email Infrastructure Test</p>
        </div>
        <div style="background: #0f1712; padding: 20px; border-radius: 8px; border: 1px solid #1b3322; margin-bottom: 20px;">
          <p style="margin-top: 0; color: #e2e8f0; font-size: 15px; line-height: 1.6;">${message}</p>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1b3322; font-size: 12px; color: #94a3b8;">
            <div><strong>Timestamp:</strong> ${new Date().toUTCString()}</div>
            <div><strong>Delivery Provider:</strong> SendBaba API Engine</div>
            <div><strong>Sender:</strong> ${this.sendbabaService.fromEmail}</div>
            <div><strong>Recipient:</strong> ${recipient}</div>
          </div>
        </div>
        <p style="color: #64748b; font-size: 12px; text-align: center; margin-bottom: 0;">
          © ${new Date().getFullYear()} FundedGiants Prop Firm. All rights reserved.
        </p>
      </div>
    `;

    const res = await this.sendbabaService.sendEmail({
      to: recipient,
      subject,
      html,
      text: `${subject}\n\n${message}\n\nTimestamp: ${new Date().toISOString()}`,
      tags: ['fundedgiants-test'],
    });

    return {
      success: res.success,
      message: res.success
        ? `Test email sent successfully to ${recipient} (Message ID: ${res.messageId})`
        : `Delivery failed: ${res.error}`,
      details: res,
    };
  }

  /**
   * Admin Endpoint: Integration status, connection latency and webhook info
   * GET /api/v1/admin/integrations/sendbaba/status
   */
  @Get('admin/integrations/sendbaba/status')
  @UseGuards(DeviceBindingGuard)
  async getStatus() {
    const test = await this.sendbabaService.testConnection();
    return {
      success: true,
      configured: this.sendbabaService.isConfigured(),
      apiUrl: this.sendbabaService.apiUrl,
      orgId: this.sendbabaService.orgId,
      senderEmail: this.sendbabaService.fromEmail,
      senderName: this.sendbabaService.fromName,
      syncWebhookUrl: this.sendbabaService.syncWebhookUrl,
      inboundWebhookUrl: 'https://api.fundedgiants.ng/api/v1/webhooks/sendbaba',
      connection: test,
    };
  }

  /**
   * External Feed Endpoint for SendBaba Dashboard Data Sync ("api_url" method)
   * GET /api/v1/integrations/sendbaba/feed
   */
  @Get('integrations/sendbaba/feed')
  async getFeed(
    @Query('key') queryKey?: string,
    @Headers('authorization') authHeader?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    // Validate that caller provides either our SendBaba API key or webhook secret
    const expectedKey = this.sendbabaService.apiKey;
    const bearer = authHeader?.replace(/^Bearer\s+/i, '').trim();
    const provided = queryKey || bearer;

    if (expectedKey && provided !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing authorization key for SendBaba feed');
    }

    const pageNum = parseInt(page || '1', 10);
    const limitNum = Math.min(parseInt(limit || '500', 10), 1000);
    const skip = (pageNum - 1) * limitNum;

    return this.sendbabaService.getContactsFeed(skip, limitNum);
  }

  /**
   * Inbound Webhook Endpoint for SendBaba Events
   * POST /api/v1/webhooks/sendbaba
   * Events: email.sent, email.delivered, email.opened, email.clicked, email.bounced, email.unsubscribed
   */
  @Post('webhooks/sendbaba')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-sendbaba-signature') signature?: string,
    @Req() req?: Request
  ) {
    const event = body.event || body.type || 'unknown';
    const payload = body.data || body;

    // Optional HMAC signature verification
    const rawBody = (req as any)?.rawBody || JSON.stringify(body);
    const isValid = this.sendbabaService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('SendBaba inbound webhook signature verification failed.');
      return { success: false, error: 'Invalid HMAC signature' };
    }

    const result = await this.sendbabaService.handleWebhookEvent(event, payload);
    return {
      success: true,
      result,
    };
  }
}
