# FundedGiants Contribution and Engineering Guidelines

## 1. Purpose

This document defines the mandatory development workflow, coding standards, testing requirements and engineering practices for FundedGiants.

It applies to:

- Antigravity AI agents.
- Human developers.
- Contributors.
- Automated development workflows.

FundedGiants must be developed as a production-grade application from day one.

Local development is not a prototype phase.

The objective is to develop the actual application locally, verify it, and deploy the same application to staging and eventually OVHcloud production without rebuilding its core functionality.

## 2. Authoritative Project Documents

Before starting any development task, read:

- AGENTS.md
- SECURITY.md
- CONTRIBUTING.md

These documents establish the project's mandatory rules.

If a task conflicts with these rules:

1. Identify the conflict.
2. Explain the affected requirement.
3. Do not silently weaken the rule.
4. Ask the owner for clarification when necessary.

Security requirements in SECURITY.md must not be bypassed for convenience.

## 3. Project Development Principles

The following principles are mandatory:

- Production-grade implementation from day one.
- Security-first engineering.
- Modular and maintainable architecture.
- Financial integrity.
- Test-driven or test-supported development.
- Explicit business rules.
- Actual integrations based on verified documentation.
- Local, staging and production environment parity.
- Minimal infrastructure cost.
- No unnecessary complexity.
- No unapproved production operations.
- Clear documentation.

Prefer a modular monolith initially unless a documented technical requirement justifies a separate service.

Do not introduce microservices, Kubernetes or additional infrastructure complexity without justification and owner approval.

## 4. No Mock Application Development

FundedGiants must not be developed as a mock application or disposable prototype.

Do not implement fake or placeholder functionality as a substitute for required production features.

Examples of prohibited final implementations:

- Static dashboard data presented as actual customer data.
- In-memory persistence presented as a real database.
- Hardcoded successful authentication.
- Hardcoded payment success.
- Fake wallet balances.
- Fake payout processing.
- Fake challenge provisioning.
- Fake SteraTrader account creation.
- Simulated risk engine decisions as the final risk engine.
- Placeholder API responses presented as completed integrations.

All required application modules must use real application logic and real persistence from the outset.

### Permitted test doubles

Mocks, fixtures and deterministic test data may be used for:

- Unit tests.
- Integration tests.
- Failure scenarios.
- Contract testing.
- Automated test isolation.
- Testing edge cases that are difficult to reproduce with external providers.

Test doubles must be isolated from production application paths.

They must not replace the actual production integration.

When an external integration cannot be verified due to missing credentials or provider access, document that limitation honestly.

## 5. Existing Website and Platform Requirements

### WordPress and WooCommerce

The existing WordPress/WooCommerce public website and checkout must be preserved.

Do not replace, rebuild or migrate the website without explicit owner approval.

The backend must integrate with WooCommerce through verified API and webhook contracts.

The backend must independently validate successful payment events before creating entitlements or provisioning accounts.

### Trading Platform

SteraTrader is the designated trading platform.

Do not implement MT5-specific integrations unless the owner explicitly changes the platform requirement.

Do not invent SteraTrader API endpoints, authentication methods, capabilities or provisioning workflows.

Verify all trading platform integrations against official documentation.

### Hosting

The intended production provider is OVHcloud.

Local development must not require an active paid VPS.

Do not introduce AWS or other paid infrastructure without owner approval.

## 6. Development Workflow

Every significant feature must follow this workflow.

### Step 1: Understand the task

- Read the relevant project documentation.
- Inspect the existing code.
- Identify dependencies.
- Identify affected modules.
- Identify business rules.
- Identify security implications.
- Identify database changes.
- Identify integration requirements.

Do not assume that a module or function does not exist before inspecting the repository.

### Step 2: Prepare an implementation plan

For significant changes, provide a concise plan covering:

- Objective.
- Files and modules affected.
- Database changes.
- API changes.
- Security considerations.
- Tests required.
- External dependencies.
- Acceptance criteria.

