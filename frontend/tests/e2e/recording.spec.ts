import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// =====================================================================
// AGENTFORGE SOVEREIGN E2E EXHAUSTION MATRIX
// Scope: Landing → Register → Settings (BYOK + Theme) → Agent Create →
//        Knowledge Upload → RAG Chat → Individual Deletions → Vaporize
// Viewport Matrix: Desktop (1440×900) · Tablet (768×1024) · Mobile (375×812)
// =====================================================================

// Manual Backend .env Retrieval (Frictionless & Secure)
const getBackendKey = () => {
  try {
    const envPath = path.resolve(__dirname, '../../../backend/.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/GEMINI_API_KEY=["']?([^"'\n]+)["']?/);
      return match ? match[1] : null;
    }
  } catch (e) { return null; }
  return null;
};

const SYSTEM_API_KEY = process.env.GEMINI_API_KEY || getBackendKey() || 'dummy_api_key_for_testing';

const autoScroll = async (page: any, label: string) => {
  console.log(`[SOVEREIGN] ${label}: Scrolling to demonstrate adaptive UI...`);
  await page.waitForTimeout(2000);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
  await page.waitForTimeout(4000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
  await page.waitForTimeout(2000);
};

test.describe.configure({ mode: 'serial' });

const viewports = [
  { name: 'Desktop', width: 1440, height: 900 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Mobile', width: 375, height: 812 },
];

for (const vp of viewports) {
  test(`Full Lifecycle Demo — ${vp.name}`, async ({ }) => {
    test.setTimeout(300000); // 5 minutes per viewport

    const browser = await chromium.launch({
      headless: false, // Forces Chrome to open visibly
    });

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();
    const timestamp = Date.now();
    const email = `demo_${timestamp}_${vp.name.toLowerCase()}@forge.test`;
    const password = process.env.TEST_PASSWORD || 'password123';

    // Console & error logging for debugging
    page.on('console', msg => console.log(`[BROWSER LOG] [${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));

    // Auto-accept native confirm/prompt dialogs
    page.on('dialog', async dialog => {
      console.log(`[DIALOG] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    // Sidebar navigation helper — automatically opens mobile burger menu
    const navigateSidebar = async (selector: string) => {
      const menuBtn = page.locator('button.btn-menu');
      if (await menuBtn.isVisible()) {
        console.log(`[SOVEREIGN] ${vp.name}: Opening mobile sidebar...`);
        await menuBtn.click();
        await page.waitForTimeout(1000);
      }
      await page.locator(selector).first().click();
    };

    try {
      // ─────────────────────────────────────────────
      // 1. LANDING PAGE
      // ─────────────────────────────────────────────
      await test.step('Landing Page Verification & Scroll', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Visiting Landing Page...`);
        await page.goto('http://localhost:3003');
        await page.waitForLoadState('networkidle');
        await expect(page.getByText(/AgentForge/i).first()).toBeVisible();
        await expect(page.getByText(/Build Intelligent AI Agents/i).first()).toBeVisible();
        await autoScroll(page, vp.name);
      });

      // ─────────────────────────────────────────────
      // 2. USER REGISTRATION
      // ─────────────────────────────────────────────
      await test.step('Identity Registration', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Navigating to Register...`);
        const getStartedBtn = page.getByRole('button', { name: /Start Building/i }).first();
        if (await getStartedBtn.isVisible()) {
          await getStartedBtn.click();
        } else {
          await page.goto('http://localhost:3003/register');
        }

        await page.waitForURL('**/register');
        await page.waitForTimeout(2000);
        await page.locator('#register-name').fill(`Agent Observer (${vp.name})`);
        await page.locator('#register-email').fill(email);
        await page.locator('#register-password').fill(password);
        await page.locator('#register-confirm').fill(password);
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: /Create Account/i }).click();
        await page.waitForLoadState('networkidle');
        await page.waitForURL('**/dashboard', { timeout: 30000 });
        await page.waitForTimeout(3000);
      });

      // ─────────────────────────────────────────────
      // 3. THEME TOGGLE (LIGHT/DARK VALIDATION)
      // ─────────────────────────────────────────────
      await test.step('Theme Toggle — Light & Dark Mode', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Testing Light/Dark Mode switching...`);
        const themeBtn = page.locator('#theme-toggle-btn');

        // Switch to Light Mode
        await themeBtn.click();
        await page.waitForTimeout(1500);
        const lightTheme = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme')
        );
        console.log(`[SOVEREIGN] ${vp.name}: Theme after first toggle: ${lightTheme}`);
        expect(lightTheme).toBe('light');

        // Switch back to Dark Mode
        await themeBtn.click();
        await page.waitForTimeout(1000);
        const darkTheme = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme')
        );
        console.log(`[SOVEREIGN] ${vp.name}: Theme after second toggle: ${darkTheme}`);
        expect(darkTheme).toBe('dark');
      });

      // ─────────────────────────────────────────────
      // 4. BYOK GEMINI API CONFIGURATION
      // ─────────────────────────────────────────────
      await test.step('BYOK — Configure Gemini API Key', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Navigating to Settings...`);
        await navigateSidebar('text=Global Settings');
        await page.waitForURL('**/settings');
        await page.waitForTimeout(3000);

        console.log(`[SOVEREIGN] ${vp.name}: Configuring LLM API Key...`);
        await page.locator('input[type="password"]').fill(SYSTEM_API_KEY);
        await page.locator('input[placeholder="e.g. gemini-2.5-flash"]').fill('gemini-2.5-flash');
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: /Save LLM Settings/i }).click();

        // Wait for success toast / badge update
        await page.waitForTimeout(3000);
        await expect(page.locator('.key-status-indicator.active')).toBeVisible();
      });

      // ─────────────────────────────────────────────
      // 5. AI AGENT CREATION
      // ─────────────────────────────────────────────
      await test.step('Create Autonomous Agent', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Navigating back to Dashboard...`);
        await navigateSidebar('text=Agents Dashboard');
        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Building a new Agent...`);
        await page.getByRole('button', { name: /New Agent/i }).first().click();
        await page.waitForTimeout(1500);

        await page.locator('input[placeholder*="Sales Assistant"]').fill(`Support Bot (${vp.name})`);
        await page.locator('textarea[placeholder*="technical documentation assistant"]').fill(
          'You are a grounding verification assistant. Respond concisely and referencing the document details.'
        );
        await page.locator('input[type="range"]').fill('0.5');
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: /Save Agent/i }).click();

        // Verify agent card is now present
        await page.waitForTimeout(3000);
        await expect(page.locator('.agent-card')).toContainText(`Support Bot (${vp.name})`);
      });

      // ─────────────────────────────────────────────
      // 6. RAG KNOWLEDGE BASE — DOCUMENT UPLOAD
      // ─────────────────────────────────────────────
      await test.step('RAG Document Ingestion & Vectorization', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Navigating to Agent Data Manager...`);
        await page.locator('.agent-card').filter({ hasText: `Support Bot (${vp.name})` })
          .getByRole('button', { name: /Data/i }).click();
        await page.waitForURL('**/agents/**/knowledge');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Creating test grounding file...`);
        const testFilePath = path.resolve(__dirname, `sample_${vp.name.toLowerCase()}.txt`);
        const fileContent = `AgentForge Workspace Protocol: Verified operational success. The designated coder is Antigravity, a senior Google DeepMind agent designed for autonomous pairing. The system operates on port 3003.`;
        fs.writeFileSync(testFilePath, fileContent);

        console.log(`[SOVEREIGN] ${vp.name}: Uploading file to RAG pipeline...`);
        await page.setInputFiles('input[type="file"]', testFilePath);

        // Wait for ingestion/vectorization to finish
        await page.waitForTimeout(8000);
        await expect(page.locator('.doc-row')).toContainText(`sample_${vp.name.toLowerCase()}.txt`);

        // Clean up local temp file
        try { fs.unlinkSync(testFilePath); } catch (e) { }
      });

      // ─────────────────────────────────────────────
      // 7. RAG CHAT — GROUNDED CONVERSATION
      // ─────────────────────────────────────────────
      await test.step('RAG Chat — Grounded Query & Stream Verification', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Navigating back to Dashboard to Chat...`);
        await page.locator('.back-link').click();
        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Launching Chat window...`);
        await page.locator('.agent-card').filter({ hasText: `Support Bot (${vp.name})` })
          .getByRole('button', { name: /Chat/i }).click();
        await page.waitForURL('**/chat/**');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Sending grounded query to Agent...`);
        await page.locator('textarea.chat-input').fill('Who is Antigravity according to the protocol?');
        await page.locator('button[type="submit"]').click();

        // Wait for streaming RAG response
        console.log(`[SOVEREIGN] ${vp.name}: Waiting for LLM to stream RAG response...`);
        await page.waitForTimeout(12000);

        const responseBubbles = page.locator('.message-wrapper.model');
        await expect(responseBubbles.first()).toBeVisible();
        const responseText = await responseBubbles.first().innerText();
        console.log(`[SOVEREIGN] ${vp.name}: RAG response: "${responseText.trim()}"`);
        expect(responseText.toLowerCase()).toContain('antigravity');
      });

      // ─────────────────────────────────────────────
      // 8. INDIVIDUAL DELETIONS WITH ASSERTIONS
      // ─────────────────────────────────────────────
      await test.step('Individual Item Deletions with Assertions', async () => {
        // 8a. Delete the uploaded document from the Knowledge Base
        console.log(`[SOVEREIGN] ${vp.name}: Navigating to Knowledge to delete document...`);
        await navigateSidebar('text=Agents Dashboard');
        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(2000);

        await page.locator('.agent-card').filter({ hasText: `Support Bot (${vp.name})` })
          .getByRole('button', { name: /Data/i }).click();
        await page.waitForURL('**/agents/**/knowledge');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Deleting uploaded document...`);
        await page.locator('button[title="Delete document"]').first().click();
        await page.waitForTimeout(3000);
        await expect(page.locator('.doc-row')).not.toBeVisible({ timeout: 10000 });

        // 8b. Navigate back and delete the agent itself
        console.log(`[SOVEREIGN] ${vp.name}: Navigating back to Dashboard to delete agent...`);
        await page.locator('.back-link').click();
        await page.waitForURL('**/dashboard');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Deleting agent...`);
        await page.locator('.agent-card').filter({ hasText: `Support Bot (${vp.name})` })
          .locator('button[title="Delete Agent"]').click();
        await page.waitForTimeout(3000);
        await expect(page.locator('.agent-card').filter({ hasText: `Support Bot (${vp.name})` }))
          .not.toBeVisible({ timeout: 10000 });

        console.log(`[SOVEREIGN] ${vp.name}: Individual deletions verified.`);
        await page.waitForTimeout(2000);
      });

      // ─────────────────────────────────────────────
      // 9. SOVEREIGN PURGE — ACCOUNT VAPORIZATION
      // ─────────────────────────────────────────────
      await test.step('Sovereign Purge — Account Vaporization', async () => {
        console.log(`[SOVEREIGN] ${vp.name}: Navigating to Settings for Vaporization...`);
        await navigateSidebar('text=Global Settings');
        await page.waitForURL('**/settings');
        await page.waitForTimeout(2000);

        console.log(`[SOVEREIGN] ${vp.name}: Vaporizing user account...`);
        await page.getByRole('button', { name: /Vaporize Account/i }).click();

        // Verify redirect back to /login with a clean state
        await page.waitForURL('**/login', { timeout: 15000 });
        console.log(`[SOVEREIGN] ${vp.name}: Sovereign purge complete. Redirected to Login.`);
        await page.waitForTimeout(3000);
      });

    } catch (error) {
      console.error(`[ERR_SOVEREIGN] ${vp.name}: Demo interrupted:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  });
}
