# FundedGiants Technical Blueprint

**Document:** TECHNICAL_BLUEPRINT.md  
**Version:** 1.0  
**Status:** Architectural baseline  
**Project:** FundedGiants  
**Trading Platform:** SteraTrader  
**Public Website and Checkout:** Existing WordPress + WooCommerce  
**Target Infrastructure:** OVHcloud VPS  
**Source Control:** GitHub  
**Development Approach:** Production-grade implementation from day one

---

# 1. Executive Summary

FundedGiants is a proprietary trading platform that provides customers with access to trading challenges, funded trading programs, trading account provisioning, account monitoring, risk evaluation, payout processing and related services.

The platform will consist of:

1. Customer-facing web application.
2. Administrative web application.
3. Backend API.
4. Background processing workers.
5. Risk engine.
6. PostgreSQL database.
7. Redis for appropriate caching and job coordination.
8. External integration adapters.
9. Monitoring, auditing and operational infrastructure.

The existing WordPress/WooCommerce website remains the public marketing website and checkout system.

FundedGiants will integrate with WooCommerce for order creation and payment verification. After successful and independently verified payment, the backend will orchestrate customer account creation or association, entitlement creation, challenge provisioning and customer notifications.

The application must be built as a real production-grade system from the beginning.

Local development must use the same core application architecture intended for staging and production.

The application must not be developed as a disposable mock or prototype.

# 2. Architectural Principles

The following principles are mandatory.

## 2.1 Production-grade from day one

Build actual application functionality from the outset.

Use:

- Real application modules.
- Real database persistence.
- Real business logic.
- Actual API contracts.
- Actual integration adapters.
- Production-grade security controls.
- Automated testing.
- Database migrations.
- Structured logging.
- Audit trails.

Test doubles may be used for isolated automated tests only.

## 2.2 Modular monolith first

Begin with a modular monolith for the core backend.

Each business domain must have clear boundaries, interfaces and ownership of its data.

Do not split the application into microservices unless a documented technical requirement justifies the additional complexity and the owner approves the change.

The background worker and risk engine may run as separate deployable processes while sharing the same codebase and domain packages where appropriate.

## 2.3 API-first architecture

The frontend must communicate with the backend through documented APIs.

The backend is authoritative for:

- Authentication.
- Authorisation.
- Customer identity.
- Orders.
- Entitlements.
- Wallets and financial records.
- Challenge accounts.
- Risk decisions.
- Payout eligibility.
- Administrative actions.

The frontend must never be trusted to determine financial or risk outcomes.

## 2.4 Financial integrity

Financial transactions must be:

- Transactional.
- Idempotent.
- Auditable.
- Reconciliable.
- Precisely represented.
- Protected against duplicate posting.

Implement a double-entry ledger for applicable financial accounting.

Do not assume all platform balances are customer cash.

## 2.5 Security-first

Follow AGENTS.md and SECURITY.md.

Use defence-in-depth security.

Administrative privileges, financial operations, customer data, trading credentials and production infrastructure must receive heightened protection.

## 2.6 Environment parity

Local, staging and production must use the same core application code and architecture.

Environment differences must be controlled through configuration, secrets, infrastructure and provider credentials.

Do not maintain separate local and production business logic.

# 3. Technology Stack

Use the following baseline unless a documented technical reason requires a change.

| Component | Technology |
|---|---|
| Customer web application | Next.js |
| Administrative web application | Next.js |
| Language | TypeScript |
| Backend API | NestJS |
| API style | REST with OpenAPI |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Background jobs | BullMQ with Redis |
| Durable critical workflow records | PostgreSQL |
| Cache and job coordination | Redis |
| Containerisation | Docker |
| Local orchestration | Docker Compose |
| Reverse proxy | Caddy or Nginx, select one |
| Version control | GitHub |
| CI | GitHub Actions |
| Production hosting | OVHcloud VPS |
| DNS and edge security | Cloudflare, subject to configuration |
| Monitoring | Appropriate self-hosted or cost-conscious monitoring |