Do not begin major architectural changes without presenting the plan.

### Step 3: Implement

- Follow the existing architecture.
- Write production-grade code.
- Use typed interfaces.
- Validate inputs.
- Enforce authorisation.
- Implement proper error handling.
- Maintain financial integrity.
- Avoid unnecessary dependencies.
- Avoid unrelated changes.

### Step 4: Test

Run the relevant automated tests.

Do not claim tests have passed unless they were actually executed.

Do not suppress failing tests to complete a task.

### Step 5: Review

Review:

- Security.
- Correctness.
- Maintainability.
- Performance.
- Database integrity.
- Integration behaviour.
- Documentation.
- Error handling.

### Step 6: Report

At completion, report:

- What was implemented.
- Files changed.
- Database changes.
- Tests executed.
- Actual test results.
- Security considerations.
- External integration verification status.
- Known limitations.
- Outstanding requirements.

## 7. Repository and Git Practices

Use Git for all source code changes.

Recommended branch conventions:

- feature/<feature-name>
- fix/<issue-name>
- security/<security-change>
- docs/<documentation-change>
- refactor/<module-name>

Do not commit directly to the production branch unless the owner explicitly authorises it.

Commit messages should be descriptive.

Recommended format:

- feat: add customer authentication
- fix: prevent duplicate payment webhook processing
- security: enforce wallet ownership checks
- docs: update deployment guide
- refactor: isolate risk engine module
- test: add ledger transaction tests

Before committing:

- Review the diff.
- Confirm no secrets are included.
- Confirm generated files are appropriate.
- Confirm tests have been executed.
- Confirm no unrelated modifications are included.

Never force-push, rewrite shared history or delete branches without appropriate approval.

## 8. Coding Standards

### TypeScript

Use TypeScript for application development.

Requirements:

- Enable strict type checking.
- Avoid `any` unless justified and documented.
- Prefer explicit interfaces and types.
- Validate external data at runtime.
- Avoid unsafe type assertions.
- Keep functions focused.
- Avoid unnecessary duplication.
- Use consistent naming.
- Document non-obvious logic.

### Naming

Use descriptive names.

Examples:

- createCustomerAccount
- verifyPaymentWebhook
- provisionChallengeAccount
- evaluateChallengeRisk
- initiatePayout
- reconcileLedgerEntries

Avoid vague names such as:

- processData
- doTask
- handleStuff
- tempFunction

### Error Handling

Use explicit and structured error handling.

Requirements:

- Do not silently swallow errors.
- Do not expose internal stack traces to customers.
- Use consistent API error structures.
- Log relevant operational information without exposing secrets.
- Implement timeouts for external API requests.
- Handle retryable and non-retryable failures appropriately.

## 9. Frontend Engineering

The frontend must use a maintainable component architecture.

Requirements:

- Use typed API contracts.
- Validate user inputs.
- Handle loading, empty, success and error states.
- Avoid hardcoded production customer data.
- Enforce permissions on the backend.
- Avoid exposing secrets in browser code.
- Ensure responsive design.
- Support accessible interactions.
- Use consistent design tokens and components.

The customer dashboard and administrative portal must use actual backend APIs.

Do not use static JSON as the permanent source of customer, financial, challenge or risk data.

## 10. Backend Engineering

The backend must be the authoritative source of business logic and data integrity.

Requirements:

- Use modular architecture.
- Keep business logic out of controllers where practical.
- Validate all incoming requests.
- Enforce authorisation.
- Use transactions for critical operations.
- Implement idempotency for appropriate workflows.
- Maintain audit records.
- Handle external provider failures.
- Use explicit API contracts.
- Implement structured logging.

Do not trust frontend calculations for financial, payment, entitlement or risk decisions.

## 11. Database Engineering

Use PostgreSQL as the primary relational database.

Use Prisma where appropriate for schema management and database access.

