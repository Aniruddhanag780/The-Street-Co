import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMongoUri, getMongoUriCandidates, isMongoAuthError } from './mongoUriHelper.js';

test('normalizeMongoUri strips surrounding quotes and encodes special characters in password', () => {
  const uri = normalizeMongoUri('"mongodb+srv://admin:p@ss#word/1@cluster0.abcde.mongodb.net/"', 'thestreetco');
  assert.equal(
    uri,
    'mongodb+srv://admin:p%40ss%23word%2F1@cluster0.abcde.mongodb.net/thestreetco?retryWrites=true&w=majority'
  );
});

test('normalizeMongoUri avoids double-encoding already percent-encoded credentials', () => {
  const uri = normalizeMongoUri('mongodb+srv://admin:p%40ssword@cluster0.abcde.mongodb.net/thestreetco?retryWrites=true');
  assert.equal(
    uri,
    'mongodb+srv://admin:p%40ssword@cluster0.abcde.mongodb.net/thestreetco?retryWrites=true'
  );
});

test('normalizeMongoUri rejects empty strings, placeholders, and non-mongo schemes', () => {
  assert.equal(normalizeMongoUri(''), '');
  assert.equal(normalizeMongoUri('mongodb+srv://<username>:<password>@cluster.mongodb.net/'), '');
  assert.equal(normalizeMongoUri('mongodb+srv://admin:<db_password>@cluster.mongodb.net/'), '');
  assert.equal(normalizeMongoUri('https://example.com'), '');
});

test('getMongoUriCandidates provides fallback when a stray template angle bracket remains in credentials', () => {
  const candidates = getMongoUriCandidates('mongodb+srv://dbuser:<secretPass123@cluster-1.abcde.mongodb.net/', 'thestreetco');
  assert.deepEqual(candidates, [
    'mongodb+srv://dbuser:%3CsecretPass123@cluster-1.abcde.mongodb.net/thestreetco?retryWrites=true&w=majority',
    'mongodb+srv://dbuser:secretPass123@cluster-1.abcde.mongodb.net/thestreetco?retryWrites=true&w=majority'
  ]);

  const clean = getMongoUriCandidates('mongodb+srv://dbuser:secretPass123@cluster-1.abcde.mongodb.net/', 'thestreetco');
  assert.deepEqual(clean, [
    'mongodb+srv://dbuser:secretPass123@cluster-1.abcde.mongodb.net/thestreetco?retryWrites=true&w=majority'
  ]);
});

test('isMongoAuthError identifies MongoDB Atlas bad auth errors', () => {
  assert.equal(isMongoAuthError({ code: 8000, message: 'bad auth : authentication failed' }), true);
  assert.equal(isMongoAuthError(new Error('Authentication failed.')), true);
  assert.equal(isMongoAuthError(new Error('ETIMEDOUT')), false);
});

