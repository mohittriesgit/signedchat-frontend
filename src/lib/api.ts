import type { User, CreateUserRequest, SendMessageRequest, SignedMessage, DeliveryResponse, ReceiveResponse, ProblemDetail } from './types';
export class ApiError extends Error {
  constructor(message: string, public status: number, public problem?: ProblemDetail) { super(message); this.name = 'ApiError'; }
}
export function createApi(baseUrl = '') {
  async function request<T>(path: string, init: RequestInit = {}, acceptedStatuses: number[] = []): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api${path}`, {
        ...init, signal: controller.signal,
        headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      });
      const raw = await response.text();
      let body: unknown;
      try { body = raw ? JSON.parse(raw) : undefined; } catch { throw new ApiError('The server returned an unreadable response. Check the API address.', response.status); }
      if (!response.ok && !acceptedStatuses.includes(response.status)) {
        const problem = body as ProblemDetail | undefined;
        throw new ApiError(problem?.detail || problem?.title || `Request failed (${response.status}).`, response.status, problem);
      }
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(controller.signal.aborted ? 'The backend took too long to respond. Try again.' : 'Cannot reach the backend. Check that it is running.', 0);
    } finally { clearTimeout(timeout); }
  }
  const post = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });
  return {
    listUsers: () => request<User[]>('/users'),
    getUser: (name: string) => request<User>(`/users/${encodeURIComponent(name)}`),
    createUser: (body: CreateUserRequest) => request<User>('/users', post(body)),
    getInbox: (name: string) => request<SignedMessage[]>(`/users/${encodeURIComponent(name)}/inbox`),
    sign: (body: SendMessageRequest) => request<SignedMessage>('/messages/sign', post(body)),
    send: (body: SendMessageRequest) => request<DeliveryResponse>('/messages', post(body), [422]),
    receive: (name: string, body: SignedMessage) => request<ReceiveResponse>(`/users/${encodeURIComponent(name)}/inbox`, post(body), [422]),
  };
}
export const api = createApi(import.meta.env.VITE_API_BASE_URL || '');