Do not introduce paid services, additional cloud providers, Kubernetes or unnecessary infrastructure without owner approval.

# 4. High-Level System Architecture

The system should follow this logical architecture.

```text
                         CUSTOMERS
                            |
                            v
             Existing WordPress Website
                            |
                       WooCommerce
                            |
                 Checkout / Payment
                            |
                  Verified Webhooks
                            |
                            v
+--------------------------------------------------+
|               FUNDEDGIANTS PLATFORM              |
|                                                  |
|  +----------------+      +--------------------+  |
|  | Customer Web   |      | Administrative Web |  |
|  | Application    |      | Application        |  |
|  +----------------+      +--------------------+  |
|            \                    /                |
|             \                  /                 |
|              v                v                  |
|              +----------------+                  |
|              | Backend API    |                  |
|              | NestJS         |                  |
|              +----------------+                  |
|                       |                           |
|     +-----------------+----------------------+    |
|     |                 |                      |    |
|     v                 v                      v    |
| Identity          Commerce              Challenges|
| Customers         Entitlements           Accounts |
| Orders            Wallets               Trading  |
| Ledger            Payouts               Risk     |
| Notifications     Audit                 Support  |
|                                                  |
|              +------------------+                |
|              | Background       |                |
|              | Workers          |                |
|              +------------------+                |
|                       |                           |
|                       v                           |
|              External Integrations               |
|                                                  |
+--------------------------------------------------+
             |              |              |
             v              v              v
        SteraTrader     Email/WhatsApp   Payments
```

The diagram is logical. Actual network boundaries, process separation and deployment topology must be documented separately.

# 5. Repository Structure

Use the following repository structure as the architectural baseline.

```text
fundedgiants/
├── apps/
│   ├── trader-web/
│   │   └── Customer dashboard
│   ├── admin-web/
│   │   └── Administrative portal
│   └── api/
│       └── NestJS backend API
│
├── services/
│   ├── worker/
│   │   └── Background processing
│   └── risk-engine/
│       └── Risk evaluation service
│
├── packages/
│   ├── shared-types/
│   ├── validation/
│   ├── ui/
│   ├── config/
│   └── test-utils/
│
├── modules/
│   ├── identity/
│   ├── customers/
│   ├── roles-permissions/
│   ├── commerce/
│   ├── orders/
│   ├── entitlements/
│   ├── wallets/
│   ├── ledger/
│   ├── challenges/
│   ├── trading-accounts/
│   ├── trading-data/
│   ├── risk/
│   ├── payouts/
│   ├── notifications/
│   ├── kyc/
│   ├── integrations/
│   ├── support/
│   └── audit/
│
├── infrastructure/
│   ├── docker/
│   ├── local/
│   ├── staging/
│   ├── production/
│   ├── reverse-proxy/
│   ├── backups/
│   └── monitoring/
│
├── docs/
│   ├── architecture/
│   ├── security/
│   ├── api/
│   ├── database/
│   ├── integrations/
│   ├── deployment/
│   ├── disaster-recovery/
│   └── beginner-guides/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   └── load/
│
├── .github/
│   └── workflows/
│
├── AGENTS.md
├── SECURITY.md
├── CONTRIBUTING.md
├── TECHNICAL_BLUEPRINT.md
├── README.md
├── docker-compose.yml
├── .env.example
└── package.json
```

This structure may be refined during implementation, but changes to major module boundaries must be documented.

# 6. Core Domain Modules

## 6.1 Identity Module

Responsibilities:

- Customer registration.
- Customer authentication.
- Email OTP.
- WhatsApp OTP.
- Secure session management.
- Account recovery.
- Account linking.
- Session revocation.
- Authentication audit events.

Customer authentication must be passwordless.

A customer must not be able to authenticate merely by supplying an email address or phone number.

OTP delivery and verification must be implemented using actual approved providers.

## 6.2 Customers Module

Responsibilities:

- Customer profile.
- Contact information.
- Account status.
- Customer preferences.
- Customer identity association.
- Customer lifecycle management.

