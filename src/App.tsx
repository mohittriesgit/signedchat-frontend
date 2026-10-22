import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Copy, KeyRound, MessageSquare, RefreshCw, Send, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { Button } from './components/ui/button';
import { api, ApiError } from './lib/api';
import type { SignedMessage, User } from './lib/types';
import { reconcileConversation } from './lib/conversation';

type Identity = 'Alice' | 'Bob';
type Notice = { text: string; kind: 'error' | 'success' };
const names: Identity[] = ['Alice', 'Bob'];
const other = (name: Identity): Identity => name === 'Alice' ? 'Bob' : 'Alice';
const messageOf = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.';

function MessageDetails({ message }: { message: SignedMessage }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(JSON.stringify(message, null, 2)); setCopied(true); setCopyError(false); }
    catch { setCopyError(true); }
  }
  return <details className="message-details"><summary>Inspect signature <ChevronDown size={12}/></summary><div className="detail-content">
    <dl><dt>Sender</dt><dd>{message.senderId}</dd><dt>Recipient</dt><dd>{message.receiverId}</dd><dt>Signature · Base64</dt><dd className="signature">{message.signature}</dd></dl>
    <button className="text-button" onClick={copy}><Copy size={12}/>{copied ? 'Copied JSON' : 'Copy signed message'}</button>{copyError && <span role="alert">Unable to copy. Select the signature manually.</span>}
  </div></details>;
}

