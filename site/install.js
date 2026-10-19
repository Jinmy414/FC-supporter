(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const notice = $("#dataNotice");
  try {
    if (localStorage.getItem("fcSupporterNotice") === "dismissed") notice.hidden = true;
  } catch (_) {}
  $("#dismissNotice").addEventListener("click", () => {
    notice.hidden = true;
    try {
      localStorage.setItem("fcSupporterNotice", "dismissed");
    } catch (_) {}
  });
  document.querySelectorAll("[data-dialog]").forEach(button => button.addEventListener("click", () => {
    const dialog = document.getElementById(button.dataset.dialog);
    dialog.showModal();
  }));
  document.querySelectorAll("dialog").forEach(dialog => {
    dialog.querySelector(".close-dialog").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => {
      if (event.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r
          .bottom) dialog.close();
      }
    });
  });
  document.querySelectorAll(".nav-menu").forEach(menu => menu.addEventListener("toggle", () => {
    if (menu.open) document.querySelectorAll(".nav-menu").forEach(other => {
      if (other !== menu) other.open = false;
    });
  }));

  function revealHash() {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.classList.contains("install-option")) target.open = true;
  }
  window.addEventListener("hashchange", revealHash);
  revealHash();
  $("#copyExtensionUrl").addEventListener("click", async () => {
    const address = /Edg\//.test(navigator.userAgent) ? "edge://extensions" : "chrome://extensions";
    const toast = $("#siteToast");
    try {
      await navigator.clipboard.writeText(address);
      toast.textContent = "已复制 " + address + "，请粘贴到浏览器地址栏。";
    } catch (_) {
      toast.textContent = "请在地址栏输入 " + address;
    }
    toast.classList.add("visible");
    window.setTimeout(() => toast.classList.remove("visible"), 5000);
  });
})();
