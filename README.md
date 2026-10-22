# SignedChat frontend

React + TypeScript + Vite, with Tailwind CSS and shadcn-compatible components.

## Start

Requires Node.js 22+ and the [separate Java backend](https://github.com/mohnishc07/messaging-using-digital-signatures) running on port 8080. In the backend checkout, start it with `.\mvnw.cmd spring-boot:run` on Windows or `./mvnw spring-boot:run` on macOS/Linux.

In this frontend repository:

```powershell
npm ci
npm run dev
```

Open the Local URL printed by Vite. Create Alice and Bob using the two panels; existing users are loaded automatically. Send from either composer. Enter sends; Shift + Enter inserts a new line. Newlines and other message content are signed exactly as entered. Whitespace-only messages are disabled in the interface.

Delivered messages appear in both panels after the inbox refresh. Expand **Inspect signature** for sender, recipient, signature, and JSON copying. **Public key** expands the key returned by the backend. **Refresh inboxes** picks up externally delivered messages. There is no background polling.

## Configuration

Copy `.env.example` to `.env.local` to change the backend address; restart Vite afterward. The development proxy forwards `/api` to `BACKEND_URL`. Production hosting must forward `/api` to the backend, or set `VITE_API_BASE_URL` at build time and configure backend CORS appropriately. Environment values prefixed VITE_ are public: never put secrets there.

```powershell
npm run build
npm test
```

## Current scope

- Side-by-side Alice/Bob messaging; mobile switches between panels.
- Real API integration, user creation, public-key viewing, inbox refresh, signature inspection, network and delivery error handling.
- User panels represent demonstration identities, not independent authenticated sessions. The available backend (fb0e479) has no authentication endpoints.
- Accepted badges reflect backend inbox acceptance, not independent browser verification.
- Messages are plaintext. No encryption, replay protection, or key fingerprint validation is claimed.
- The old backend supplies no message IDs or timestamps. The interface preserves observed message order during use, but cannot reconstruct historical interleaving across the two inboxes after a page reload. This can be improved once the backend returns ordering metadata.
- Inboxes and keys disappear on backend restart. Refresh to synchronize the frontend afterward.
- Security Lab and authentication integration will follow the updated backend contract.
