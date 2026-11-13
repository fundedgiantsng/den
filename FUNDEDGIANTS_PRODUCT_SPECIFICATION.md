# FundedGiants Complete Product Specification and Coding Requirements

**Document:** FUNDEDGIANTS_PRODUCT_SPECIFICATION.md  
**Version:** 1.0  
**Status:** Product and engineering baseline  
**Project:** FundedGiants  
**Currency:** Nigerian Naira (NGN / ₦)  
**Trading Platform:** SteraTrader  
**Wallet Funding and Payout Provider:** Lenco  
**KYC Provider:** Ninja  
**Public Website and Checkout:** Existing WordPress + WooCommerce  
**Initial OTP Channel:** SMS  
**Transactional Email:** SMTP provider, initially Brevo or Resend  
**Hosting Target:** OVHcloud VPS  
**Source Control:** GitHub

---

# 1. Product Overview

FundedGiants is a Naira-denominated proprietary trading firm and trader financial ecosystem.

The platform offers:

1. One-Step trading challenges.
2. Instant Funding challenges.
3. SteraTrader-powered trading accounts.
4. Customer NGN wallet.
5. Lenco dedicated virtual bank accounts for wallet funding.
6. Wallet-based challenge purchases.
7. Withdrawal of eligible trader earnings.
8. Withdrawal of affiliate commissions.
9. Custom physical NGN metal cards.
10. Affiliate program.
11. Customer KYC.
12. Customer dashboard.
13. Administrative portal.
14. Risk management and challenge evaluation.
15. Financial accounting and reconciliation.
16. Customer support and notifications.

The customer dashboard and admin portal must be actual functional applications, not static UI mockups.

All financial, trading, authentication and operational functionality must use real backend services and database persistence.

---

# 2. Product Architecture

The application consists of:

- Customer web application.
- Administrative web application.
- Backend API.
- Background workers.
- Risk engine.
- Financial ledger.
- Wallet module.
- SteraTrader integration.
- Lenco integration.
- Ninja KYC integration.
- Notification service.
- Card issuing integration adapter.
- PostgreSQL database.
- Redis.

The existing WordPress/WooCommerce website remains the public website and checkout.

The dashboard must integrate with the existing commerce system without replacing it.

The platform must be production-grade from day one.

---

# 3. Customer Dashboard — Complete Page Hierarchy

The customer dashboard should use a persistent sidebar navigation on desktop and a responsive navigation pattern on mobile.

The sidebar should be grouped into meaningful sections.

## 3.1 Dashboard Overview

Route: `/dashboard`

### Purpose

Provide a consolidated summary of the customer's FundedGiants account.

### Features

- Total wallet balance.
- Available wallet balance.
- Pending wallet balance.
- Active challenge count.
- Active trading account count.
- Challenge progress summaries.
- Eligible trader earnings.
- Affiliate earnings.
- Recent transactions.
- Recent purchases.
- Recent notifications.
- KYC status.
- Card status.
- Quick actions.

### Quick actions

- Buy a challenge.
- Fund wallet.
- View challenges.
- Request a payout.
- View affiliate dashboard.
- Manage card.

All values must come from actual backend APIs.

Do not use hardcoded balances or simulated trading results.

---

# 4. Challenges

Navigation group: Challenges

## 4.1 Challenge Marketplace

Route: `/dashboard/challenges`

Purpose: Display available challenge products.

Subsections:

- All Challenges.
- One-Step Challenges.
- Instant Funding Challenges.
- Challenge comparison.

Features:

- Challenge package cards.
- Account sizes.
- Naira prices.
- Challenge category.
- Rules summary.
- Trading platform.
- Purchase eligibility.
- KYC requirements.
- Purchase CTA.
- Product availability.
- Filter and sorting.

The exact challenge packages, rules and affiliate program rules are already supplied in the existing frontend/business documentation.

Antigravity must use those provided rules as the source of truth.

Do not invent challenge prices, profit targets, drawdown percentages or trading restrictions.

## 4.2 Challenge Product Details

Route: `/dashboard/challenges/:productId`

Features:

- Challenge name.
- Challenge type.
- Account size.
- Purchase price.
- Rules.
- Trading conditions.
- Profit target.
- Drawdown rules.
- Payout eligibility.
- Account progression.
- Platform information.
- Purchase requirements.
- Buy button.

The displayed rules must be consistent with the configuration used by the backend risk engine.

## 4.3 Checkout

Route: `/dashboard/checkout/:productId`

Features:

- Selected challenge summary.
- Product price.
- Available wallet balance.
- Wallet payment option.
- External checkout option where supported.
- Insufficient balance indication.
- Purchase confirmation.
- Order creation.
- Payment status.
- Entitlement creation.
- Provisioning status.

Wallet purchases must be processed through an atomic financial transaction.

The backend must prevent duplicate purchases caused by repeated requests or browser refreshes.

The existing WooCommerce checkout remains supported.

## 4.4 My Challenges

Route: `/dashboard/my-challenges`

Tabs:

- All.
- Active.
- Pending Provisioning.
- Passed.
- Failed.
- Completed.

Features:

- Challenge list.
- Account size.
- Challenge type.
- Purchase date.
- Status.
- Trading account association.
- Progress.
- Details link.

## 4.5 Challenge Details

Route: `/dashboard/my-challenges/:challengeId`

Tabs:

### Overview

- Challenge status.
- Account size.
- Current balance.
- Current equity.
- Profit/loss.
- Progress.
- Trading account reference.
- Challenge stage.

### Rules

- Applicable challenge rules.
- Rule version.
- Trading restrictions.
- Drawdown conditions.
- Profit target.
- Challenge requirements.

### Performance

- Balance chart.
- Equity chart.
- Profit/loss chart.
- Trading metrics available through SteraTrader.
- Data freshness indicator.

### Trading Activity

