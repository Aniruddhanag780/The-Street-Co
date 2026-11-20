export const ALLOWED_PUBLIC_ROOT_FILES = new Map([
  ['/style.css', 'style.css'],
  ['/main.js', 'main.js'],
  ['/manifest.json', 'manifest.json'],
  ['/sw.js', 'sw.js'],
  ['/upiIntentHelper.js', 'upiIntentHelper.js'],
  ['/confirmationHelper.js', 'confirmationHelper.js'],
  ['/cartItemHelper.js', 'cartItemHelper.js']
]);

const BLOCKED_PATH_PREFIXES = [
  '/netlify/',
  '/scripts/',
  '/node_modules/',
  '/dist/'
];

const SENSITIVE_NAME_PATTERN = /(?:^|\/)(?:\.[^/]+|(?:env|evn)(?:\.[^/]*)?|license|readme(?:\.[^/]*)?)$/i;
const SENSITIVE_EXTENSION_PATTERN = /\.(?:env|example|js|mjs|cjs|ts|json|md|toml|ya?ml|lock|log|txt|sh|sql|map|bak|conf|ini|pem|key|crt|html?)$/i;

/**
 * Determines whether a request path is an explicitly allowed public static file,
 * an allowed public asset directory path, a blocked private/internal file (404),
 * or a clean SPA navigation route.
 *
 * @param {string} rawPath
 * @returns {{ action: 'allow_file', file: string } | { action: 'allow_public_dir' } | { action: 'block' } | { action: 'spa' }}
 */
export function classifyStaticRequest(rawPath = '/') {
  let decoded = '';
  try {
    decoded = decodeURIComponent(String(rawPath || '/'));
  } catch {
    return { action: 'block' };
  }

  const normalized = decoded.replace(/\\+/g, '/').replace(/\/{2,}/g, '/');

  // Block path traversal or null bytes
  if (normalized.includes('..') || normalized.includes('\0')) {
    return { action: 'block' };
  }

  // Block any dotfile/hidden directory segment (e.g. /.env, /.env.example, /.git, /.aistudio)
  if (/(?:^|\/)\.[^/]*/.test(normalized)) {
    return { action: 'block' };
  }

  // Allow explicitly permitted root frontend files only
  if (ALLOWED_PUBLIC_ROOT_FILES.has(normalized)) {
    return { action: 'allow_file', file: ALLOWED_PUBLIC_ROOT_FILES.get(normalized) };
  }

  // Allow files inside /public/ (no dotfiles, checked above)
  if (normalized === '/public' || normalized.startsWith('/public/')) {
    return { action: 'allow_public_dir' };
  }

  const lower = normalized.toLowerCase();

  // Block private/internal directories
  if (BLOCKED_PATH_PREFIXES.some(prefix => lower === prefix.slice(0, -1) || lower.startsWith(prefix))) {
    return { action: 'block' };
  }

  // Block env/evn/example/license/readme or any backend/config/data file extension
  if (SENSITIVE_NAME_PATTERN.test(lower) || SENSITIVE_EXTENSION_PATTERN.test(lower)) {
    return { action: 'block' };
  }

  return { action: 'spa' };
}