A customer must have one canonical internal customer identity.

A customer may have multiple verified authentication methods.

Avoid creating duplicate customer records when a returning customer purchases another product.

## 6.3 Roles and Permissions Module

Responsibilities:

- Role definitions.
- Permission definitions.
- Administrative role assignments.
- Resource access controls.
- Privileged operation checks.

Permissions must be enforced by the backend.

The initial role design should include customer, support, risk, finance, compliance and administrator roles, subject to final operational approval.

## 6.4 Commerce Module

Responsibilities:

- WooCommerce integration.
- Product mapping.
- Order synchronisation.
- Payment verification.
- Webhook processing.
- Purchase validation.
- Order reconciliation.

WooCommerce remains the existing checkout system.

The backend must independently verify payment before activating purchased services.

## 6.5 Orders Module

Responsibilities:

- Internal order records.
- WooCommerce order references.
- Order status tracking.
- Order item records.
- Payment state.
- Order reconciliation.
- Idempotency.

An order must have a traceable lifecycle.

Do not create multiple internal orders or entitlements due to duplicate webhook delivery.

## 6.6 Entitlements Module

Responsibilities:

- Purchased challenge eligibility.
- Purchased service access.
- Challenge package association.
- Entitlement activation.
- Entitlement consumption.
- Entitlement expiry.
- Entitlement audit records.

An entitlement represents the customer's right to access a purchased service.

It is not the same as a wallet balance or trading account equity.

## 6.7 Wallets and Ledger Modules

These modules must have clear separation.

### Wallets

Responsibilities may include:

- Customer cash balance.
- Approved internal credits.
- Withdrawable balance.
- Pending balance.
- Wallet transaction history.

The precise wallet functionality must be confirmed before implementing customer cash deposits, stored value or withdrawals.

### Ledger

Responsibilities:

- Double-entry accounting.
- Journal entries.
- Ledger accounts.
- Posting rules.
- Reversals.
- Reconciliation.
- Financial auditability.

The ledger is the authoritative accounting record for applicable financial transactions.

Do not treat a mutable wallet balance field as the authoritative financial record.

Wallet balances, where implemented, must be derived from or reconciled against ledger records.

## 6.8 Challenges Module

Responsibilities:

- Challenge products.
- Challenge lifecycle.
- Challenge configuration.
- Challenge stages.
- Challenge rules.
- Challenge status.
- Challenge completion.
- Challenge failure.
- Challenge progression.

Challenge rules must be versioned.

A challenge must reference the rule version applicable to it.

Do not retroactively change an existing challenge's rules without an approved business process.

## 6.9 Trading Accounts Module

Responsibilities:

- Trading account association.
- Trading account provisioning.
- Trading account status.
- Challenge account linkage.
- Trading platform account references.
- Account provisioning jobs.
- Account lifecycle management.

This module must integrate with SteraTrader using verified API capabilities.

Do not assume that every provisioning or management capability is available.

Do not store trading account passwords in ordinary customer profile fields.

## 6.10 Trading Data Module

Responsibilities:

- Trading data ingestion.
- Trade history.
- Balance and equity information.
- Trading activity synchronisation.
- Data validation.
- Data freshness tracking.
- Provider event processing.

The design must accommodate the actual data capabilities of SteraTrader.

The source, timestamp, validity and completeness of trading data must be identifiable.

## 6.11 Risk Engine

Responsibilities:

- Challenge rule evaluation.
- Drawdown evaluation.
- Profit target evaluation.
- Trading restriction evaluation.
- Challenge completion evaluation.
- Challenge breach evaluation.
- Risk event generation.

The risk engine must be logically isolated.

Risk decisions must be reproducible where the available data permits.

The risk engine must use versioned rules and validated trading data.

Missing or stale trading data must not silently produce a favourable decision.

## 6.12 Payouts Module

Responsibilities:

- Payout eligibility.
- Payout request.
- Payout approval.
- Payout execution.
- Payout status.
- Payout reconciliation.
- Payout audit records.

Payout processing must distinguish:

