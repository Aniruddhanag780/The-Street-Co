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
  if (/<user>|<username>|<password>|<db_password>|<cluster>|your_mongodb_uri/i.test(raw)) {
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

function stripAccidentalAngleBrackets(segment) {
  if (!segment) return segment;
  if (segment.startsWith('<') && segment.endsWith('>') && segment.length > 2) {
    return segment.slice(1, -1);
  }
  if (segment.startsWith('<') && !segment.includes('>') && segment.length > 1) {
    return segment.slice(1);
  }
  if (segment.endsWith('>') && !segment.includes('<') && segment.length > 1) {
    return segment.slice(0, -1);
  }
  return segment;
}

export function getMongoUriCandidates(rawUri, defaultDbName = 'thestreetco') {
  const primary = normalizeMongoUri(rawUri, defaultDbName);
  if (!primary) return [];

  const candidates = [primary];
  let raw = String(rawUri || '').trim();
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  const schemeMatch = raw.match(/^(mongodb(?:\+srv)?:\/\/)(.*)$/i);
  if (!schemeMatch) return candidates;

  const scheme = schemeMatch[1];
  const rest = schemeMatch[2];
  const authMatch = rest.match(
    /^(.+?)@((?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?(?:,(?:localhost|(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3})(?::\d+)?)*)([/?].*)?$/
  );
  if (!authMatch) return candidates;

  const creds = authMatch[1];
  const hosts = authMatch[2];
  const suffix = authMatch[3] || '';
  const colonIdx = creds.indexOf(':');

  let altRaw = '';
  if (colonIdx > -1) {
    const rawUser = decodePercentSafely(creds.slice(0, colonIdx));
    const rawPass = decodePercentSafely(creds.slice(colonIdx + 1));
    const altUser = stripAccidentalAngleBrackets(rawUser);
    const altPass = stripAccidentalAngleBrackets(rawPass);
    if ((altUser !== rawUser || altPass !== rawPass) && altUser && altPass) {
      altRaw = `${scheme}${encodeURIComponent(altUser)}:${encodeURIComponent(altPass)}@${hosts}${suffix}`;
    }
  } else {
    const rawUser = decodePercentSafely(creds);
    const altUser = stripAccidentalAngleBrackets(rawUser);
    if (altUser !== rawUser && altUser) {
      altRaw = `${scheme}${encodeURIComponent(altUser)}@${hosts}${suffix}`;
    }
  }

  if (altRaw) {
    const altNormalized = normalizeMongoUri(altRaw, defaultDbName);
    if (altNormalized && !candidates.includes(altNormalized)) {
      candidates.push(altNormalized);
    }
  }

  return candidates;
}

export function isMongoAuthError(err) {
  if (!err) return false;
  return err.code === 8000 || /bad auth|authentication failed/i.test(String(err.message || ''));
}

