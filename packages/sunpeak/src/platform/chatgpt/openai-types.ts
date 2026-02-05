/**
 * TypeScript declarations for the `window.openai` ChatGPT runtime.
 *
 * These APIs are available inside ChatGPT-hosted iframes and provide
 * platform-specific capabilities beyond the MCP Apps standard.
 *
 * @see https://developers.openai.com/apps-sdk/mcp-apps-in-chatgpt
 */

export interface OpenAIUploadFileResult {
  fileId: string;
}

export interface OpenAIFileDownloadUrlResult {
  downloadUrl: string;
}

export interface OpenAIRequestModalParams {
  /** URL of an alternate UI template to load in the modal. Omit to reuse the current UI. */
  template?: string;
  /** Arbitrary params forwarded to the modal content. */
  params?: Record<string, unknown>;
}

export interface OpenAICheckoutPaymentProvider {
  provider: string;
  merchant_id: string;
  supported_payment_methods: string[];
}

export interface OpenAICheckoutTotal {
  type: string;
  display_text: string;
  amount: number;
}

export interface OpenAICheckoutLink {
  type: 'terms_of_use' | 'privacy_policy' | string;
  url: string;
}

export interface OpenAICheckoutSession {
  id: string;
  payment_provider: OpenAICheckoutPaymentProvider;
  status: 'ready_for_payment';
  currency: string;
  totals: OpenAICheckoutTotal[];
  links: OpenAICheckoutLink[];
  payment_mode: 'live' | 'test';
}

export interface OpenAICheckoutOrder {
  id: string;
  checkout_session_id: string;
  status: 'completed' | string;
  permalink_url?: string;
}

/**
 * The `window.openai` runtime object injected by ChatGPT into hosted iframes.
 */
export interface OpenAIRuntime {
  // --- File APIs ---
  uploadFile?(file: File): Promise<OpenAIUploadFileResult>;
  getFileDownloadUrl?(params: { fileId: string }): Promise<OpenAIFileDownloadUrlResult>;

  // --- Modal API ---
  requestModal?(params: OpenAIRequestModalParams): Promise<void>;

  // --- Checkout API ---
  requestCheckout?(session: OpenAICheckoutSession): Promise<OpenAICheckoutOrder>;

  // --- Display ---
  requestClose?(): void;
  requestDisplayMode?(params: { mode: 'inline' | 'PiP' | 'fullscreen' }): Promise<void>;

  // --- Messaging ---
  sendFollowUpMessage?(params: { prompt: string }): void;

  // --- Other ---
  openExternal?(params: { href: string }): void;
}

/**
 * Get the `window.openai` runtime if available.
 * Returns `undefined` outside of ChatGPT or in SSR.
 */
export function getOpenAIRuntime(): OpenAIRuntime | undefined {
  if (typeof window !== 'undefined' && 'openai' in window) {
    return (window as unknown as { openai: OpenAIRuntime }).openai;
  }
  return undefined;
}
