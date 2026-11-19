export function decodePercentSafely(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function normalizeMongoUri(rawUri, defaultDbName = 'thestreetco') {
  let raw = String(rawUri || '').trim();
  if (!raw) return '';

  // Strip accidental surrounding quotes from env vars
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  if (!raw) return '';

  // Reject unreplaced placeholders
  if (/<username>|<password>|<cluster>|your_mongodb_uri/i.test(raw)) {
    return '';
  }

  const schemeMatch = raw.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!schemeMatch) {
    return '';
  }

  const scheme = schemeMatch[1];
  const rest = schemeMatch[2];

  // Match credentials up to the '@' that precedes a valid MongoDB host[:port][,host2]
  const authMatch = rest.match(
    /^(.+?)@((?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?(?:,(?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?)*)([/?].*)?$/
  );

  let normalized = raw;
  if (authMatch) {
    const creds = authMatch[1];
    const hosts = authMatch[2];
    const suffix = authMatch[3] || '';
    const colonIdx = creds.indexOf(':');
    if (colonIdx > -1) {
      const user = encodeURIComponent(decodePercentSafely(creds.slice(0, colonIdx)));
      const pass = encodeURIComponent(decodePercentSafely(creds.slice(colonIdx + 1)));
      normalized = `${scheme}${user}:${pass}@${hosts}${suffix}`;
    } else {
      const user = encodeURIComponent(decodePercentSafely(creds));
      normalized = `${scheme}${user}@${hosts}${suffix}`;
    }
  }

  if (normalized.endsWith('.mongodb.net/')) {
    return `${normalized}${defaultDbName}?retryWrites=true&w=majority`;
  }
  return normalized;
}
