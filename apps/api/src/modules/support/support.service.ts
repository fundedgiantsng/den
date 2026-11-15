import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, TicketCategory, TicketPriority, TicketStatus, UserRole } from '@fundedgiants/database';
import { CreateTicketDto, ReplyTicketDto, UpdateTicketStatusDto } from './dto/support.dto';

@Injectable()
export class SupportService {
  /**
   * Official Knowledge Base & FAQs
   */
  getFaqs() {
    return [
      {
        category: 'Challenges & Trading Rules',
        faqs: [
          {
            q: 'How does the Rhino Rush 2% maximum daily profit cap work?',
            a: 'On Rhino Rush accounts, daily profit is capped at 2% of the account size per trading day. Any profit generated exceeding this 2% cap does not count towards your overall profit target and is automatically cleared/reset at the daily server reset time (00:00 UTC+1).',
          },
          {
            q: 'How is daily drawdown calculated on FundedGiants accounts?',
            a: 'Daily drawdown is strictly calculated based on the higher of starting daily balance or equity, and is fully inclusive of all open and closed trades. If your open equity or closed balance dips below the permissible daily loss boundary at any millisecond during the session, it triggers a daily drawdown breach.',
          },
          {
            q: 'Can I hold trades overnight and over weekends?',
            a: 'Yes, overnight holding is allowed across all FundedGiants challenges. Weekend holding is permitted on Phoenix Rise accounts without restriction.',
          },
          {
            q: 'What trading platform does FundedGiants use?',
            a: 'FundedGiants is powered by SteraTrader with institutional liquidity, ultra-low latency execution, raw spreads, and fixed NGN denomination.',
          },
        ],
      },
      {
        category: 'Payouts & Giants Vault',
        faqs: [
          {
            q: 'When can I request my trading payouts?',
            a: 'FundedGiants supports daily payouts on eligible funded accounts! Payouts are credited directly to your Giants Vault in Nigerian Naira (NGN), from which you can withdraw to any Nigerian commercial bank account or spend via your Giants Verve Card.',
          },
          {
            q: 'How long do bank withdrawals take?',
            a: 'Withdrawals from your Giants Vault are processed automatically via automated banking settlement and typically arrive in your registered Nigerian bank account within minutes.',
          },
        ],
      },
      {
        category: 'NinjaKYC & Identity Verification',
        faqs: [
          {
            q: 'Why is NinjaKYC verification required?',
            a: 'NinjaKYC verifies your Bank Verification Number (BVN) against your legal identity to comply with Nigerian banking regulations and to immediately auto-provision your dedicated Lenco bank deposit account.',
          },
          {
            q: 'Is my BVN safe with FundedGiants?',
            a: 'Yes. FundedGiants uses military-grade encryption and never stores your raw BVN. Verification is handled securely by NinjaKYC.',
          },
        ],
      },
      {
        category: 'Giants Verve Debit Card',
        faqs: [
          {
            q: 'How do I request a physical Giants Verve Card?',
            a: 'Navigate to the Giants Spend Card section under Wallet, click "Request Card", customize the embossed name on your card, and submit. Once approved by admin, your card is printed and dispatched for local delivery.',
          },
          {
            q: 'Can I spend directly from my Giants Vault with the card?',
            a: 'Yes! The Giants Verve Card is directly debited from your Giants Vault for ATM cash withdrawals, POS terminal payments, and local web checkouts nationwide.',
          },
        ],
      },
    ];
  }