- Trade history.
- Instrument.
- Direction.
- Volume.
- Entry and exit.
- Profit/loss.
- Trade timestamps.

### Activity Log

- Purchase.
- Provisioning.
- Challenge activation.
- Risk events.
- Status changes.
- Challenge progression.

The customer may view risk results but must not be able to modify challenge rules or risk evaluations.

---

# 5. Trading Accounts

Navigation group: Trading

## 5.1 Trading Accounts

Route: `/dashboard/trading-accounts`

Features:

- Trading account list.
- Account reference.
- Platform.
- Account size.
- Challenge association.
- Status.
- Current balance.
- Current equity.
- Account provisioning state.
- Account details.

## 5.2 Trading Account Details

Route: `/dashboard/trading-accounts/:accountId`

Tabs:

- Overview.
- Performance.
- Trading History.
- Challenge Rules.
- Account Information.

Features:

- Trading metrics.
- Balance.
- Equity.
- Profit/loss.
- Trading history.
- Applicable challenge rules.
- Account status.
- SteraTrader account reference.
- Synchronisation status.

Sensitive trading credentials must not be exposed in ordinary dashboard views.

The actual data and capabilities displayed must be limited to verified SteraTrader API functionality.

---

# 6. Wallet

Navigation group: Wallet

The wallet is a core financial feature.

It must be implemented using a proper ledger-backed accounting model.

## 6.1 Wallet Overview

Route: `/dashboard/wallet`

Features:

- Total wallet balance.
- Available balance.
- Pending balance.
- Reserved balance.
- Withdrawable earnings.
- Wallet transaction history.
- Funding CTA.
- Withdrawal CTA.
- Purchase CTA.

The system must distinguish between:

- Customer cash.
- Affiliate earnings.
- Trader earnings.
- Pending credits.
- Reserved funds.
- Promotional credit, if applicable.

Do not combine balances into a single withdrawable balance unless business rules explicitly permit it.

## 6.2 Fund Wallet

Route: `/dashboard/wallet/fund`

Features:

- Customer's dedicated Lenco virtual bank account.
- Bank name.
- Account name.
- Account number.
- Funding instructions.
- Minimum funding amount.
- Maximum funding amount where applicable.
- Deposit history.
- Pending deposit status.
- Successful deposit status.
- Failed deposit status.

Each eligible customer must be associated with their dedicated virtual account.

The virtual account must be created through the verified Lenco API and associated with the canonical FundedGiants customer ID.

## 6.3 Wallet Transactions

Route: `/dashboard/wallet/transactions`

Features:

- Deposits.
- Challenge purchases.
- Approved credits.
- Affiliate earnings credits.
- Trader earnings credits.
- Withdrawals.
- Card-related transactions where applicable.
- Transaction references.
- Dates.
- Amounts.
- Status.
- Filters.
- Search.
- Export.

Each transaction must link to its source record.

## 6.4 Withdraw Funds

Route: `/dashboard/wallet/withdraw`

Features:

- Available withdrawable balance.
- Withdrawal amount.
- Bank account selection.
- Bank account verification.
- Withdrawal fee display.
- Minimum and maximum withdrawal rules.
- Confirmation.
- Withdrawal request status.
- Withdrawal history.

Withdrawals must be allowed only from eligible balances.

The backend must validate:

- KYC status.
- Account status.
- Balance availability.
- Withdrawal limits.
- Source of earnings.
- Fraud and risk controls.
- Payout destination.
- Duplicate request prevention.

Lenco must be used for actual approved payout execution.

## 6.5 Bank Accounts

Route: `/dashboard/wallet/bank-accounts`

Features:

- Add bank account.
- Verify account.
- View saved bank accounts.
- Set preferred account.
- Remove bank account where allowed.

The bank account must be securely associated with the customer.

Account ownership checks must be applied.

---

# 7. Affiliate Program

Navigation group: Affiliates

The affiliate program rules are already supplied in the existing frontend/business documentation.

Antigravity must use those rules as the source of truth.

The program must be configurable, auditable and consistent across the frontend and backend.

## 7.1 Affiliate Overview

Route: `/dashboard/affiliate`

Features:

- Affiliate status.
- Referral link.
- Referral code.
- Total referrals.
- Registered referrals.
- Qualified referrals.
- Conversions.
- Total commissions.
- Available commissions.
- Pending commissions.
- Withdrawn commissions.
- Performance summary.

## 7.2 Referral Links

Route: `/dashboard/affiliate/links`

Features:

- Default referral link.
- Campaign links where supported.
- Link generation.
- Link copying.
- Campaign tracking.
- Referral attribution.
- Conversion tracking.

Referral attribution must be validated server-side.

## 7.3 Referrals

Route: `/dashboard/affiliate/referrals`

Features:

- Referral list.
- Referral date.
- Referral status.
- Qualified status.
- Purchase activity where disclosure is permitted.
- Commission qualification status.

Do not expose unnecessary personal or financial data about referred customers.

## 7.4 Commissions

Route: `/dashboard/affiliate/commissions`

Features:

- Commission history.
- Commission source.
- Commission amount.
- Currency.
- Status.
- Qualification date.
- Payment status.
- Transaction reference.

Statuses must include appropriate states such as pending, approved, available, paid, reversed and rejected.

## 7.5 Affiliate Withdrawals

Route: `/dashboard/affiliate/withdrawals`

Features:

- Available affiliate balance.
- Withdrawal request.
- Withdrawal destination.
- Withdrawal history.
- Status tracking.
- Lenco payout reference.

Affiliate earnings must be accounted for separately from customer deposits.

## 7.6 Affiliate Rules

Route: `/dashboard/affiliate/rules`

Features:

- Program terms.
- Commission calculation.
- Qualification requirements.
- Payout rules.
- Referral restrictions.
- Disqualification conditions.

Display the approved rules supplied by the owner.

Do not invent or alter commission rules.