Requirements:

- Use approved database migrations.
- Maintain appropriate indexes.
- Use foreign keys and database constraints.
- Maintain transactional consistency.
- Avoid unnecessary denormalisation.
- Document important schema decisions.
- Use appropriate data types.
- Avoid floating-point money calculations.
- Preserve financial history.

Database changes must be reviewed for:

- Data integrity.
- Performance.
- Security.
- Compatibility.
- Migration safety.
- Rollback or recovery strategy.

Do not perform destructive production migrations without explicit approval.

## 12. Financial Engineering

Financial operations require additional engineering discipline.

Requirements:

- Use a double-entry ledger.
- Maintain immutable posted financial records.
- Use transactions.
- Implement idempotency.
- Prevent duplicate crediting.
- Reconcile external transactions.
- Separate cash balances from challenge entitlements and trading equity.
- Implement controlled adjustments and reversals.
- Maintain audit trails.

Every financial operation must have a documented business purpose and accounting treatment.

Do not implement wallet, deposit, withdrawal or payout behaviour based on assumptions.

## 13. Risk Engine Engineering

The risk engine must be independently testable and logically isolated.

Requirements:

- Version challenge rules.
- Make risk decisions reproducible where data permits.
- Validate trading data.
- Handle missing or stale data explicitly.
- Document calculation logic.
- Use deterministic calculations.
- Maintain audit records.
- Restrict overrides.
- Test edge cases thoroughly.

Risk rules must not be casually changed as part of unrelated feature work.

Changes affecting challenge eligibility, drawdown, profit targets, payouts or trading restrictions require explicit business-rule confirmation.

## 14. External Integrations

External integrations must use actual provider contracts.

Examples:

- WooCommerce.
- Payment providers.
- Email delivery.
- WhatsApp delivery.
- SteraTrader.
- Identity verification providers.
- Notification providers.

For each integration:

1. Identify the official documentation.
2. Confirm supported capabilities.
3. Define authentication.
4. Define request and response contracts.
5. Define timeouts.
6. Define retries.
7. Define rate-limit behaviour.
8. Define error handling.
9. Define idempotency where applicable.
10. Implement secure credential handling.
11. Write appropriate tests.
12. Document verification status.

Never invent endpoints or assume undocumented capabilities.

## 15. Testing Requirements

Testing is mandatory.

### Unit Tests

Test isolated business logic.

Examples:

- Financial calculations.
- Ledger posting rules.
- Entitlement eligibility.
- Challenge rule calculations.
- OTP validation.
- Authorisation rules.

### Integration Tests

Test actual module interactions.

Examples:

- Database transactions.
- Order processing.
- Webhook handling.
- Customer provisioning.
- Ledger posting.
- Risk engine integration.

### End-to-End Tests

Test important customer and administrative workflows.

Examples:

- Customer authentication.
- Purchase verification.
- Challenge entitlement creation.
- Account provisioning.
- Dashboard access.
- Payout request and approval.

### Security Tests

Test:

- Authentication.
- Authorisation.
- Resource ownership.
- Input validation.
- Rate limiting.
- Webhook verification.
- Financial integrity.
- Privileged operations.

### Test Environment

Use local infrastructure and provider test environments where available.

Test data must not contain real customer secrets or unapproved production data.

Test doubles may be used for isolated automated tests but must not replace production integration code.

### Completion Criteria

A feature must not be declared complete if required tests are failing or have not been executed.

If tests cannot be executed, document the exact reason and the remaining verification requirements.

## 16. Local Development and Environment Parity

The local development environment must use production-grade architecture.

Use Docker Compose where appropriate for:

- Application services.
- PostgreSQL.
- Redis.
- Background workers.
- Supporting infrastructure.

The application must use environment-specific configuration.

Local, staging and production must share:

- Core application code.
- Business logic.
- Database schema and migration system.
- API contracts.
- Container definitions where appropriate.

