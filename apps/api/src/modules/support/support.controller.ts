import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { AuthService } from '../auth/auth.service';
import {
  CreateTicketDto,
  ReplyTicketDto,
  UpdateTicketStatusDto,
  SendLiveChatMessageDto,
} from './dto/support.dto';
import { TicketCategory, TicketPriority, TicketStatus, UserRole } from '@fundedgiants/database';

@ApiTags('Help & Support')
@Controller('support')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly authService: AuthService,
  ) {}

  private async getSessionUserOrThrow(req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }
    const user = await this.authService.getSessionUser(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid');
    }
    return user;
  }

  // 1. FAQs & Knowledge Base
  @Get('faqs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get official knowledge base and FAQs' })
  getFaqs() {
    return {
      success: true,
      data: this.supportService.getFaqs(),
    };
  }

  // 2. WhatsApp Customer Support Agent Info
  @Get('agent-contact')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get assigned WhatsApp customer agent contact info' })
  async getAgentContact(@Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    const user = token ? await this.authService.getSessionUser(token) : null;
    return {
      success: true,
      data: this.supportService.getWhatsAppAgentContact(
        user ? { firstName: user.firstName ?? undefined, lastName: user.lastName ?? undefined, email: user.email ?? undefined } : undefined
      ),
    };
  }

  // 3. User Tickets
  @Get('tickets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all support tickets for current user' })
  async getUserTickets(@Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const tickets = await this.supportService.getUserTickets(user.id);
    return {
      success: true,
      data: tickets,
    };
  }

  @Get('tickets/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get single ticket with full message history' })
  async getTicketDetails(@Param('id') id: string, @Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const ticket = await this.supportService.getTicketById(id, user.role === UserRole.ADMIN ? undefined : user.id);
    return {
      success: true,
      data: ticket,
    };
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new support ticket' })
  async createTicket(@Body() dto: CreateTicketDto, @Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const ticket = await this.supportService.createTicket(user.id, dto);
    return {
      success: true,
      message: 'Support ticket submitted successfully.',
      data: ticket,
    };
  }

  @Post('tickets/:id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reply to a support ticket' })
  async replyTicket(@Param('id') id: string, @Body() dto: ReplyTicketDto, @Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const reply = await this.supportService.replyTicket({
      ticketId: id,
      senderId: user.id,
      senderRole: user.role,
      senderName: `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim(),
      message: dto.message,
    });
    return {
      success: true,
      message: 'Reply sent successfully.',
      data: reply,
    };
  }

  // 4. Live Chat
  @Get('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get live chat messages for user' })
  async getChatMessages(@Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const messages = await this.supportService.getLiveChatMessages(user.id);
    return {
      success: true,
      data: messages,
    };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send live chat message' })
  async sendChatMessage(@Body() dto: SendLiveChatMessageDto, @Req() req: any) {
    const user = await this.getSessionUserOrThrow(req);
    const message = await this.supportService.sendLiveChatMessage({
      userId: user.id,
      senderRole: user.role,
      senderName: `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim(),
      message: dto.message,
    });
    return {
      success: true,
      data: message,
    };
  }

  // ================= ADMIN ENDPOINTS ================= //

  @Get('admin/tickets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Get all support tickets' })
  async getAdminTickets(
    @Query('status') status?: TicketStatus,
    @Query('category') category?: TicketCategory,
    @Query('priority') priority?: TicketPriority,
    @Query('search') search?: string,
  ) {
    const tickets = await this.supportService.getAllTicketsAdmin({ status, category, priority, search });
    return {
      success: true,
      data: tickets,
    };
  }

  @Patch('admin/tickets/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Update ticket status and agent' })
  async updateAdminTicketStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    const updated = await this.supportService.updateTicketStatusAdmin(id, dto);
    return {
      success: true,
      message: 'Ticket updated successfully.',
      data: updated,
    };
  }

  @Post('admin/tickets/:id/reply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Reply to ticket as Support/Admin' })
  async adminReplyTicket(@Param('id') id: string, @Body() dto: ReplyTicketDto, @Req() req: any) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    const user = token ? await this.authService.getSessionUser(token) : null;
    const senderName = user?.firstName ? `${user.firstName} (Support)` : 'FundedGiants Support';
    const senderId = user?.id || 'admin-system';

    const reply = await this.supportService.replyTicket({
      ticketId: id,
      senderId,
      senderRole: UserRole.SUPPORT,
      senderName,
      message: dto.message,
    });

    return {
      success: true,
      message: 'Support reply dispatched.',
      data: reply,
    };
  }

  @Get('admin/chats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: List active live chat threads' })
  async getAdminChatThreads() {
    const threads = await this.supportService.getAllLiveChatThreadsAdmin();
    return {
      success: true,
      data: threads,
    };
  }

  @Get('admin/chats/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Get user live chat messages' })
  async getAdminUserChatMessages(@Param('userId') userId: string) {
    const messages = await this.supportService.getLiveChatMessages(userId);
    return {
      success: true,
      data: messages,
    };
  }

  @Post('admin/chats/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: Send live chat reply to user' })
  async adminSendChatMessage(
    @Param('userId') userId: string,
    @Body() dto: SendLiveChatMessageDto,
    @Req() req: any,
  ) {
    const token = req.cookies?.fg_session || req.headers['authorization']?.replace('Bearer ', '');
    const user = token ? await this.authService.getSessionUser(token) : null;
    const senderName = user?.firstName ? `${user.firstName} (Support)` : 'FundedGiants Concierge';

    const msg = await this.supportService.sendLiveChatMessage({
      userId,
      senderRole: UserRole.SUPPORT,
      senderName,
      message: dto.message,
    });

    return {
      success: true,
      data: msg,
    };
  }
}
