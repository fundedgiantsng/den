# FUNDEDGIANTS — SUPPLEMENTARY IMPLEMENTATION REQUIREMENTS
**Document type:** Additional technical and business requirements  
**Purpose:** To supplement the existing FundedGiants product specification, technical blueprint, security requirements and project instructions.  
**Instruction:** This document adds requirements to the existing project documentation. It does not replace or invalidate previously supplied documents.

---

## 1. LIVE INTEGRATION ONLY — NO SANDBOX, DEMO OR MOCK IMPLEMENTATIONS

FundedGiants already has access to the necessary live service resources, including a live Ninja account.

The development approach must therefore be based on actual production-provider capabilities and real integration behaviour from the beginning.

### Mandatory requirements

1. Do not build integrations around sandbox or demo environments.
2. Do not create mock payment gateways, simulated wallet deposits, fake KYC responses, simulated OTP delivery or artificial trading account provisioning.
3. Do not implement temporary mock services with the intention of replacing them later with live integrations.
4. Integrate directly with the actual live provider APIs and their supported production endpoints.
5. Validate every integration against the real provider's documented capabilities, authentication requirements, request formats, response formats, webhooks and error handling.
6. Where a provider requires account activation, permissions, credentials or configuration, identify the requirement instead of pretending the integration is operational.
7. Do not invent API endpoints, capabilities or provider responses.

### Important distinction

Using a live integration does not mean performing uncontrolled financial transactions during development.

Use controlled, owner-authorised live operations and low-value transactions where appropriate. Clearly identify any transaction that moves real money, creates a charge, initiates a withdrawal, issues a card or has another irreversible consequence.

Never expose production credentials in source code, logs, frontend code or AI-agent output.

The objective is to develop against the actual production behaviour from the beginning, avoiding a second implementation exercise when moving from development to live operations.

---

## 2. ROBASE — SMS AND WHATSAPP OTP INTEGRATION

Robase is the selected provider for SMS and WhatsApp OTP delivery.

Build the authentication and notification architecture around a provider adapter so that the platform can support both channels without duplicating authentication logic.

### 2.1 Login options

On the login page, users must be able to choose their preferred login identifier:

- Email address
- Phone number

The selected identifier determines the initial OTP delivery channel.

**Email login:**
- User enters their registered email address.
- System generates and sends an email OTP using the configured email provider.
- User enters the OTP to complete authentication.

**Phone login:**
- User enters their registered phone number.
- System generates an OTP.
- Initial delivery is through Robase SMS.
- User enters the OTP to complete authentication.

### 2.2 WhatsApp retry option

If a user initially requests phone authentication through SMS but does not receive the OTP, the interface must provide an option to request another OTP through WhatsApp.

Expected flow:

1. User enters phone number.
2. OTP is sent through Robase SMS.
3. User waits for the OTP.
4. If SMS delivery fails or the OTP does not arrive, the user can request a retry through WhatsApp.
5. System applies the necessary resend cooldown and rate limits.
6. A new OTP is generated and delivered through Robase WhatsApp.
7. The user completes authentication with the valid OTP.

The system must not assume that a successful API response automatically means a message was delivered. Track provider acceptance, delivery reports where supported, failures and retries.

### 2.3 OTP security

Implement:

- Cryptographically secure OTP generation.
- Hashed OTP storage rather than plaintext storage.
- OTP expiry.
- Single-use OTP validation.
- Resend cooldown.
- Maximum verification attempts.
- Rate limits by account, phone number, IP address and relevant risk signals.
- Protection against OTP enumeration and brute-force attacks.
- Audit logs for authentication events.
- Invalidation of previous OTPs when a new OTP is issued, according to the authentication policy.
- Appropriate controls against abuse of paid OTP delivery.

Users must not be able to repeatedly request paid SMS or WhatsApp messages without restrictions.

### 2.4 OTP cost recovery

SMS and WhatsApp delivery are chargeable services.

The platform must support configurable customer charges for:

- SMS OTP delivery.
- WhatsApp OTP delivery.

The actual charge should be configurable independently of Robase's provider cost.

The system must record, where available:

- User ID.
- Delivery channel.
- Provider message reference.
- Provider cost.
- Customer charge.
- Delivery status.
- Timestamp.
- Related wallet transaction.
- Failure or retry details.

Where a charge is applied, it must be transparently reflected in the user's wallet transaction history.

Do not silently deduct charges or invent pricing. The business administrator must be able to configure the applicable fees.

---

## 3. WALLET FEES, CARD FEES AND CUSTOMER CHARGES

FundedGiants operates a wallet-based ecosystem. The wallet is not merely a deposit balance for purchasing challenges; it is also the account through which eligible customer funds, earnings, withdrawals and supported card transactions are managed.

The platform must therefore support configurable fees and charges.

### 3.1 Supported charge categories

The system must support the following charge categories:

