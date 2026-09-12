# EmailJS contact configuration fix

## Changes
- Add `@emailjs/browser` using the existing Bun package workflow.
- Replace the hardcoded EmailJS values and direct REST request with one `emailjs.send(...)` browser-SDK path using the three required `VITE_EMAILJS_*` variables.
- Preserve database-first submission, all form fields, validation, layout, and the existing two success outcomes.
- Add a configuration guard that logs no values and gracefully reports notification failure without saving a duplicate message.
- Add an `.env.example` containing empty EmailJS variable declarations, without altering unrelated environment settings.

## Verification
- Search tracked project files for the removed literal values and duplicate EmailJS REST endpoint.
- Confirm the package installation and production build through the preview build signal.
- Exercise `/contact` in the browser, including native validation and the configured notification path, while confirming the database request remains first.
- Check representative existing routes for regressions.

## Required environment configuration
The deployed frontend build must provide `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`, and `VITE_EMAILJS_PUBLIC_KEY`. These are browser-visible EmailJS identifiers, not private server credentials.
