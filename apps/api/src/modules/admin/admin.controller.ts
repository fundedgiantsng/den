import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AdminService, AdminActionContext } from './admin.service';
import { DeviceBindingGuard } from './device-binding.guard';
import { KycStatus, UserRole, ChallengeStatus, WithdrawalStatus } from '@fundedgiants/database';

@Controller('admin')
@UseGuards(DeviceBindingGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private extractContext(req: any, body?: any): AdminActionContext {
    return {
      adminId: req.headers['x-admin-id'] || 'ADMIN_OPERATOR',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      reason: body?.reason || 'Administrative action performed via control panel',
    };
  }

  // 1. Executive Dashboard Overview
  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  // 2. Customers Directory
  @Get('customers')
  getCustomers(
    @Query('search') search?: string,
    @Query('kycStatus') kycStatus?: KycStatus,
    @Query('role') role?: UserRole,
    @Query('isSuspended') isSuspended?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getCustomers({
      search,
      kycStatus,
      role,
      isSuspended: isSuspended !== undefined ? isSuspended === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  // 3. Customer 360 Details
  @Get('customers/:id')
  getCustomerDetails(@Param('id') id: string) {
    return this.adminService.getCustomerDetails(id);
  }

  // 4. Update Customer Status (Suspend / Reinstate / KYC override)
  @Patch('customers/:id/status')
  @HttpCode(HttpStatus.OK)
  updateCustomerStatus(
    @Param('id') id: string,
    @Body()
    body: {
      isSuspended?: boolean;
      suspensionReason?: string;
      kycStatus?: KycStatus;
      role?: UserRole;
      reason: string;
    },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.updateCustomerStatus(id, body, context);
  }

  // 4b. Impersonate Trader Customer
  @Post('customers/:id/impersonate')
  @HttpCode(HttpStatus.OK)
  impersonateCustomer(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const context = this.extractContext(req, body);
    return this.adminService.impersonateCustomer(id, context);
  }

  // 5. Challenges & Full Cycle Rule Management
  @Get('challenges/products')
  getChallengeProducts() {
    return this.adminService.getChallengeProducts();
  }

  @Post('challenges/products')
  @HttpCode(HttpStatus.CREATED)
  createChallengeProduct(@Body() body: any, @Req() req: any) {
    const context = this.extractContext(req, body);
    return this.adminService.createChallengeProduct(body, context);
  }

  @Patch('challenges/products/:id')
  @HttpCode(HttpStatus.OK)
  updateChallengeProduct(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.updateChallengeProduct(id, body, context);
  }

  @Post('challenges/grant')
  @HttpCode(HttpStatus.CREATED)
  grantChallengeToUser(@Body() body: any, @Req() req: any) {
    const context = this.extractContext(req, body);
    return this.adminService.grantChallengeToUser(body, context);
  }

  @Get('challenges')
  getChallenges(
    @Query('status') status?: ChallengeStatus,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getChallenges({
      status,
      search,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  // 6. SteraTrader Accounts
  @Get('trading-accounts')
  getTradingAccounts(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getTradingAccounts({
      search,
      status,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  // Administrative Account Kill-Switch
  @Post('trading-accounts/:id/terminate')
  @HttpCode(HttpStatus.OK)
  terminateTradingAccount(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.terminateTradingAccount(id, context);
  }

  // Administrative Account Reinstatement
  @Post('trading-accounts/:id/reinstate')
  @HttpCode(HttpStatus.OK)
  reinstateTradingAccount(
    @Param('id') id: string,
    @Body() body: { reason?: string; resetBalance?: boolean; targetBalanceNgn?: number; addBalanceNgn?: number },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.reinstateTradingAccount(id, body, context);
  }

  // Adjust Trading Account Balance (Deposit / Withdrawal)
  @Post('trading-accounts/:id/adjust-balance')
  @HttpCode(HttpStatus.OK)
  adjustTradingAccountBalance(
    @Param('id') id: string,
    @Body() body: { amountNgn: number; type?: 'deposit' | 'withdrawal'; reason?: string },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.adjustTradingAccountBalance(id, body, context);
  }

  // Adjust Customer Wallet Balance (Test / Demo Credit)
  @Post('customers/:id/wallet/adjust-balance')
  @HttpCode(HttpStatus.OK)
  adjustCustomerWalletBalance(
    @Param('id') id: string,
    @Body() body: { amountNgn: number; reason?: string },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.adjustCustomerWalletBalance(id, body, context);
  }

  // 7. Risk Events Log
  @Get('risk/events')
  getRiskEvents(
    @Query('eventType') eventType?: string,
    @Query('severity') severity?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getRiskEvents({
      eventType,
      severity,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  @Post('risk/events/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolveRiskEvent(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const context = this.extractContext(req, body);
    return this.adminService.resolveRiskEvent(id, context);
  }

  @Post('risk/accounts/:id/resolve-breaches')
  @HttpCode(HttpStatus.OK)
  resolveAccountRiskBreaches(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const context = this.extractContext(req, body);
    return this.adminService.resolveAccountRiskBreaches(id, context);
  }

  // 8. Financial Ledger Journal Entries
  @Get('finance/ledger')
  getLedgerEntries(
    @Query('transactionType') transactionType?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getLedgerEntries({
      transactionType,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  // 9. Withdrawals Queue
  @Get('finance/withdrawals')
  getWithdrawals(
    @Query('status') status?: WithdrawalStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getWithdrawals({
      status,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  // Process Withdrawal (Approve / Reject)
  @Post('finance/withdrawals/:id/process')
  @Post('withdrawals/:id/process')
  @HttpCode(HttpStatus.OK)
  processWithdrawal(
    @Param('id') id: string,
    @Body() body: { action: 'APPROVE' | 'APPROVE_MANUAL' | 'REJECT'; reason?: string; manualNote?: string },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.processWithdrawal(id, body, context);
  }

  // 10. Affiliates
  @Get('affiliates')
  getAffiliates(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.adminService.getAffiliates({
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 50,
    });
  }

  // Coupons
  @Get('affiliates/coupons')
  getCoupons() {
    return this.adminService.getCoupons();
  }

  @Post('affiliates/coupons')
  @HttpCode(HttpStatus.CREATED)
  createCoupon(
    @Body()
    body: {
      code: string;
      discountPercent: number;
      cpaDeductionPercent?: number;
      maxUses?: number;
      reason?: string;
    },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.createCoupon(body, context);
  }

  @Patch('affiliates/coupons/:code/toggle')
  @HttpCode(HttpStatus.OK)
  toggleCoupon(
    @Param('code') code: string,
    @Body() body: { isActive: boolean; reason?: string },
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.toggleCoupon(code, body.isActive, context);
  }

  @Put('affiliates/coupons/:code')
  @HttpCode(HttpStatus.OK)
  updateCoupon(
    @Param('code') code: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const context = this.extractContext(req, body);
    return this.adminService.updateCoupon(code, body, context);
  }

  @Delete('affiliates/coupons/:code')
  @HttpCode(HttpStatus.OK)
  deleteCoupon(
    @Param('code') code: string,
    @Req() req: any,
  ) {
    const context = this.extractContext(req);
    return this.adminService.deleteCoupon(code, context);
  }

  @Post('affiliates/coupons/:code/send-email')
  @HttpCode(HttpStatus.OK)
  sendCouponEmail(
    @Param('code') code: string,
    @Body() body: { emails: string[]; assignedPlan?: string; assignedSize?: number; discountPercent?: number },
  ) {
    return this.adminService.dispatchCouponEmails({
      code,
      discountPercent: body.discountPercent || 10,
      emails: body.emails,
      assignedPlan: body.assignedPlan,
      assignedSize: body.assignedSize,
    });
  }

  // 11. Immutable Audit Trail
  @Get('audit-logs')
  getAuditLogs(
    @Query('action') action?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.adminService.getAuditLogs({
      action,
      skip: skip ? parseInt(skip, 10) : 0,
      take: take ? parseInt(take, 10) : 100,
    });
  }
}
