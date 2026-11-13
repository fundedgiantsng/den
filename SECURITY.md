# FundedGiants Security Policy

## 1. Purpose

This document establishes the mandatory security requirements for the FundedGiants platform.

FundedGiants is a trading and proprietary trading platform that handles customer accounts, purchases, challenge entitlements, trading account provisioning, financial records, risk evaluations, payouts, personal information and integrations with external providers.

Security must be built into the architecture, implementation, testing, deployment and operation of the platform from day one.

The application must be developed to production-grade standards, even while running locally.

Security must never be treated as a feature to add later.

## 2. Security Objectives

The platform must protect:

- Customer accounts and authentication credentials.
- Personal information and identity verification records.
- Customer purchases and payment information.
- Wallets, financial ledgers and payout records.
- Challenge accounts and trading account credentials.
- Trading data and risk evaluation results.
- Administrative functions and privileged operations.
- External API credentials and integration secrets.
- Platform infrastructure, databases and application services.

The security objectives are:

1. Prevent unauthorised access.
2. Prevent unauthorised financial operations.
3. Prevent manipulation of challenge results and risk evaluations.
4. Prevent customer data exposure.
5. Prevent privilege escalation.
6. Maintain accurate and auditable financial records.
7. Detect and respond to suspicious activity.
8. Maintain service availability and recoverability.
9. Prevent insecure deployment configurations.
10. Maintain security across local, staging and production environments.

No system can be guaranteed to be completely secure. FundedGiants must use defence-in-depth controls, independent verification and continuous improvement.

## 3. Security Standards

Use the OWASP Application Security Verification Standard (ASVS) Level 2 as the minimum application security baseline, targeting version 5.0.0 where applicable.

Use current relevant OWASP guidance for:

- Web application security.
- API security.
- Authentication.
- Session management.
- Secure coding.
- Input validation.
- Access control.
- Cryptographic practices.

Use current secure development practices for:

- TypeScript.
- Node.js.
- PostgreSQL.
- Docker.
- Linux server administration.
- Next.js.
- NestJS.
- Prisma.

Do not assume that using a framework automatically makes an application secure.

## 4. Threat Modelling

Significant modules and features must undergo threat analysis before implementation.

Consider at minimum:

- Malicious customers.
- Account takeover.
- Credential theft.
- OTP brute-force attacks.
- API abuse.
- Payment manipulation.
- Duplicate webhook delivery.
- Forged or replayed webhooks.
- Insecure direct object references.
- Privilege escalation.
- Financial ledger manipulation.
- Insider abuse.
- Compromised administrator accounts.
- Third-party provider compromise.
- Database compromise.
- Server compromise.
- Secrets leakage.
- Denial-of-service attacks.
- Dependency vulnerabilities.
- Misconfigured infrastructure.
- Trading data manipulation or interruption.

For significant features, document the relevant threats, mitigations and residual risks.

## 5. Authentication

### Customer Authentication

Customer authentication must use passwordless authentication through approved email or WhatsApp OTP delivery.

Telegram authentication or linking may be supported only through a securely verified account-linking workflow.

Requirements:

- OTPs must be generated using a cryptographically secure random generator.
- OTPs must be securely hashed or otherwise protected at rest.
- OTPs must have a short configurable expiry.
- OTPs must be single-use.
- OTP verification must be rate-limited.
- Repeated incorrect attempts must trigger appropriate temporary restrictions.
- OTP issuance must be rate-limited.
- OTPs must never be stored in plaintext in application databases or logs.
- Authentication responses must not unnecessarily disclose whether an account exists.
- OTP delivery failures must be handled securely.
- Account recovery must not bypass normal identity verification controls.

Authentication must be bound to the correct customer account and intended operation.

### Session Management

Use secure session management.

Requirements:

- Secure, HttpOnly cookies where cookie-based sessions are used.
- Appropriate SameSite cookie configuration.
- TLS-only session transmission.
- Session rotation following authentication and privilege changes.
- Session expiry and revocation.
- Protection against session fixation.
- Protection against CSRF where applicable.
- Logout must invalidate the session.
- Administrative sessions must have stronger controls than customer sessions.

