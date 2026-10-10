import { initLlama } from 'llama.rn';
import RNFS from 'react-native-fs';

jest.mock('../../../../src/utils/logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockInitLlama = initLlama as jest.MockedFunction<typeof initLlama>;
const mockExists = RNFS.exists as jest.MockedFunction<typeof RNFS.exists>;
const mockDownloadFile = RNFS.downloadFile as jest.MockedFunction<any>;
const mockHash = (RNFS as any).hash as jest.MockedFunction<any>;
const mockMoveFile = RNFS.moveFile as jest.MockedFunction<typeof RNFS.moveFile>;
const MODEL_SHA256 = '263215c3cadd6e16740741a7624ab4cbb6c8e777688bd5331ecfbf5681c2f8ed';

// Must import after mocks are set up
import { embeddingService } from '../../../../src/services/rag/embedding';
import { modelResidencyManager } from '../../../../src/services/modelResidency';

const mockEmbedding = jest.fn();
const mockRelease = jest.fn();

describe('EmbeddingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset internal state
    (embeddingService as any).context = null;
    (embeddingService as any).loading = null;
    modelResidencyManager._reset();

    mockEmbedding.mockResolvedValue({ embedding: new Array(384).fill(0.1) });
    mockRelease.mockResolvedValue(undefined);
    mockInitLlama.mockResolvedValue({
      embedding: mockEmbedding,
      release: mockRelease,
    } as any);
    // The model is on the device unless a test says otherwise.
    mockExists.mockResolvedValue(true);
    mockDownloadFile.mockImplementation(() => ({ jobId: 1, promise: Promise.resolve({ statusCode: 200 }) }));
    mockHash.mockResolvedValue(MODEL_SHA256);
  });

  describe('load', () => {
    it('initializes llama context with embedding params', async () => {
      await embeddingService.load();

      expect(mockInitLlama).toHaveBeenCalledWith(expect.objectContaining({
        embedding: true,
        n_gpu_layers: 0,
        n_ctx: 512,
      }));
      expect(embeddingService.isLoaded()).toBe(true);
    });

    it('downloads the model when it is not on the device', async () => {
      mockExists.mockResolvedValue(false);
      await embeddingService.load();

      expect(mockDownloadFile).toHaveBeenCalledWith(expect.objectContaining({
        fromUrl: expect.stringContaining('all-MiniLM-L6-v2-Q8_0.gguf'),
        toFile: expect.stringMatching(/\.part$/),
      }));
      expect(mockMoveFile).toHaveBeenCalledWith(
        expect.stringMatching(/\.part$/),
        expect.stringMatching(/all-MiniLM-L6-v2-Q8_0\.gguf$/),
      );
      expect(embeddingService.isLoaded()).toBe(true);
    });

    it('skips the download if the model is already there', async () => {
      await embeddingService.load();

      expect(mockDownloadFile).not.toHaveBeenCalled();
    });

    it('rejects a download whose checksum does not match and keeps nothing', async () => {
      mockExists.mockResolvedValue(false);
      mockHash.mockResolvedValue('not-the-model');

      await expect(embeddingService.load()).rejects.toThrow(/document search model.*checksum mismatch/);
      expect(mockMoveFile).not.toHaveBeenCalled();
      expect(RNFS.unlink).toHaveBeenCalledWith(expect.stringMatching(/\.part$/));
      expect(embeddingService.isLoaded()).toBe(false);
    });

    it('is idempotent — second call is a no-op', async () => {
      await embeddingService.load();
      await embeddingService.load();

      expect(mockInitLlama).toHaveBeenCalledTimes(1);
    });

    it('serializes concurrent calls', async () => {
      const p1 = embeddingService.load();
      const p2 = embeddingService.load();
      await Promise.all([p1, p2]);

      expect(mockInitLlama).toHaveBeenCalledTimes(1);
    });

    it('registers with the residency manager so its RAM is budgeted (F2)', async () => {
      await embeddingService.load();
      expect(modelResidencyManager.isResident('embedding')).toBe(true);
      const resident = modelResidencyManager.getResidents().find(r => r.key === 'embedding');
      expect(resident?.type).toBe('embedding');
      expect(resident?.sizeMB).toBeGreaterThan(0);
    });

    it('rejects and does not register if the native load times out (F5)', async () => {
      jest.useFakeTimers();
      // initLlama never resolves → the timeout must fire and release the lock.
      mockInitLlama.mockReturnValue(new Promise(() => {}) as any);
      const loadPromise = embeddingService.load().catch((e: Error) => e);
      await jest.advanceTimersByTimeAsync(31000);
      const result = await loadPromise;
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toMatch('timed out');
      expect(embeddingService.isLoaded()).toBe(false);
      expect(modelResidencyManager.isResident('embedding')).toBe(false);
      jest.useRealTimers();
    });
  });

  describe('embed', () => {
    it('returns embedding vector', async () => {
      await embeddingService.load();
      const result = await embeddingService.embed('hello world');

      expect(mockEmbedding).toHaveBeenCalledWith('hello world');
      expect(result).toHaveLength(384);
    });

    it('throws if model not loaded', async () => {
      await expect(embeddingService.embed('test')).rejects.toThrow('not loaded');
    });
  });

  describe('embedBatch', () => {
    it('embeds multiple texts sequentially', async () => {
      await embeddingService.load();
      const results = await embeddingService.embedBatch(['hello', 'world']);

      expect(results).toHaveLength(2);
      expect(mockEmbedding).toHaveBeenCalledTimes(2);
    });
  });

  describe('unload', () => {
    it('releases the context', async () => {
      await embeddingService.load();
      await embeddingService.unload();

      expect(mockRelease).toHaveBeenCalled();
      expect(embeddingService.isLoaded()).toBe(false);
    });

    it('releases its residency registration on unload (F2)', async () => {
      await embeddingService.load();
      expect(modelResidencyManager.isResident('embedding')).toBe(true);
      await embeddingService.unload();
      expect(modelResidencyManager.isResident('embedding')).toBe(false);
    });

    it('is safe to call when not loaded', async () => {
      await embeddingService.unload();
      expect(mockRelease).not.toHaveBeenCalled();
    });
  });

  describe('getDimension', () => {
    it('returns 384', () => {
      expect(embeddingService.getDimension()).toBe(384);
    });
  });

  describe('embed — error recovery branches', () => {
    it('unloads model and throws wrapped error on ggml native error', async () => {
      await embeddingService.load();
      mockEmbedding.mockRejectedValue(new Error('ggml alloc failed'));
      mockRelease.mockResolvedValue(undefined);

      await expect(embeddingService.embed('test')).rejects.toThrow('Embedding failed (native error)');
      expect(embeddingService.isLoaded()).toBe(false);
    });

    it('uses String(error) fallback when error has no message property', async () => {
      await embeddingService.load();
      // Throw a plain string, not an Error object — error?.message is undefined
      mockEmbedding.mockRejectedValue('OOM string error');

      await expect(embeddingService.embed('test')).rejects.toThrow('Embedding failed (native error)');
    });

    it('re-throws non-recovery errors unchanged', async () => {
      await embeddingService.load();
      mockEmbedding.mockRejectedValue(new Error('unexpected error'));

      await expect(embeddingService.embed('test')).rejects.toThrow('unexpected error');
    });
  });

  describe('unload — release error is swallowed', () => {
    it('sets context to null even when release throws', async () => {
      await embeddingService.load();
      mockRelease.mockRejectedValue(new Error('bridge torn down'));

      await embeddingService.unload();
      expect(embeddingService.isLoaded()).toBe(false);
    });
  });
});
