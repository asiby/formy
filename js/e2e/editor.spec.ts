import { expect, test, type Page } from '@playwright/test';

/** Text of each top-level block, prefixed by kind (F field, A advanced, H, P). */
async function blocks(page: Page): Promise<string[]> {
  return page.locator('.formy-canvas__doc > *').evaluateAll((els) => els.map((e) => {
    const input = e.querySelector<HTMLInputElement>('[data-formy-label]');
    if (input) return `F:${input.value}`;
    const label = e.querySelector('.formy-field__label');
    if (label) return `A:${label.textContent!.trim()}`;
    return `${e.tagName === 'H2' ? 'H' : 'P'}:${e.textContent}`;
  }));
}

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/demo/${query}`);
  await page.locator('.formy-field').first().waitFor();
}

async function save(page: Page): Promise<void> {
  await page.keyboard.press('Control+s');
}

const lastSaved = (page: Page) => page.evaluate(() => fetch('/api/last-saved').then((r) => r.json()));

test('loads a webform as a document', async ({ page }) => {
  await open(page);
  expect(await blocks(page)).toEqual([
    'H:Spring workshop registration',
    "P:Tell us who's coming. It takes about two minutes.",
    'F:Full name',
    'F:Email',
    'F:Which workshop?',
    'F:Dietary needs',
    'A:Mailing address',
    'F:Signature',
    'P:',
  ]);
  await expect(page.locator('formy-signature-preview')).toBeVisible();
  await expect(page.locator('.formy-bar__status')).toHaveText('All changes saved');
});

test('"/" inserts a question, focuses its label and opens its settings', async ({ page }) => {
  await open(page);
  await page.locator('.formy-canvas__doc > p').last().click();
  await page.keyboard.type('/');
  const menu = page.locator('formy-slash-menu');
  await expect(menu).toBeVisible();
  await page.keyboard.type('dat');
  await expect(menu.locator('.formy-slash-menu__label')).toHaveText(['Date']);
  await page.keyboard.press('Enter');
  await expect(menu).toHaveCount(0);
  await page.keyboard.type('Arrival date');
  await expect(page.locator('formy-settings-panel .formy-panel__title')).toHaveText('Date');
  await page.locator('formy-settings-panel').getByLabel('Required').check();
  await save(page);
  await expect(page.locator('.formy-bar__status')).toHaveText('All changes saved');

  const saved = await lastSaved(page);
  expect(saved.blocks.at(-1)).toMatchObject({
    type: 'date',
    key: 'arrival_date',
    settings: { label: 'Arrival date', required: true },
  });
  // After saving, the key is fixed.
  await expect(page.locator('#formy-setting-key')).toHaveAttribute('readonly', '');
});

test('choices are edited in the settings panel', async ({ page }) => {
  await open(page);
  await page.locator('.formy-canvas__doc > p').last().click();
  await page.keyboard.type('/single');
  await page.keyboard.press('Enter');
  await page.keyboard.type('T-shirt size');
  const panel = page.locator('formy-settings-panel');
  await panel.getByRole('button', { name: 'Add choice' }).click();
  await panel.getByRole('textbox', { name: 'Choice 3', exact: true }).fill('Large');
  await panel.getByLabel('Show as').selectOption('dropdown');
  await save(page);
  await expect(page.locator('.formy-bar__status')).toHaveText('All changes saved');
  expect((await lastSaved(page)).blocks.at(-1)).toMatchObject({
    type: 'single_choice',
    key: 't_shirt_size',
    settings: {
      display: 'dropdown',
      options: [
        { value: 'option_1', label: 'Option 1' },
        { value: 'option_2', label: 'Option 2' },
        { value: 'option_3', label: 'Large' },
      ],
    },
  });
});

test('blocks move with buttons, the keyboard and drag and drop', async ({ page }) => {
  await open(page);
  const email = page.locator('.formy-field').nth(1);
  await email.hover();
  await email.getByRole('button', { name: 'Move up' }).click();
  expect((await blocks(page)).slice(2, 4)).toEqual(['F:Email', 'F:Full name']);

  await page.locator('.formy-canvas__doc > p').first().click();
  // ProseMirror reads the new selection on the next selectionchange event.
  await page.waitForTimeout(100);
  await page.keyboard.press('Alt+ArrowUp');
  expect((await blocks(page)).slice(0, 2)).toEqual(["P:Tell us who's coming. It takes about two minutes.", 'H:Spring workshop registration']);

  // Drag "Dietary needs" to the top with the handle's grip.
  const diet = page.locator('.formy-field').nth(3);
  await diet.hover({ position: { x: 30, y: 10 } });
  const grip = page.locator('.formy-handle__grip');
  await expect(grip).toBeVisible();
  const from = (await grip.boundingBox())!;
  const to = (await page.locator('.formy-canvas__doc > *').first().boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + 10, { steps: 12 });
  await page.mouse.move(to.x + 22, to.y + 4, { steps: 3 });
  await page.mouse.up();
  expect((await blocks(page))[0]).toBe('F:Dietary needs');
});

test('invalid blocks are flagged after a failed save', async ({ page }) => {
  await open(page);
  await page.locator('.formy-canvas__doc > p').last().click();
  await page.keyboard.type('/short');
  await page.keyboard.press('Enter');
  await save(page);
  await expect(page.locator('.formy-banner')).toContainText('Some fields need attention.');
  await expect(page.locator('.formy-field.has-errors')).toContainText('This cannot be empty.');
  await expect(page.locator('formy-settings-panel')).toContainText('This cannot be empty.');
});

test('questions with responses cannot be deleted', async ({ page }) => {
  await open(page, '?responses=1');
  await expect(page.locator('.formy-notice')).toBeVisible();
  const name = page.locator('.formy-field').first();
  await name.hover();
  await name.getByRole('button', { name: 'Delete' }).click();
  await save(page);
  await expect(page.locator('.formy-banner')).toContainText('full_name: This question already has responses');
  await page.locator('.formy-canvas__doc > p').last().click();
  await page.keyboard.press('Control+z');
  await save(page);
  await expect(page.locator('.formy-bar__status')).toHaveText('All changes saved');
});

test('a concurrent edit is reported with a reload button', async ({ page }) => {
  await open(page);
  await page.locator('.formy-canvas__doc > p').last().click();
  await page.keyboard.type('More text');
  await page.evaluate(async () => {
    const current = await (await fetch('/api/webform')).json();
    await fetch('/api/webform', {
      method: 'POST',
      headers: { 'X-CSRF-Token': 'demo-token' },
      body: JSON.stringify({ document: current.document, revision: current.meta.revision }),
    });
  });
  await save(page);
  await expect(page.locator('.formy-banner')).toContainText('changed elsewhere');
  await expect(page.locator('.formy-banner').getByRole('button', { name: 'Reload' })).toBeVisible();
});