---

# 8. Trader Earnings

Navigation group: Earnings

## 8.1 Earnings Overview

Route: `/dashboard/earnings`

Features:

- Total trader earnings.
- Pending earnings.
- Approved earnings.
- Available earnings.
- Withdrawn earnings.
- Earnings history.
- Payout eligibility.

Trader earnings must be distinct from affiliate commissions and wallet deposits.

## 8.2 Earnings History

Route: `/dashboard/earnings/history`

Features:

- Earnings records.
- Challenge/account association.
- Earnings amount.
- Qualification period.
- Approval status.
- Payment status.
- Reference.

## 8.3 Request Earnings Payout

Route: `/dashboard/earnings/withdraw`

Features:

- Available earnings.
- Withdrawal amount.
- Bank destination.
- Eligibility validation.
- Request confirmation.
- Payout status.

The payout workflow must use the approved FundedGiants payout rules.

Lenco must handle the actual disbursement.

---

# 9. Physical NGN Metal Card

Navigation group: Cards

The customer-facing card is a branded FundedGiants physical metal card.

The card must be tied to an approved spendable wallet balance.

Card issuance and processing require a confirmed card issuing provider.

Do not assume Lenco offers card issuing unless this capability is verified.

## 9.1 Card Overview

Route: `/dashboard/cards`

Features:

- Card status.
- Card type.
- Masked card number.
- Cardholder name.
- Available spending balance.
- Card order status.
- Recent card transactions.
- Manage card CTA.

## 9.2 Order Physical Card

Route: `/dashboard/cards/order`

Features:

- Card design selection where applicable.
- Cardholder name.
- Delivery address.
- Delivery details.
- Card order fee.
- Eligibility checks.
- KYC requirement.
- Order confirmation.
- Card production status.
- Delivery status.

Card order and fulfilment must be tracked.

## 9.3 Card Details

Route: `/dashboard/cards/:cardId`

Features:

- Masked card details.
- Card status.
- Cardholder information.
- Card limits.
- Linked wallet reference.
- Card transaction history.

Full card data must be displayed only through an approved PCI-compliant card provider flow.

FundedGiants must not store raw PAN or CVV.

## 9.4 Card Controls

Route: `/dashboard/cards/:cardId/manage`

Features, subject to provider capability:

- Freeze card.
- Unfreeze card.
- Block card.
- Replace card.
- Change PIN through secure provider workflow.
- Set spending limits.
- View transaction history.

## 9.5 Card Transactions

Route: `/dashboard/cards/transactions`

Features:

- Merchant.
- Amount.
- Currency.
- Date.
- Transaction status.
- Authorisation status.
- Reversal/refund status.

Card transactions must reconcile with the financial ledger.

---

# 10. KYC and Verification

Navigation group: Verification

## 10.1 Verification Overview

Route: `/dashboard/verification`

Features:

- KYC status.
- Verification progress.
- Verification requirements.
- Verification provider.
- Submitted information.
- Verification result.
- Reverification status.

## 10.2 Complete KYC

Route: `/dashboard/verification/complete`

Features:

- Start Ninja KYC flow.
- Secure verification session.
- Identity verification.
- Required selfie/liveness steps if enabled.
- Consent.
- Verification completion.
- Result handling.

KYC data must be processed securely.

Ninja webhooks must be verified before changing customer verification status.

## 10.3 Verification History

Route: `/dashboard/verification/history`

Features:

- Verification attempts.
- Date.
- Status.
- Reason for failure where available.
- Reverification option.

---

# 11. Orders and Purchases

Navigation group: Orders

## 11.1 Order History

Route: `/dashboard/orders`

Features:

- Order number.
- Product.
- Amount.
- Currency.
- Payment method.
- Status.
- Purchase date.
- Receipt.

## 11.2 Order Details

Route: `/dashboard/orders/:orderId`

Features:

- Order items.
- Product details.
- Amount.
- Payment reference.
- Payment status.
- Entitlement status.
- Account provisioning status.
- Receipt.
- Support link.

The dashboard must show the actual internal order and verified WooCommerce references.

---

# 12. Notifications

Route: `/dashboard/notifications`

Features:

- Notification list.
- Read/unread status.
- Notification categories.
- Notification preferences.
- Account security alerts.
- Purchase notifications.
- Challenge notifications.
- Wallet notifications.
- Payout notifications.
- Affiliate notifications.
- Card notifications.

Notifications must originate from backend events.

## Notification Preferences

Route: `/dashboard/settings/notifications`

Features:

- Email preferences.
- SMS preferences.
- Optional WhatsApp preferences in future.
- Transactional notification preferences.
- Marketing notification preferences.

Security-critical notifications must not be disabled where required.

---

# 13. Customer Support

Navigation group: Support

## 13.1 Support Overview

Route: `/dashboard/support`

Features:

- Open cases.
- Resolved cases.
- New case.
- Case status.
- Support announcements.

## 13.2 Create Support Case

Route: `/dashboard/support/new`

Features:

- Category.
- Subject.
- Description.
- Related order.
- Related challenge.
- Related trading account.
- Attachment upload where supported.
- Case submission.

## 13.3 Support Case Details

Route: `/dashboard/support/:caseId`

Features:

- Case conversation.
- Replies.
- Attachments.
- Status.
- Internal response timestamps.

Customers must not see internal notes.

---

# 14. Profile and Account Settings

Navigation group: Settings

## 14.1 Profile

Route: `/dashboard/settings/profile`

Features:

- Full name.
- Email.
- Phone number.
- Date of birth where required.
- Address.
- Profile updates.
- Verification status.

Sensitive profile changes may require reauthentication.

## 14.2 Security

Route: `/dashboard/settings/security`

Features:

- Login methods.
- Verified email.
- Verified phone.
- Session list.
- Active devices where supported.
- Revoke sessions.
- Account recovery.
- Security activity.

