(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const notice = $("#dataNotice");
  const menuToggle = $(".mobile-menu-toggle");
  const navigation = $("#siteNavigation");
  function closeNavigation() {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', '打开导航菜单');
    navigation.classList.remove('is-open');
  }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
    navigation.classList.toggle('is-open', open);
  });
  navigation.addEventListener('click', event => {
    if (event.target.closest('a,button')) closeNavigation();
  });
  document.addEventListener('keydown', event => {if(event.key === 'Escape') closeNavigation();});
  document.addEventListener('click', event => {
    if (!navigation.contains(event.target) && !menuToggle.contains(event.target)) closeNavigation();
  });
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
