import type { SignedMessage } from './types';
// The old backend has no timestamps. Preserve observed order across inbox refreshes;
// historical ordering across separate inboxes cannot be reconstructed after reload.
export function reconcileConversation(previous: SignedMessage[], incoming: SignedMessage[]) {
  const counts = new Map<string, number>();
  const identify = (messages: SignedMessage[]) => messages.map(message => {
    const signature = JSON.stringify(message);
    const count = counts.get(signature) || 0;
    counts.set(signature, count + 1);
    return { id: `${signature}:${count}`, message };
  });
  const current = identify(incoming);
  counts.clear();
  const old = identify(previous);
  const remaining = new Map(current.map(entry => [entry.id, entry.message]));
  const ordered: SignedMessage[] = [];
  for (const entry of old) {
    const message = remaining.get(entry.id);
    if (message) { ordered.push(message); remaining.delete(entry.id); }
  }
  return [...ordered, ...remaining.values()];
}