- Requested.
- Pending review.
- Approved.
- Rejected.
- Processing.
- Paid.
- Failed.
- Cancelled.

The final status model must be validated against the actual payout provider and business workflow.

Real payout execution requires explicit owner approval during development and production operation.

## 6.13 Notifications Module

Responsibilities:

- Email notifications.
- WhatsApp notifications.
- Optional Telegram notifications.
- OTP delivery.
- Purchase confirmation.
- Account provisioning updates.
- Challenge status updates.
- Payout updates.
- Security notifications.

Notifications must be generated from backend events.

Sensitive information must not be unnecessarily included in notifications.

## 6.14 KYC Module

Responsibilities:

- Identity verification provider integration.
- Verification status.
- Customer verification records.
- Verification event processing.
- Access restrictions where required.

The KYC provider and applicable business requirements must be confirmed before implementation.

## 6.15 Audit Module

Responsibilities:

- Security audit events.
- Financial audit events.
- Administrative actions.
- Customer account changes.
- Challenge rule changes.
- Risk overrides.
- Payout approvals.
- Integration events.

Critical audit records must be protected against unauthorised modification.

## 6.16 Support Module

Responsibilities:

- Customer support cases.
- Account-related support.
- Challenge-related support.
- Payment-related support.
- Internal notes.
- Support permissions.
- Case status tracking.

Support staff must not automatically receive access to financial or trading credentials.

# 7. Core Data Model

The following entities establish the conceptual database architecture.

Antigravity must create a detailed Prisma schema based on these entities and their relationships.

## 7.1 Identity and Customers

- Customer
- CustomerProfile
- CustomerContact
- AuthIdentity
- OtpChallenge
- Session
- Role
- Permission
- RoleAssignment

Important constraints:

- Canonical customer identity.
- Unique verified contact identifiers where required.
- Secure OTP lifecycle.
- Session revocation.
- Role assignment auditability.

## 7.2 Commerce

- ProductMapping
- InternalOrder
- InternalOrderItem
- PaymentRecord
- WebhookEvent
- OrderReconciliation
- Entitlement
- EntitlementEvent

Important constraints:

- Unique external WooCommerce order reference.
- Unique external payment reference where applicable.
- Idempotent webhook processing.
- Unique entitlement association to its originating purchase where required.

## 7.3 Challenges and Trading Accounts

- ChallengeProduct
- ChallengeConfiguration
- ChallengeRuleVersion
- CustomerChallenge
- ChallengeStage
- TradingAccount
- TradingAccountProvisioningJob
- TradingAccountEvent
- TradingDataSnapshot
- TradeRecord
- RiskEvaluation
- RiskEvent
- ChallengeOverride

Important constraints:

- Challenge rule version is immutable once published.
- Customer challenge references the applicable rule version.
- Trading account association is explicit.
- Provisioning operations are idempotent where supported.
- Risk evaluations retain the required rule and data references.

## 7.4 Financial Records

- Wallet
- LedgerAccount
- JournalEntry
- JournalLine
- FinancialTransaction
- DepositRecord
- WithdrawalRecord
- Payout
- PayoutApproval
- ReconciliationRecord

These entities must not be implemented as a collection of mutable balance fields.

The detailed ledger design must establish:

- Account types.
- Debit and credit rules.
- Currency handling.
- Posting lifecycle.
- Reversal rules.
- Reconciliation rules.

## 7.5 Operations and Audit

- AuditEvent
- Notification
- NotificationDelivery
- SupportCase
- IntegrationCredentialReference
- BackgroundJobRecord
- SystemConfiguration

Secrets must not be stored in ordinary configuration records without an appropriate secure secrets-management design.

# 8. Purchase-to-Account Provisioning Workflow

This workflow is central to FundedGiants.

## 8.1 Initial Purchase

