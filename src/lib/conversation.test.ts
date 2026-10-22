import { describe, expect, it } from 'vitest';
import { reconcileConversation } from './conversation';
import type { SignedMessage } from './types';
const message = (senderId: string, signature: string): SignedMessage => ({ senderId, receiverId: senderId === 'Alice' ? 'Bob' : 'Alice', message: 'hello', signature });
describe('conversation refresh', () => {
  it('preserves observed order as messages arrive in either inbox', () => {
    const first = message('Alice', 'one'); const reply = message('Bob', 'two');
    expect(reconcileConversation([first], [reply, first])).toEqual([first, reply]);
  });
  it('preserves replayed duplicates and removes entries lost on a backend reset', () => {
    const first = message('Alice', 'one');
    expect(reconcileConversation([first], [first, first])).toEqual([first, first]);
    expect(reconcileConversation([first], [])).toEqual([]);
  });
});
