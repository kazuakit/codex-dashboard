# Continuous delivery

Phase 1 has no deployment target. The dashboard is run only by its single user
on one MacBook through the local `pnpm dev` command, so no CD workflow or
deployment credentials are configured.

Before adding a hosted or distributable runtime, decide and document the
deployment target, trigger, rollback strategy, and TLS termination approach.
