# OWASP Dependency Audit Tool (Static)

This is a minimal static web app that generates an audit-ready report from an
OWASP dependency-check report XML and a suppressions XML.

How it works:
- Upload your `dependency-check-report.xml` (the OWASP dependency-check output)
- Upload your `suppressions.xml` (optional)
- Click "Generate Audit Report"
- The page parses and shows counts and a table of unsuppressed vulnerabilities
- Use "Export Report" to save a single HTML file to share with managers

Deploy:
- This is a static site. You can host it on GitHub Pages, Netlify, Vercel, or any static host.
- An example GitHub Actions workflow is included at `.github/workflows/deploy.yml` to deploy to GitHub Pages.

Notes:
- This is a starting point. You may want to improve XML parsing robustness (support multiple XML shape variants),
  add sorting, filtering, CSV/PDF export, and accessibility improvements.