## 14.3 Account Preferences

Route: `/dashboard/settings/preferences`

Features:

- Display preferences.
- Timezone.
- Notification preferences.
- Language settings where supported.

## 14.4 Account Status

Route: `/dashboard/settings/account`

Features:

- Account status.
- Restrictions.
- Closure request where permitted.
- Legal and privacy information.

---

# 15. Administrative Portal

The admin portal must be a separate application with strict role-based access control.

Route prefix: `/admin`

It must not be treated as a customer dashboard with extra menu items.

The admin portal must provide operational, financial, compliance, risk, customer support and platform management functions.

# 16. Admin Dashboard Overview

Route: `/admin`

Features:

- Total customers.
- New registrations.
- KYC status summary.
- Total challenge purchases.
- Purchase revenue.
- Active challenges.
- Challenge pass/fail metrics.
- Trading account provisioning status.
- Wallet funding volume.
- Wallet balances.
- Pending withdrawals.
- Pending trader earnings payouts.
- Pending affiliate payouts.
- Card orders.
- Card status summary.
- Failed integrations.
- Failed background jobs.
- System health.

Sensitive financial data must be restricted according to permissions.

# 17. Admin Customer Management

Navigation: Customers

## 17.1 Customer List

Route: `/admin/customers`

Features:

- Search.
- Filter.
- Customer ID.
- Name.
- Email.
- Phone.
- Registration date.
- KYC status.
- Account status.
- Wallet status.
- Active challenges.

## 17.2 Customer Details

Route: `/admin/customers/:customerId`

Tabs:

- Overview.
- Profile.
- KYC.
- Orders.
- Challenges.
- Trading Accounts.
- Wallet.
- Affiliate.
- Earnings.
- Cards.
- Support.
- Audit History.

Features:

- Customer status.
- Account restrictions.
- Verification status.
- Purchase history.
- Challenge history.
- Trading account references.
- Wallet and ledger summaries.
- Affiliate records.
- Payout history.
- Card history.
- Support cases.

Administrative access to sensitive customer data must be logged.

## 17.3 Customer Actions

Possible actions, permission-dependent:

- Suspend customer.
- Reinstate customer.
- Restrict purchases.
- Restrict payouts.
- Request reverification.
- Revoke sessions.
- Add internal notes.
- View audit history.

High-risk actions must require a reason and be audited.

---

# 18. Admin KYC Management

Navigation: Verification

## 18.1 KYC Overview

Route: `/admin/kyc`

Features:

- Pending verification.
- Approved verification.
- Failed verification.
- Reverification requests.
- KYC provider status.

## 18.2 KYC Details

Route: `/admin/kyc/:verificationId`

Features:

- Customer reference.
- Ninja verification reference.
- Status.
- Verification timestamps.
- Verification outcome.
- Provider response summary.
- Review notes.

Do not expose unnecessary identity document data.

## 18.3 KYC Review

Where manual review is required:

- Review status.
- Request additional information.
- Approve or reject where legally and operationally permitted.
- Record decision reason.
- Audit decision.

Ninja results are evidence for the platform's decision, not a substitute for FundedGiants' own compliance process.

---

# 19. Admin Product and Challenge Management

Navigation: Products & Challenges

## 19.1 Product Catalog

Route: `/admin/products`

Features:

- Product list.
- Product type.
- Account size.
- Price in NGN.
- Availability.
- WooCommerce mapping.
- Product status.

## 19.2 Product Details

Route: `/admin/products/:productId`

Features:

- Product configuration.
- Pricing.
- Challenge type.
- Account size.
- SteraTrader configuration reference.
- Entitlement rules.
- WooCommerce product mapping.
- Publication status.

## 19.3 Challenge Rule Management

Route: `/admin/challenge-rules`

Features:

- Rule sets.
- Rule versioning.
- Challenge type association.
- Profit targets.
- Drawdown configuration.
- Trading restrictions.
- Payout conditions.
- Rule publication.
- Change history.

Rules must be versioned and immutable once published.

Changing a rule must not silently alter existing challenge instances.

## 19.4 Challenge Instances

Route: `/admin/challenges`

Features:

- Challenge list.
- Customer association.
- Challenge status.
- Account size.
- Trading account association.
- Provisioning status.
- Rule version.
- Progress.
- Risk status.

## 19.5 Challenge Details

Route: `/admin/challenges/:challengeId`

Tabs:

- Overview.
- Customer.
- Trading Account.
- Rules.
- Performance.
- Risk Events.
- Activity Log.

Features:

- View challenge state.
- Review risk events.
- View applicable rules.
- View provisioning history.
- View customer association.
- Initiate approved operational actions.

Manual rule changes or risk overrides must be restricted and audited.

---

# 20. Admin Trading Account Management

Navigation: Trading Accounts

## 20.1 Trading Account List

Route: `/admin/trading-accounts`

Features:

- Account reference.
- Customer.
- Challenge.
- Account size.
- Platform.
- Status.
- Provisioning state.
- Data synchronisation state.

## 20.2 Trading Account Details

Route: `/admin/trading-accounts/:accountId`

Features:

- Customer association.
- Challenge association.
- SteraTrader account reference.
- Provisioning logs.
- Trading data status.
- Balance and equity.
- Risk evaluation status.
- Account lifecycle events.

## 20.3 Provisioning Queue

Route: `/admin/trading-accounts/provisioning`

Features:

- Pending jobs.
- Processing jobs.
- Failed jobs.
- Retry eligibility.
- Provider response summary.
- Job idempotency reference.

Retries must not create duplicate trading accounts.

---

# 21. Admin Risk Management

Navigation: Risk

## 21.1 Risk Dashboard

Route: `/admin/risk`

Features:

- Active challenge monitoring.
- Risk alerts.
- Breach events.
- Data freshness.
- Evaluation failures.
- Challenges requiring review.

