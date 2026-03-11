# Security

- Input validation and sanitization are done server-side (express-validator).
- UI output: use escapeHtml() from utils/escape.js when injecting user content into DOM.
- No secrets in frontend; use .env for API URL only.
- CORS and Helmet are configured on the server.
