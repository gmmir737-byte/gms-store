export type RetryOptions = {
  retries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  retryOnStatus?: number[];
};

export async function retryFetch(input: RequestInfo, init?: RequestInit, options: RetryOptions = {}) {
  const {
    retries = 3,
    retryDelayMs = 300,
    timeoutMs = 10000,
    retryOnStatus = [429, 500, 502, 503, 504],
  } = options;

  let attempt = 0;

  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!response.ok && retryOnStatus.includes(response.status) && attempt <= retries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (err) {
      window.clearTimeout(timeout);
      if (attempt > retries) {
        throw err;
      }
      const delay = retryDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