## 21.2 Risk Events

Route: `/admin/risk/events`

Features:

- Event list.
- Customer.
- Challenge.
- Event type.
- Rule version.
- Severity.
- Timestamp.
- Status.

## 21.3 Risk Event Details

Route: `/admin/risk/events/:eventId`

Features:

- Evaluation result.
- Relevant data references.
- Applicable rules.
- Reason codes.
- Review history.
- Audit trail.

## 21.4 Manual Review

Route: `/admin/risk/reviews`

Features:

- Cases requiring review.
- Review notes.
- Approved decision options.
- Escalation.
- Reviewer identity.
- Decision reason.

Risk overrides must be restricted, documented and audited.

---

# 22. Admin Finance

Navigation: Finance

This section is one of the most security-sensitive areas of the platform.

## 22.1 Finance Overview

Route: `/admin/finance`

Features:

- Wallet balances.
- Total deposits.
- Total withdrawals.
- Challenge sales.
- Affiliate commissions.
- Trader earnings.
- Pending payouts.
- Reconciliation status.
- Ledger exceptions.

## 22.2 Wallet Management

Route: `/admin/finance/wallets`

Features:

- Customer wallet list.
- Wallet status.
- Currency.
- Available balance.
- Pending balance.
- Ledger summary.
- Transaction history.

Do not permit unrestricted manual balance editing.

## 22.3 Ledger

Route: `/admin/finance/ledger`

Features:

- Journal entries.
- Ledger accounts.
- Debit and credit lines.
- Financial references.
- Posting date.
- Reversal history.
- Reconciliation state.

## 22.4 Ledger Details

Route: `/admin/finance/ledger/:entryId`

Features:

- Journal entry.
- Debit lines.
- Credit lines.
- Source transaction.
- Posting status.
- Audit records.

## 22.5 Deposits

Route: `/admin/finance/deposits`

Features:

- Deposit list.
- Customer.
- Amount.
- Lenco reference.
- Dedicated virtual account.
- Deposit status.
- Settlement status.
- Reconciliation status.

## 22.6 Deposit Details

Route: `/admin/finance/deposits/:depositId`

Features:

- Provider reference.
- Customer association.
- Amount.
- Currency.
- Webhook history.
- Ledger posting.
- Reconciliation result.

## 22.7 Withdrawals

Route: `/admin/finance/withdrawals`

Features:

- Withdrawal requests.
- Customer.
- Source of funds.
- Amount.
- Bank destination.
- KYC status.
- Eligibility.
- Approval status.
- Lenco disbursement status.

## 22.8 Withdrawal Details

Route: `/admin/finance/withdrawals/:withdrawalId`

Features:

- Request.
- Validation results.
- Approval history.
- Provider reference.
- Execution status.
- Reconciliation.
- Audit trail.

## 22.9 Financial Adjustments

Route: `/admin/finance/adjustments`

Features:

- Adjustment request.
- Reason.
- Reference.
- Debit/credit direction.
- Approval.
- Reversal.
- Audit trail.

Financial adjustments must not silently mutate balances.

Use properly controlled ledger entries.

---

# 23. Admin Trader Earnings and Payouts

Navigation: Payouts

## 23.1 Trader Earnings

Route: `/admin/payouts/trader-earnings`

Features:

- Earnings records.
- Customer.
- Challenge/account.
- Earnings amount.
- Eligibility.
- Approval status.
- Payout status.

## 23.2 Trader Payout Requests

Route: `/admin/payouts/trader`

Features:

- Pending requests.
- Eligibility checks.
- KYC checks.
- Amount.
- Destination.
- Review.
- Approval.
- Rejection.
- Lenco execution.

## 23.3 Affiliate Payout Requests

Route: `/admin/payouts/affiliate`

Features:

- Affiliate.
- Commission balance.
- Requested amount.
- Eligibility.
- Approval.
- Lenco execution.
- Status.
- Reconciliation.

## 23.4 Payout Details

Route: `/admin/payouts/:payoutId`

Features:

- Payout source.
- Customer.
- Amount.
- Destination.
- Approval history.
- Lenco reference.
- Execution state.
- Reconciliation state.

High-risk payouts must follow maker-checker approval.

---

# 24. Admin Affiliate Management

Navigation: Affiliates

## 24.1 Affiliate Overview

Route: `/admin/affiliates`

Features:

- Affiliate count.
- Active affiliates.
- Referral volume.
- Qualified referrals.
- Commission totals.
- Pending commissions.
- Payout totals.

## 24.2 Affiliate List

Route: `/admin/affiliates/list`

Features:

- Customer.
- Affiliate status.
- Referral code.
- Referrals.
- Commission totals.
- Payout status.

## 24.3 Affiliate Details

Route: `/admin/affiliates/:affiliateId`

Tabs:

- Overview.
- Referrals.
- Commissions.
- Withdrawals.
- Activity.
- Audit.

## 24.4 Affiliate Rules

Route: `/admin/affiliates/rules`

Features:

- Approved commission rule configuration.
- Rule versions.
- Qualification requirements.
- Payout conditions.
- Effective dates.
- Audit history.

The existing owner-supplied affiliate rules must be used as the source of truth.

Do not silently alter those rules.

---

# 25. Admin Card Management

Navigation: Cards

## 25.1 Card Dashboard

Route: `/admin/cards`

Features:

- Card count.
- Card orders.
- Pending fulfilment.
- Issued cards.
- Active cards.
- Frozen cards.
- Blocked cards.
- Card transactions.
- Provider health.

## 25.2 Card Orders

Route: `/admin/cards/orders`

Features:

- Customer.
- Card design.
- Cardholder name.
- Delivery address.
- Order fee.
- Production status.
- Delivery status.
- Fulfilment reference.

## 25.3 Card Order Details

Route: `/admin/cards/orders/:orderId`

Features:

