import '@testing-library/jest-dom';
import { beforeAll, afterEach, vi } from 'vitest';

// Mock Web Speech API
beforeAll(() => {
  global.speechSynthesis = {
    speak: vi.fn(),
    cancel: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    pending: false,
    paused: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as any;

  global.SpeechSynthesisUtterance = vi.fn().mockImplementation((text) => ({
    text,
    lang: '',
    voice: null,
    volume: 1,
    rate: 1,
    pitch: 1,
    onstart: null,
    onend: null,
    onerror: null,
    onpause: null,
    onresume: null,
    onmark: null,
    onboundary: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
