B-TRACE System Requirements (All-in-One):

A. TECHNOLOGY STACK & STRUCTURE:
- Frontend: React.js with JSX for interfaces, styled using Tailwind CSS (utility-first, responsive, accessible).
- Backend: SQLite database for local data storage.
- Recommended Folders:
/trace-app
  /src (components, pages, layouts, contexts, hooks, utils, services, assets, styles, security, App.jsx, index.js)
  /server (controllers, routes, models, middleware, db, utils, server.js)
  /config, /public, /scripts
  .env, .gitignore, package.json, tailwind.config.js, README.md

B. MODERN UI/UX PRINCIPLES:
- Minimalist, mobile-responsive, accessible design.
- Intuitive navigation menus/sidebar.
- CTAs, clear forms, tooltips, notifications, toast messages.
- Use Tailwind utility classes.
- Keyboard navigation, ARIA labels, color contrast.
- Step-by-step/wizard flows for complex forms.
- Dashboard/home page overview.
- Clean typography, spacing, visual hierarchy.
- Implement toast notifications for user feedback (e.g., successful save, error states) using a library such as react-hot-toast or react-toastify.

C. ELECTRON INTEGRATION (Desktop):
- Use Electron for packaging React as a desktop app.
- Configure main/renderer process and IPC.
- Hot reload for development.
- Icons/platform settings for Windows/macOS/Linux.
- Secure Node integration.
- Package with electron-builder/electron-forge.
- List node/electron version in README, document scripts.
- IPC tested and OS permissions handled securely.

D. KEY DEPENDENCIES (include in package.json):
- electron, electron-builder, concurrently, (optionally: wait-on).
- For toast notifications: add react-hot-toast or react-toastify to dependencies.

E. CORE SECURITY PRACTICES:
- Always validate & sanitize input server-side.
- Escape UI output to prevent XSS.
- Authenticate (sessions/JWT/tokens).
- CORS & CSRF protection as needed.
- No secrets in frontend or committed to code.
- HTTPS, secure cookies in production.
- Helmet or equivalent for HTTP headers.
- Modular structure for security clarity & easy onboarding.

F. CHILD & APPLICATION REQUIREMENTS:

1. CHILD IDENTIFICATION Info:
   - First, Middle, Last Name
   - Date of Birth, Age
   - Place of Birth
   - Contact No.

2. GENERAL DOCUMENTS (ALL AGES):
   1. National I.D
   2. PSA Negative
   3. Affidavit of Two Witnesses (Legal Office)
   4. Affidavit of Abandonment (Legal Office)
   5. Affidavit of Guardianship (Legal Office)
   6. Affidavit w/ Corroboration for Out-of-Town Applicant (Legal Office)
   7. Brgy. Certification (Facts of Birth)
   8. Brgy. Residency
   9. 2x2 Photo I.D. with white background (studio copy: 1, out-of-town: 2)

3. AGE-SPECIFIC REQUIREMENTS:

a. 1 Month & 1 Day - 6 Yrs. Old
   - Immunization record (5yo+ Immunization Cert’n)
   - Baptismal certificate (*Siblings' COLB if born at home)
   - Form 137/school records or certification
   - AUSF (Affidavit to Use Surname of Father) / Appearance of both parents (married/not married)
   - Marriage contract of parents (if married)
   - Valid I.D. & birth cert of parents

b. 7-17 Yrs. Old
   - Baptismal certificate / siblings’ COLB (esp. if born at home)
   - Form 137 SF10-ES and/or school cert
   - Appearance of both parents and applicant
   - AUSF (Affidavit to Use Surname of Father)
   - Marriage contract of parents
   - Valid I.D. & birth cert of parents

c. 18-59 Yrs. Old (showing applicant's place of birth & parents’ details)
   - Baptismal certificate
   - Form 137 SF10-ES and/or school cert
   - Voter’s certification / registration record
   - Police or NBI clearance
   - Service record
   - Marriage certificate (applicant or parents) with place of birth
   - SSS-E4, GSIS, or MDR-PhilHealth
   - Applicant's appearance
   - Siblings’ birth certificate, etc.
   - Valid I.D.s & birth cert of parents

d. 60 Yrs. Old & Above (showing applicant's place of birth & parents’ details)
   - Baptismal certificate
   - Children's birth certificates (1960–1984)
   - Service record / insurance policy
   - Marriage certificate (applicant or parents, with place of birth)
   - Voter’s certification / registration record
   - Police or NBI clearance
   - SSS-E4, GSIS, or MDR-PhilHealth
   - Siblings’ birth, COM, baptismal or death certificate
   - Applicant’s appearance
   - Parent’s birth/ID/death certificate (if deceased)

*This system combines technical structure, UI/UX (including use of toast notifications), security, and detailed documentation requirements for B-TRACE.* 