| Charge | Description |
|---|---|
| SMS OTP fee | Customer charge for SMS authentication delivery |
| WhatsApp OTP fee | Customer charge for WhatsApp authentication delivery |
| Card issuance fee | One-time standard fee for issuing a physical FundedGiants card |
| Card customization fee | Additional fee for a customer's personally customised card design |
| Card maintenance fee | Recurring card maintenance charge, where applicable |
| Transaction fee | Charge applicable to supported wallet/card transactions |
| Withdrawal fee | Configurable charge for eligible withdrawals, if introduced |
| Other service fees | Additional administrator-configured service charges |

All fees must be configurable from the administration dashboard.

### 3.2 Physical card pricing and issuance policy

The primary business model is paid card issuance.

The standard FundedGiants physical card issuance fee is:

₦100,000

Customers should be able to select from available FundedGiants card templates/designs.

The platform must support two card design options:

**Option A — Standard FundedGiants templates**
- Customer selects from the available official card templates.
- Standard issuance fee: ₦100,000.
- No customization surcharge.

**Option B — Customer's own customised design**
- Customer requests a personalised card design.
- Additional customization fee: ₦50,000.
- Total standard charge where both fees apply: ₦150,000.

The administration dashboard must allow authorised staff to manage available templates and approve or reject custom design requests.

### 3.3 Discretionary complimentary cards

FundedGiants administrators may, at their sole discretion, offer a customer a free card or waive some or all applicable card fees.

This is a business discretion, not an automatic customer entitlement.

Requirements:

1. Administrators with the appropriate permission can grant a complimentary card.
2. Administrators can select the applicable customer and card order.
3. The administrator can waive the standard issuance fee, customization fee or both, as appropriate.
4. The system must record the administrator, customer, date, waived amount and reason.
5. The waiver must be reflected in the customer's order and wallet records.
6. The system must prevent the waived fee from being charged.
7. Complimentary issuance must not depend on cumulative deposits, withdrawals, trading profits or an automatic qualification threshold.

Do not display any withdrawal-based qualification progress or automatic free-card eligibility to customers.

### 3.4 Fee engine

Do not hardcode customer fees into individual frontend pages or backend business functions.

Build a central fee engine that can:

- Retrieve applicable fee configurations.
- Calculate charges before a transaction is confirmed.
- Apply eligible waivers and discounts.
- Support fixed and percentage-based fees.
- Support minimum and maximum fee limits where required.
- Record the fee calculation and its applicable configuration.
- Post charges to the financial ledger.
- Display the fee to the user before confirmation.
- Support changes to future pricing without rewriting application code.

Historical transactions must retain the fee configuration and calculation that applied when they were processed.

### 3.5 Fee transparency

Before a user confirms a chargeable action, display:

- Transaction amount.
- Applicable service fee.
- Total amount payable or deductible.
- Any applicable waiver or discount.

Every fee deduction must have a corresponding ledger entry and an understandable wallet transaction description.

Never deduct the same fee twice because of a retry, duplicate webhook or repeated API request.

---

## 4. PHYSICAL CARD SYSTEM

FundedGiants intends to provide branded physical NGN-denominated metal cards to eligible users.

The card must be linked to the customer's supported spendable wallet balance.

The architecture must support:

- Card application and ordering.
- Standard card template selection.
- Custom card design requests.
- Customization approval workflow.
- Card issuance.
- Card activation.
- Card status.
- Card controls, including supported freeze/unfreeze operations.
- Card transaction history.
- Card maintenance fees.
- Card transaction fees.
- Card issuance fees and discretionary waivers.
- Card replacement and cancellation, where supported.
- Card transaction reconciliation.

The card issuer and processing partner must be treated as a separate integration from Lenco unless a verified provider agreement establishes otherwise.

Do not assume that Lenco provides physical card issuing.

The card integration must use a dedicated provider adapter. Confirm the selected issuer's actual API, authorisation model, funding model, transaction events, settlement process and supported controls before implementing provider-specific functionality.

Never store raw card PAN, CVV or other prohibited sensitive card credentials in the FundedGiants application database or logs.

The wallet ledger must remain the financial source of truth, with card authorisations, reversals, settlements and fees reconciled against the card provider.

---

## 5. LOAD BALANCING, HORIZONTAL SCALING AND HIGH AVAILABILITY

This is a core architectural requirement.

FundedGiants is intended to serve thousands of traders. The application must not be designed as a small website that depends on one application process or one server handling all customer activity.

The architecture must be designed for horizontal scaling from the beginning.

### 5.1 Load balancing

The infrastructure and application architecture must support a load balancer distributing incoming requests across multiple application instances.

Requirements:

- Support multiple concurrent backend instances.
- Support multiple frontend/application instances.
- Avoid dependence on a single application server.
- Use stateless application services wherever possible.
- Store shared session and temporary authentication state in an appropriate shared service such as Redis.
- Avoid relying on in-memory application state for important user or financial data.
- Configure health checks so unhealthy instances can be removed from traffic.
- Support graceful shutdown and deployment without unnecessarily interrupting active users.
- Ensure API requests can be safely retried where appropriate.
- Use connection pooling and sensible database connection limits.
- Support horizontal scaling without requiring changes to core business logic.