  /**
   * WhatsApp Assigned Customer Support Agent info
   */
  getWhatsAppAgentContact(user?: { firstName?: string; lastName?: string; email?: string }) {
    // Official FundedGiants Customer Support WhatsApp line
    const supportPhone = process.env.SUPPORT_WHATSAPP_PHONE || '2348000000000';
    const traderName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Trader';
    const email = user?.email || '';

    const text = `Hello FundedGiants Support, my name is ${traderName}${email ? ` (${email})` : ''}. I need assistance with my account.`;
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(text)}`;

    return {
      agentName: 'FundedGiants Priority Concierge',
      supportPhone: `+${supportPhone}`,
      availableHours: '24/7 Priority Support',
      whatsappUrl,
    };
  }

  /**
   * List tickets for a specific user
   */
  async getUserTickets(userId: string) {
    return prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get single ticket by ID with full conversation
   */
  async getTicketById(ticketId: string, userId?: string) {
    const whereClause: any = { id: ticketId };
    if (userId) whereClause.userId = userId;

    const ticket = await prisma.supportTicket.findFirst({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found.');
    }

    return ticket;
  }

  /**
   * Create a new support ticket
   */
  async createTicket(userId: string, dto: CreateTicketDto) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    const ticketNumber = `FG-TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        subject: dto.subject.trim(),
        category: dto.category || TicketCategory.OTHER,
        priority: dto.priority || TicketPriority.NORMAL,
        status: TicketStatus.OPEN,
        relatedAccountId: dto.relatedAccountId?.trim() || null,
        assignedAgentName: 'Support Team',
        messages: {
          create: {
            senderId: userId,
            senderRole: user.role,
            senderName: `${user.firstName || 'Valued'} ${user.lastName || 'Trader'}`.trim(),
            message: dto.message.trim(),
          },
        },
      },
      include: {
        messages: true,
      },
    });

    return ticket;
  }

  /**
   * Reply to an existing ticket
   */
  async replyTicket(params: {
    ticketId: string;
    senderId: string;
    senderRole: UserRole;
    senderName: string;
    message: string;
  }) {
    const { ticketId, senderId, senderRole, senderName, message } = params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found.');
    }

    const newStatus = senderRole === UserRole.CUSTOMER ? TicketStatus.OPEN : TicketStatus.IN_PROGRESS;

    const [ticketMessage] = await prisma.$transaction([
      prisma.ticketMessage.create({
        data: {
          ticketId,
          senderId,
          senderRole,
          senderName,
          message: message.trim(),
        },
      }),
      prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
      }),
    ]);

    return ticketMessage;
  }

  /**
   * Admin: get all tickets with filtering
   */
  async getAllTicketsAdmin(filter?: {
    status?: TicketStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    search?: string;
  }) {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.category) where.category = filter.category;
    if (filter?.priority) where.priority = filter.priority;
    if (filter?.search) {
      where.OR = [
        { ticketNumber: { contains: filter.search, mode: 'insensitive' } },
        { subject: { contains: filter.search, mode: 'insensitive' } },
        { user: { email: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Admin: update status & assigned agent
   */
  async updateTicketStatusAdmin(ticketId: string, dto: UpdateTicketStatusDto) {
    const data: any = {
      status: dto.status,
      updatedAt: new Date(),
    };

    if (dto.assignedAgentName) {
      data.assignedAgentName = dto.assignedAgentName;
    }

    if (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) {
      data.resolvedAt = new Date();
    }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data,
    });
  }

  /**
   * Live Chat: Get messages for user
   */
  async getLiveChatMessages(userId: string) {
    return prisma.liveChatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  /**
   * Live Chat: Send a message
   */
  async sendLiveChatMessage(params: {
    userId: string;
    senderRole: UserRole;
    senderName: string;
    message: string;
  }) {
    const { userId, senderRole, senderName, message } = params;

    const userMessage = await prisma.liveChatMessage.create({
      data: {
        userId,
        senderRole,
        senderName,
        message: message.trim(),
      },
    });

    // If customer sends a message and there are few messages, provide an instant concierge acknowledgment
    if (senderRole === UserRole.CUSTOMER) {
      const msgCount = await prisma.liveChatMessage.count({ where: { userId } });
      if (msgCount <= 2) {
        setTimeout(async () => {
          try {
            await prisma.liveChatMessage.create({
              data: {
                userId,
                senderRole: UserRole.SUPPORT,
                senderName: 'FundedGiants Concierge',
                message: `Hello ${senderName.split(' ')[0]}! A dedicated support specialist has received your message and is reviewing your account. You can also reach our assigned WhatsApp concierge anytime.`,
              },
            });
          } catch (e) {
            // Ignore background error
          }
        }, 1500);
      }
    }

    return userMessage;
  }

  /**
   * Admin: Get all live chat active conversations
   */
  async getAllLiveChatThreadsAdmin() {
    // Find unique users who have chat messages
    const chatUsers = await prisma.liveChatMessage.findMany({
      distinct: ['userId'],
      select: {
        userId: true,
      },
    });

    const threads = await Promise.all(
      chatUsers.map(async ({ userId }) => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            kycStatus: true,
          },
        });

        const lastMessage = await prisma.liveChatMessage.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.liveChatMessage.count({
          where: { userId, senderRole: UserRole.CUSTOMER, isRead: false },
        });

        return {
          user,
          lastMessage,
          unreadCount,
        };
      })
    );

    return threads.sort((a, b) => {
      const timeA = a.lastMessage?.createdAt.getTime() || 0;
      const timeB = b.lastMessage?.createdAt.getTime() || 0;
      return timeB - timeA;
    });
  }
}