Do not create a separate local implementation of core business functionality.

The intended deployment path is:

Local development → GitHub → Staging on OVHcloud → Approved production deployment on OVHcloud.

## 17. Background Jobs and Reliability

Use durable background processing for operations that should not depend on a single HTTP request.

Examples:

- Account provisioning.
- Notification delivery.
- Webhook processing.
- Reconciliation.
- Trading data ingestion.
- Risk evaluation.
- Scheduled operational tasks.

Requirements:

- Durable job records where critical.
- Idempotent processing.
- Appropriate retries.
- Failure handling.
- Dead-letter or equivalent handling.
- Monitoring.
- Operational visibility.

Critical financial workflows must not rely solely on an in-memory queue.

## 18. Dependency Management

Do not add dependencies without justification.

Before adding a dependency:

- Confirm it is necessary.
- Review its maintenance status.
- Review its licence.
- Review known vulnerabilities.
- Prefer established libraries.
- Pin or constrain versions appropriately.

Do not introduce a new paid service or vendor without owner approval.

Keep dependencies updated through controlled changes.

## 19. AI Agent Operating Rules

Antigravity must operate as a disciplined engineering agent.

It may autonomously:

- Inspect project files.
- Read documentation.
- Plan implementation.
- Write application code.
- Create and run local tests.
- Perform local linting and type checks.
- Review code.
- Update documentation.
- Create non-destructive local database migrations.
- Identify security issues.
- Prepare Git changes.

It must not autonomously:

- Deploy to production.
- Access or alter production financial records.
- Execute real payouts.
- Run destructive production migrations.
- Expose production secrets.
- Disable security controls.
- Introduce unapproved paid infrastructure.
- Change confirmed business rules.
- Replace the existing WordPress/WooCommerce website.
- Invent external API capabilities.
- Claim unverified work is complete.

When an action is risky, destructive, security-sensitive or financially consequential, stop and obtain owner approval.

Do not ask for approval for every routine local development operation. Work autonomously within the defined boundaries.

## 20. Documentation Requirements

Every significant feature must have appropriate documentation.

Documentation may include:

- Architecture.
- API contracts.
- Database schemas.
- Business rules.
- Integration specifications.
- Security considerations.
- Environment variables.
- Deployment instructions.
- Troubleshooting.
- Operational procedures.

Update documentation when implementation changes make it inaccurate.

Do not leave undocumented assumptions in critical financial or risk logic.

## 21. Production Deployment Workflow

Production deployment must be a controlled process.

Before deployment:

- Confirm the intended release.
- Confirm automated tests pass.
- Confirm relevant security scans pass.
- Review database migrations.
- Review environment configuration.
- Confirm secrets are correctly configured.
- Confirm backup status.
- Confirm recovery procedures.
- Confirm monitoring.
- Confirm integration readiness.
- Confirm owner approval.

Production deployment must use the approved deployment process.

Never deploy automatically merely because a commit has been pushed to GitHub.

## 22. Definition of Done

A feature is complete only when:

- Requirements are understood.
- Business rules are confirmed.
- Production-grade implementation is complete.
- Appropriate database changes are implemented.
- Security controls are applied.
- Actual integration code is implemented where required.
- Tests are written and executed.
- Relevant checks pass.
- Documentation is updated.
- No critical unresolved issue is hidden.
- Known limitations are documented.
- The implementation has been reviewed.
- The owner has been informed of the actual completion status.

A mock implementation, placeholder or unverified integration must never be presented as a completed production feature.

## 23. Final Engineering Principle

Build FundedGiants as a real, secure, maintainable and deployable platform from day one.

Do not optimise for the appearance of progress.

Optimise for correct functionality, financial integrity, security, reliability, maintainability and a seamless eventual deployment to OVHcloud.

When requirements are unclear, inspect the existing code and documentation first. If the ambiguity affects financial behaviour, security, external integrations or business rules, request clarification rather than making assumptions.
