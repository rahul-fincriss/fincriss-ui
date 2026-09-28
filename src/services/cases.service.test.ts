import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/api-client', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

import api from '@/lib/api-client';
import { casesService } from './cases.service';

const mockPost = api.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockPost.mockReset();
});

describe('casesService.addNote', () => {
  it('POSTs the note to the case notes endpoint', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 1, note: 'reviewed' } });
    await casesService.addNote('120', 'reviewed');
    expect(mockPost).toHaveBeenCalledWith('/api/cases/120/notes', { note: 'reviewed' });
  });
});

describe('casesService.uploadEvidence', () => {
  it('registers the file, then PUTs bytes to the presigned URL', async () => {
    mockPost.mockResolvedValueOnce({
      data: { evidence_id: 9, upload_url: 'https://s3.example/put?sig=abc' },
    });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);

    const file = new File(['data'], 'statement.pdf', { type: 'application/pdf' });
    const res = await casesService.uploadEvidence('120', file);

    // registration call carries the file name as a query param
    expect(mockPost).toHaveBeenCalledWith('/api/cases/120/evidence', null, {
      params: { file_name: 'statement.pdf' },
    });
    // direct S3 PUT of the bytes
    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.example/put?sig=abc',
      expect.objectContaining({ method: 'PUT', body: file })
    );
    expect(res.evidence_id).toBe(9);

    vi.unstubAllGlobals();
  });

  it('throws if the S3 PUT fails', async () => {
    mockPost.mockResolvedValueOnce({ data: { upload_url: 'https://s3.example/put' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const file = new File(['x'], 'x.pdf', { type: 'application/pdf' });
    await expect(casesService.uploadEvidence('120', file)).rejects.toThrow(/403/);
    vi.unstubAllGlobals();
  });
});
