/**
 * generationKeepAlive: holds the Android foreground service only while a reply is generating.
 */
import { NativeModules, Platform } from 'react-native';

type Listener = (state: { isGenerating: boolean }) => void;
let textListener: Listener | null = null;
let imageListener: Listener | null = null;

jest.mock('../../../src/services/generationService', () => ({
  generationService: {
    subscribe: (l: Listener) => { textListener = l; l({ isGenerating: false }); return () => { textListener = null; }; },
  },
}));
jest.mock('../../../src/services/imageGenerationService', () => ({
  imageGenerationService: {
    subscribe: (l: Listener) => { imageListener = l; l({ isGenerating: false }); return () => { imageListener = null; }; },
  },
}));
jest.mock('../../../src/utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const start = jest.fn();
const stop = jest.fn();

describe('generationKeepAlive', () => {
  let keepAlive: typeof import('../../../src/services/generationKeepAlive');

  beforeEach(() => {
    jest.resetModules();
    start.mockClear();
    stop.mockClear();
    (NativeModules as any).GenerationKeepAlive = { start, stop };
    Platform.OS = 'android';
    keepAlive = require('../../../src/services/generationKeepAlive');
    keepAlive.startGenerationKeepAlive();
  });

  afterEach(() => {
    keepAlive.stopGenerationKeepAlive();
  });

  it('holds the service while a text reply generates and releases it after', () => {
    expect(start).not.toHaveBeenCalled();
    textListener!({ isGenerating: true });
    expect(start).toHaveBeenCalledTimes(1);
    textListener!({ isGenerating: false });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('starts once however many state updates arrive mid-reply', () => {
    textListener!({ isGenerating: true });
    textListener!({ isGenerating: true });
    textListener!({ isGenerating: true });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('stays held until both a text and an image reply have finished', () => {
    textListener!({ isGenerating: true });
    imageListener!({ isGenerating: true });
    textListener!({ isGenerating: false });
    expect(stop).not.toHaveBeenCalled();
    imageListener!({ isGenerating: false });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('releases the service when watching stops mid-reply', () => {
    textListener!({ isGenerating: true });
    keepAlive.stopGenerationKeepAlive();
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
