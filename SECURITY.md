# Security

Private Council is currently a local-first prototype.

## Do Not Commit Secrets

Never commit `.env` or runtime data from `.private-council-data/`.

Use `.env.example` as the public template.

## API Keys

Model provider keys are read by `server.js` and should remain server-side. The browser talks only to local endpoints such as `/api/sessions` and `/api/config`.

## Current Limitations

- No user authentication
- No encryption at rest
- No multi-user authorization model
- No production audit logging
- Basic rule-based safety routing only
- Local JSON storage, not a production database

Do not deploy this publicly without adding authentication, access control, hardened storage, logging, and a stronger safety layer.