- Order details.
- Customer KYC status.
- Issuer status.
- Production status.
- Delivery tracking.
- Support history.

## 25.4 Issued Cards

Route: `/admin/cards/issued`

Features:

- Customer.
- Masked card reference.
- Card status.
- Issuer reference.
- Linked wallet.
- Issue date.

## 25.5 Card Transactions

Route: `/admin/cards/transactions`

Features:

- Merchant.
- Customer.
- Amount.
- Status.
- Authorisation.
- Settlement.
- Reversal.
- Ledger reference.

## 25.6 Card Controls

Route: `/admin/cards/:cardId`

Features:

- View card status.
- Freeze or block card where permitted.
- Review transactions.
- Review issuer events.
- Replace card where supported.
- Audit card-related actions.

The admin portal must not expose raw card numbers or CVVs.

---

# 26. Admin WooCommerce and Commerce Operations

Navigation: Commerce

## 26.1 WooCommerce Integration

Route: `/admin/integrations/woocommerce`

Features:

- Connection status.
- API configuration status.
- Webhook status.
- Last synchronisation.
- Failed events.
- Product mappings.

## 26.2 Orders

Route: `/admin/orders`

Features:

- Internal order list.
- WooCommerce order reference.
- Customer.
- Product.
- Payment status.
- Entitlement status.
- Provisioning status.

## 26.3 Order Details

Route: `/admin/orders/:orderId`

Features:

- Customer.
- WooCommerce reference.
- Payment record.
- Order items.
- Entitlement.
- Provisioning job.
- Event history.
- Reconciliation.

## 26.4 Webhook Events

Route: `/admin/commerce/webhooks`

Features:

- Event list.
- Event type.
- Provider.
- Signature validation result.
- Processing status.
- Idempotency reference.
- Retry status.
- Failure reason.

Do not display sensitive webhook secrets.

---

# 27. Admin Notifications and Messaging

Navigation: Communications

## 27.1 Notification Templates

Route: `/admin/communications/templates`

Features:

- Email templates.
- SMS templates.
- Transactional templates.
- Template versions.
- Preview.
- Variables.
- Approval.

## 27.2 Notification Logs

Route: `/admin/communications/logs`

Features:

- Customer.
- Channel.
- Notification type.
- Provider.
- Delivery status.
- Timestamp.
- Provider reference.

OTP values must never appear in logs.

## 27.3 Provider Configuration

Route: `/admin/integrations/notifications`

Features:

- SMTP provider status.
- SMS provider status.
- Sender identity.
- Delivery status.
- Provider health.

Secrets must be stored securely and must not be displayed in plaintext.

---

# 28. Admin Integrations

Navigation: Integrations

## 28.1 Integration Overview

Route: `/admin/integrations`

Features:

- Lenco.
- Ninja.
- SteraTrader.
- WooCommerce.
- Email.
- SMS.
- Card issuer.
- Provider status.
- Last successful request.
- Failed requests.
- Integration health.

## 28.2 Lenco Integration

Route: `/admin/integrations/lenco`

Features:

- Connection status.
- Virtual account configuration status.
- Disbursement configuration status.
- Webhook status.
- Reconciliation status.
- Failed events.

Do not expose API secrets.

## 28.3 Ninja Integration

Route: `/admin/integrations/ninja`

Features:

- Connection status.
- Sandbox/live status.
- Verification flow configuration.
- Webhook status.
- Failed verifications.
- Integration health.

## 28.4 SteraTrader Integration

Route: `/admin/integrations/steratrader`

Features:

- Connection status.
- Account provisioning status.
- Data synchronisation status.
- API capability status.
- Failed requests.
- Provider health.

The exact integration must be based on verified SteraTrader documentation.

## 28.5 Card Issuer Integration

Route: `/admin/integrations/cards`

Features:

- Provider status.
- Card issuing capability.
- Card production.
- Card transaction synchronisation.
- Settlement configuration.
- Webhook status.
- Reconciliation status.

The card issuing provider must be selected and approved before implementing this integration.

---

# 29. Admin System Settings

Navigation: Settings

## 29.1 General Settings

Route: `/admin/settings/general`

Features:

- Platform name.
- Branding.
- Currency.
- Timezone.
- Customer support information.
- Platform status.

## 29.2 Security Settings

Route: `/admin/settings/security`

Features:

- Admin MFA requirements.
- Session policy.
- Password policy for staff accounts where applicable.
- Access restrictions.
- Audit configuration.

## 29.3 Staff Management

Route: `/admin/settings/staff`

Features:

- Staff accounts.
- Roles.
- Permissions.
- Account status.
- MFA status.
- Last login.
- Session revocation.

## 29.4 Roles and Permissions

Route: `/admin/settings/roles`

Features:

- Role list.
- Permission matrix.
- Role assignments.
- Permission changes.
- Audit history.

## 29.5 Audit Logs

Route: `/admin/settings/audit-logs`

Features:

- Staff action logs.
- Financial action logs.
- Customer account action logs.
- Risk override logs.
- Integration configuration logs.
- Search and filters.

Audit records must be protected against unauthorised alteration.

## 29.6 Background Jobs

Route: `/admin/settings/jobs`

Features:

- Job list.
- Queue.
- Status.
- Retry.
- Failure reason.
- Duration.
- Job references.

Retries must be restricted for operations where duplicate execution could cause financial or trading account consequences.

## 29.7 System Health

Route: `/admin/settings/system-health`

Features:

- API health.
- Database health.
- Redis health.
- Worker health.
- Queue health.
- Integration health.
- Backup status.
- Resource usage.

---

# 30. Role-Based Access Control

The admin portal must support granular permissions.

Suggested roles:

## Super Administrator

- Full platform administration.
- Configuration.
- Staff management.
- Privileged system operations.

## Operations Administrator

- Customer operations.
- Challenge operations.
- Trading account operations.
- Provisioning support.