1. Customer visits the existing WordPress website.
2. Customer selects a challenge product.
3. Customer completes checkout through WooCommerce.
4. WooCommerce processes payment.
5. WooCommerce sends the appropriate webhook.
6. Backend verifies webhook authenticity.
7. Backend independently verifies payment and order details.
8. Backend records the webhook event idempotently.
9. Backend creates or associates the customer with a canonical identity.
10. Backend creates or updates the internal order.
11. Backend creates the purchased entitlement.
12. Backend creates a durable account provisioning job.
13. Worker processes the provisioning job.
14. Worker provisions the account using the verified SteraTrader integration.
15. Backend records the trading account association.
16. Backend activates the appropriate challenge.
17. Customer receives an approved notification.
18. Customer logs into the dashboard using OTP.

## 8.2 Failure Handling

If payment is verified but account provisioning fails:

- Preserve the verified order.
- Preserve the entitlement.
- Record the provisioning failure.
- Retry according to a controlled retry policy.
- Prevent duplicate account creation.
- Notify the appropriate operational role.
- Provide administrative visibility.

Do not reverse a valid payment merely because provisioning failed unless the approved business rules require it.

Do not mark provisioning successful until the external provider's response has been verified.

## 8.3 Returning Customer Purchase

1. Customer logs into the existing account.
2. Customer selects a new product.
3. Backend validates the product and price mapping.
4. Backend creates the WooCommerce order through the approved API.
5. Customer completes payment.
6. Backend verifies payment.
7. Backend creates the new entitlement.
8. Backend provisions the new challenge account.
9. The existing customer identity remains unchanged.

Never create a new customer merely because the customer made another purchase.

# 9. Authentication Workflow

## 9.1 OTP Login

1. Customer submits email address or phone number.
2. Backend validates the request.
3. Backend applies issuance rate limits.
4. Backend generates a secure OTP.
5. Backend stores a protected OTP challenge.
6. Backend sends the OTP through the approved provider.
7. Customer submits the OTP.
8. Backend verifies the OTP.
9. Backend consumes the OTP.
10. Backend creates or rotates the customer session.
11. Backend records the authentication event.

## 9.2 Security Controls

- OTP expiration.
- Single-use OTP.
- Rate limiting.
- Attempt limits.
- Session revocation.
- Secure cookies.
- Customer identity verification.
- Protection against account enumeration.
- Audit logging.

# 10. Risk Evaluation Architecture

Risk evaluation must follow a controlled process.

```text
Trading Data Received
        |
        v
Data Validation
        |
        v
Data Freshness Check
        |
        v
Challenge Rule Version Lookup
        |
        v
Risk Evaluation
        |
        v
Evaluation Result
        |
        +--> Challenge Continues
        |
        +--> Challenge Completed
        |
        +--> Challenge Failed
        |
        +--> Requires Review
```

Risk evaluation must identify:

- Customer challenge.
- Applicable rule version.
- Data snapshot or reference.
- Evaluation timestamp.
- Result.
- Relevant breached or satisfied conditions.
- Reason codes.
- Any review or override requirement.

The actual calculations must be defined from the confirmed FundedGiants business rules.

Do not invent challenge thresholds.

# 11. API Architecture

The backend must expose versioned REST APIs.

Use `/api/v1` as the initial API version prefix.

Example API groups:

```text
/api/v1/auth
/api/v1/customers
/api/v1/profile
/api/v1/products
/api/v1/orders
/api/v1/entitlements
/api/v1/challenges
/api/v1/trading-accounts
/api/v1/trading-data
/api/v1/risk
/api/v1/wallets
/api/v1/ledger
/api/v1/payouts
/api/v1/notifications
/api/v1/support
/api/v1/admin
/api/v1/integrations
/api/v1/webhooks
```

These are logical API groups, not final endpoint definitions.

Each endpoint must have:

- Request schema.
- Response schema.
- Authentication requirements.
- Authorisation requirements.
- Validation.
- Error behaviour.
- Rate limits where applicable.
- OpenAPI documentation.

Sensitive administrative endpoints must use stricter permissions and audit logging.

# 12. Integration Architecture

All external integrations must be isolated behind dedicated adapters.

Examples:

