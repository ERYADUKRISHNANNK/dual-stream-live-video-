Playwright Auto-Login Script

Usage:
1. Install Playwright and required browsers:

   npm install -D playwright
   npx playwright install

2. Run the script from the repository root:

   node tools/playwright/playwright_auto_login.js

Notes:
- Ensure frontend is running (Vite) and reachable at http://localhost:3001.
- The script opens a visible browser window and fills the demo credentials.
- You can edit the credentials inside the script if needed.
