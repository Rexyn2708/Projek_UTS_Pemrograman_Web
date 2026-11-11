/* ==========================================================================
   CampusBite — main.js (Updated for Rupiah & Campus Canteen)
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Helpers (Rupiah Formatter) ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); }
  function lockScroll(on) { document.body.classList.toggle("body-lock", !!on); }

  /* ---------- Toast ---------- */
  var toastTimer;
  function showToast(msg) {
    var t = $("#toast"), m = $("#toastMsg");
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- Sticky header state ---------- */
  function initStickyHeader() {
    var header = $("#siteHeader");
    if (!header) return;
    function onScroll() { header.classList.toggle("is-stuck", window.scrollY > 12); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile nav ---------- */
  function initMobileNav() {
    var toggle = $("#navToggle"), nav = $("#mobileNav"), close = $("#navClose"), scrim = $("#scrim");
    if (!toggle || !nav) return;
    function open() {
      nav.classList.add("open");
      if (scrim) scrim.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      lockScroll(true);
      var first = nav.querySelector("a");
      if (first) first.focus();
    }
    function shut() {
      nav.classList.remove("open");
      if (scrim) scrim.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      lockScroll(false);
    }
    toggle.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    if (scrim) scrim.addEventListener("click", shut);
    $all("a", nav).forEach(function (a) { a.addEventListener("click", shut); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) shut(); });
  }

  /* ---------- Search panel ---------- */
  function initSearch() {
    var toggle = $("#searchToggle"), panel = $("#searchPanel"), close = $("#searchClose"), input = $("#searchInput");
    if (!toggle || !panel) return;
    function open() {
      panel.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      if (input) setTimeout(function () { input.focus(); }, 60);
    }
    function shut() {
      panel.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      panel.classList.contains("open") ? shut() : open();
    });
    if (close) close.addEventListener("click", shut);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) shut(); });
    document.addEventListener("click", function (e) {
      if (panel.classList.contains("open") && !panel.contains(e.target) && !toggle.contains(e.target)) shut();
    });
  }

  /* ---------- Product filtering ---------- */
  function initFilter() {
    var buttons = $all(".filter-btn");
    var cards = $all("#productGrid .product-card");
    var noRes = $("#noResults");
    if (!buttons.length || !cards.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        var shown = 0;
        cards.forEach(function (card) {
          var match = f === "all" || card.getAttribute("data-cat") === f;
          card.classList.toggle("hide", !match);
          if (match) shown++;
        });
        if (noRes) noRes.style.display = shown === 0 ? "block" : "none";
      });
    });
  }

  /* ---------- Wishlist toggles ---------- */
  function initWishlist() {
    $all(".pc-wish").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var on = btn.classList.toggle("active");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        showToast(on ? "Disimpan ke favorit" : "Dihapus dari favorit");
      });
    });
    var big = $("#pdpWish");
    if (big) big.addEventListener("click", function () {
      var on = big.classList.toggle("active");
      big.setAttribute("aria-pressed", on ? "true" : "false");
      showToast(on ? "Disimpan ke favorit" : "Dihapus dari favorit");
    });
  }

  /* ==========================================================================
     Cart (Keranjang Belanja)
     ========================================================================== */
  var cart = [];

  function cartKey(item) { return item.id + "|" + (item.variant || ""); }

  function addToCart(item) {
    var key = cartKey(item);
    var existing = cart.filter(function (c) { return cartKey(c) === key; })[0];
    if (existing) { existing.qty += item.qty; }
    else { cart.push(item); }
    renderCart(true);
  }

  function removeFromCart(key) {
    cart = cart.filter(function (c) { return cartKey(c) !== key; });
    renderCart();
  }

  function changeQty(key, delta) {
    cart.forEach(function (c) {
      if (cartKey(c) === key) { c.qty = Math.max(1, c.qty + delta); }
    });
    renderCart();
  }

  function cartTotals() {
    var qty = 0, sub = 0;
    cart.forEach(function (c) { qty += c.qty; sub += c.qty * c.price; });
    return { qty: qty, sub: sub };
  }

  function renderCart(bump) {
    var wrap = $("#cartItems"), empty = $("#cartEmpty"), foot = $("#cartFoot");
    var countEl = $("#cartCount"), noteEl = $("#cartQtyNote"), subEl = $("#cartSubtotal");
    var freeMsg = $("#cartFreeMsg"), progress = $("#cartProgress");
    if (!wrap) return;
    var t = cartTotals();

    // count pill
    if (countEl) {
      countEl.textContent = t.qty;
      countEl.style.display = t.qty > 0 ? "flex" : "none";
      if (bump) { countEl.classList.remove("pop"); void countEl.offsetWidth; countEl.classList.add("pop"); }
    }
    if (noteEl) noteEl.textContent = t.qty + (t.qty === 1 ? " item" : " items");

    // lines
    $all(".cart-line", wrap).forEach(function (n) { n.remove(); });
    if (cart.length === 0) {
      if (empty) empty.style.display = "";
      if (foot) foot.hidden = true;
    } else {
      if (empty) empty.style.display = "none";
      if (foot) foot.hidden = false;
      cart.forEach(function (c) {
        var key = cartKey(c);
        var line = document.createElement("div");
        line.className = "cart-line";
        line.innerHTML =
          '<img src="' + c.img + '" alt="' + c.name + '" width="74" height="94" loading="lazy">' +
          '<div><div class="cl-name">' + c.name + '</div>' +
          '<div class="cl-meta">' + (c.variant || "") + '</div>' +
          '<div class="cl-price">' + money(c.price) + '</div>' +
          '<button class="cl-remove" type="button" data-key="' + key + '">Hapus</button></div>' +
          '<div class="cl-right"><div class="qty-stepper">' +
          '<button type="button" class="q-minus" data-key="' + key + '" aria-label="Kurangi jumlah"' + (c.qty <= 1 ? " disabled" : "") + '>&minus;</button>' +
          '<span class="q">' + c.qty + '</span>' +
          '<button type="button" class="q-plus" data-key="' + key + '" aria-label="Tambah jumlah">+</button>' +
          '</div></div>';
        wrap.appendChild(line);
      });
    }

    // subtotal + free-ship info kampus
    if (subEl) subEl.textContent = money(t.sub);
    if (freeMsg) {
      freeMsg.innerHTML = "<strong>Bebas ongkir</strong> antar gedung khusus area kampus!";
    }
    if (progress) progress.style.width = "100%";
  }

  function initCart() {
    var drawer = $("#cartDrawer"), scrim = $("#cartScrim");
    var openBtn = $("#cartOpen"), closeBtn = $("#cartClose");
    var contBtn = $("#cartContinue"), emptyShop = $("#cartEmptyShop");
    if (!drawer) return;

    function open() {
      drawer.classList.add("open");
      if (scrim) scrim.classList.add("open");
      lockScroll(true);
      if (closeBtn) closeBtn.focus();
    }
    function shut() {
      drawer.classList.remove("open");
      if (scrim) scrim.classList.remove("open");
      lockScroll(false);
    }
    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", shut);
    if (scrim) scrim.addEventListener("click", shut);
    if (contBtn) contBtn.addEventListener("click", shut);
    if (emptyShop) emptyShop.addEventListener("click", shut);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) shut(); });

    // delegate qty/remove inside cart
    drawer.addEventListener("click", function (e) {
      var minus = e.target.closest(".q-minus");
      var plus = e.target.closest(".q-plus");
      var rm = e.target.closest(".cl-remove");
      if (minus) changeQty(minus.getAttribute("data-key"), -1);
      else if (plus) changeQty(minus ? minus.getAttribute("data-key") : plus.getAttribute("data-key"), 1);
      else if (rm) removeFromCart(rm.getAttribute("data-key"));
    });

    // quick-add buttons across the page
    $all(".js-add").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        addToCart({
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          price: parseFloat(btn.getAttribute("data-price")),
          img: btn.getAttribute("data-img"),
          variant: btn.getAttribute("data-variant") || "",
          qty: 1
        });
        showToast(btn.getAttribute("data-name") + " masuk keranjang jajan");
        open();
      });
    });

    // PDP add-to-bag
    var pdpAdd = $("#pdpAdd");
    if (pdpAdd) {
      pdpAdd.addEventListener("click", function () {
        var colour = ($("#colourVal") || {}).textContent || "";
        var sizeBtn = $(".size-btn.active");
        var size = sizeBtn ? sizeBtn.getAttribute("data-size") : "";
        var qty = parseInt(($("#qtyVal") || {}).textContent, 10) || 1;
        addToCart({
          id: pdpAdd.getAttribute("data-id"),
          name: pdpAdd.getAttribute("data-name"),
          price: parseFloat(pdpAdd.getAttribute("data-price")),
          img: pdpAdd.getAttribute("data-img"),
          variant: [colour, size].filter(Boolean).join(" · "),
          qty: qty
        });
        showToast(pdpAdd.getAttribute("data-name") + " masuk keranjang jajan");
        open();
      });
    }

    renderCart();
  }

  /* ---------- Gallery & Lightbox ---------- */
  function initGallery() {
    var thumbs = $all(".pdp-thumb"), mainImg = $("#pdpMainImg");
    if (!thumbs.length || !mainImg) return;
    thumbs.forEach(function (t) {
      t.addEventListener("click", function () {
        var full = t.getAttribute("data-full");
        if (full) mainImg.src = full;
        thumbs.forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
      });
    });
  }

  function initLightbox() {
    var main = $("#pdpMain"), lb = $("#lightbox"), lbImg = $("#lightboxImg"), close = $("#lightboxClose"), mainImg = $("#pdpMainImg");
    if (!main || !lb) return;
    function open() {
      if (mainImg && lbImg) lbImg.src = mainImg.src;
      lb.classList.add("open");
      lockScroll(true);
      if (close) close.focus();
    }
    function shut() { lb.classList.remove("open"); lockScroll(false); }
    main.addEventListener("click", open);
    main.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    if (close) close.addEventListener("click", shut);
    lb.addEventListener("click", function (e) { if (e.target === lb) shut(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("open")) shut(); });
  }

  function initSwatches() {
    var swatches = $all("#swatches .swatch"), val = $("#colourVal");
    if (!swatches.length) return;
    swatches.forEach(function (s) {
      s.addEventListener("click", function () {
        swatches.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-checked", "false"); });
        s.classList.add("active");
        s.setAttribute("aria-checked", "true");
        if (val) val.textContent = s.getAttribute("data-colour");
      });
    });
  }

  function initSizePicker() {
    var sizes = $all("#sizes .size-btn");
    if (!sizes.length) return;
    sizes.forEach(function (s) {
      if (s.disabled) return;
      s.addEventListener("click", function () {
        sizes.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-checked", "false"); });
        s.classList.add("active");
        s.setAttribute("aria-checked", "true");
      });
    });
  }

  function initQtyStepper() {
    var minus = $("#qtyMinus"), plus = $("#qtyPlus"), val = $("#qtyVal"), add = $("#pdpAdd");
    if (!val) return;
    function get() { return parseInt(val.textContent, 10) || 1; }
    function setPrice() {
      if (!add) return;
      var base = parseFloat(add.getAttribute("data-price"));
      add.textContent = "+ Masukkan Keranjang — " + money(base * get());
    }
    function set(n) { val.textContent = Math.max(1, n); if (minus) minus.disabled = get() <= 1; setPrice(); }
    if (minus) minus.addEventListener("click", function () { set(get() - 1); });
    if (plus) plus.addEventListener("click", function () { set(get() + 1); });
    set(1);
  }

  function initTabs() {
    var tabs = $all(".tab-btn"), panels = $all(".tab-panel");
    if (!tabs.length) return;
    function activate(name) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-panel") === name); });
    }
    tabs.forEach(function (t, idx) {
      t.addEventListener("click", function () { activate(t.getAttribute("data-tab")); });
      t.addEventListener("keydown", function (e) {
        var n;
        if (e.key === "ArrowRight") n = (idx + 1) % tabs.length;
        else if (e.key === "ArrowLeft") n = (idx - 1 + tabs.length) % tabs.length;
        else return;
        e.preventDefault();
        tabs[n].focus();
        activate(tabs[n].getAttribute("data-tab"));
      });
    });
    var jumpR = $("#jumpReviews"), jumpS = $("#jumpSize");
    if (jumpR) jumpR.addEventListener("click", function () { activate("reviews"); });
    if (jumpS) jumpS.addEventListener("click", function (e) { e.preventDefault(); activate("size"); var el = $("#sizeguide"); if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initStickyHeader();
    initMobileNav();
    initSearch();
    initFilter();
    initWishlist();
    initCart();
    initGallery();
    initLightbox();
    initSwatches();
    initSizePicker();
    initQtyStepper();
    initTabs();
  });
})();
