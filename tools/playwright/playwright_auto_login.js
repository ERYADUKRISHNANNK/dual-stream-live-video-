const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

function waitForUrl(url, timeout = 120000, interval = 1000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryReq = () => {
      const req = http.get(url, res => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) return reject(new Error('Timeout waiting for ' + url));
        setTimeout(tryReq, interval);
      });
      req.setTimeout(2000, () => req.abort());
    };
    tryReq();
  });
}

(async () => {
  // Optionally skip starting services by setting SKIP_START=1 in env
  const skipStart = process.env.SKIP_START === '1';
  if (!skipStart) {
    const repoRoot = path.resolve(__dirname, '..', '..');
    const bat = path.join(repoRoot, 'run_all.bat');
    console.log('Starting run_all.bat to launch backend and frontend...');
    const proc = spawn('cmd.exe', ['/c', bat], { cwd: repoRoot, windowsHide: true, detached: false });
    proc.stdout.on('data', d => process.stdout.write(`[run_all] ${d}`));
    proc.stderr.on('data', d => process.stderr.write(`[run_all] ${d}`));
    proc.on('exit', code => console.log('run_all.bat exited with', code));
  } else {
    console.log('SKIP_START=1 set; not launching run_all.bat');
  }

  const loginUrl = 'http://localhost:3001/login';
  console.log('Waiting for frontend at', loginUrl);
  try {
    await waitForUrl(loginUrl, 120000);
  } catch (err) {
    console.warn('Frontend did not become ready in time:', err.message);
  }

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  try {
    await page.goto(loginUrl, { timeout: 30000 });

    // Fill username and password
    await page.fill('input[placeholder="Enter account username"]', 'YADUKRISHNAN N K').catch(() => {});
    await page.fill('input[type="password"]', '12345678').catch(() => {});

    // Click the primary login button (try common labels)
    const selectors = ['button:has-text("VERIFY IDENTITY GATEWAY")', 'button:has-text("Login")', 'button:has-text("Sign In")', 'button:has-text("VERIFY")'];
    for (const sel of selectors) {
      try {
        const btn = await page.$(sel);
        if (btn) { await btn.click(); break; }
      } catch (e) {}
    }

    // Wait briefly for navigation or UI changes
    await page.waitForTimeout(2000);

    // Check for login failure indicator; if found, fallback to API token injection
    const errorBanner = await page.$('text=Credentials matching failed') || await page.$('.alert-danger') || await page.$('.toast-error');
    if (errorBanner) {
      console.log('UI login failed; attempting API login and token injection.');
      try {
        const resp = await (globalThis.fetch || fetch)('http://127.0.0.1:5000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'YADUKRISHNAN N K', password: '12345678', fingerprint: 'Playwright' })
        });
        if (resp && resp.ok) {
          const data = await resp.json();
          const token = data.token;
          const user = data.user;
          await page.evaluate((t, u) => {
            localStorage.setItem('token', t);
            localStorage.setItem('user', JSON.stringify(u));
          }, token, user);
          console.log('Token injected into localStorage; reloading dashboard.');
          await page.goto('http://localhost:3001/', { timeout: 15000 });
        } else {
          console.warn('API login failed or backend unreachable.');
        }
      } catch (e) {
        console.error('API login fallback error:', e);
      }
    }

    console.log('Auto-login script completed.');
  } catch (err) {
    console.error('Playwright error:', err);
  } finally {
    // leave browser open for inspection
    // await browser.close();
  }
})();