function ChatPanel({ name, user, messages, ready, busy, onCreate, onSend }: {
  name: Identity; user?: User; messages: SignedMessage[]; ready: boolean; busy: boolean;
  onCreate: (name: Identity) => Promise<void>; onSend: (name: Identity, content: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const bottom = useRef<HTMLDivElement>(null);
  const peer = other(name);
  // Inbox entries are authoritative; outgoing entries come from the recipient's inbox.
  const conversation = messages.filter(m =>
    (m.senderId === name && m.receiverId === peer) || (m.senderId === peer && m.receiverId === name));
  useEffect(() => { const container = bottom.current?.parentElement; container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' }); }, [conversation.length]);
  async function create() {
    setCreating(true); setNotice(undefined);
    try { await onCreate(name); } catch (e) { setNotice({ kind: 'error', text: messageOf(e) }); }
    finally { setCreating(false); }
  }
  async function send() {
    if (!draft.trim() || sending) return;
    setSending(true); setNotice(undefined);
    try {
      if (await onSend(name, draft)) { setDraft(''); setNotice({ kind: 'success', text: `Signed and delivered to ${peer}.` }); }
      else setNotice({ kind: 'error', text: 'The backend rejected this message. It was not delivered.' });
    } catch (e) { setNotice({ kind: 'error', text: messageOf(e) }); }
    finally { setSending(false); }
  }
  return <section className={`chat-panel ${name.toLowerCase()}`} aria-label={`${name}'s conversation`}>
    <div className="chat-heading"><div className="avatar">{name[0]}<span className={ready && user ? 'presence online' : 'presence'}/></div><div><h2>{name}</h2><p>{user ? `Chatting with ${peer}` : 'Create user to start'}</p></div><span className="identity-label">{name === 'Alice' ? 'USER 01' : 'USER 02'}</span></div>
    {user ? <div className="trust-strip"><KeyRound size={13}/><span>{user.trusted ? 'Key registered as trusted' : 'Key is not trusted'}</span><details><summary>Public key</summary><code>{user.publicKey}</code></details></div> : <div className="trust-strip"><KeyRound size={13}/> No signing key registered</div>}
    <div className="messages" role="log" aria-label={`${name}'s messages`}>
      {!user ? <div className="empty-state"><span className="empty-icon"><KeyRound size={27}/></span><h3>Meet {name}.</h3><p>Create {name} and generate an Ed25519 signing key to begin.</p><Button onClick={create} disabled={!ready || busy || creating}>{creating ? <RefreshCw size={14} className="spin"/> : <ArrowUpRight size={14}/>}Create {name}</Button></div>
      : !conversation.length ? <div className="empty-state"><span className="empty-icon"><MessageSquare size={27}/></span><h3>A conversation starts here.</h3><p>Send a message to {peer}. The backend signs it and checks the signature before delivery.</p></div>
      : conversation.map((m, index) => <article className={`message ${m.senderId === name ? 'outgoing' : 'incoming'}`} key={`${m.signature}-${index}`}><div className="message-sender">{m.senderId === name ? 'You' : m.senderId}</div><p>{m.message}</p><div className="verified"><ShieldCheck size={12}/>Accepted by backend</div><MessageDetails message={m}/></article>)}
      <div ref={bottom}/>
    </div>
    <div className="composer"><form onSubmit={e => { e.preventDefault(); void send(); }}><label className="sr-only" htmlFor={`message-${name}`}>Message from {name} to {peer}</label><textarea id={`message-${name}`} placeholder={`Message ${peer}…`} value={draft} disabled={!ready || !user || sending} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (ready && user && !busy) void send(); } }} rows={2}/><Button type="submit" aria-label={`Send from ${name} to ${peer}`} disabled={!ready || !user || busy || sending || !draft.trim()}>{sending ? <RefreshCw size={17} className="spin"/> : <Send size={17}/>}</Button></form><div className="composer-caption"><span>Ed25519 signed</span><span>Enter to send · Shift + Enter for a new line</span></div><div aria-live="polite">{notice && <p className={`notice ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : undefined}>{notice.text}</p>}</div></div>
  </section>;
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<SignedMessage[]>([]);
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Identity>('Alice');
  const refreshing = useRef(false);
  async function refresh() {
    if (refreshing.current) return;
    refreshing.current = true; setBusy(true); setError('');
    try {
      const list = await api.listUsers();
      const entries = await Promise.all(names.map(async name => [name, list.some(u => u.name === name) ? await api.getInbox(name) : []] as const));
      setUsers(list); setMessages(previous => reconcileConversation(previous, entries.flatMap(([, inbox]) => inbox))); setStatus('connected');
    } catch (e) { setStatus('error'); setError(messageOf(e)); }
    finally { refreshing.current = false; setBusy(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function create(name: Identity) {
    try { await api.createUser({ name, trusted: true }); }
    catch (e) { if (!(e instanceof ApiError && e.status === 409)) throw e; }
    await refresh();
  }
  async function send(name: Identity, content: string) {
    const result = await api.send({ sender: name, recipient: other(name), content });
    if (result.delivered) await refresh();
    return result.delivered;
  }
  return <div className="workspace"><aside><a href="#" className="brand"><ShieldCheck size={25}/>signedchat<span>.</span></a><div className="sidebar-label">WORKSPACE</div><div className="nav-current"><MessageSquare size={18}/>Conversation<span>01</span></div><div className="sidebar-note"><ShieldCheck size={20}/><p>Every message.<br/>A signature to inspect.</p></div><div className="sidebar-bottom">SECURE MESSAGING PROTOTYPE<br/><span>Ed25519 · Spring Boot</span></div></aside>
    <main><header><span>WORKSPACE <b>/</b> CONVERSATION</span><span className={`connection-status ${status}`} role="status">{status === 'connected' ? <Wifi size={13}/> : <WifiOff size={13}/>} {status === 'connected' ? 'Backend connected' : status === 'loading' ? 'Connecting…' : 'Backend unavailable'}</span></header>
      <div className="page-heading"><div><div className="eyebrow">SIGNED. SENT. VERIFIED.</div><h1>Two people. One conversation.</h1><p>Exchange messages and inspect the signatures behind them.</p></div><Button variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw size={15} className={busy ? 'spin' : ''}/>Refresh inboxes</Button></div>
      {error && <div className="connection-error" role="alert">{error} Start the backend on port 8080, then refresh. Existing messages may be out of date.</div>}
      <div className="mobile-tabs" aria-label="Choose conversation">{names.map(name => <button key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}</div>
      <div className={`chat-grid show-${tab.toLowerCase()}`}>{names.map(name => <ChatPanel key={name} name={name} user={users.find(u => u.name === name)} messages={messages} ready={status === 'connected'} busy={busy} onCreate={create} onSend={send}/>)}</div>
      <footer><span><Check size={13}/> Verification results come from the backend.</span><span>Demo identities · Messages are signed, not encrypted.</span></footer>
    </main></div>;
}