```text
modules/integrations/
├── woocommerce/
├── steratrader/
├── payments/
├── email/
├── whatsapp/
├── telegram/
└── kyc/
```

Each adapter must define:

- Provider configuration.
- Authentication.
- Request and response types.
- Error mapping.
- Timeout behaviour.
- Retry behaviour.
- Idempotency strategy where applicable.
- Logging policy.
- Automated tests.
- Documentation.

## 12.1 WooCommerce

Use verified WooCommerce API and webhook contracts.

Preserve the existing website and checkout.

Verify successful payments independently.

## 12.2 SteraTrader

Use verified SteraTrader documentation.

Do not assume undocumented provisioning, trading data, account management or risk functionality.

If the provider's API does not support a required workflow, document the limitation and request owner approval for an alternative.

## 12.3 Payments

Payment providers must be selected and configured through an approved integration design.

Use provider-hosted checkout or tokenisation where appropriate.

Never trust client-side payment status.

## 12.4 Notifications

Email and WhatsApp providers must be confirmed.

OTP delivery must be implemented through actual approved providers.

## 12.5 KYC

The KYC provider must be confirmed before the implementation of the production verification workflow.

# 13. Background Processing Architecture

Use background workers for operations that should not depend on a single HTTP request.

Examples:

- WooCommerce webhook processing.
- Account provisioning.
- Notification delivery.
- Trading data synchronisation.
- Risk evaluation.
- Payout processing.
- Reconciliation.
- Scheduled maintenance.

Use BullMQ and Redis for appropriate job execution.

For critical workflows, maintain durable job state in PostgreSQL.

Requirements:

- Idempotency.
- Retry limits.
- Backoff policies.
- Failure visibility.
- Dead-letter or equivalent failure handling.
- Monitoring.
- Auditability.

A queue must not be the only record of a critical financial operation.

# 14. Frontend Architecture

## 14.1 Customer Dashboard

The customer dashboard should provide:

- Secure login.
- Customer profile.
- Purchased products.
- Active challenge accounts.
- Challenge status.
- Trading account details.
- Challenge progress.
- Orders and purchase history.
- Entitlements.
- Payout information where applicable.
- Notifications.
- Support access.

The frontend must consume actual backend APIs.

## 14.2 Administrative Portal

The administrative portal should provide role-controlled functionality for:

- Customer management.
- Order management.
- Entitlement management.
- Challenge management.
- Trading account management.
- Risk monitoring.
- Finance and ledger operations.
- Payout management.
- KYC review.
- Support.
- Audit logs.
- Integration health.
- Operational monitoring.

Do not expose every administrative function to every staff role.

## 14.3 Design System

Use a consistent design system.

The FundedGiants brand direction is dark green, black and white.

Avoid unnecessary visual complexity.

The customer dashboard and administrative portal should have distinct navigation and permission boundaries.

# 15. Environment Architecture

Maintain three environments.

## 15.1 Local

Purpose:

- Development.
- Automated tests.
- Integration testing where credentials are available.
- Database migrations.
- Security testing.
- Feature verification.

Characteristics:

- Runs on the developer's computer.
- Uses production-grade application code.
- Uses local PostgreSQL and Redis.
- Uses provider sandbox credentials where available.
- Does not require a paid VPS.
- Does not use real customer financial records.
- Must not expose production secrets.

## 15.2 Staging

Purpose:

- Deployment verification.
- Integration verification.
- End-to-end testing.
- Release testing.
- Operational testing.

Characteristics:

- Hosted on the approved OVHcloud staging environment.
- Uses staging secrets.
- Uses test or sandbox provider accounts where available.
- Uses isolated databases.
- Uses separate domains or subdomains.
- Must not process real customer funds without explicit approval.

## 15.3 Production

Purpose:

- Actual customer operations.

Characteristics:

- Hosted on approved OVHcloud infrastructure.
- Uses production secrets.
- Uses production provider credentials.
- Uses restricted administrative access.
- Uses encrypted backups.
- Uses monitoring and audit logging.
- Requires explicit owner approval for deployment.