## Risk Analyst

- Risk monitoring.
- Challenge reviews.
- Risk event review.
- Approved risk decisions.

## Finance Operator

- Deposit review.
- Ledger viewing.
- Withdrawal preparation.
- Financial reconciliation.

## Finance Approver

- Approval of designated financial operations.
- Payout approval.
- Financial adjustment approval.

## KYC/Compliance Officer

- KYC review.
- Compliance cases.
- Verification restrictions.

## Customer Support

- Customer profile viewing within permission limits.
- Support case handling.
- Basic order and challenge status viewing.

## Affiliate Manager

- Affiliate monitoring.
- Referral review.
- Commission review.

## Card Operations

- Card orders.
- Fulfilment.
- Card status.
- Card transaction review.

These roles are a starting point.

The final permission matrix must be documented and implemented.

High-risk financial operations must use maker-checker approval.

---

# 31. Core Financial Workflows

## 31.1 Dedicated Virtual Account Creation

When a customer becomes eligible for wallet functionality:

1. Backend validates customer identity and status.
2. Backend requests a dedicated virtual account from Lenco using verified API documentation.
3. Backend records the Lenco virtual account reference.
4. Backend associates the virtual account with the internal customer ID.
5. Backend displays the bank details to the customer.
6. The system monitors funding events through verified webhooks and reconciliation.

Account creation must be idempotent.

Do not create multiple dedicated virtual accounts for the same customer without an approved reason.

## 31.2 Wallet Funding

1. Customer transfers NGN to their assigned virtual account.
2. Lenco reports the incoming transaction.
3. Backend verifies the webhook or provider event.
4. Backend validates the customer and transaction reference.
5. Backend records the deposit.
6. Backend posts the appropriate ledger entries.
7. Wallet available balance is updated or derived from the ledger.
8. Customer receives a notification.
9. The transaction becomes visible in wallet history.

Duplicate webhook events must not duplicate wallet credit.

Unverified events must not create spendable balances.

## 31.3 Wallet Challenge Purchase

1. Customer selects a challenge.
2. Backend validates product availability and price.
3. Backend validates customer eligibility.
4. Backend checks available wallet balance.
5. Backend reserves or debits funds atomically.
6. Backend creates the internal order.
7. Backend creates the entitlement.
8. Backend creates the provisioning job.
9. Worker provisions the account through SteraTrader.
10. Challenge becomes active after confirmed provisioning.
11. Customer receives a purchase and provisioning notification.

If provisioning fails, preserve the valid order and entitlement and execute controlled retry/recovery.

The system must prevent duplicate debit and duplicate provisioning.

## 31.4 Trader Earnings Payout

1. Earnings become eligible according to approved rules.
2. Earnings are recorded as payable.
3. Customer requests withdrawal.
4. Backend validates eligibility.
5. Backend validates KYC.
6. Backend validates the amount and destination.
7. Funds are reserved.
8. Required approval is obtained.
9. Lenco disbursement is initiated.
10. Provider result is verified.
11. Ledger entries are posted or finalised.
12. Payout status is updated.
13. Customer receives notification.
14. Transaction is reconciled.

## 31.5 Affiliate Earnings Payout

Use the same controlled payout architecture, but maintain separate source accounting.

Affiliate commissions must not be mixed with trader earnings in the ledger without clear accounting classification.

## 31.6 Card Spend

The card issuing provider must supply the actual card authorisation and settlement integration.

The intended customer experience:

1. Customer holds an eligible NGN wallet balance.
2. Customer has an approved active card.
3. Card transaction is authorised.
4. The appropriate available balance is reserved or reduced.
5. Transaction events are synchronised.
6. Settlement and reversals are reconciled.
7. The customer sees the transaction in wallet/card history.

The technical design must support the issuer's actual authorisation, clearing, settlement and reversal model.

Do not implement a fake card balance or assume card transactions are directly controlled by Lenco.

---

# 32. Financial Data Model Requirements

Implement proper financial entities.

Minimum conceptual entities:

- CustomerWallet.
- WalletAccount.
- LedgerAccount.
- JournalEntry.
- JournalLine.
- Deposit.
- Withdrawal.
- FinancialTransaction.
- Payout.
- AffiliateCommission.
- TraderEarning.
- CardTransaction.
- CardSettlement.
- ReconciliationRecord.

Use precise financial types.

Do not use floating-point numbers for money.

Maintain a clear distinction between:

- Wallet cash.
- Pending cash.
- Reserved cash.
- Affiliate commission payable.
- Trader earnings payable.
- Challenge purchase revenue.
- Card clearing.
- Card settlement.
- Provider fees.
- Reversal entries.

Every financial event must have a unique idempotency reference where applicable.

---

# 33. Provider Integration Requirements

## Lenco

Required functionality:

- Dedicated virtual account creation.
- Incoming deposit event processing.
- Account and transaction history access.
- Disbursement for approved payouts.
- Provider reconciliation.

Use verified Lenco documentation.

## Ninja

Required functionality:

- Customer identity verification.
- KYC status.
- Hosted verification flow or approved API flow.
- Webhook handling.
- Verification history.
- Secure result processing.

## SteraTrader

Required functionality based on verified provider capabilities:

- Trading account provisioning.
- Account association.
- Account status.
- Trading data.
- Challenge account monitoring.

Do not invent endpoints or functionality.

## WooCommerce

Required functionality:

- Order creation.
- Product mapping.
- Webhook verification.
- Payment verification.
- Order reconciliation.

## Email

Use SMTP transport through a provider adapter.

Initial provider: Brevo or Resend.

Required functionality:

- OTP email.
- Purchase receipts.
- Account notifications.
- Payout notifications.
- Security notifications.

## SMS

Use a provider adapter.

Initial channel: SMS OTP.

Provider recommendation: evaluate Termii and Robase against current route pricing, delivery success, support and integration requirements.

