import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyStaticRequest } from './staticSecurityHelper.js';

test('classifyStaticRequest blocks .env, .env.example, env.example, evn.example, and hidden paths', () => {
  const blocked = [
    '/.env',
    '/.env.example',
    '/.env.local',
    '/.env.production',
    '/env.example',
    '/evn.example',
    '/EVN.EXAMPLE',
    '/env',
    '/evn',
    '/.git/config',
    '/.gitignore',
    '/.aistudio/state.json',
    '/public/.env'
  ];
  for (const p of blocked) {
    assert.deepEqual(classifyStaticRequest(p), { action: 'block' }, `Expected ${p} to be blocked`);
  }
});

test('classifyStaticRequest blocks backend source, test, config, lock, and JSON data files', () => {
  const blocked = [
    '/server.js',
    '/SERVER.JS',
    '/mongoDb.js',
    '/mongoUriHelper.js',
    '/mongoUriHelper.test.js',
    '/zohoInventory.js',
    '/zohoOrderHelper.js',
    '/imapPaymentVerifier.js',
    '/emailTemplates.js',
    '/staticSecurityHelper.js',
    '/eslint.config.js',
    '/package.json',
    '/metadata.json',
    '/newsletter_subscribers.json',
    '/notifications_log.json',
    '/zoho_inventory_cache.json',
    '/netlify.toml',
    '/README.md',
    '/security_spec.md',
    '/LICENSE',
    '/bun.lock',
    '/netlify/functions/api.js',
    '/scripts/check.sh',
    '/admin-zoho.html'
  ];
  for (const p of blocked) {
    assert.deepEqual(classifyStaticRequest(p), { action: 'block' }, `Expected ${p} to be blocked`);
  }
});

test('classifyStaticRequest blocks path traversal and malformed percent encodings', () => {
  assert.deepEqual(classifyStaticRequest('/public/../.env'), { action: 'block' });
  assert.deepEqual(classifyStaticRequest('/%2e%2e/.env.example'), { action: 'block' });
  assert.deepEqual(classifyStaticRequest('/%E0%A4%A'), { action: 'block' });
});

test('classifyStaticRequest allows required frontend assets and public assets directory', () => {
  assert.deepEqual(classifyStaticRequest('/style.css'), { action: 'allow_file', file: 'style.css' });
  assert.deepEqual(classifyStaticRequest('/main.js'), { action: 'allow_file', file: 'main.js' });
  assert.deepEqual(classifyStaticRequest('/manifest.json'), { action: 'allow_file', file: 'manifest.json' });
  assert.deepEqual(classifyStaticRequest('/sw.js'), { action: 'allow_file', file: 'sw.js' });
  assert.deepEqual(classifyStaticRequest('/upiIntentHelper.js'), { action: 'allow_file', file: 'upiIntentHelper.js' });
  assert.deepEqual(classifyStaticRequest('/confirmationHelper.js'), { action: 'allow_file', file: 'confirmationHelper.js' });
  assert.deepEqual(classifyStaticRequest('/cartItemHelper.js'), { action: 'allow_file', file: 'cartItemHelper.js' });
  assert.deepEqual(classifyStaticRequest('/public/assets/email/pay-visa.png'), { action: 'allow_public_dir' });
});

test('classifyStaticRequest preserves clean SPA routes', () => {
  assert.deepEqual(classifyStaticRequest('/'), { action: 'spa' });
  assert.deepEqual(classifyStaticRequest('/invoice/214822'), { action: 'spa' });
  assert.deepEqual(classifyStaticRequest('/collections'), { action: 'spa' });
});