# 16. Deployment Architecture

The intended deployment architecture is:

```text
Internet
   |
   v
Cloudflare DNS / Edge Protection
   |
   v
OVHcloud VPS
   |
   v
Reverse Proxy with TLS
   |
   +-------------------+
   |                   |
   v                   v
Customer Web        Admin Web
   |                   |
   +--------+----------+
            |
            v
        Backend API
            |
      +-----+------+
      |            |
      v            v
 PostgreSQL      Redis
      |            |
      |            v
      |        Background Worker
      |
      v
 Encrypted Backup System
```

Additional services may be added only where justified.

PostgreSQL and Redis must not be exposed directly to the public internet.

Production infrastructure must be documented and deployed through controlled configuration.

# 17. CI/CD Architecture

GitHub Actions should perform automated checks.

Recommended pipeline:

```text
Commit / Pull Request
        |
        v
Dependency Installation
        |
        v
Lint
        |
        v
Type Checking
        |
        v
Unit Tests
        |
        v
Integration Tests
        |
        v
Build
        |
        v
Security Scans
        |
        v
Review and Approval
        |
        v
Staging Deployment
        |
        v
Staging Verification
        |
        v
Owner Approval
        |
        v
Production Deployment
```

Production deployment must not occur automatically without explicit owner approval.

The pipeline must never expose production secrets to ordinary development workflows.

# 18. Observability

Implement structured logging and operational monitoring.

Monitor:

- API availability.
- Application errors.
- Database health.
- Redis health.
- Worker health.
- Queue depth.
- Failed jobs.
- Account provisioning failures.
- Webhook processing failures.
- Payment reconciliation.
- Trading data freshness.
- Risk evaluation failures.
- Payout processing failures.
- Resource usage.
- Security events.

Sensitive data must not be exposed in logs.

# 19. Backup and Recovery

Implement:

- Automated PostgreSQL backups.
- Encrypted backup storage.
- Offsite backups.
- Retention policies.
- Backup verification.
- Restoration testing.
- Documented recovery procedures.

The owner must approve recovery objectives before production launch.

# 20. Development Phases

Development must proceed in controlled phases.

## Phase 0 — Repository and Architecture Foundation

Deliverables:

- Repository structure.
- Monorepo configuration.
- TypeScript configuration.
- Docker Compose local environment.
- PostgreSQL.
- Redis.
- Backend application foundation.
- Customer frontend foundation.
- Administrative frontend foundation.
- Environment configuration.
- CI pipeline.
- Documentation baseline.

No paid VPS is required for this phase.

## Phase 1 — Identity and Access Control

Deliverables:

- Customer identity.
- Passwordless authentication.
- OTP delivery integration.
- Session management.
- Customer profiles.
- Role-based access control.
- Administrative authentication.
- Audit events.

## Phase 2 — Commerce and Order Processing

Deliverables:

- WooCommerce adapter.
- Product mapping.
- Webhook verification.
- Order synchronisation.
- Payment verification.
- Idempotent processing.
- Customer association.
- Entitlement creation.
- Purchase history.

## Phase 3 — Challenge and Trading Account Provisioning

Deliverables:

- Challenge product configuration.
- Challenge lifecycle.
- Challenge entitlement consumption.
- SteraTrader adapter based on verified documentation.
- Account provisioning workflow.
- Provisioning status.
- Retry and failure handling.
- Customer dashboard account views.

## Phase 4 — Trading Data and Risk Engine

Deliverables:

- Trading data ingestion.
- Data validation.
- Data freshness handling.
- Versioned challenge rules.
- Risk evaluation.
- Challenge progression.
- Challenge failure and completion.
- Risk monitoring.
- Administrative review controls.

## Phase 5 — Financial Operations

Deliverables depend on approved financial requirements.

Potential deliverables:

- Double-entry ledger.
- Wallet accounting.
- Deposits.
- Withdrawals.
- Payout requests.
- Payout approval.
- Payout execution.
- Reconciliation.
- Financial audit reports.