## Card Issuing Provider

Must be selected and approved.

Required capabilities:

- NGN physical card issuance.
- Custom metal card programme.
- Cardholder management.
- Card authorisation.
- Card transaction events.
- Card controls.
- Settlement and reconciliation.
- Secure cardholder data handling.

Do not begin implementation of issuer-specific features until capabilities are verified.

---

# 34. API Requirements

The backend should expose versioned REST APIs.

Suggested route groups:

```text
/api/v1/auth
/api/v1/customers
/api/v1/profile
/api/v1/verification
/api/v1/products
/api/v1/orders
/api/v1/entitlements
/api/v1/challenges
/api/v1/trading-accounts
/api/v1/trading-data
/api/v1/risk
/api/v1/wallets
/api/v1/deposits
/api/v1/withdrawals
/api/v1/earnings
/api/v1/affiliates
/api/v1/commissions
/api/v1/payouts
/api/v1/cards
/api/v1/card-transactions
/api/v1/notifications
/api/v1/support
/api/v1/admin
/api/v1/integrations
/api/v1/webhooks
```

All API endpoints must include:

- Request validation.
- Authentication requirements.
- Authorisation requirements.
- Consistent error handling.
- Appropriate rate limiting.
- OpenAPI documentation.
- Audit logging where applicable.

---

# 35. Security Requirements

Follow SECURITY.md.

Mandatory:

- Passwordless OTP authentication.
- Admin MFA.
- Role-based access control.
- Resource ownership checks.
- Secure session management.
- Secure secrets management.
- Webhook signature verification.
- Financial idempotency.
- Double-entry ledger.
- Audit logging.
- Database transactions.
- Rate limiting.
- Secure provider credential handling.
- Protection against duplicate payouts.
- Protection against duplicate account provisioning.
- Secure KYC handling.
- No raw card data storage.
- Production deployment approval.

---

# 36. Implementation Phases

Antigravity must not attempt to implement the entire platform in one uncontrolled change.

## Phase 1 — Foundation

- Repository and monorepo setup.
- Backend API.
- Customer web application.
- Admin web application.
- PostgreSQL.
- Redis.
- Docker Compose.
- Authentication architecture.
- RBAC foundation.
- Logging.
- Audit module.
- CI.
- Local environment.

## Phase 2 — Customer Identity and KYC

- Customer registration.
- SMS OTP.
- Email OTP.
- Sessions.
- Profile.
- Ninja KYC.
- KYC status.
- Administrative KYC review.

## Phase 3 — Commerce and Challenges

- WooCommerce integration.
- Product mapping.
- Orders.
- One-Step challenge catalog.
- Instant Funding challenge catalog.
- Checkout.
- Entitlements.
- Provisioning workflows.

## Phase 4 — SteraTrader Integration

- Verified account provisioning.
- Account association.
- Trading data ingestion.
- Account status.
- Challenge account display.
- Provisioning monitoring.

## Phase 5 — Wallet and Lenco

- Wallet accounting.
- Dedicated virtual account creation.
- Deposit processing.
- Ledger posting.
- Wallet funding UI.
- Wallet transaction history.
- Wallet challenge purchases.
- Deposit reconciliation.

## Phase 6 — Affiliate and Trader Earnings

- Affiliate dashboard.
- Referral attribution.
- Commission calculation using supplied rules.
- Trader earnings.
- Earnings history.
- Payout eligibility.
- Withdrawal requests.

## Phase 7 — Lenco Payouts

- Bank account management.
- Withdrawal requests.
- Payout approvals.
- Lenco disbursement integration.
- Payout reconciliation.
- Finance dashboard.

## Phase 8 — Physical Card Programme

This phase depends on selecting an approved card issuing provider.

- Card provider adapter.
- Cardholder eligibility.
- Card order.
- Custom card design integration.
- Card issuance.
- Card activation.
- Card controls.
- Card transaction synchronisation.
- Card settlement.
- Card reconciliation.

## Phase 9 — Administrative Operations

- Customer management.
- Product management.
- Challenge management.
- Risk monitoring.
- Trading account management.
- Financial operations.
- Affiliate management.
- Card operations.
- Support.
- Notifications.
- Integration health.
- Staff permissions.

## Phase 10 — Staging and Production Readiness

- OVHcloud staging.
- Deployment automation.
- Integration verification.
- Security testing.
- End-to-end tests.
- Backup verification.
- Monitoring.
- Independent security assessment.
- Production readiness review.

Production deployment requires explicit owner approval.

---

# 37. Definition of Done

A feature is complete only when:

- The page exists.
- The page is connected to the correct backend API.
- The backend functionality is implemented.
- Database persistence is implemented.
- Permissions are enforced.
- Validation is implemented.
- Error states are implemented.
- Loading states are implemented.
- Security requirements are applied.
- Automated tests are executed.
- Documentation is updated.
- Actual integration verification is reported.
- No mock implementation is being presented as production functionality.

A visually complete page with fake data is not a completed feature.

---

# 38. Final Instruction to Antigravity

Treat this specification as the product requirements baseline for FundedGiants.

Before implementation:

1. Read AGENTS.md.
2. Read SECURITY.md.
3. Read CONTRIBUTING.md.
4. Read TECHNICAL_BLUEPRINT.md.
5. Read this specification.
6. Inspect the existing repository.
7. Inspect the existing frontend and supplied business rules.
8. Identify the existing WooCommerce integration requirements.
9. Verify official provider documentation for Lenco, Ninja and SteraTrader.
10. Identify unresolved card issuing and financial model decisions.
11. Produce a phased implementation plan.

Do not invent business rules.

Do not invent provider API capabilities.

Do not build mock application functionality.

Do not replace the existing WordPress/WooCommerce website.

Do not deploy to production without explicit owner approval.

Build the actual production-grade FundedGiants application from day one.
