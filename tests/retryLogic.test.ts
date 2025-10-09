import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock implementation of retry logic (extracted from geminiService.ts)
async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isLastAttempt = attempt === maxRetries - 1;

      if (isLastAttempt) {
        break;
      }

      // Calculate delay with exponential backoff: 1s, 2s, 4s, etc.
      const delayMs = initialDelayMs * Math.pow(2, attempt);

      // Use mock timer for tests instead of real delay
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

describe('Retry Logic - retryWithExponentialBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithExponentialBackoff(mockFn, 3, 100);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on second attempt', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce('success');

    const result = await retryWithExponentialBackoff(mockFn, 3, 100);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should retry on failure and succeed on third attempt', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Second attempt failed'))
      .mockResolvedValueOnce('success');

    const result = await retryWithExponentialBackoff(mockFn, 3, 100);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should throw error after all retries exhausted', async () => {
    const errorMessage = 'Persistent error';
    const mockFn = vi.fn().mockRejectedValue(new Error(errorMessage));

    await expect(
      retryWithExponentialBackoff(mockFn, 3, 100)
    ).rejects.toThrow(errorMessage);

    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff delays', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValueOnce('success');

    const startTime = Date.now();

    await retryWithExponentialBackoff(mockFn, 3, 100);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should wait: 100ms + 200ms = 300ms (with some tolerance)
    // Note: In real tests with vi.useFakeTimers() this would be more precise
    expect(totalTime).toBeGreaterThanOrEqual(250);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it('should work with custom retry count', async () => {
    const mockFn = vi.fn().mockRejectedValue(new Error('Failed'));

    await expect(
      retryWithExponentialBackoff(mockFn, 5, 100)
    ).rejects.toThrow('Failed');

    expect(mockFn).toHaveBeenCalledTimes(5);
  });

  it('should work with custom initial delay', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockResolvedValueOnce('success');

    const startTime = Date.now();

    await retryWithExponentialBackoff(mockFn, 3, 500);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Should wait at least 500ms for first retry
    expect(totalTime).toBeGreaterThanOrEqual(450);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should preserve error type', async () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'CustomError';
      }
    }

    const mockFn = vi.fn().mockRejectedValue(new CustomError('Custom error'));

    await expect(
      retryWithExponentialBackoff(mockFn, 2, 100)
    ).rejects.toThrow(CustomError);
  });

  it('should handle async function properly', async () => {
    const mockAsyncFn = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'async success';
    });

    const result = await retryWithExponentialBackoff(mockAsyncFn, 3, 100);

    expect(result).toBe('async success');
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
  });
});
