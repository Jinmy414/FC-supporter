// Fodder background service worker (MV3).
// The ONLY layer that fetches our backend. The MAIN-world client dispatches a "fodder-fetch-req"
// CustomEvent → the isolated content script (bridge.js) relays it here via chrome.runtime → we do the
// real fetch() and send the response back. Because this runs in the extension's background context (not
// the page), these requests never appear in the page's network surface — EA's page JS can't observe them.
//
// SECURITY: the backend origin is PINNED here (not taken from the page) and the request URL is resolved
// with new URL(path, origin) + an origin re-check, so a hostile MAIN-world script on ea.com can't turn
// this privileged, off-page, CORS-free fetch into an open relay to an arbitrary host (a naive base+path
// concat would let path="@evil.com" escape the origin). pack.mjs swaps this const for the store build.
const BACKEND_ORIGIN = "https://fodder.gg";

// Additional origins this worker may fetch, on top of BACKEND_ORIGIN. Pinned at BUILD time exactly like
// it is, and swapped by pack.mjs for the store build.
//
// ⚠ THIS IS AN ALLOWLIST, NOT A RELAXATION, AND THE DISTINCTION IS THE WHOLE SECURITY PROPERTY. /config
// tells the client which origin to post solves to (`solveBase`, so the solver can move to its own box
// without a Web Store release), and /config is read in the MAIN world — where a hostile page script could
// forge it. If this worker simply trusted the origin the client asked for, that forgery would turn a
// privileged, off-page, CORS-free fetch into an open relay, which is the exact attack BACKEND_ORIGIN is
// pinned against. So the SERVER chooses among hosts, and the BUILD decides which hosts are choosable: a
// forged solveBase pointing anywhere else is rejected as off-origin, unchanged.
//
// The consequence to plan around: a host that is not in this array cannot be switched to for anyone
// already running an installed build. Add a host here BEFORE it is needed, ship, and only then point
// solveBase at it.
const EXTRA_ORIGINS = ["https://solve.fodder.gg"];

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === "fodderOpenUrl") {
    let url;
    try {
      url = new URL(String(msg.url || ""));
      // "/" is the site root, opened by the header wordmark. Still an allowlist, not a prefix check: this
      // handler opens a tab off-page with the extension's privileges, so a hostile MAIN-world script on
      // ea.com must not be able to aim it anywhere it likes.
      if (url.origin !== "https://fodder.gg" || !["/", "/donate", "/support"].includes(url.pathname)) {
        throw new Error("off-origin");
      }
    } catch (_e) {
      sendResponse({ error: "blocked: unsupported Fodder URL" });
      return;
    }
    chrome.tabs.create({ url: url.href }, () => {
      if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
      else sendResponse({ ok: true });
    });
    return true;
  }
  // Sign in with an OAuth provider, without the page ever touching the flow.
  //
  // chrome.identity.launchWebAuthFlow opens a Chrome-managed window and resolves with the URL our backend
  // finally redirects to — we point it at OUR /auth/login, not at Discord/Google directly, so the client
  // secret stays server-side and no provider needs this extension's redirect URI registered. The backend
  // hands the token back in the URL FRAGMENT, which never reaches a server or a Referer header.
  //
  // Runs here rather than in the page because chrome.identity exists only in an extension context, and
  // because the token should never be visible to ea.com's own scripts in transit.
  if (msg.type === "fodderSignIn") {
    const provider = String(msg.provider || "");
    if (!/^[a-z]+$/.test(provider)) {
      sendResponse({ error: "blocked: bad provider" });
      return;
    }
    let authUrl;
    try {
      authUrl = new URL("/auth/login/" + provider, BACKEND_ORIGIN);
      if (authUrl.origin !== BACKEND_ORIGIN) throw new Error("off-origin");
      authUrl.searchParams.set("redirect", chrome.identity.getRedirectURL());
    } catch (_e) {
      sendResponse({ error: "blocked: could not build the sign-in URL" });
      return;
    }
    chrome.identity.launchWebAuthFlow({ url: authUrl.href, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        // Closing the window is a normal outcome, not a fault worth shouting about.
        sendResponse({ error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || "cancelled" });
        return;
      }
      let token = null;
      try {
        const frag = new URL(redirectUrl).hash.replace(/^#/, "");
        token = new URLSearchParams(frag).get("token");
      } catch (_e) { /* fall through to the error below */ }
      if (!token) sendResponse({ error: "no token in the redirect" });
      else sendResponse({ ok: true, token });
    });
    return true; // async sendResponse
  }
  if (msg.type !== "fodderFetch") return;
  let url;
  try {
    // A relative path still resolves against BACKEND_ORIGIN, so the default is unchanged; an ABSOLUTE URL
    // (the client's solveUrl, when /config routes solves elsewhere) resolves to its own origin and is then
    // checked against the pinned set. Either way the check is on the RESOLVED origin, which is what stops
    // `path="@evil.com"` escaping.
    url = new URL(String(msg.path || ""), BACKEND_ORIGIN);
    if (url.origin !== BACKEND_ORIGIN && !EXTRA_ORIGINS.includes(url.origin)) throw new Error("off-origin");
  } catch (_e) {
    sendResponse({ error: "blocked: must resolve to " + [BACKEND_ORIGIN].concat(EXTRA_ORIGINS).join(" or ") });
    return; // synchronous reject — nothing async pending
  }
  const opts = msg.opts || {};
  // A compressed body arrives base64-encoded (`bodyB64`): the bridge relays opts as a JSON string on
  // CustomEvent.detail, which cannot carry bytes. Decode back to the raw gzip bytes here — the
  // Content-Encoding header the client set rides along in opts.headers untouched.
  let body = opts.body;
  if (opts.bodyB64) {
    try {
      const bin = atob(opts.bodyB64);
      const u8 = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      body = u8;
    } catch (_e) {
      sendResponse({ error: "blocked: bad bodyB64" });
      return;
    }
  }
  fetch(url.href, {
    method: opts.method || "GET",
    headers: opts.headers || undefined,
    body,
    cache: opts.cache,
    // The client identifies by the bearer header the MAIN world supplies, never by a cookie. An extension
    // fetch can carry cookies for a host it has permission for, and one riding along here would keep
    // authenticating the client after it had signed out. Explicit, not left to the default.
    credentials: "omit",
  })
    .then(async (r) => {
      const body = await r.text();
      sendResponse({ status: r.status, body });
    })
    .catch((e) => sendResponse({ error: String((e && e.message) || e) }));
  return true; // keep the message channel open for the async sendResponse
});
