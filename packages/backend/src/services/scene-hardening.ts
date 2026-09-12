import type { LessonBlock } from '@reka-bytes/shared';

/**
 * Scene (widget block) hardening — PRD-06 §4/§6.
 *
 * The model authors a self-contained HTML document; it is ALWAYS rendered
 * inside `<iframe sandbox="allow-scripts">` (opaque origin — no cookies, no
 * parent DOM, no storage). These checks + injections are defense in depth on
 * top of the sandbox, applied once at generation time so the stored HTML is
 * final.
 */

/** CSP: everything fails closed. Scenes must inline styles/scripts and use
 *  data: URIs for images/fonts. connect-src inherits default-src 'none'. */
export const SCENE_CSP =
  "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; font-src data:; media-src data:";

/** Height reporter injected into every scene: the parent renderer clamps the
 *  reported value and only trusts messages from the frame's own contentWindow. */
const SCENE_REPORTER = `<script data-rb-scene="bridge">
  (function () {
    var send = function () {
      parent.postMessage({ source: 'rb-scene', type: 'height', height: Math.ceil(document.documentElement.getBoundingClientRect().height) }, '*');
    };
    addEventListener('load', send);
    new ResizeObserver(send).observe(document.documentElement);
  })();
</script>`;

/** Hard static gate. Returns an error string, or null when the scene passes. */
export function sceneStaticCheckError(html: string): string | null {
  if (!html || html.trim().length === 0) return 'empty document';
  // External network in any attribute (src/href/action), CSS url(), or dynamic APIs.
  // data: URIs are allowed; everything else must not leave the sandbox.
  const external =
    /(?:\bsrc\s*=\s*|\bhref\s*=\s*|\baction\s*=\s*|url\()\s*["']?\s*(?:https?:)?\/\/[^\s"')]+/i;
  if (external.test(html)) return 'external URL reference';
  if (/new\s+XMLHttpRequest|fetch\s*\(|WebSocket|EventSource|navigator\.sendBeacon/i.test(html)) {
    return 'network API usage';
  }
  if (/<form\b/i.test(html)) return '<form> element';
  if (/<iframe\b|<object\b|<embed\b/i.test(html)) return 'nested embed/iframe';
  if (/window\.top|window\.parent(?!\.postMessage)|parent\.location|top\.location/i.test(html)) {
    return 'parent/top window access';
  }
  if (/document\.cookie|localStorage|sessionStorage|indexedDB/i.test(html)) {
    return 'storage/cookie access';
  }
  return null;
}

/**
 * Harden a scene for storage: inject the CSP <meta> and height reporter once
 * (idempotent via the data-rb-scene marker), so the stored HTML is final.
 * Returns null when the scene fails the static gate (caller drops the block).
 */
export function hardenSceneHtml(html: string): string | null {
  const fail = sceneStaticCheckError(html);
  if (fail) return null;
  if (html.includes('data-rb-scene="bridge"')) return html; // already hardened

  const injection =
    `<meta http-equiv="Content-Security-Policy" content="${SCENE_CSP}">` + SCENE_REPORTER;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => `${m}${injection}`);
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${injection}</head>`);
  }
  return injection + html;
}

/** Post-storage hardening pass used wherever widget blocks enter the system. */
export function hardenSceneBlocks(blocks: LessonBlock[]): LessonBlock[] {
  return blocks.map((b) => {
    if (b.type !== 'widget' || b.html.includes('data-rb-scene="bridge"')) return b;
    const hardened = hardenSceneHtml(b.html);
    return hardened ? { ...b, html: hardened } : b;
  });
}
