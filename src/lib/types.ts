export interface User { name: string; publicKey: string; trusted: boolean }
export interface CreateUserRequest { name: string; trusted?: boolean }
export interface SendMessageRequest { sender: string; recipient: string; content: string }
// The available backend does not yet return nonce, timestamp, or verification reason fields.
export interface SignedMessage { message: string; signature: string; senderId: string; receiverId: string }
export interface DeliveryResponse { message: SignedMessage; delivered: boolean }
export interface ReceiveResponse { accepted: boolean }
export interface ProblemDetail { title?: string; detail?: string; status?: number; errors?: Record<string, string> }