Do not rely on sticky sessions as a substitute for proper distributed application design.

### 5.2 Expected user capacity

The platform must be engineered with the expectation that thousands of traders may access it concurrently.

Do not interpret this as a requirement to deploy thousands of servers immediately.

Instead, build an architecture that can scale application instances and supporting infrastructure as usage increases.

The engineering team must establish realistic capacity targets, including:

- Concurrent authenticated users.
- Requests per second.
- Authentication and OTP request volume.
- Wallet transaction volume.
- Trading account activity and event ingestion.
- WebSocket or real-time connection volume, where supported.
- Database query throughput.
- Background job throughput.

Document the assumptions and validate them through load and stress testing before production launch.

### 5.3 Database architecture

PostgreSQL must be designed for concurrent transactional workloads.

Implement:

- Proper indexing.
- Query optimisation.
- Database connection pooling.
- Transaction boundaries.
- Appropriate isolation levels.
- Efficient pagination.
- Avoidance of N+1 queries.
- Safe concurrency handling for wallet balances and financial operations.
- Backup and recovery procedures.
- Monitoring of slow queries, locks and connection utilisation.

Financial correctness must never be sacrificed for speed.

### 5.4 Redis and background processing

Use Redis for suitable shared, temporary and high-speed workloads, including:

- Distributed rate limiting.
- OTP and authentication controls.
- Shared caching.
- Job queues.
- Short-lived coordination and locking where appropriate.
- Real-time event distribution where appropriate.

Use background workers for tasks that should not block user-facing API requests, including:

- OTP delivery.
- Notifications.
- Provider webhook processing.
- Reconciliation.
- Trading account provisioning.
- Affiliate calculations.
- Scheduled fees.
- Reporting and analytics.
- Card transaction updates.

Background jobs must support retries, idempotency, failure tracking and dead-letter handling.

### 5.5 Trading activity and real-time updates

Trading account activity can generate frequent events.

The architecture must separate high-volume trading updates from critical financial transaction processing.

Requirements:

- Use efficient event ingestion.
- Avoid unnecessary synchronous requests to the trading provider.
- Use queues and event processing where appropriate.
- Support real-time dashboard updates without repeatedly polling the trading provider.
- Ensure duplicate or delayed trading events cannot create duplicate financial credits.
- Preserve event ordering where business logic requires it.
- Monitor event-processing delays and failed events.

SteraTrader integration must be based on its verified documentation and supported capabilities.

### 5.6 Infrastructure and deployment

The architecture must support:

- Cloudflare ingress and protection.
- Load-balanced application instances.
- Separate frontend and backend deployment responsibilities where appropriate.
- Secure database access.
- Redis availability.
- Worker processes that can scale independently.
- Centralised application logs.
- Infrastructure and application monitoring.
- Health checks and alerting.
- Automated backups.
- Recovery procedures.
- Environment-based configuration.

The local development architecture should reflect the eventual production topology as closely as reasonably possible, without introducing unnecessary infrastructure costs.

Do not assume that simply adding a load balancer guarantees scalability. The application, database, queues, external integrations and infrastructure must all be designed and tested for concurrent workloads.

---

## 6. ADMINISTRATOR CONTROLS AND REPORTING

The administration dashboard must expose appropriate controls for the new business requirements.

Authorised administrators should be able to:

1. Configure SMS OTP customer charges.
2. Configure WhatsApp OTP customer charges.
3. Review OTP delivery costs and delivery failures.
4. Configure physical card issuance fees.
5. Configure card customization fees.
6. Manage available card templates.
7. Review and approve custom card designs.
8. Configure card maintenance fees.
9. Configure applicable transaction fees.
10. Grant complimentary cards or waive selected card fees at their discretion.
11. Record reasons for complimentary card approvals.
12. Review fees charged and fees waived.
13. Review card transaction records and reconciliation status.
14. Monitor application performance and infrastructure health.
15. Review queue backlogs, failed jobs and provider integration errors.

All administrative fee changes and complimentary card approvals must be permission-controlled and recorded in the audit log, including the administrator, previous value where applicable, new value, reason and timestamp.

---

## 7. IMPLEMENTATION INSTRUCTIONS

These requirements must be incorporated into the existing FundedGiants implementation.

Before changing the existing architecture:

1. Read the existing project documentation.
2. Review the current repository and existing frontend.
3. Identify where these requirements fit into the existing architecture.
4. Identify provider capabilities that need confirmation from official documentation or account-specific API access.
5. Update the technical implementation plan where necessary.
6. Implement the requirements without duplicating existing features or creating conflicting business rules.

Do not replace the existing WordPress/WooCommerce public website or checkout as part of this addendum.

Do not introduce a second wallet ledger, competing fee engine or duplicate authentication system.

Maintain one consistent financial source of truth.

**Final instruction:** FundedGiants must be built as a scalable financial and trading platform from the outset, not as a prototype that will later need to be redesigned for live financial operations or thousands of concurrent users.
