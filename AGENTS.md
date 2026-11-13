# FundedGiants Workspace Governance

This workspace contains the FundedGiants production-grade application.

Before performing any development work, follow the complete project instructions in the root files:

- AGENTS.md
- SECURITY.md
- CONTRIBUTING.md

These files are authoritative project engineering and security requirements.

Mandatory:
- Build production-grade application code from day one, even during local development.
- Do not create mock application development or fake implementations as substitutes for required production functionality.
- Use real integrations based on verified API documentation.
- Use provider test/sandbox environments where available.
- Test doubles are permitted only for isolated automated testing and must never replace production integration code.
- Maintain local, staging and production environment parity.
- Do not deploy to OVHcloud or any public production environment without explicit owner approval.
- Do not introduce AWS or paid infrastructure without approval.
- FundedGiants uses SteraTrader, not MT5.
- Preserve the existing WordPress/WooCommerce website.
- Never expose production secrets or weaken security controls.
- Do not claim functionality, tests, security checks or integrations are complete unless actually verified.

At the start of a new development task, identify the relevant requirements and acceptance criteria. For significant changes, explain the plan before implementation.

At completion, report the files changed, actual tests performed, results, known limitations and outstanding integration requirements.

## 22. Production-Grade Development From Day One — No Mock Application Development

FundedGiants must be developed as the actual production application from the beginning, even while running locally.

The local environment is a development environment for the real application, not a prototype environment.

### Mandatory principles

1. Build real application modules and business logic from the outset.
2. Implement real authentication, authorisation, database persistence, APIs, financial ledger, risk engine, account provisioning and administrative workflows.
3. Implement actual integration adapters using verified official API documentation.
4. Use production-grade validation, security controls, logging, error handling, audit trails and database migrations from the beginning.
5. Maintain the same application architecture across local, staging and production.
6. Prefer environment-specific configuration over environment-specific application rewrites.
7. Build deployable application containers locally.
8. Ensure that local code is suitable for eventual production deployment without rebuilding core functionality.

### Prohibition on mock application development

Do not create mock or fake implementations as substitutes for required production features.

Do not:
- Hardcode successful login responses.
- Hardcode successful payment responses in application business logic.
- Generate fake financial balances as real wallet functionality.
- Simulate challenge outcomes in the production risk engine.
- Create fake SteraTrader account provisioning as the final implementation.
- Create fake payout processing as the final implementation.
- Replace real database persistence with in-memory data.
- Use static dashboard data as completed functionality.
- Claim an integration is complete when only a mock has been implemented.

### Appropriate use of test doubles

Test doubles, fixtures and deterministic simulated data may be used only for isolated automated tests, contract tests, failure testing or situations where an external system is unavailable.

They must:
- Be clearly identified as test-only.
- Be isolated from production application paths.
- Never be used to claim that an external integration has been fully verified.
- Never replace the actual integration implementation.
- Never permit accidental real-money activity during local testing.

### External integrations

Use actual integration contracts and documented APIs.

Where a provider offers a sandbox or test environment, use it for local integration testing.

Where access credentials are unavailable:
- Implement the real adapter based on verified documentation.
- Define required environment variables.
- Define the expected authentication and data contracts.
- Create automated tests for the adapter's internal logic.
- Document exactly which integration tests remain blocked by missing credentials or provider access.
- Do not fabricate API responses or claim live integration verification.

### Environment parity

Local, staging and production must use the same application codebase, module structure, container definitions and database migration system.

Differences must be controlled through:
- Environment variables.
- Secrets.
- Domain configuration.
- Infrastructure configuration.
- Provider credentials.
- Security policies.
- Operational settings.

Do not maintain separate local and production implementations of core business logic.

### Production readiness

A locally developed feature must be built to production standards, but it must not be declared production-ready until its actual integrations, security controls, deployment configuration and operational requirements have been verified.

The objective is seamless deployment of the same tested application to OVHcloud, not a second development phase that rewrites the application for production.
