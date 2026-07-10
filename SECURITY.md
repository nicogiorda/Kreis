# Security Policy

## Reporting a Vulnerability

If you discover a security issue in Kreis, please do not open a public issue.

Send a report to:

```text
kreis1app@gmail.com
```

Please include:

- A clear description of the issue.
- Steps to reproduce it.
- The affected route, screen, endpoint, or dependency.
- Any relevant logs or screenshots, without exposing private user data.

We will review valid reports as soon as possible and prioritize fixes based on severity and impact.

## Secrets

Do not commit `.env` files, access tokens, private keys, database dumps, production credentials, or service-role keys. Local configuration must be based on `.env.example`.