Do not store long-lived authentication tokens in browser localStorage unless a documented security assessment justifies the design.

### Administrative Authentication

Administrative accounts must use mandatory MFA.

Prefer phishing-resistant MFA where supported.

Administrative access must be restricted according to role and operational need.

## 6. Authorisation and Access Control

Implement server-side authorisation for every protected operation.

Use role-based access control and resource ownership checks.

Potential roles include:

- Customer.
- Support.
- Risk analyst.
- Finance operator.
- Compliance operator.
- Administrator.
- Super administrator.

The final roles must be documented and implemented according to actual business requirements.

Requirements:

- Enforce least privilege.
- Deny access by default.
- Validate resource ownership on every applicable request.
- Never trust customer-supplied account IDs, wallet IDs, order IDs or challenge IDs without authorisation checks.
- Prevent insecure direct object references.
- Separate customer permissions from administrative permissions.
- Separate financial approval permissions from financial execution permissions.
- Audit privileged actions.
- Prevent users from granting themselves permissions.
- Never rely solely on frontend visibility to enforce permissions.

## 7. Application Security

All API inputs must be validated using explicit schemas.

Requirements:

- Validate request bodies, query parameters, headers and route parameters.
- Reject unexpected or invalid input.
- Use parameterised database queries.
- Prevent SQL injection.
- Prevent XSS.
- Prevent CSRF where applicable.
- Prevent SSRF.
- Prevent path traversal.
- Prevent unsafe file uploads.
- Prevent mass assignment.
- Apply appropriate security headers.
- Use secure CORS policies.
- Rate-limit sensitive endpoints.
- Limit request sizes.
- Validate uploaded files using content and format checks.
- Avoid exposing stack traces or internal implementation details to customers.

Do not disable security controls to make development easier.

## 8. Financial Integrity

Financial records are security-critical.

All financial operations must be implemented with strong integrity controls.

### Ledger

The ledger must be:

- Double-entry.
- Immutable after posting.
- Transactional.
- Auditable.
- Idempotent where applicable.
- Reconciliable against external providers.
- Protected against duplicate posting.

Posted financial records must not be silently edited or deleted.

Corrections must be performed through properly authorised reversal or adjustment entries.

### Money Representation

Do not use floating-point numbers for financial calculations.

Use PostgreSQL NUMERIC with explicit precision and scale, or integer minor units where appropriate.

Currency must be explicitly represented.

Currency conversion must use documented rates, timestamps, precision and rounding policies.

### Wallets

Wallet functionality must not be implemented until its permitted purpose, accounting treatment and operational controls are documented.

Do not assume that purchasing a challenge automatically creates a cash wallet balance.

Distinguish clearly between:

- Customer cash.
- Promotional credit.
- Challenge entitlement.
- Trading account equity.
- Profit share payable.
- Pending payout.
- Internal accounting balances.

Do not represent trading profits as withdrawable customer cash unless the applicable business rules explicitly permit it.

### Payouts

Payouts must include:

- Eligibility validation.
- Risk and rule validation where applicable.
- Duplicate request prevention.
- Authorised approval.
- Immutable payout records.
- Status tracking.
- Reconciliation.
- Audit logging.

High-risk payout operations must use maker-checker approval.

The person initiating a high-risk payout must not be the sole person approving it.

## 9. WooCommerce and Payment Security

The existing WordPress/WooCommerce website and checkout must remain intact.

The FundedGiants backend must not trust frontend payment success messages.

Requirements:

- Verify webhook signatures using the provider's documented method.
- Validate webhook source and authenticity.
- Implement replay protection.
- Use idempotency keys.
- Handle duplicate webhook deliveries safely.
- Validate order identifiers.
- Validate purchased products and applicable prices.
- Verify payment status independently.
- Prevent client-side manipulation of product prices.
- Prevent duplicate account or entitlement creation.
- Persist webhook processing status.
- Maintain an auditable order-to-entitlement relationship.

Customer account creation, challenge provisioning and entitlements must be triggered only by independently verified successful payment events.

For subsequent dashboard purchases, the backend must create or initiate legitimate WooCommerce orders through the approved API integration.

