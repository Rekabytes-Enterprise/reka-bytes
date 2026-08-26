/**
 * Programmatic BAML client configuration.
 *
 * The .baml file declares `base_url = env.OPENROUTER_BASE_URL` etc., but the
 * Rust runtime resolves those from a snapshot that does not reliably see
 * Node's process.env mutations in this setup. Instead we pass a
 * ClientRegistry per call (`{ clientRegistry }`) built from the backend's
 * zod-parsed env — same values, nothing hardcoded, resolved fresh.
 */
import { ClientRegistry } from '@reka-bytes/baml';
import { env } from '../../env';

let registry: ClientRegistry | null = null;

/**
 * Timeout configuration MUST live inside the nested `http: {}` block of the
 * client options (BAML's PropertyHandler.ensure_http_config only reads that
 * block — flat top-level timeout keys are silently ignored while still being
 * echoed into request logs, which cost us a long debugging session).
 *
 * With no http block BAML defaults to connect 10s + request_timeout 300s,
 * which killed WriteLesson passes on slow reasoning models at ~300s
 * ("Could not read response body … Body TimedOut").
 *
 * Semantics (verified against baml v0.226.1 source): non-negative integers;
 * 0 = NO timeout (infinite). idle/ttft timeouts are streaming-only opt-ins
 * and have no defaults — we don't use streaming, so we don't set them.
 */
function httpTimeoutConfig() {
  return {
    connect_timeout_ms: 10_000,
    // AI_TIMEOUT_MS=0 → infinite (no total cap); >0 → hard cap in ms.
    request_timeout_ms: env.AI_TIMEOUT_MS > 0 ? env.AI_TIMEOUT_MS : 0,
  };
}

/** Build (once) an OpenRouter client registry from backend env. */
export function getBamlRegistry(): ClientRegistry {
  if (registry) return registry;
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set — AI features are unavailable');
  }
  const r = new ClientRegistry();
  r.addLlmClient(
    'OpenRouter',
    'openai',
    {
      base_url: env.OPENROUTER_BASE_URL,
      api_key: env.OPENROUTER_API_KEY,
      model: env.AI_MODEL,
      // Some OpenRouter providers reject system-only conversations; BAML
      // renders the whole prompt as ONE message, so send it as `user`.
      default_role: 'user',
      http: httpTimeoutConfig(),
    },
    'Robust',
  );
  r.setPrimary('OpenRouter');
  registry = r;
  return registry;
}
