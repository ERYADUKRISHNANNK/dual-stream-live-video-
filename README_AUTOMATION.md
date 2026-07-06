One-click / Quick Login Automation

Files added:
- docs/quick_login_bookmarklet.html  — bookmarklet link to auto-fill login
- scripts/create_desktop_shortcut.ps1 — create a Desktop shortcut that launches run_all.bat
- tools/playwright/playwright_auto_login.js — Playwright script to auto-fill and submit login
- tools/playwright/README.md — instructions to run the Playwright script

How to use

A) Bookmarklet (Quickest)
- Open docs/quick_login_bookmarklet.html in your browser.
- Drag the "Quick Login (Aegis)" link to your bookmarks bar.
- Start the frontend, open the login page, then click the bookmarklet to auto-login.

B) Desktop Shortcut (one-click launcher)
- From the repo root, run the PowerShell helper to create a Desktop shortcut:
  1. Open PowerShell (no admin required).
  2. From repo root run: `scripts\create_desktop_shortcut.ps1`
- Double-click the "Aegis Platform" shortcut on your Desktop to launch `run_all.bat` and start services.

C) Playwright auto-login (automated browser)
- Install Playwright and browsers:
  ```bash
  npm install -D playwright
  npx playwright install
  ```
- Run the script:
  ```bash
  node tools/playwright/playwright_auto_login.js
  ```
- The script opens Chromium, navigates to the login page, fills credentials, and submits.

Demo credentials (mock DB):
- Username: YADUKRISHNAN N K
- Password: 12345678

If you want me to (1) create a desktop shortcut automatically now, (2) customize the bookmarklet credentials, or (3) wire Playwright to also start `run_all.bat`, tell me which and I'll proceed.