Do not store payment card details unless the architecture and compliance requirements explicitly permit it. Prefer tokenisation and provider-hosted payment processing.

## 10. SteraTrader Integration Security

SteraTrader is the designated trading platform.

Do not assume MT5 APIs, MT5 Manager functionality, MT5 EAs or MT5-specific integration capabilities.

All SteraTrader integrations must be based on verified official documentation and confirmed provider capabilities.

Requirements:

- Secure API credential storage.
- Least-privilege integration access.
- Request authentication.
- Input and response validation.
- Idempotent provisioning workflows where supported.
- Error and timeout handling.
- Rate-limit handling.
- Audit trails.
- Protection against duplicate account provisioning.
- Verification of account ownership and association.
- Secure handling of trading credentials.

Never expose trading credentials in frontend responses, logs, URLs or browser storage.

If provider documentation or credentials are unavailable, document the limitation rather than inventing endpoints or claiming a completed integration.

## 11. Risk Engine Security

The risk engine must be isolated from ordinary customer-facing application logic.

Risk evaluations must be deterministic and reproducible where the available trading data permits.

Requirements:

- Version challenge rules.
- Record the applicable rule version.
- Validate incoming trading data.
- Detect missing, stale, inconsistent or invalid data.
- Handle provider interruptions safely.
- Prevent customer manipulation of risk evaluation inputs.
- Maintain audit trails for significant decisions.
- Record the relevant data snapshot or references needed for reproducibility.
- Restrict manual overrides.
- Require documented approval for high-impact overrides.

Missing or unreliable trading data must not silently produce a favourable risk decision.

The system must have explicit behaviour for unavailable trading data and provider failures.

## 12. Data Protection and Privacy

Collect only data required for legitimate platform functionality.

Requirements:

- Encrypt data in transit using TLS.
- Encrypt sensitive data at rest where appropriate.
- Restrict access to personal information.
- Protect identity verification records.
- Define data retention and deletion rules.
- Avoid unnecessary copies of sensitive information.
- Never expose sensitive customer data in logs.
- Use synthetic or anonymised data for tests.
- Document data flows and third-party processors.

Sensitive data access must be auditable.

## 13. Secrets Management

Never commit secrets to GitHub.

This includes:

- Database credentials.
- API keys.
- Webhook secrets.
- OTP provider credentials.
- SteraTrader credentials.
- WooCommerce API secrets.
- Payment provider secrets.
- SSH private keys.
- JWT signing secrets.
- Encryption keys.

Use environment variables for application configuration and an appropriate secrets-management mechanism for deployed environments.

The repository must contain a safe `.env.example` with placeholders only.

Production secrets must not be accessible to local development agents or ordinary development environments.

If a secret is exposed:

1. Treat it as compromised.
2. Revoke or rotate it.
3. Investigate possible use.
4. Remove the exposure from the relevant systems.
5. Document the incident.

Do not assume deleting a secret from Git history makes it safe.

## 14. Database Security

PostgreSQL must be configured securely.

Requirements:

- Database access must be private.
- Do not expose PostgreSQL directly to the public internet.
- Use least-privilege database roles.
- Separate application and migration privileges where practical.
- Use parameterised queries.
- Validate all data before persistence.
- Use transactions for critical operations.
- Enforce database constraints for financial integrity.
- Use approved migrations.
- Protect backups.
- Test restoration procedures.

Never run destructive production migrations without explicit owner approval and a verified recovery plan.

## 15. Infrastructure Security — OVHcloud

The production environment will be deployed to OVHcloud unless the owner approves a different provider.

Requirements:

- Use a supported Ubuntu LTS release.
- Apply security updates.
- Configure host firewall rules.
- Restrict SSH access.
- Prefer SSH keys over password authentication.
- Disable unnecessary services.
- Use a reverse proxy with TLS.
- Keep databases and Redis on private networks.
- Restrict inbound and outbound traffic where practical.
- Use non-root application containers.
- Avoid privileged containers.
- Do not expose internal service ports publicly.
- Monitor resource usage and service health.
- Maintain encrypted offsite backups.
- Document infrastructure configuration.

