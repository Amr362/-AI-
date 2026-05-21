const DEFAULT_TIMEOUT_MS = 4500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWithRetry(url, options = {}, { retries = 1, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const res = await fetchWithTimeout(url, options, timeoutMs);
      return res;
    } catch (error) {
      lastError = error;
      if (attempt === retries) break;
      await sleep(200 * (attempt + 1));
    }
    attempt += 1;
  }

  throw lastError;
}

export async function safeReadText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
