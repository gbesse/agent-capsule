# Security boundary

Plugins are trusted executable code, not sandboxed. Model judgments are uncertain; host applications own authentication, data access and side effects. Errors propagate; CLI errors print to stderr and exit nonzero. Hosts must connect failures to their configured administrator reporter (for example `[project][staging] error type`); this repository has no email service or telemetry. Never publish customer traces, credentials or secrets.
