import { Injectable, Logger } from '@nestjs/common';

export interface AiChatAnswer {
  reply: string;
  isEscalated: boolean;
  suggestedQuestions?: string[];
  actionLink?: {
    label: string;
    url: string;
  };
}

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);

  // Authoritative FundedGiants Knowledge Base
  private readonly KNOWLEDGE_BASE = {
    company: {
      name: 'FundedGiants',
      currency: 'Nigerian Naira (NGN - ₦)',
      tagline: "Nigeria's Premier Naira-Denominated Proprietary Trading Firm",
      supportEmail: 'support@fundedgiants.ng',
      whatsappPhone: process.env.SUPPORT_WHATSAPP_PHONE || '2348000000000',
    },
    programs: [
      {
        name: 'Rhino Rush (1-Step Evaluation)',
        type: 'Evaluation Challenge',
        sizes: '₦1,000,000 to ₦50,000,000',
        profitTarget: '10% cumulative qualified gain',
        dailyProfitCap: '2% maximum per day (excess profit above 2% in a single day is cleared at 23:00 GMT+1 session reset)',
        minTradingDays: '5 days (with 2% daily cap, 5 trading days achieves 10%)',
        dailyDrawdown: '4% (evaluated against 23:00 GMT+1 baseline: higher of starting day balance or equity)',
        maxDrawdown: '10% static floor (permanently locked at 90% of initial starting capital, zero trailing)',
        leverage: '1:100',
        platform: 'SteraTrader (iOS, Android, Windows, Web)',
        fundedProfitSplit: '80% trader payout share on the resulting funded account',
        promotion: 'When 10% qualified profit target is met with 5+ trading days, the evaluation account is automatically passed, Completion Certificate stamped, and a brand-new Funded Account is issued in group fg-rr-funded!',
      },
      {
        name: 'Phoenix Rise (Instant Funding)',
        type: 'Direct Funded Trading (No Challenge / No Evaluation)',
        sizes: '₦1,000,000 to ₦50,000,000',
        profitTarget: 'No evaluation! Live funded trading immediately.',
        payoutRequirements: 'Payout #1 requires 10% profit target. Subsequent payouts require 2% profit target.',
        dailyDrawdown: '4% (evaluated against 23:00 GMT+1 baseline)',
        maxDrawdown: '7% static floor (permanently locked at 93% of initial balance)',
        leverage: '1:100',
        platform: 'SteraTrader',
        profitSplit: '80% trader share',
        postPayoutAction: 'Account balance is cleanly reset to initial starting capital via SteraTrader withdrawal debit, retaining the exact same trading account.',
      },
    ],
    rules: {
      weekendHolding: 'Permitted. Traders are allowed to hold open positions over weekends.',
      overnightHolding: 'Permitted. Traders are allowed to hold swing positions overnight.',
      newsTrading: 'Permitted. Trading during high-impact economic news events is allowed.',
      eaAndBots: 'Permitted. Expert Advisors (EAs) and automated trading algorithms are allowed (except latency arbitrage and toxic high-frequency quote stuffing).',
      inactivityLimit: '30 consecutive calendar days. At least one trade must be opened/closed every 30 days to keep the account active.',
    },
    banking: {
      deposits: 'Automated deposit vault via dedicated Nigerian Interbank Virtual Account (Nomba Banking). Funds credit instantly to your Giants Vault.',
      payouts: 'Direct local bank transfer to any commercial bank in Nigeria (Zenith, GTBank, Access, Kuda, Moniepoint, OPay, UBA, FirstBank, etc.).',
      profitSplit: '80% trader share / 20% firm share.',
      turnaround: 'Payout requests are verified and approved within 15 to 45 minutes.',
    },
    kyc: {
      provider: 'Ninja KYC (automated BVN lookup and facial liveness verification).',
      unlockCondition: 'KYC is unlocked only after you pass a Rhino Rush evaluation challenge or hit payout profit on Phoenix Rise. Unqualified accounts do not need KYC.',
    },
  };

  /**
   * Process a customer query and generate an AI-assisted answer
   */
  async generateResponse(query: string, context?: {
    traderName?: string;
    isLoggedIn?: boolean;
    userAccounts?: any[];
  }): Promise<AiChatAnswer> {
    const q = query.trim().toLowerCase();
    const traderName = context?.traderName ? context.traderName.split(' ')[0] : 'there';
    const whatsappUrl = `https://wa.me/${this.KNOWLEDGE_BASE.company.whatsappPhone}?text=${encodeURIComponent(
      `Hello FundedGiants Support, my name is ${context?.traderName || 'Trader'} and I need assistance with: "${query.slice(0, 100)}"`
    )}`;

    // 1. Check for Explicit Escalation Triggers
    const escalationKeywords = [
      'human',
      'agent',
      'representative',
      'talk to someone',
      'speak with someone',
      'real person',
      'escalate',
      'fraud',
      'scam',
      'lawyer',
      'dispute',
      'breach appeal',
      'reinstate',
      'refund',
      'manager',
      'call me',
    ];

    const isExplicitEscalation = escalationKeywords.some((kw) => q.includes(kw));

    if (isExplicitEscalation) {
      return {
        reply: `Hello ${traderName}, I understand you would like to speak directly with our senior human support team. Your inquiry has been prioritized for concierge review. You can connect with our assigned 24/7 human desk immediately on WhatsApp or reply here and an agent will join this thread.`,
        isEscalated: true,
        actionLink: {
          label: 'Chat with 24/7 VIP Concierge on WhatsApp',
          url: whatsappUrl,
        },
        suggestedQuestions: [
          'What are the rules for Rhino Rush?',
          'How do payouts work?',
          'Check my account status',
        ],
      };
    }

    // 2. Try External LLM if configured
    if (process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY) {
      try {
        const llmAnswer = await this.callExternalLlm(query, context);
        if (llmAnswer) return llmAnswer;
      } catch (err: any) {
        this.logger.warn(`External LLM fallback triggered: ${err.message}`);
      }
    }

    // 3. High-Precision Deterministic Knowledge Engine
    return this.matchKnowledgeBase(q, traderName, whatsappUrl);
  }

  /**
   * High-Precision Knowledge Matching Engine
   */
  private matchKnowledgeBase(q: string, traderName: string, whatsappUrl: string): AiChatAnswer {
    // A. 2% Daily Profit Cap / Excess Profit Clearing
    if (q.includes('2%') || q.includes('cap') || q.includes('daily profit') || q.includes('excess profit') || q.includes('cleared')) {
      return {
        reply: `Hi ${traderName}! Here is how the **2% Daily Profit Cap** operates on **Rhino Rush (1-Step Evaluation)**:

• **Maximum Capped Gain:** A trader can bank up to a maximum of **2% of starting capital per day** towards the 10% evaluation profit target.
• **Excess Profit Clearing:** If you make more than 2% in a single day (e.g. 2.1% or 3%), the excess profit above 2% is debited from both your SteraTrader balance and dashboard at the **23:00 GMT+1 session reset**.
• **Natural Growth:** When you resume the next morning, your balance begins cleanly at the 2% capped baseline.
• **Target Goal:** By earning up to 2% daily over 5 trading days, you achieve the full **10% target** and pass the evaluation!`,
        isEscalated: false,
        suggestedQuestions: [
          'What are the drawdown limits?',
          'How does promotion to funded work?',
          'Can I hold trades overnight?',
        ],
      };
    }

    // B. Rhino Rush (1-Step Evaluation Rules)
    if (q.includes('rhino') || q.includes('1 step') || q.includes('1-step') || q.includes('evaluation rules') || q.includes('pass challenge')) {
      return {
        reply: `Here are the official rules for the **Rhino Rush (1-Step Evaluation)** program:

• **Profit Target:** 10% cumulative qualified gain.
• **Daily Profit Cap:** Maximum 2% per day towards target.
• **Minimum Trading Days:** 5 days.
• **Daily Drawdown Limit:** 4% (evaluated against the 23:00 GMT+1 baseline).
• **Maximum Drawdown Limit:** 10% static floor (permanently locked at 90% of initial starting capital; zero trailing).
• **Trading Platform:** SteraTrader (1:100 leverage).
• **Holding Rules:** Overnight and weekend holding are 100% permitted. News trading is allowed.
• **Passing Milestone:** Once you achieve 10% target with 5 trading days, you receive a Completion Certificate and are automatically upgraded to a live **Funded Account (80% profit split)**!`,
        isEscalated: false,
        suggestedQuestions: [
          'What is Phoenix Rise Instant Funding?',
          'How do payouts work?',
          'Where do I download SteraTrader?',
        ],
      };
    }

    // C. Phoenix Rise (Instant Funding Rules)
    if (q.includes('phoenix') || q.includes('instant') || q.includes('no challenge')) {
      return {
        reply: `The **Phoenix Rise** program offers **instant funded trading** with zero evaluation phase:

• **Account Sizes:** ₦1,000,000 to ₦50,000,000.
• **No Evaluation:** Trade real capital and earn real profit from day one.
• **Daily Drawdown Limit:** 4% evaluated against 23:00 GMT+1 baseline.
• **Maximum Drawdown Limit:** 7% static floor (locked at 93% of initial balance).
• **Payout Requirements:**
  - **Payout #1:** Requires reaching a **10%** profit target.
  - **Subsequent Payouts:** Require only a **2%** profit target!
• **Profit Share:** 80% to the trader, paid directly to your Nigerian bank account.
• **Post-Payout:** Your account balance resets back to initial capital cleanly via SteraTrader withdrawal transaction, keeping your existing account.`,
        isEscalated: false,
        suggestedQuestions: [
          'How do I request a withdrawal?',
          'What bank accounts are supported?',
          'How do I verify KYC?',
        ],
      };
    }

    // D. Drawdown & Loss Limits
    if (q.includes('drawdown') || q.includes('daily loss') || q.includes('max loss') || q.includes('limit')) {
      return {
        reply: `FundedGiants enforces transparent, static drawdown limits:

1. **Daily Drawdown (4%):**
   - Calculated as 4% of the starting day baseline (the higher of your balance or equity at 23:00 GMT+1 / 22:00 UTC).
   - Includes both open floating trades and closed trades.

2. **Maximum Drawdown (Static Floor):**
   - **Rhino Rush (1-Step):** 10% static floor (balance/equity must never drop below 90% of initial balance).
   - **Phoenix Rise (Instant):** 7% static floor (balance/equity must never drop below 93% of initial balance).
   - **Zero Trailing Risk:** Unlike other firms, our max drawdown floor never trails up as you make profits!`,
        isEscalated: false,
        suggestedQuestions: [
          'How does the 23:00 session reset work?',
          'Can I hold trades over the weekend?',
          'How do payouts work?',
        ],
      };
    }

    // E. Payouts, Withdrawals & Profits
    if (q.includes('payout') || q.includes('withdraw') || q.includes('disbursement') || q.includes('profit split') || q.includes('bank')) {
      return {
        reply: `FundedGiants operates semi-automated payouts in Nigerian Naira:

• **Profit Split:** Traders keep **80%** of all generated trading profits.
• **Payout Eligibility:**
  - **Rhino Rush Funded:** Any trading profit generated above starting capital.
  - **Phoenix Rise:** 10% profit on 1st payout; 2% profit on subsequent payouts.
• **Disbursement Rail:** Disbursed directly to your verified Nigerian commercial bank account (GTBank, Zenith, Access, Kuda, Moniepoint, OPay, UBA, etc.) via Nomba Banking.
• **Turnaround:** Payout requests are verified by our compliance desk and disbursed within **15 to 45 minutes**!
• **Certificate:** An official verified Payout Certificate is stamped and published to your portal and the public payout ledger.`,
        isEscalated: false,
        suggestedQuestions: [
          'How does KYC verification work?',
          'What happens after a payout is approved?',
          'View the live payout tracker',
        ],
      };
    }

    // F. Trading Platform (SteraTrader)
    if (q.includes('steratrader') || q.includes('mt5') || q.includes('platform') || q.includes('app') || q.includes('login') || q.includes('download')) {
      return {
        reply: `FundedGiants utilizes **SteraTrader** as our official trading technology platform (we do **not** use MT5):

• **Compatibility:** Available on Android (Google Play), iOS (Apple App Store), Windows Desktop, and WebTrader.
• **Server:** Select **Velton-Live** or **FundedGiants** in the SteraTrader server search.
• **Credentials:** When your account is provisioned, your SteraTrader Login ID and Master Password are displayed in your trader dashboard under **Trading Accounts**.
• **Leverage:** 1:100 on forex, commodities, and indices.`,
        isEscalated: false,
        suggestedQuestions: [
          'Where do I find my account password?',
          'Can I trade news on SteraTrader?',
          'What are the trading hours?',
        ],
      };
    }

    // G. KYC & Identity Verification
    if (q.includes('kyc') || q.includes('ninja') || q.includes('verify') || q.includes('identity') || q.includes('bvn')) {
      return {
        reply: `Identity verification on FundedGiants is powered by **Ninja KYC**:

• **When is KYC required?** KYC is **unlocked only after you qualify** (either by passing a Rhino Rush evaluation challenge or reaching payout profit on Phoenix Rise). If you have not qualified yet, KYC is locked and not needed.
• **Verification Requirements:** Government BVN matching and a live facial selfie.
• **Anti-Double Billing:** The portal reuses your secure session so you are never charged twice for verification.
• **Virtual Account Activation:** Completing KYC automatically activates your dedicated interbank deposit vault on Nomba Banking.`,
        isEscalated: false,
        suggestedQuestions: [
          'What is the Giants Vault?',
          'How do I pass the evaluation challenge?',
          'Speak with support',
        ],
      };
    }

    // H. Deposits, Giants Vault & Funding
    if (q.includes('deposit') || q.includes('fund wallet') || q.includes('vault') || q.includes('virtual account')) {
      return {
        reply: `Funding your account is instant through the **Giants Vault**:

• **Dedicated Account Number:** Each verified trader receives a dedicated virtual bank account number (Nomba Banking / Nombank MFB) tied directly to their profile.
• **Instant Credit:** Simply transfer Naira from your bank app to your dedicated account number. Your Giants Vault balance updates instantly.
• **Zero Payment Gateway Friction:** No card failures or foreign exchange markups.`,
        isEscalated: false,
        suggestedQuestions: [
          'How do I buy a challenge?',
          'How do payouts work?',
          'What are the account sizes?',
        ],
      };
    }

    // I. Inactivity Rule
    if (q.includes('inactivity') || q.includes('30 day') || q.includes('how long') || q.includes('dormant')) {
      return {
        reply: `FundedGiants has a **30-Day Inactivity Rule**:

• Traders must place at least one trade (open or closed) every **30 consecutive calendar days**.
• If an account has zero trading activity for 30 consecutive days, the risk engine flags it as breached due to inactivity.
• To keep your account active, simply execute at least one small trade within every 30-day window!`,
        isEscalated: false,
        suggestedQuestions: [
          'What are the drawdown rules?',
          'Can I hold trades overnight?',
        ],
      };
    }

    // Default Fallback
    return {
      reply: `Hello ${traderName}! I am the FundedGiants 24/7 AI Concierge. I can assist you with all information regarding our **Rhino Rush (1-Step)** evaluation challenges, **Phoenix Rise (Instant Funding)** accounts, **SteraTrader** setup, 2% daily profit caps, 4% daily drawdown, and instant local Naira payouts!

How can I help you succeed with FundedGiants today?`,
      isEscalated: false,
      suggestedQuestions: [
        'How does Rhino Rush work?',
        'What is Phoenix Rise Instant Funding?',
        'How do payouts work?',
        'Explain the 2% daily profit cap',
      ],
    };
  }

  /**
   * Optional External LLM Integration (OpenAI or Gemini)
   */
  private async callExternalLlm(query: string, context?: any): Promise<AiChatAnswer | null> {
    const apiKey = process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const systemPrompt = `You are the official 24/7 AI Concierge and Support Assistant for FundedGiants (fundedgiants.ng), Nigeria's premier Naira proprietary trading firm.
You answer questions accurately, professionally, and concisely using the following authoritative rules:
- Two account programs:
  1. Rhino Rush (1-Step Evaluation): 10% target, 4% daily drawdown, 10% static max drawdown floor. Promotes to funded account with 80% profit split upon passing. (Note: The 2% daily profit cap on evaluation is an internal risk assessment mechanism, not an obstacle to passing or failing).
  2. Phoenix Rise (Instant Funding): No challenge! Instant live trading. 4% daily drawdown, 7% static max drawdown floor. Payout #1 requires 10% profit; subsequent payouts require 2% profit. 80% trader profit split. Balance resets to starting capital post-payout.
- Trading platform is SteraTrader (NOT MT5). Leverage 1:100. Server: Velton-Live.
- News trading, overnight holding, and weekend holding are all permitted.
- Payouts are paid in Nigerian Naira (NGN) within 15-45 minutes to Nigerian commercial bank accounts via Nomba Banking.
- Dedicated deposit vault via Nomba virtual account.
- 30-day inactivity rule applies.
- Ninja KYC is only required after qualifying (passing evaluation or reaching profit target).
- If the user asks for a human agent or reports a complex dispute, acknowledge and advise them to connect with the human concierge desk.`;

    try {
      if (process.env.OPENAI_API_KEY) {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query },
            ],
            temperature: 0.3,
            max_tokens: 400,
          }),
        });

        const data = await res.json();
        const reply = data?.choices?.[0]?.message?.content;
        if (reply) {
          return {
            reply,
            isEscalated: query.toLowerCase().includes('human') || query.toLowerCase().includes('agent'),
          };
        }
      }
    } catch {}

    return null;
  }
}
