import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createApi } from './api';
const api = createApi('http://localhost:8080/');
afterEach(() => vi.unstubAllGlobals());
describe('backend contract', () => {
  it('encodes user identities as one path segment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('[]'));
    vi.stubGlobal('fetch', fetchMock);
    await api.getInbox('Alice/Bob');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/users/Alice%2FBob/inbox');
  });
  it('preserves signature rejection as a domain result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"accepted":false}', { status: 422 })));
    expect(await api.receive('Bob', { message: 'changed', signature: 'AA==', senderId: 'Alice', receiverId: 'Bob' })).toEqual({ accepted: false });
  });
  it('retains backend validation details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"detail":"Request validation failed","errors":{"name":"must not be blank"}}', { status: 400 })));
    await expect(api.createUser({ name: '' })).rejects.toMatchObject({ status: 400, problem: { errors: { name: 'must not be blank' } } });
  });
  it('reports a network failure instead of pretending to connect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(api.listUsers()).rejects.toBeInstanceOf(ApiError);
    await expect(api.listUsers()).rejects.toMatchObject({ status: 0 });
  });
  it('rejects non-JSON proxy responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>', { status: 502 })));
    await expect(api.listUsers()).rejects.toMatchObject({ status: 502 });
  });
});