Do not implement customer cash wallet or stored-value functionality until its intended operation and accounting treatment are confirmed.

## Phase 6 — Administrative Operations

Deliverables:

- Customer management.
- Challenge management.
- Trading account management.
- Finance operations.
- Risk monitoring.
- Payout operations.
- Support workflows.
- Audit logs.
- Operational monitoring.

## Phase 7 — Staging and Production Readiness

Deliverables:

- OVHcloud staging infrastructure.
- Deployment automation.
- Integration verification.
- End-to-end testing.
- Security assessment.
- Backup and recovery verification.
- Monitoring.
- Incident response documentation.
- Production readiness review.

Production deployment requires explicit owner approval.

# 21. Architecture Decision Records

Significant architectural decisions must be documented using Architecture Decision Records (ADRs).

Store them in:

```text
docs/architecture/decisions/
```

Each ADR must include:

- Decision title.
- Date.
- Status.
- Context.
- Options considered.
- Decision.
- Consequences.
- Security considerations.
- Financial implications where relevant.

Examples:

- ADR-001: Modular Monolith Architecture.
- ADR-002: PostgreSQL as Primary Database.
- ADR-003: Passwordless OTP Authentication.
- ADR-004: WooCommerce as Checkout System.
- ADR-005: SteraTrader Integration Architecture.
- ADR-006: Double-Entry Financial Ledger.
- ADR-007: OVHcloud Deployment Architecture.

Do not silently change major architectural decisions.

# 22. Unresolved Business and Integration Decisions

Antigravity must not invent answers to the following.

## 22.1 SteraTrader

Verify:

- Official API availability.
- Authentication mechanism.
- Account provisioning capabilities.
- Trading data availability.
- Account management capabilities.
- Event or webhook support.
- Rate limits.
- Provider-side risk capabilities.
- Required credentials.
- API access limitations.

Document confirmed capabilities and unavailable capabilities.

## 22.2 Wallet Model

Confirm:

- Whether customer cash wallets exist.
- Whether customers can deposit funds.
- Whether wallets are used for challenge purchases.
- Whether withdrawals are supported.
- Whether balances include promotional credits.
- Whether funds are segregated.
- Applicable accounting treatment.
- Applicable legal and regulatory requirements.

Do not implement assumed stored-value functionality.

## 22.3 Challenge Rules

Confirm the complete challenge rules, including:

- Challenge types.
- Challenge stages.
- Profit targets.
- Daily drawdown.
- Maximum drawdown.
- Drawdown calculation method.
- Trading restrictions.
- News restrictions.
- Minimum trading days.
- Payout eligibility.
- Challenge progression.
- Challenge failure conditions.

Rules must be explicitly versioned.

## 22.4 Payout Operations

Confirm:

- Payout eligibility.
- Payout schedule.
- Approval process.
- Payout providers.
- Currency.
- Fees.
- Reconciliation.
- Required customer verification.

## 22.5 KYC

Confirm the provider, requirements and verification workflow.

## 22.6 Notification Providers

Confirm:

- Email provider.
- WhatsApp provider.
- Optional Telegram integration.
- Delivery limits.
- Provider credentials.
- Operational costs.

# 23. Definition of Architecture Compliance

A feature is architecturally compliant when:

- It belongs to the appropriate domain module.
- It follows the established architecture.
- It uses approved technology.
- It uses real business logic.
- It uses actual database persistence.
- It follows security requirements.
- It uses verified external integration contracts.
- It has appropriate automated tests.
- It is documented.
- It does not introduce unapproved infrastructure.
- It does not silently change confirmed business rules.
- It is deployable through the established environment workflow.

# 24. Final Architectural Principle

FundedGiants must be built as a secure, production-grade, maintainable trading platform.

Local development must produce the actual application.

The eventual deployment to OVHcloud must be a controlled deployment of the same application, not a rewrite.

When requirements are unclear, inspect the existing code and official documentation first.

When ambiguity affects financial integrity, security, provider capabilities or business rules, stop and request owner clarification rather than inventing a solution.