Do not introduce AWS, Kubernetes or additional paid infrastructure without owner approval.

## 16. Docker and Container Security

All container configurations must follow secure practices.

Requirements:

- Pin dependencies and base image versions appropriately.
- Avoid unnecessary packages.
- Run services as non-root users where possible.
- Do not embed secrets in images.
- Avoid privileged mode.
- Use minimal production images.
- Separate development and production configuration.
- Scan images for vulnerabilities.
- Keep application and infrastructure images updated.

Docker Compose may be used for local development and deployment where appropriate.

## 17. Logging, Monitoring and Auditing

Implement structured logging.

Logs must support investigation of:

- Authentication events.
- Authorisation failures.
- Payment events.
- Account provisioning.
- Ledger operations.
- Payout operations.
- Risk evaluations.
- Administrative actions.
- Integration failures.
- Security events.

Never log:

- OTP values.
- Passwords.
- Authentication tokens.
- API secrets.
- Full payment card data.
- Unnecessary identity documents.
- Trading account passwords.

Maintain immutable or tamper-resistant audit records for critical operations.

Monitoring must include application errors, availability, resource usage and security-relevant events.

## 18. Backup and Disaster Recovery

Production data must be backed up regularly.

Requirements:

- Automated database backups.
- Encrypted backup storage.
- Offsite backup copies.
- Documented retention policy.
- Backup integrity verification.
- Periodic restoration testing.
- Recovery procedures.
- Defined recovery time and recovery point objectives.

A backup that has never been tested for restoration must not be considered verified.

## 19. Security Testing

Security testing must be integrated into development.

Required checks include:

- Unit tests.
- Integration tests.
- End-to-end tests.
- Authentication and authorisation tests.
- API validation tests.
- Financial integrity tests.
- Dependency vulnerability scanning.
- Static analysis.
- Secret scanning.
- Container scanning.
- Database migration tests.
- Relevant OWASP security tests.

Before production launch, perform an independent security assessment appropriate to the platform's financial and trading functionality.

Critical and high-severity findings must be resolved or explicitly accepted by the owner through a documented risk decision before launch.

## 20. Vulnerability Handling

Any discovered vulnerability must be documented and prioritised.

Severity guidance:

- Critical: Immediate investigation and remediation.
- High: Prioritised remediation before production release.
- Medium: Planned remediation with documented justification.
- Low: Remediation through normal maintenance.

Do not hide, suppress or downgrade security findings merely to make CI pass.

## 21. Incident Response

For a suspected security incident:

1. Preserve relevant logs and evidence.
2. Restrict affected access where necessary.
3. Notify the owner promptly.
4. Rotate compromised credentials.
5. Assess the scope and impact.
6. Restore service securely where appropriate.
7. Document the incident.
8. Implement corrective actions.

Do not independently perform destructive actions or make external incident notifications without appropriate authorisation.

## 22. Production Deployment Approval

Production deployment requires explicit owner approval.

The following actions require explicit approval:

- Deploying to production.
- Changing production infrastructure.
- Accessing or modifying production financial records.
- Executing real payouts.
- Enabling real-money payment flows.
- Running destructive database migrations.
- Changing security controls.
- Disabling security monitoring.
- Introducing paid infrastructure.
- Exposing internal services publicly.

Local development, automated tests, code analysis, documentation and non-destructive development tasks may proceed autonomously within the established rules.

## 23. Definition of Security Completion

A feature must not be declared security-complete until:

- Its security requirements are identified.
- Input validation is implemented.
- Authorisation is verified.
- Sensitive data handling is reviewed.
- Relevant automated tests pass.
- Applicable security scans have been performed.
- Audit logging is implemented where required.
- Known limitations are documented.
- Any outstanding critical or high risks are reported.

Security is a continuous responsibility, not a one-time checklist.

## 24. Final Principle

FundedGiants must protect customer accounts, financial records, trading integrity and infrastructure as its highest technical priorities.

When a design decision creates a conflict between convenience and security, security takes priority.

When security requirements are unclear, stop and ask for clarification rather than silently implementing a weaker control.
