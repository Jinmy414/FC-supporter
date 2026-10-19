// Fodder bridge — runs in the ISOLATED content-script world (has chrome.runtime; the MAIN-world client
// does not). It relays the client's backend calls to the background service worker so they leave the
// page's network surface. Cross-world payloads are passed as JSON strings on CustomEvent.detail (plain
// objects can trip cross-world access errors).
(() => {
  // Availability handshake: MAIN pings, we pong (MAIN can't see this isolated script otherwise).
  document.addEventListener("fodder-bridge-ping", () => {
    document.dispatchEvent(new CustomEvent("fodder-bridge-pong"));
  });

  document.addEventListener("fodder-fetch-req", (e) => {
    let req;
    try { req = JSON.parse(e.detail); } catch (_e) { return; }
    if (!req || !req.id) return;
    const reply = (out) => document.dispatchEvent(new CustomEvent("fodder-fetch-res", { detail: JSON.stringify(Object.assign({ id: req.id }, out)) }));
    try {
      chrome.runtime.sendMessage(
        { type: "fodderFetch", path: req.path, opts: req.opts, backend: req.backend },
        (resp) => {
          if (chrome.runtime.lastError) return reply({ error: chrome.runtime.lastError.message });
          reply(resp || { error: "no response" });
        },
      );
    } catch (err) {
      reply({ error: String((err && err.message) || err) });
    }
  });

  // External navigation must leave EA's MAIN-world event system. Mobile WebViews frequently suppress
  // window.open/target=_blank there, so relay the request to the extension service worker.
  // Sign-in relay. The MAIN-world client cannot reach chrome.identity, so it asks here and gets back only
  // the finished token — the OAuth flow itself never touches the page.
  document.addEventListener("fodder-signin-req", (e) => {
    let req = {};
    try { req = JSON.parse(e.detail || "{}"); } catch (_e) { req = {}; }
    const reply = (out) => document.dispatchEvent(new CustomEvent("fodder-signin-res", {
      detail: JSON.stringify(Object.assign({ id: req.id }, out)),
    }));
    try {
      chrome.runtime.sendMessage({ type: "fodderSignIn", provider: req.provider }, (res) => {
        if (chrome.runtime.lastError) reply({ error: chrome.runtime.lastError.message });
        else reply(res || { error: "no response" });
      });
    } catch (err) {
      reply({ error: String((err && err.message) || err) });
    }
  });

  document.addEventListener("fodder-open-url-req", (e) => {
    let req;
    try { req = JSON.parse(e.detail); } catch (_e) { return; }
    if (!req || !req.id || !req.url) return;
    const reply = (out) => document.dispatchEvent(new CustomEvent("fodder-open-url-res", {
      detail: JSON.stringify(Object.assign({ id: req.id }, out)),
    }));
    try {
      chrome.runtime.sendMessage({ type: "fodderOpenUrl", url: req.url }, (resp) => {
        if (chrome.runtime.lastError) return reply({ error: chrome.runtime.lastError.message });
        reply(resp || { error: "no response" });
      });
    } catch (err) {
      reply({ error: String((err && err.message) || err) });
    }
  });
})();
