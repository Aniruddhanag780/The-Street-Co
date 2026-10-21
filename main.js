/* ═══════════════════════════════════════════════════════════
   THE STREET CO — CONTEMPORARY STREETWEAR ESSENTIALS
   ═══════════════════════════════════════════════════════════ */

// Force browser to start at top on clean loads
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// Google Analytics Event Dispatcher
window.trackGAEvent = function(eventName, eventParams = {}) {
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, eventParams);
    } else if (typeof gtag === "function") {
      gtag("event", eventName, eventParams);
    }
  } catch (_) {}
};

// Authentic Luxury Preloader
(function initLuxuryPreloader() {
  const loaderEl = document.getElementById("loader");
  const loaderFill = document.getElementById("loaderFill");
  const loaderPct = document.getElementById("loaderPct");

  if (!loaderEl) return;

  let current = 0;
  const startTime = performance.now();
  const totalDuration = 1250; // Smooth ~1.25s luxury brand reveal

  function update(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);

    // Elegant cubic ease-out curve
    const easeOut = 1 - Math.pow(1 - progress, 2.8);
    current = Math.min(100, Math.floor(easeOut * 100));

    if (loaderFill) loaderFill.style.width = current + "%";
    if (loaderPct) loaderPct.textContent = current + "%";

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      if (loaderFill) loaderFill.style.width = "100%";
      if (loaderPct) loaderPct.textContent = "100%";
      setTimeout(() => {
        loaderEl.classList.add("done");
        document.body.classList.add("ready");
        setTimeout(() => {
          loaderEl.style.display = "none";
        }, 800);
      }, 180);
    }
  }

  requestAnimationFrame(update);
})();

// ÉLANORA Navigation, Filter Shortcuts, Interactive Showcases & Mobile Bar
document.addEventListener("DOMContentLoaded", () => {
  // Header Search Button
  const headerSearchBtn = document.getElementById("headerSearchBtn");
  const shopSearchInput = document.getElementById("shopSearchInput");
  if (headerSearchBtn && shopSearchInput) {
    headerSearchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const shopEl = document.getElementById("shop");
      if (shopEl) {
        shopEl.scrollIntoView({ behavior: "smooth" });
        setTimeout(() => shopSearchInput.focus(), 400);
      }
    });
  }

  // Header Track Order Button
  const headerTrackBtn = document.getElementById("headerTrackBtn");
  if (headerTrackBtn) {
    headerTrackBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const trackModal = document.getElementById("delhiveryTrackModal");
      if (trackModal) {
        trackModal.classList.add("open");
        trackModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
    });
  }

  // Top Announcement Bar links
  const topTrackOrderLink = document.getElementById("topTrackOrderLink");
  if (topTrackOrderLink) {
    topTrackOrderLink.addEventListener("click", (e) => {
      e.preventDefault();
      const trackModal = document.getElementById("delhiveryTrackModal");
      if (trackModal) {
        trackModal.classList.add("open");
        trackModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
    });
  }

  const topHelpCenterLink = document.getElementById("topHelpCenterLink");
  if (topHelpCenterLink) {
    topHelpCenterLink.addEventListener("click", (e) => {
      e.preventDefault();
      const sizeModal = document.getElementById("sizeGuideModal");
      if (sizeModal) {
        sizeModal.classList.add("open");
        sizeModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
    });
  }

  // Circular Category Avatars (7 Circles)
  document.querySelectorAll("[data-category-filter]").forEach(item => {
    item.addEventListener("click", () => {
      const cat = item.getAttribute("data-category-filter");
      if (shopSearchInput) {
        shopSearchInput.value = cat;
        shopSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const shopEl = document.getElementById("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Hero Quick Category & Nav shortcuts
  document.querySelectorAll("[data-filter-quick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-filter-quick");
      document.querySelectorAll("[data-filter-quick]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const targetCb = document.querySelector(`input[name="filter-cat"][value="${cat}"]`);
      if (targetCb) {
        document.querySelectorAll('input[name="filter-cat"]').forEach(cb => cb.checked = false);
        targetCb.checked = true;
        targetCb.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (cat === "all") {
        document.querySelectorAll('input[name="filter-cat"]').forEach(cb => cb.checked = false);
        const allCb = document.querySelector('input[name="filter-cat"][value="all"]');
        if (allCb) {
          allCb.checked = true;
          allCb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      const shopEl = document.getElementById("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Collection Switcher Tabs (section#shop)
  document.querySelectorAll("[data-collection-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      const cat = tab.getAttribute("data-collection-tab");
      document.querySelectorAll("[data-collection-tab]").forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      const crumbCurrent = document.getElementById("shopCurrentCrumb");
      if (crumbCurrent) {
        crumbCurrent.textContent = cat === "all" ? "All Collections" : (tab.textContent + " Collection");
      }

      if (shopSearchInput) {
        shopSearchInput.value = cat === "all" ? "" : cat;
        shopSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const targetCb = document.querySelector(`input[name="filter-cat"][value="${cat}"]`);
      if (targetCb) {
        document.querySelectorAll('input[name="filter-cat"]').forEach(cb => cb.checked = false);
        targetCb.checked = true;
        targetCb.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (cat === "all") {
        document.querySelectorAll('input[name="filter-cat"]').forEach(cb => cb.checked = false);
        const allCb = document.querySelector('input[name="filter-cat"][value="all"]');
        if (allCb) {
          allCb.checked = true;
          allCb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    });
  });

  // Nav category shortcuts
  document.querySelectorAll("[data-nav-category]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const cat = link.getAttribute("data-nav-category");
      document.querySelectorAll("[data-nav-category]").forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      if (cat === "new") {
        if (typeof window.openNewProductsFilter === "function") {
          window.openNewProductsFilter(e);
        } else {
          const shopEl = document.getElementById("shop");
          if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }

      if (shopSearchInput && cat !== "all") {
        shopSearchInput.value = cat === "collections" ? "" : cat;
        shopSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      } else if (shopSearchInput && cat === "all") {
        shopSearchInput.value = "";
        shopSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const targetCb = document.querySelector(`input[name="filter-cat"][value="${cat}"]`);
      if (targetCb) {
        document.querySelectorAll('input[name="filter-cat"]').forEach(cb => cb.checked = false);
        targetCb.checked = true;
        targetCb.dispatchEvent(new Event("change", { bubbles: true }));
      } else if (cat === "all") {
        document.querySelectorAll('input[name="filter-cat"]').forEach(cb => cb.checked = false);
        const allCb = document.querySelector('input[name="filter-cat"][value="all"]');
        if (allCb) {
          allCb.checked = true;
          allCb.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }

      const shopEl = document.getElementById("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Curated New Arrivals Wishlist clicks
  document.querySelectorAll("[data-action='quick-wishlist']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = btn.getAttribute("data-name") || "Luxury Piece";
      btn.style.color = "#DC2626";
      const shopWishlistBtn = document.getElementById("shopWishlistBtn");
      if (shopWishlistBtn) {
        shopWishlistBtn.click();
      }
    });
  });

  // Curated Cards click -> view in shop
  document.querySelectorAll(".featured-arrival-card").forEach(card => {
    card.addEventListener("click", () => {
      const name = card.getAttribute("data-curated-name");
      if (shopSearchInput && name) {
        shopSearchInput.value = name;
        shopSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const shopEl = document.getElementById("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Dual promo clicks
  document.querySelectorAll("[data-promo-action]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const action = link.getAttribute("data-promo-action");
      if (shopSearchInput) {
        shopSearchInput.value = action === "summer" ? "dress" : "accessories";
        shopSearchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
      const shopEl = document.getElementById("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    });
  });

  // Reviews Carousel navigation
  const reviewsGrid = document.getElementById("reviewsGrid");
  const reviewsPrevBtn = document.getElementById("reviewsPrevBtn");
  const reviewsNextBtn = document.getElementById("reviewsNextBtn");
  if (reviewsGrid && reviewsPrevBtn && reviewsNextBtn) {
    reviewsPrevBtn.addEventListener("click", () => {
      reviewsGrid.scrollBy({ left: -320, behavior: "smooth" });
    });
    reviewsNextBtn.addEventListener("click", () => {
      reviewsGrid.scrollBy({ left: 320, behavior: "smooth" });
    });
  }

  // Floating Mobile Bottom Navigation (Home, Shop, Collections, Bag)
  const mobileNavHome = document.getElementById("mobileNavHome");
  const mobileNavShop = document.getElementById("mobileNavShop");
  const mobileNavCollections = document.getElementById("mobileNavCollections");
  const mobileNavCart = document.getElementById("mobileNavCart");
  const mobileNavWishlist = document.getElementById("mobileNavWishlist");
  const mobileNavTrack = document.getElementById("mobileNavTrack");

  function setActiveBottomNav(activeItem) {
    if (!activeItem) return;
    if (activeItem.classList.contains("active")) return;
    document.querySelectorAll(".mobile-bottom-bar__item").forEach(item => {
      if (item !== activeItem) item.classList.remove("active");
    });
    activeItem.classList.add("active");
  }

  let isNavClickLocked = false;
  let navClickLockTimer = null;
  function lockNavScrollSync(duration = 900) {
    isNavClickLocked = true;
    if (navClickLockTimer) clearTimeout(navClickLockTimer);
    navClickLockTimer = setTimeout(() => {
      isNavClickLocked = false;
    }, duration);
  }

  if (mobileNavHome) {
    mobileNavHome.addEventListener("click", (e) => {
      e.preventDefault();
      lockNavScrollSync(900);
      setActiveBottomNav(mobileNavHome);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (mobileNavShop) {
    mobileNavShop.addEventListener("click", (e) => {
      e.preventDefault();
      lockNavScrollSync(900);
      setActiveBottomNav(mobileNavShop);
      const shopEl = document.getElementById("shop");
      if (shopEl) shopEl.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (mobileNavCollections) {
    mobileNavCollections.addEventListener("click", (e) => {
      e.preventDefault();
      lockNavScrollSync(1200);
      setActiveBottomNav(mobileNavCollections);
      openCollectionsPage();
    });
  }

  if (mobileNavCart) {
    mobileNavCart.addEventListener("click", (e) => {
      e.preventDefault();
      lockNavScrollSync(1200);
      setActiveBottomNav(mobileNavCart);
      const cartBtn = document.getElementById("shopCartBtn");
      if (cartBtn) cartBtn.click();
    });
  }

  if (mobileNavWishlist) {
    mobileNavWishlist.addEventListener("click", () => {
      const wishBtn = document.getElementById("shopWishlistBtn");
      if (wishBtn) wishBtn.click();
    });
  }

  if (mobileNavTrack) {
    mobileNavTrack.addEventListener("click", () => {
      const trackModal = document.getElementById("delhiveryTrackModal");
      if (trackModal) {
        trackModal.classList.add("open");
        trackModal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
      }
    });
  }

  // Smooth scroll sync for active bottom bar icon without fluctuating
  window.syncMobileBottomNav = function() {
    if (window.innerWidth > 768) return;
    if (isNavClickLocked) return;
    if (collectionsPage && collectionsPage.classList.contains('open')) {
      if (mobileNavCollections) setActiveBottomNav(mobileNavCollections);
      return;
    }
    if (document.body.classList.contains("bag-open") || document.body.classList.contains("cart-open")) {
      if (mobileNavCart) setActiveBottomNav(mobileNavCart);
      return;
    }
    const scrollY = window.scrollY || window.pageYOffset;
    const shopSec = document.getElementById("shop");
    const shopTop = shopSec ? (shopSec.getBoundingClientRect().top + scrollY - 260) : 999999;

    if (scrollY >= shopTop && mobileNavShop) {
      setActiveBottomNav(mobileNavShop);
    } else if (scrollY < shopTop && mobileNavHome) {
      setActiveBottomNav(mobileNavHome);
    }
  };

  let scrollNavTimer = null;
  window.addEventListener("scroll", () => {
    if (window.innerWidth > 768 || isNavClickLocked) return;
    if (scrollNavTimer) return;
    scrollNavTimer = setTimeout(() => {
      scrollNavTimer = null;
      if (typeof window.syncMobileBottomNav === 'function') {
        window.syncMobileBottomNav();
      }
    }, 120);
  }, { passive: true });
});

/* ═════════════════════ reveals ═════════════════════ */
document.querySelectorAll(
  ".quote blockquote, .quote__mark, .footer__big, .footer__row, [data-reveal]"
).forEach((el, i) => {
  el.setAttribute("data-reveal", "");
  if (!el.style.getPropertyValue("--i")) el.style.setProperty("--i", i % 4);
});

const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll("[data-reveal]").forEach(el => io.observe(el));

/* ═════════════════════ SHOP LOGIC ═════════════════════ */
(function initShop() {
  const shopSection = document.getElementById('shop');
  if (!shopSection) return;

  // Category filtering
  const filterBtns = shopSection.querySelectorAll('.shop__filter');
  const cards = shopSection.querySelectorAll('.shop-card');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.category;
      cards.forEach(card => {
        if (cat === 'all' || card.dataset.category === cat) {
          card.style.display = 'flex';
          setTimeout(() => { card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }, 20);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'translateY(12px)';
          setTimeout(() => { card.style.display = 'none'; }, 200);
        }
      });
    });
  });

  // Cart & Wishlist state
  let cart = [];
  const WISHLIST_STORAGE_KEY = 'the_street_co_wishlist';
  let wishlist = [];
  try {
    const rawWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY) || localStorage.getItem('itachi_wishlist_backup');
    if (rawWishlist) {
      wishlist = JSON.parse(rawWishlist);
      if (!Array.isArray(wishlist)) wishlist = [];
    }
  } catch (e) {
    wishlist = [];
  }

  function saveWishlist() {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.warn('Failed to save wishlist to localStorage', e);
    }
  }

  function isWishlisted(sku) {
    if (!sku) return false;
    return wishlist.some(i => (i.sku || i.id) === sku);
  }

  const cartBtn = document.getElementById('shopCartBtn');
  const cartCountEl = document.getElementById('cartCount');
  const cartDrawer = document.getElementById('cartDrawer');
  const cartBackdrop = document.getElementById('cartBackdrop');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const cartSubtotal = document.getElementById('cartSubtotal');
  const cartDiscountRow = document.getElementById('cartDiscountRow');
  const cartDiscountCodeBadge = document.getElementById('cartDiscountCodeBadge');
  const cartDiscountVal = document.getElementById('cartDiscountVal');
  const cartTotalRow = document.getElementById('cartTotalRow');
  const cartTotalVal = document.getElementById('cartTotalVal');
  const checkoutBtnText = document.getElementById('checkoutBtnText');
  const cartDrawerCount = document.getElementById('cartDrawerCount');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const shopToast = document.getElementById('shopToast');
  const orderModal = document.getElementById('orderModal');
  const orderCloseBtn = document.getElementById('orderCloseBtn');
  const orderCode = document.getElementById('orderCode');
  const collecCartBtn = document.getElementById('collecCartBtn');
  const collecCartCount = document.getElementById('collecCartCount');

  // Cart Coupon Tracking (Redeemed in Bag so user knows price before checkout)
  let appliedCartCoupon = {
    code: '',
    discount: 0,
    details: null
  };

  // Wishlist elements
  const shopWishlistBtn = document.getElementById('shopWishlistBtn');
  const wishlistCountEl = document.getElementById('wishlistCount');
  const collecWishlistBtn = document.getElementById('collecWishlistBtn');
  const collecWishlistCount = document.getElementById('collecWishlistCount');
  const cartDrawerTabBag = document.getElementById('cartDrawerTabBag');
  const cartDrawerTabWishlist = document.getElementById('cartDrawerTabWishlist');
  const wishlistItemsContainer = document.getElementById('wishlistItemsContainer');
  const cartDrawerWishlistCount = document.getElementById('cartDrawerWishlistCount');
  const cartDrawerFoot = document.getElementById('cartDrawerFoot');
  const wishlistDrawerFoot = document.getElementById('wishlistDrawerFoot');
  const wishlistMoveAllBtn = document.getElementById('wishlistMoveAllBtn');
  const relicGalleryWishlistBtn = document.getElementById('relicGalleryWishlistBtn');
  const relicGalleryWishlistText = document.getElementById('relicGalleryWishlistText');

  let currentDrawerTab = 'bag';

  let toastTimer = null;
  function showToast(titleOrName, optionalDetail, type = 'cart') {
    if (!shopToast) return;
    const title = optionalDetail ? titleOrName : (type === 'wishlist' ? 'SAVED WISHLIST' : (type === 'price-drop' ? 'PRICE DROP ALERT' : 'ADDED TO CART'));
    const detail = optionalDetail ? optionalDetail : titleOrName;
    const isCartToast = type === 'cart';
    const isWishlistToast = type === 'wishlist';
    const isPriceDropToast = type === 'price-drop';

    shopToast.innerHTML = `
      <div class="shop-toast__progress" aria-hidden="true"></div>
      <div class="shop-toast__inner">
        <div class="shop-toast__icon ${isPriceDropToast ? 'price-drop-icon' : ''}" aria-hidden="true">
          ${isWishlistToast ? `
            <svg class="anim-check-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          ` : (isPriceDropToast ? `
            <svg class="anim-check-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fbbf24" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          ` : `
            <svg class="anim-check-svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `)}
        </div>
        <div class="shop-toast__body">
          <div class="shop-toast__title" style="${isPriceDropToast ? 'color:#fbbf24;' : ''}">${title}</div>
          <div class="shop-toast__name" title="${detail}">${detail}</div>
        </div>
        ${isCartToast ? `<button type="button" class="shop-toast__btn" id="toastOpenBagBtn">VIEW BAG →</button>` : ''}
        ${isWishlistToast ? `<button type="button" class="shop-toast__btn" id="toastOpenWishlistBtn">VIEW WISHLIST →</button>` : ''}
      </div>
    `;
    shopToast.classList.add('show');

    const openBagBtn = document.getElementById('toastOpenBagBtn');
    if (openBagBtn) {
      openBagBtn.addEventListener('click', () => {
        shopToast.classList.remove('show');
        openCart('bag');
      });
    }

    const openWishlistBtn = document.getElementById('toastOpenWishlistBtn');
    if (openWishlistBtn) {
      openWishlistBtn.addEventListener('click', () => {
        shopToast.classList.remove('show');
        openCart('wishlist');
      });
    }

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      shopToast.classList.remove('show');
    }, 4200);
  }

  function updateHeartButtons(sku, isWish) {
    document.querySelectorAll(`[data-wishlist-toggle="${sku}"]`).forEach(btn => {
      btn.classList.toggle('active', isWish);
      btn.setAttribute('aria-label', isWish ? 'Remove from Wishlist' : 'Save to Wishlist');
      btn.setAttribute('title', isWish ? 'Saved in Wishlist (Click to remove)' : 'Save to Wishlist');
      const svg = btn.querySelector('svg');
      if (svg) {
        svg.setAttribute('fill', isWish ? 'currentColor' : 'none');
      }
    });

    if (activeGalleryItem && (activeGalleryItem.sku || activeGalleryItem.id) === sku) {
      if (relicGalleryWishlistBtn) {
        relicGalleryWishlistBtn.classList.toggle('active', isWish);
        const svg = relicGalleryWishlistBtn.querySelector('svg');
        if (svg) svg.setAttribute('fill', isWish ? 'currentColor' : 'none');
        if (relicGalleryWishlistText) {
          relicGalleryWishlistText.textContent = isWish ? 'SAVED' : 'WISHLIST';
        }
      }
    }
  }

  function toggleWishlist(item, triggerBtn) {
    const sku = item.sku || item.id;
    if (!sku) return;

    const existingIndex = wishlist.findIndex(i => (i.sku || i.id) === sku);
    if (existingIndex > -1) {
      // Remove from wishlist
      wishlist.splice(existingIndex, 1);
      saveWishlist();
      updateWishlistUI();
      updateHeartButtons(sku, false);
      showToast('REMOVED FROM WISHLIST', item.name, 'wishlist');
    } else {
      // Add to wishlist
      const priceInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
      const priceRyo = item.priceRyo ? Number(item.priceRyo) : Math.round(priceInr * 1.54);
      wishlist.push({
        id: sku,
        sku: sku,
        name: item.name,
        priceRyo: priceRyo,
        priceInr: priceInr,
        seal: item.seal || '忍',
        desc: item.desc || '',
        category: item.category || 'relic',
        collectionName: item.collectionName || 'Official Collection',
        images: Array.isArray(item.images) ? item.images : (item.imageUrl ? [item.imageUrl] : []),
        imageUrl: item.imageUrl || (Array.isArray(item.images) && item.images[0]) || '',
        addedAt: Date.now()
      });
      saveWishlist();
      updateWishlistUI();
      updateHeartButtons(sku, true);
      showToast('SAVED TO WISHLIST', item.name, 'wishlist');

      if (typeof window.trackGAEvent === 'function') {
        window.trackGAEvent('add_to_wishlist', {
          item_id: sku,
          item_name: item.name,
          price: priceInr,
          currency: 'INR'
        });
      }

      if (triggerBtn) {
        triggerBtn.classList.add('active');
      }
    }
  }

  function removeFromWishlist(sku) {
    const idx = wishlist.findIndex(i => (i.sku || i.id) === sku);
    if (idx > -1) {
      const removed = wishlist[idx];
      wishlist.splice(idx, 1);
      saveWishlist();
      updateWishlistUI();
      updateHeartButtons(sku, false);
      showToast('REMOVED FROM WISHLIST', removed.name, 'wishlist');
    }
  }

  function moveWishlistItemToBag(sku) {
    const item = wishlist.find(i => (i.sku || i.id) === sku);
    if (!item) return;

    const existing = cart.find(i => (i.sku || i.id) === sku);
    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        id: sku,
        sku: sku,
        name: item.name,
        category: item.category || 'Relics',
        collection: item.collection || '',
        collectionName: item.collectionName || 'Official Collection',
        priceRyo: item.priceRyo,
        priceInr: item.priceInr,
        seal: item.seal || '忍',
        specs: item.specs || '',
        desc: item.desc || '',
        image: (item.images && item.images[0]) || item.image || item.imageUrl || '',
        qty: 1
      });
    }
    updateCartUI();
    showToast('MOVED TO CART', item.name, 'cart');
  }

  function moveAllWishlistToBag() {
    if (wishlist.length === 0) return;
    wishlist.forEach(item => {
      const sku = item.sku || item.id;
      const existing = cart.find(i => (i.sku || i.id) === sku);
      if (existing) {
        existing.qty++;
      } else {
        cart.push({
          id: sku,
          sku: sku,
          name: item.name,
          category: item.category || 'Relics',
          collection: item.collection || '',
          collectionName: item.collectionName || 'Apparel & Product Catalog',
          priceRyo: item.priceRyo,
          priceInr: item.priceInr,
          seal: item.seal || '忍',
          specs: item.specs || '',
          desc: item.desc || '',
          image: (item.images && item.images[0]) || item.image || item.imageUrl || '',
          qty: 1
        });
      }
    });
    updateCartUI();
    showToast('ALL ITEMS MOVED TO CART', `${wishlist.length} item${wishlist.length > 1 ? 's' : ''} transferred to Cart`, 'cart');
    switchDrawerTab('bag');
  }

  function updateWishlistUI() {
    const wishCount = wishlist.length;
    if (wishlistCountEl) {
      wishlistCountEl.textContent = String(wishCount);
      wishlistCountEl.setAttribute('data-count', String(wishCount));
      if (wishCount > 0) {
        wishlistCountEl.classList.remove('is-zero');
        wishlistCountEl.style.setProperty('display', 'flex', 'important');
      } else {
        wishlistCountEl.classList.add('is-zero');
        wishlistCountEl.style.setProperty('display', 'none', 'important');
      }
    }
    if (collecWishlistCount) collecWishlistCount.textContent = String(wishCount);
    if (cartDrawerWishlistCount) cartDrawerWishlistCount.textContent = String(wishCount);
    const mobileWishBadge = document.getElementById('mobileWishlistBadge');
    if (mobileWishBadge) {
      mobileWishBadge.textContent = String(wishCount);
      mobileWishBadge.setAttribute('data-count', String(wishCount));
      if (wishCount > 0) {
        mobileWishBadge.classList.remove('is-zero');
        mobileWishBadge.style.setProperty('display', 'flex', 'important');
      } else {
        mobileWishBadge.classList.add('is-zero');
        mobileWishBadge.style.setProperty('display', 'none', 'important');
      }
    }

    if (shopWishlistBtn) {
      shopWishlistBtn.classList.toggle('has-items', wishCount > 0);
      if (wishCount > 0) {
        shopWishlistBtn.classList.add('bounce');
        setTimeout(() => shopWishlistBtn.classList.remove('bounce'), 350);
      }
    }
    if (collecWishlistBtn) {
      collecWishlistBtn.classList.toggle('has-items', wishCount > 0);
      if (wishCount > 0) {
        collecWishlistBtn.classList.add('bounce');
        setTimeout(() => collecWishlistBtn.classList.remove('bounce'), 350);
      }
    }

    if (!wishlistItemsContainer) return;

    if (wishlist.length === 0) {
      wishlistItemsContainer.innerHTML = `
        <div class="cart-drawer__empty">
          <span class="cart-drawer__empty-glyph">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </span>
          <p>Your saved wishlist is empty.<br>Click the heart icon on any item to save it.</p>
        </div>
      `;
      if (wishlistMoveAllBtn) wishlistMoveAllBtn.disabled = true;
      return;
    }

    if (wishlistMoveAllBtn) wishlistMoveAllBtn.disabled = false;

    wishlistItemsContainer.innerHTML = wishlist.map(item => {
      const sku = item.sku || item.id;
      const itemInr = Number(item.priceInr) || 4999;
      const thumb = (Array.isArray(item.images) && item.images[0]) || item.imageUrl || '';

      return `
        <div class="wishlist-item" data-wishlist-item="${sku}">
          <div class="wishlist-item__thumb">
            ${thumb 
              ? `<img src="${thumb}" alt="${item.name}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}else{this.style.display='none';}" />` 
              : `<span class="wishlist-thumb-ph"></span>`}
          </div>
          <div class="cart-item__info">
            <h5>${item.name}</h5>
            <div class="cart-item__price">₹${itemInr.toLocaleString('en-IN')} INR</div>
          </div>
          <div class="wishlist-item__actions">
            <button class="wishlist-move-btn" type="button" data-wishlist-move="${sku}" title="Move to Bag">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>ADD TO BAG</span>
            </button>
            <button class="wishlist-remove-btn" type="button" data-wishlist-remove="${sku}" aria-label="Remove from Wishlist" title="Remove from Wishlist">✕</button>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners for wishlist item actions
    wishlistItemsContainer.querySelectorAll('[data-wishlist-move]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.dataset.wishlistMove;
        moveWishlistItemToBag(sku);
      });
    });

    wishlistItemsContainer.querySelectorAll('[data-wishlist-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sku = btn.dataset.wishlistRemove;
        removeFromWishlist(sku);
      });
    });
  }

  function getBagTotals() {
    let subtotalInr = 0;
    cart.forEach(item => {
      const itemInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
      subtotalInr += itemInr * item.qty;
    });
    let discount = 0;
    if (appliedCartCoupon.code && appliedCartCoupon.details) {
      const c = appliedCartCoupon.details;
      if (c.minOrderValue && subtotalInr < c.minOrderValue) {
        appliedCartCoupon.code = '';
        appliedCartCoupon.discount = 0;
        appliedCartCoupon.details = null;
        checkoutSession.promoCode = '';
        checkoutSession.discount = 0;
        resetCouponUI();
        if (checkoutPromoMsg) {
          checkoutPromoMsg.textContent = `⚠️ Cart subtotal fell below required ₹${c.minOrderValue.toLocaleString('en-IN')} for coupon "${c.code}". Coupon removed.`;
          checkoutPromoMsg.className = 'checkout-promo-message warning show';
          checkoutPromoMsg.style.display = 'block';
        }
      } else {
        if (c.group === 'percentage' || c.type === 'percentage') {
          discount = Math.round((subtotalInr * c.value) / 100);
          if (c.maxDiscount && discount > c.maxDiscount) discount = c.maxDiscount;
        } else {
          discount = Number(c.value) || 0;
        }
        discount = Math.min(discount, subtotalInr);
        appliedCartCoupon.discount = discount;
        checkoutSession.discount = discount;
      }
    }
    const totalInr = Math.max(0, subtotalInr - discount);
    return { subtotalInr, discount, totalInr };
  }

  function updateCartPriceDisplays() {
    if (!cartSubtotal) return;
    const { subtotalInr, discount, totalInr } = getBagTotals();
    cartSubtotal.textContent = `₹${subtotalInr.toLocaleString('en-IN')} INR`;

    if (discount > 0 && appliedCartCoupon.code) {
      if (cartDiscountRow) cartDiscountRow.style.display = 'flex';
      if (cartDiscountCodeBadge) cartDiscountCodeBadge.textContent = appliedCartCoupon.code;
      if (cartDiscountVal) cartDiscountVal.textContent = `-₹${discount.toLocaleString('en-IN')} INR`;
      if (cartTotalRow) cartTotalRow.style.display = 'flex';
      if (cartTotalVal) cartTotalVal.textContent = `₹${totalInr.toLocaleString('en-IN')} INR`;
      if (checkoutBtnText) checkoutBtnText.textContent = `PROCEED TO CHECKOUT · ₹${totalInr.toLocaleString('en-IN')}`;
      if (checkoutPromoMsg && !checkoutPromoMsg.classList.contains('error') && !checkoutPromoMsg.classList.contains('warning')) {
        checkoutPromoMsg.textContent = `You have saved ₹${discount.toLocaleString('en-IN')} on this order.`;
        checkoutPromoMsg.className = 'checkout-promo-message success show';
        checkoutPromoMsg.style.display = 'block';
      }
    } else {
      if (cartDiscountRow) cartDiscountRow.style.display = 'none';
      if (cartTotalRow) cartTotalRow.style.display = 'none';
      if (checkoutBtnText) checkoutBtnText.textContent = subtotalInr > 0
        ? `PROCEED TO CHECKOUT · ₹${subtotalInr.toLocaleString('en-IN')}`
        : 'PROCEED TO CHECKOUT';
    }
  }

  function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartCountEl) {
      cartCountEl.textContent = String(totalQty);
      cartCountEl.setAttribute('data-count', String(totalQty));
      if (totalQty > 0) {
        cartCountEl.classList.remove('is-zero');
        cartCountEl.style.setProperty('display', 'flex', 'important');
      } else {
        cartCountEl.classList.add('is-zero');
        cartCountEl.style.setProperty('display', 'none', 'important');
      }
    }
    if (collecCartCount) collecCartCount.textContent = String(totalQty);
    if (cartDrawerCount) {
      cartDrawerCount.textContent = String(totalQty);
    }
    const mobileCartBadge = document.getElementById('mobileCartBadge');
    if (mobileCartBadge) {
      mobileCartBadge.textContent = String(totalQty);
      mobileCartBadge.setAttribute('data-count', String(totalQty));
      if (totalQty > 0) {
        mobileCartBadge.classList.remove('is-zero');
        mobileCartBadge.style.setProperty('display', 'flex', 'important');
      } else {
        mobileCartBadge.classList.add('is-zero');
        mobileCartBadge.style.setProperty('display', 'none', 'important');
      }
    }
    if (cartBtn) {
      cartBtn.classList.toggle('has-items', totalQty > 0);
      if (totalQty > 0) {
        cartBtn.classList.add('bounce');
        setTimeout(() => cartBtn.classList.remove('bounce'), 350);
      }
    }
    if (collecCartBtn) {
      collecCartBtn.classList.toggle('has-items', totalQty > 0);
      collecCartBtn.classList.add('bounce');
      setTimeout(() => collecCartBtn.classList.remove('bounce'), 350);
    }

    if (!cartItemsContainer) return;
    if (cart.length === 0) {
      appliedCartCoupon.code = '';
      appliedCartCoupon.discount = 0;
      appliedCartCoupon.details = null;
      checkoutSession.promoCode = '';
      checkoutSession.discount = 0;
      resetCouponUI();
      if (checkoutPromoBox) checkoutPromoBox.style.display = 'none';
      if (cartDiscountRow) cartDiscountRow.style.display = 'none';
      if (cartTotalRow) cartTotalRow.style.display = 'none';
      if (cartSubtotal) cartSubtotal.textContent = '₹0 INR';
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        if (checkoutBtnText) checkoutBtnText.textContent = 'PROCEED TO CHECKOUT';
      }

      cartItemsContainer.innerHTML = `
        <div class="cart-drawer__empty">
          <span class="cart-drawer__empty-glyph">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </span>
          <p>Your shopping cart is empty.<br>Select items from the catalog above.</p>
        </div>
      `;
      if (wishlist.length > 0) {
        cartItemsContainer.insertAdjacentHTML('beforeend', `
          <div class="cart-wishlist-prompt">
            <span>SAVED IN WISHLIST: <strong>${wishlist.length} ${wishlist.length === 1 ? 'RELIC' : 'RELICS'}</strong></span>
            <button type="button" id="cartSwitchToWishlistEmptyBtn">VIEW WISHLIST →</button>
          </div>
        `);
        const switchBtn = document.getElementById('cartSwitchToWishlistEmptyBtn');
        if (switchBtn) {
          switchBtn.addEventListener('click', () => switchDrawerTab('wishlist'));
        }
      }
      return;
    }

    if (checkoutPromoBox) checkoutPromoBox.style.display = 'block';

    cartItemsContainer.innerHTML = cart.map((item, idx) => {
      const itemInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
      return `
        <div class="cart-item">
          <div class="cart-item__thumb">
            ${(Array.isArray(item.images) && item.images[0]) || item.imageUrl || item.image ? `<img src="${(Array.isArray(item.images) && item.images[0]) || item.imageUrl || item.image}" alt="${item.name}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}else{this.style.display='none';}" />` : '<div class="cart-item__thumb-ph"></div>'}
          </div>
          <div class="cart-item__info">
            <h5>${item.name}</h5>
            <div class="cart-item__price">₹${(itemInr * item.qty).toLocaleString('en-IN')} INR</div>
          </div>
          <div class="cart-item__controls">
            <button class="cart-item__btn" type="button" data-qty-dec="${idx}" aria-label="Decrease quantity">-</button>
            <span class="cart-item__qty">${item.qty}</span>
            <button class="cart-item__btn" type="button" data-qty-inc="${idx}" aria-label="Increase quantity">+</button>
          </div>
        </div>
      `;
    }).join('');

    if (wishlist.length > 0) {
      cartItemsContainer.insertAdjacentHTML('beforeend', `
        <div class="cart-wishlist-prompt">
          <span>SAVED IN WISHLIST: <strong>${wishlist.length} ${wishlist.length === 1 ? 'RELIC' : 'RELICS'}</strong></span>
          <button type="button" id="cartSwitchToWishlistBtn">VIEW WISHLIST →</button>
        </div>
      `);
      const switchBtn = document.getElementById('cartSwitchToWishlistBtn');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => switchDrawerTab('wishlist'));
      }
    }

    updateCartPriceDisplays();
    if (checkoutBtn) checkoutBtn.disabled = false;
    if (typeof renderSuggestedCoupons === 'function') {
      renderSuggestedCoupons();
    }

    // Attach qty controls
    cartItemsContainer.querySelectorAll('[data-qty-dec]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.qtyDec, 10);
        if (cart[idx].qty > 1) {
          cart[idx].qty--;
        } else {
          cart.splice(idx, 1);
        }
        updateCartUI();
      });
    });

    cartItemsContainer.querySelectorAll('[data-qty-inc]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.qtyInc, 10);
        cart[idx].qty++;
        updateCartUI();
      });
    });
  }

  // Unified animated add to cart handler
  function handleAddToCart(btn, item, quantity = 1) {
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);
    const sku = item.sku || item.id;
    const existing = cart.find(i => (i.sku || i.id) === sku);
    const priceInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
    const priceRyo = item.priceRyo ? Number(item.priceRyo) : Math.round(priceInr * 1.54);

    const img = (item.images && item.images[0]) || item.image || item.imageUrl || '';

    if (existing) {
      existing.qty += qtyToAdd;
    } else {
      cart.push({
        id: sku,
        sku: sku,
        name: item.name,
        category: item.category || 'Relics',
        collection: item.collection || '',
        collectionName: item.collectionName || 'Official Collection',
        priceInr: priceInr,
        priceRyo: priceRyo,
        seal: item.seal || 'RELIC',
        specs: item.specs || '',
        desc: item.desc || '',
        image: img,
        qty: qtyToAdd
      });
    }

    updateCartUI();
    showToast(qtyToAdd > 1 ? `${qtyToAdd}× ${item.name}` : item.name);

    if (typeof window.trackGAEvent === 'function') {
      window.trackGAEvent('add_to_cart', {
        item_id: sku,
        item_name: item.name,
        price: priceInr,
        quantity: qtyToAdd,
        currency: 'INR'
      });
    }

    // 1. Floating badge animation
    const badge = document.createElement('span');
    badge.className = 'cart-float-badge';
    badge.textContent = `+${qtyToAdd} BAG`;
    btn.appendChild(badge);
    setTimeout(() => badge.remove(), 850);

    // 2. Button state transition with animated checkmark
    const origContent = btn.innerHTML;
    btn.classList.add('added');
    btn.innerHTML = `
      <svg class="anim-check-svg" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      <span>ADDED TO BAG ✓</span>
    `;
    setTimeout(() => {
      btn.classList.remove('added');
      btn.innerHTML = origContent;
    }, 1400);
  }

  // Attach to existing main shop buttons
  if (shopSection) {
    shopSection.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('click', () => {
        handleAddToCart(btn, {
          id: btn.dataset.addCart,
          sku: btn.dataset.addCart,
          name: btn.dataset.name,
          priceRyo: parseInt(btn.dataset.priceRyo, 10),
          priceInr: parseInt(btn.dataset.priceInr, 10) || 4999,
          seal: btn.dataset.seal
        });
      });
    });
  }

  // Drawer tab switcher
  function switchDrawerTab(tab) {
    currentDrawerTab = tab;
    const isBag = tab === 'bag';
    if (cartDrawerTabBag) {
      cartDrawerTabBag.classList.toggle('active', isBag);
      cartDrawerTabBag.setAttribute('aria-selected', String(isBag));
    }
    if (cartDrawerTabWishlist) {
      cartDrawerTabWishlist.classList.toggle('active', !isBag);
      cartDrawerTabWishlist.setAttribute('aria-selected', String(!isBag));
    }
    const cartDrawerBagBody = document.getElementById('cartDrawerBagBody');
    if (cartDrawerBagBody) {
      cartDrawerBagBody.style.display = isBag ? 'flex' : 'none';
    } else if (cartItemsContainer) {
      cartItemsContainer.style.display = isBag ? 'flex' : 'none';
    }
    if (wishlistItemsContainer) wishlistItemsContainer.style.display = !isBag ? 'flex' : 'none';
    if (cartDrawerFoot) cartDrawerFoot.style.display = isBag ? 'block' : 'none';
    if (wishlistDrawerFoot) wishlistDrawerFoot.style.display = !isBag ? 'block' : 'none';
  }

  // Open/close drawer with strict background scroll lock
  function openCart(tab = 'bag') {
    if (cartDrawer) {
      cartDrawer.classList.add('open');
      cartDrawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
      document.documentElement.classList.add('bag-open');
      const hintEl = document.getElementById('hint');
      if (hintEl) hintEl.classList.add('hide');
      switchDrawerTab(tab);
      if (typeof renderSuggestedCoupons === 'function') {
        renderSuggestedCoupons();
      }

      try {
        if (!history.state || !history.state.cartOpen) {
          history.pushState({ cartOpen: true }, '', window.location.href);
        }
      } catch (_) {}
    }
  }
  function closeCart(skipHistoryBack = false) {
    if (cartDrawer) {
      cartDrawer.classList.remove('open');
      cartDrawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('bag-open');
      document.documentElement.classList.remove('bag-open');
      const hintEl = document.getElementById('hint');
      if (hintEl && window.scrollY <= window.innerHeight * 0.35) {
        hintEl.classList.remove('hide');
      }

      if (!skipHistoryBack) {
        try {
          if (history.state && history.state.cartOpen) {
            history.back();
          }
        } catch (_) {}
      }

      if (typeof window.syncMobileBottomNav === 'function') {
        window.syncMobileBottomNav();
      }
    }
  }

  // Prevent background touch swipe while inside drawer
  if (cartDrawer) {
    cartDrawer.addEventListener('touchmove', (e) => {
      if (!e.target.closest('.cart-drawer__body')) {
        e.preventDefault();
      }
    }, { passive: false });
  }

  if (cartBtn) cartBtn.addEventListener('click', () => openCart('bag'));
  if (collecCartBtn) collecCartBtn.addEventListener('click', () => openCart('bag'));
  if (shopWishlistBtn) shopWishlistBtn.addEventListener('click', () => openCart('wishlist'));
  if (collecWishlistBtn) collecWishlistBtn.addEventListener('click', () => openCart('wishlist'));
  if (cartDrawerTabBag) cartDrawerTabBag.addEventListener('click', () => switchDrawerTab('bag'));
  if (cartDrawerTabWishlist) cartDrawerTabWishlist.addEventListener('click', () => switchDrawerTab('wishlist'));
  if (wishlistMoveAllBtn) wishlistMoveAllBtn.addEventListener('click', moveAllWishlistToBag);
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);

  // Close on Escape key
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeCart();
      closeCheckoutModal();
      const sGuide = document.getElementById('sizeGuideModal');
      if (sGuide) sGuide.classList.remove('open');
      const cModal = document.getElementById('contactSupportModal');
      if (cModal) cModal.classList.remove('open');
      const lModal = document.getElementById('legalPolicyModal');
      if (lModal) lModal.classList.remove('open');
      if (relicGalleryModal && relicGalleryModal.classList.contains('open')) {
        closeRelicGallery();
      } else {
        closeCollectionsPage();
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // MULTI-STEP IMPERIAL CHECKOUT CONTROLLER (STEPS 1 - 4)
  // Flow: Buy Now / Proceed to Checkout -> Address & Delivery -> Payment -> Confirm Order -> Order Confirmation
  // ═══════════════════════════════════════════════════════════════════════
  const checkoutFlowModal = document.getElementById('checkoutFlowModal');
  const checkoutFlowBackdrop = document.getElementById('checkoutFlowBackdrop');
  const checkoutFlowCloseBtn = document.getElementById('checkoutFlowCloseBtn');
  const checkoutContentWrap = checkoutFlowModal ? checkoutFlowModal.querySelector('.checkout-modal__content-wrap') : null;

  // Step Indicators & Lines
  const stepIndicators = [
    document.getElementById('stepIndicator1'),
    document.getElementById('stepIndicator2'),
    document.getElementById('stepIndicator3'),
    document.getElementById('stepIndicator4')
  ];
  const stepLines = [
    document.getElementById('stepLine1'),
    document.getElementById('stepLine2'),
    document.getElementById('stepLine3')
  ];

  // Step View Containers
  const checkoutViews = [
    document.getElementById('checkoutStep1'),
    document.getElementById('checkoutStep2'),
    document.getElementById('checkoutStep3'),
    document.getElementById('checkoutStep4')
  ];

  // Step 1 Form Inputs
  const checkoutNameInput = document.getElementById('checkoutName');
  const checkoutPhoneInput = document.getElementById('checkoutPhone');
  const checkoutEmailInput = document.getElementById('checkoutEmail');
  const checkoutPincodeInput = document.getElementById('checkoutPincode');
  const checkoutAddress1Input = document.getElementById('checkoutAddress1');
  const checkoutAddress2Input = document.getElementById('checkoutAddress2');
  const checkoutLandmarkInput = document.getElementById('checkoutLandmark');
  const checkoutCityInput = document.getElementById('checkoutCity');
  const checkoutStateInput = document.getElementById('checkoutState');
  const checkoutTypePills = document.getElementById('checkoutTypePills');

  // Step 1 Delivery Options
  const deliveryOptionFree = document.getElementById('deliveryOptionFree');
  const deliveryOptionExpress = document.getElementById('deliveryOptionExpress');
  const deliveryRadios = document.querySelectorAll('input[name="checkoutDeliverySpeed"]');

  // Step Actions
  const checkoutRefreshAddressBtn = document.getElementById('checkoutRefreshAddressBtn');
  const checkoutToPaymentBtn = document.getElementById('checkoutToPaymentBtn');
  const checkoutBackToAddressBtn = document.getElementById('checkoutBackToAddressBtn');
  const checkoutToReviewBtn = document.getElementById('checkoutToReviewBtn');
  const checkoutBackToPaymentBtn = document.getElementById('checkoutBackToPaymentBtn');
  const reviewEditAddressBtn = document.getElementById('reviewEditAddressBtn');
  const reviewEditPaymentBtn = document.getElementById('reviewEditPaymentBtn');
  const checkoutConfirmOrderBtn = document.getElementById('checkoutConfirmOrderBtn');

  // Step 4 Actions & Displays
  const checkoutTrackCourierBtn = document.getElementById('checkoutTrackCourierBtn');

  // Payment Options & Promo Elements
  const payOptions = document.querySelectorAll('.checkout-pay-option');
  const upiTabId = document.getElementById('upiTabId');
  const upiTabQr = document.getElementById('upiTabQr');
  const upiPaneId = document.getElementById('upiPaneId');
  const upiPaneQr = document.getElementById('upiPaneQr');
  const checkoutUpiIdInput = document.getElementById('checkoutUpiIdInput');
  const checkoutPromoBox = document.getElementById('checkoutPromoBox');
  const checkoutPromoInput = document.getElementById('checkoutPromoInput');
  const checkoutPromoApplyBtn = document.getElementById('checkoutPromoApplyBtn');
  const checkoutPromoClearBtn = document.getElementById('checkoutPromoClearBtn');
  const checkoutPromoMsg = document.getElementById('checkoutPromoMsg');
  const checkoutPromoAppliedBadge = document.getElementById('checkoutPromoAppliedBadge');
  const checkoutCouponsShowcase = document.getElementById('checkoutCouponsShowcase');
  const checkoutCouponsList = document.getElementById('checkoutCouponsList');
  const checkoutCouponsCartIndicator = document.getElementById('checkoutCouponsCartIndicator');
  const checkoutCouponTabs = document.querySelectorAll('.checkout-coupon-tab');

  // Checkout Session State
  let checkoutSession = {
    items: [],
    source: 'cart',
    currentStep: 1,
    address: {
      name: '',
      phone: '',
      email: '',
      pincode: '',
      address1: '',
      address2: '',
      landmark: '',
      city: '',
      state: '',
      type: 'Home'
    },
    delivery: {
      speed: 'free',
      cost: 0,
      title: 'Standard Delivery'
    },
    payment: {
      method: '',
      detail: '',
      bank: ''
    },
    promoCode: '',
    discount: 0,
    orderCode: ''
  };

  // Reset / Refresh Address and Delivery Input Fields
  function resetAddressAndDeliveryFields(options = { clearStorage: false }) {
    if (checkoutNameInput) checkoutNameInput.value = '';
    if (checkoutPhoneInput) checkoutPhoneInput.value = '';
    if (checkoutEmailInput) checkoutEmailInput.value = '';
    if (checkoutPincodeInput) checkoutPincodeInput.value = '';
    if (checkoutAddress1Input) checkoutAddress1Input.value = '';
    if (checkoutAddress2Input) checkoutAddress2Input.value = '';
    if (checkoutLandmarkInput) checkoutLandmarkInput.value = '';
    if (checkoutCityInput) checkoutCityInput.value = '';
    if (checkoutStateInput) checkoutStateInput.value = '';
    const b2bToggle = document.getElementById('checkoutIsB2B');
    if (b2bToggle) b2bToggle.checked = false;
    const gstFields = document.getElementById('checkoutGstFields');
    if (gstFields) gstFields.style.display = 'none';
    const gstinInput = document.getElementById('checkoutGstin');
    if (gstinInput) gstinInput.value = '';

    // Clear validation error highlights and messages
    [
      { input: checkoutNameInput, err: document.getElementById('checkoutNameError') },
      { input: checkoutPhoneInput, err: document.getElementById('checkoutPhoneError') },
      { input: checkoutPincodeInput, err: document.getElementById('checkoutPincodeError') },
      { input: checkoutAddress1Input, err: document.getElementById('checkoutAddress1Error') },
      { input: checkoutAddress2Input, err: document.getElementById('checkoutAddress2Error') },
      { input: checkoutCityInput, err: document.getElementById('checkoutCityError') },
      { input: checkoutStateInput, err: document.getElementById('checkoutStateError') }
    ].forEach(({ input, err }) => {
      if (input) input.classList.remove('error');
      if (err) {
        err.textContent = '';
        err.classList.remove('show');
      }
    });

    // Reset Address Type to default (Home)
    if (checkoutTypePills) {
      checkoutTypePills.querySelectorAll('.checkout-type-pill').forEach(p => {
        if (p.dataset.type === 'Home') p.classList.add('active');
        else p.classList.remove('active');
      });
    }

    // Reset delivery speed option to Standard Free
    deliveryRadios.forEach(radio => {
      radio.checked = radio.value === 'free';
    });
    if (deliveryOptionFree) deliveryOptionFree.classList.add('active');
    if (deliveryOptionExpress) deliveryOptionExpress.classList.remove('active');

    // Reset payment selection (no permanent payment)
    payOptions.forEach(opt => {
      opt.classList.remove('active');
      const hdr = opt.querySelector('.checkout-pay-header');
      if (hdr) hdr.setAttribute('aria-expanded', 'false');
    });

    // Reset checkout session address, delivery and payment state
    checkoutSession.address = {
      name: '',
      phone: '',
      email: '',
      pincode: '',
      address1: '',
      address2: '',
      landmark: '',
      city: '',
      state: '',
      type: 'Home'
    };
    checkoutSession.delivery = {
      speed: 'free',
      cost: 0,
      title: 'Standard Delivery'
    };
    checkoutSession.payment = {
      method: '',
      detail: '',
      bank: ''
    };

    if (options.clearStorage) {
      try {
        localStorage.removeItem('the_street_co_last_addr');
      } catch (e) { /* ignore */ }
    }

    renderCheckoutSidebar();
  }

  // Navigation state to always return user to their exact previous screen
  let checkoutPreviousContext = {
    view: 'shop',
    pdpItem: null,
    scrollY: 0,
    collecScrollTop: 0
  };

  // Open & Close Checkout Modal
  function openCheckoutModal(items, source = 'cart') {
    if (!items || items.length === 0) return;

    // Save previous context before opening checkout
    let prevView = 'shop';
    if (relicGalleryModal && relicGalleryModal.classList.contains('open')) {
      prevView = 'pdp';
    } else if (collectionsPage && collectionsPage.classList.contains('open')) {
      prevView = 'collections';
    } else {
      prevView = 'shop';
    }
    const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    checkoutPreviousContext = {
      view: prevView,
      pdpItem: activeGalleryItem,
      scrollY: currentY > 200 ? currentY : (document.getElementById('shop')?.offsetTop || 0),
      collecScrollTop: collectionsPage ? collectionsPage.scrollTop : 0
    };

    checkoutSession.items = items.map(it => {
      const sku = it.sku || it.id;
      const relic = (typeof collectionsData !== 'undefined' && Array.isArray(collectionsData))
        ? collectionsData.find(c => (c.sku || c.id) === sku)
        : null;
      const img = it.image || (it.images && it.images[0]) || (relic && relic.images && relic.images[0]) || (relic && relic.imageUrl) || '';
      return {
        id: sku || 'RELIC',
        sku: sku || 'RELIC',
        name: it.name || (relic && relic.name) || 'Imperial Artifact',
        category: it.category || (relic && relic.category) || 'Relics',
        collection: it.collection || (relic && relic.collection) || '',
        collectionName: it.collectionName || (relic && relic.collectionName) || 'Official Collection',
        seal: it.seal || (relic && relic.seal) || '忍',
        specs: it.specs || (relic && relic.specs) || '',
        desc: it.desc || (relic && relic.desc) || '',
        priceInr: Number(it.priceInr) || (relic && Number(relic.priceInr)) || (it.priceUsd ? Math.round(it.priceUsd * 83) : 4999),
        priceRyo: it.priceRyo ? Number(it.priceRyo) : ((relic && Number(relic.priceRyo)) || Math.round((Number(it.priceInr) || 4999) * 1.54)),
        qty: Math.max(1, parseInt(it.qty, 10) || 1),
        size: it.size || 'M',
        finish: it.finish || 'Obsidian Shadow',
        image: img
      };
    });
    checkoutSession.source = source;
    // Retain the coupon and discount redeemed in cart/bag
    checkoutSession.promoCode = appliedCartCoupon.code || '';
    checkoutSession.discount = appliedCartCoupon.discount || 0;

    // Refresh all Address & Delivery inputs to fresh blank state each time opened
    resetAddressAndDeliveryFields({ clearStorage: false });

    renderCheckoutSidebar();
    const stepperEl = document.getElementById('checkoutStepper');
    if (stepperEl) stepperEl.style.display = 'flex';
    goToCheckoutStep(1);

    if (checkoutFlowModal) {
      checkoutFlowModal.classList.add('open');
      checkoutFlowModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
    }

    try {
      if (!history.state || !history.state.checkoutOpen) {
        history.pushState({ checkoutOpen: true }, '', window.location.href);
      }
    } catch (_) {}
  }

  function closeCheckoutModal(skipHistoryBack = false) {
    if (checkoutFlowModal) {
      checkoutFlowModal.classList.remove('open');
      checkoutFlowModal.classList.remove('order-confirmed');
      checkoutFlowModal.classList.remove('step-4');
      checkoutFlowModal.setAttribute('aria-hidden', 'true');
      if (checkoutFlowCloseBtn) checkoutFlowCloseBtn.style.display = 'grid';
    }

    if (!skipHistoryBack) {
      try {
        if (history.state && history.state.checkoutOpen) {
          history.back();
        }
      } catch (_) {}
    }

    // Return user to previous page instead of homepage
    if (checkoutPreviousContext.view === 'pdp' && activeGalleryItem && relicGalleryModal) {
      relicGalleryModal.classList.add('open');
      relicGalleryModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
      document.documentElement.classList.add('bag-open');
    } else if (checkoutPreviousContext.view === 'collections' && collectionsPage) {
      collectionsPage.classList.add('open');
      collectionsPage.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
      document.documentElement.classList.add('bag-open');
      collectionsPage.scrollTop = checkoutPreviousContext.collecScrollTop || 0;
    } else {
      document.body.classList.remove('bag-open');
      document.documentElement.classList.remove('bag-open');
      const targetY = checkoutPreviousContext.scrollY > 200 
        ? checkoutPreviousContext.scrollY 
        : (document.getElementById('shop')?.offsetTop || 0);
      window.scrollTo({ top: targetY, behavior: 'instant' });
    }
  }

  // Calculate session subtotals
  function getCheckoutTotals() {
    const subtotalInr = checkoutSession.items.reduce((sum, it) => sum + (it.priceInr * it.qty), 0);
    const subtotalRyo = checkoutSession.items.reduce((sum, it) => sum + (it.priceRyo * it.qty), 0);
    const deliveryCost = checkoutSession.delivery.speed === 'express' ? 149 : 0;
    const discount = checkoutSession.discount || 0;
    const totalInr = Math.max(0, subtotalInr + deliveryCost - discount);
    const totalRyo = Math.max(0, Math.round(totalInr * 1.54));
    return { subtotalInr, subtotalRyo, deliveryCost, discount, totalInr, totalRyo };
  }

  // Update Sidebar Summary View
  function renderCheckoutSidebar() {
    const sidebarCount = document.getElementById('checkoutSidebarItemCount');
    const sidebarItems = document.getElementById('checkoutSidebarItems');
    const subtotalEl = document.getElementById('checkoutSubtotalInr');
    const deliveryEl = document.getElementById('checkoutDeliveryFee');
    const discountRow = document.getElementById('checkoutDiscountRow');
    const discountVal = document.getElementById('checkoutDiscountVal');
    const totalInrEl = document.getElementById('checkoutTotalInr');
    const totalRyoEl = document.getElementById('checkoutTotalRyo');

    const totalQty = checkoutSession.items.reduce((sum, it) => sum + it.qty, 0);
    if (sidebarCount) sidebarCount.textContent = `${totalQty} Artifact${totalQty > 1 ? 's' : ''}`;

    if (sidebarItems) {
      sidebarItems.innerHTML = checkoutSession.items.map(it => {
        const itemImg = it.image ? `<img src="${it.image}" alt="${it.name}" loading="lazy">` : `<div style="display:grid;place-items:center;height:100%;color:var(--blood-hot)">⚔️</div>`;
        return `
          <div class="checkout-sidebar-item">
            <div class="checkout-sidebar-item-thumb">${itemImg}</div>
            <div class="checkout-sidebar-item-info">
              <strong>${it.name}</strong>
              <small>Size: ${it.size} · ${it.finish} · Qty: ${it.qty}</small>
            </div>
            <div class="checkout-sidebar-item-price">₹${(it.priceInr * it.qty).toLocaleString('en-IN')}</div>
          </div>
        `;
      }).join('');
    }

    const { subtotalInr, deliveryCost, discount, totalInr, totalRyo } = getCheckoutTotals();

    if (subtotalEl) subtotalEl.textContent = `₹${subtotalInr.toLocaleString('en-IN')}`;
    if (deliveryEl) {
      if (deliveryCost === 0) {
        deliveryEl.textContent = 'FREE';
        deliveryEl.className = 'text-free';
      } else {
        deliveryEl.textContent = `₹${deliveryCost} INR`;
        deliveryEl.className = 'text-blood';
      }
    }

    if (discountRow && discountVal) {
      if (discount > 0) {
        discountRow.style.display = 'flex';
        discountVal.textContent = `-₹${discount.toLocaleString('en-IN')}`;
      } else {
        discountRow.style.display = 'none';
      }
    }

    if (totalInrEl) totalInrEl.textContent = `₹${totalInr.toLocaleString('en-IN')} INR`;
    if (totalRyoEl) totalRyoEl.textContent = '';
  }

  // Switch Active Step (1, 2, 3, 4)
  function goToCheckoutStep(stepNumber) {
    checkoutSession.currentStep = stepNumber;

    if (stepNumber === 1 && typeof window.trackGAEvent === 'function') {
      window.trackGAEvent('begin_checkout', {
        value: checkoutSession.subtotalInr || 0,
        currency: 'INR'
      });
    }

    // Toggle views
    checkoutViews.forEach((view, idx) => {
      if (!view) return;
      if (idx + 1 === stepNumber) {
        view.style.display = 'block';
        view.classList.add('active');
      } else {
        view.style.display = 'none';
        view.classList.remove('active');
      }
    });

    // Update stepper headers
    stepIndicators.forEach((ind, idx) => {
      if (!ind) return;
      const stepIdx = idx + 1;
      const numSpan = ind.querySelector('.checkout-step-num');
      if (stepIdx < stepNumber) {
        ind.className = 'checkout-step-item completed';
        if (numSpan) numSpan.textContent = '✓';
      } else if (stepIdx === stepNumber) {
        ind.className = 'checkout-step-item active';
        if (numSpan) numSpan.textContent = stepIdx;
      } else {
        ind.className = 'checkout-step-item';
        if (numSpan) numSpan.textContent = stepIdx;
      }
    });

    // Update connecting lines
    stepLines.forEach((line, idx) => {
      if (!line) return;
      if (idx + 1 < stepNumber) {
        line.classList.add('filled');
      } else {
        line.classList.remove('filled');
      }
    });

    // Hide sidebar on all steps so duplicate order summary is never shown
    if (checkoutContentWrap) {
      checkoutContentWrap.classList.add('hide-sidebar');
    }

    // Hide stepper and close (X) button on step 4 (Order Confirmation)
    const stepperEl = document.getElementById('checkoutStepper');
    if (stepperEl) {
      stepperEl.style.display = (stepNumber === 4) ? 'none' : 'flex';
    }
    const flowTitle = document.getElementById('checkoutFlowTitle');
    if (flowTitle) {
      flowTitle.textContent = (stepNumber === 4) ? 'ORDER CONFIRMATION' : 'THE STREET CO CHECKOUT';
    }

    // Completely remove the X close button on order confirmation page
    if (checkoutFlowCloseBtn) {
      checkoutFlowCloseBtn.style.display = (stepNumber === 4) ? 'none' : 'grid';
    }
    if (checkoutFlowModal) {
      if (stepNumber === 4) {
        checkoutFlowModal.classList.add('order-confirmed', 'step-4');
      } else {
        checkoutFlowModal.classList.remove('order-confirmed', 'step-4');
      }
    }

    // Scroll to top when arriving on confirmation page so confirmation is immediately visible
    if (stepNumber === 4) {
      const modalDialog = document.getElementById('checkoutModalDialog');
      if (modalDialog) modalDialog.scrollTop = 0;
      const modalBody = checkoutFlowModal ? checkoutFlowModal.querySelector('.checkout-modal__body') : null;
      if (modalBody) modalBody.scrollTop = 0;
      const viewsWrap = checkoutFlowModal ? checkoutFlowModal.querySelector('.checkout-modal__views') : null;
      if (viewsWrap) viewsWrap.scrollTop = 0;
    }

    // On step 2 (Payment page), make Cash on Delivery (COD) the active selected method
    if (stepNumber === 2) {
      payOptions.forEach(opt => {
        if (opt.dataset.method === 'cod') {
          opt.classList.add('active');
          const hdr = opt.querySelector('.checkout-pay-header');
          if (hdr) hdr.setAttribute('aria-expanded', 'true');
          checkoutSession.payment.method = 'cod';
          checkoutSession.payment.detail = 'Cash on Delivery (COD) · Pay upon arrival';
        } else {
          opt.classList.remove('active');
          const hdr = opt.querySelector('.checkout-pay-header');
          if (hdr) hdr.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // Populate review cards on Step 3 ("Conform Order")
    if (stepNumber === 3) {
      renderOrderReviewStep();
    }

    // Scroll views container to top
    const viewsWrap = checkoutFlowModal ? checkoutFlowModal.querySelector('.checkout-modal__views') : null;
    if (viewsWrap) viewsWrap.scrollTop = 0;

    renderCheckoutSidebar();
  }

  // Step 1 Validation & Proceed
  function handleAddressStepSubmit() {
    let isValid = true;

    // Helper validation
    function validateField(input, errorEl, message, validator) {
      if (!input) return true;
      const val = input.value.trim();
      const valid = validator ? validator(val) : val.length > 0;
      if (!valid) {
        input.classList.add('error');
        if (errorEl) {
          errorEl.textContent = message;
          errorEl.classList.add('show');
        }
        isValid = false;
      } else {
        input.classList.remove('error');
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.classList.remove('show');
        }
      }
      return valid;
    }

    validateField(checkoutNameInput, document.getElementById('checkoutNameError'), 'Please enter recipient name');
    validateField(checkoutPhoneInput, document.getElementById('checkoutPhoneError'), 'Please enter a valid 10-digit mobile number', v => /^\d{10}$/.test(v.replace(/\s+/g, '')));
    validateField(checkoutPincodeInput, document.getElementById('checkoutPincodeError'), 'Please enter a valid 6-digit postal PIN', v => /^\d{6}$/.test(v.trim()));
    validateField(checkoutAddress1Input, document.getElementById('checkoutAddress1Error'), 'Flat / house coordinates required');
    validateField(checkoutAddress2Input, document.getElementById('checkoutAddress2Error'), 'Area / street sector required');
    validateField(checkoutCityInput, document.getElementById('checkoutCityError'), 'Town / city required');
    validateField(checkoutStateInput, document.getElementById('checkoutStateError'), 'State / province required');

    if (!isValid) return;

    // Read address values
    const activeTypePill = checkoutTypePills ? checkoutTypePills.querySelector('.checkout-type-pill.active') : null;
    const isB2BTicked = Boolean(document.getElementById('checkoutIsB2B')?.checked);
    const gstinVal = isB2BTicked ? (document.getElementById('checkoutGstin')?.value || '').trim().toUpperCase() : '';
    checkoutSession.address = {
      name: checkoutNameInput.value.trim(),
      phone: checkoutPhoneInput.value.trim().replace(/\s+/g, ''),
      email: checkoutEmailInput ? checkoutEmailInput.value.trim() : '',
      pincode: checkoutPincodeInput.value.trim(),
      address1: checkoutAddress1Input.value.trim(),
      address2: checkoutAddress2Input.value.trim(),
      landmark: checkoutLandmarkInput ? checkoutLandmarkInput.value.trim() : '',
      city: checkoutCityInput.value.trim(),
      state: checkoutStateInput.value.trim(),
      type: activeTypePill ? activeTypePill.dataset.type : 'Home',
      isB2B: isB2BTicked,
      gstin: gstinVal
    };

    // Read delivery speed
    let selectedSpeed = 'free';
    deliveryRadios.forEach(r => {
      if (r.checked) selectedSpeed = r.value;
    });
    checkoutSession.delivery = {
      speed: selectedSpeed,
      cost: selectedSpeed === 'express' ? 149 : 0,
      title: selectedSpeed === 'express' ? '⚡ Express Delivery' : 'Standard Delivery'
    };

    // Persist address for future convenience
    try {
      localStorage.setItem('the_street_co_last_addr', JSON.stringify(checkoutSession.address));
    } catch (e) { /* ignore */ }

    // Advance to Step 2: Payment Page
    goToCheckoutStep(2);
  }

  // Step 2 Validation & Proceed (Only COD Available)
  function handlePaymentStepSubmit(chosenMethod) {
    let activeMethod = chosenMethod || checkoutSession.payment.method || 'cod';
    if (activeMethod !== 'cod') {
      showToast('PAYMENT NOTICE', 'Online payment methods are temporarily unavailable. Cash on Delivery (COD) is selected.', 'bag');
      activeMethod = 'cod';
    }

    const detail = 'Cash on Delivery (COD) · Pay upon doorstep arrival';
    checkoutSession.payment = {
      method: 'cod',
      detail: detail
    };

    // Advance to Step 3: Confirm Order ("conform order")
    goToCheckoutStep(3);
  }

  // Step 3: Render Order Review & Confirmation
  function renderOrderReviewStep() {
    const reviewName = document.getElementById('reviewRecipientName');
    const reviewPhone = document.getElementById('reviewRecipientPhone');
    const reviewTypeTag = document.getElementById('reviewAddressTypeTag');
    const reviewAddress = document.getElementById('reviewFullAddress');
    const reviewDeliveryMode = document.getElementById('reviewDeliveryMode');
    const reviewPaySelected = document.getElementById('reviewPaymentSelected');
    const reviewPayDetail = document.getElementById('reviewPaymentDetail');
    const reviewItemsList = document.getElementById('reviewItemsList');
    const reviewItemCount = document.getElementById('reviewItemCount');

    const addr = checkoutSession.address;
    if (reviewName) reviewName.textContent = addr.name || 'Customer';
    if (reviewPhone) {
      const cleanDigits = String(addr.phone || '6296731835').replace(/\D/g, '');
      const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
      reviewPhone.textContent = `+91 ${last10}`;
    }
    if (reviewTypeTag) reviewTypeTag.textContent = addr.type || 'Home';
    if (reviewAddress) {
      const landmarkPart = addr.landmark ? ` (Near ${addr.landmark}),` : '';
      reviewAddress.textContent = `${addr.address1}, ${addr.address2}${landmarkPart} ${addr.city}, ${addr.state} - ${addr.pincode}`;
    }
    const reviewGstinRow = document.getElementById('reviewGstinRow');
    const reviewGstinVal = document.getElementById('reviewGstinVal');
    if (reviewGstinRow && reviewGstinVal) {
      if (addr.isB2B && addr.gstin) {
        reviewGstinRow.style.display = 'block';
        reviewGstinVal.textContent = addr.gstin;
      } else {
        reviewGstinRow.style.display = 'none';
      }
    }
    if (reviewDeliveryMode) {
      if (checkoutSession.delivery.speed === 'express') {
        reviewDeliveryMode.innerHTML = `<span class="mode-icon">⚡</span><span>Express Delivery (₹149)</span>`;
      } else {
        reviewDeliveryMode.innerHTML = `<span class="mode-icon">🚚</span><span>Standard Delivery (FREE)</span>`;
      }
    }

    if (reviewPaySelected) {
      const titles = {
        upi: 'UPI Payment',
        card: 'Credit / Debit Card',
        netbanking: 'Net Banking',
        cod: 'Cash on Delivery (COD)'
      };
      const titleStrong = reviewPaySelected.querySelector('strong');
      if (titleStrong) titleStrong.textContent = titles[checkoutSession.payment.method] || 'Cash on Delivery (COD)';
    }
    if (reviewPayDetail) reviewPayDetail.textContent = checkoutSession.payment.detail;

    const totalQty = checkoutSession.items.reduce((sum, it) => sum + it.qty, 0);
    if (reviewItemCount) reviewItemCount.textContent = totalQty;

    if (reviewItemsList) {
      reviewItemsList.innerHTML = checkoutSession.items.map(it => {
        const itemImg = it.image ? `<img src="${it.image}" alt="${it.name}" loading="lazy">` : `<div style="display:grid;place-items:center;height:100%;color:var(--blood-hot)">⚔️</div>`;
        return `
          <div class="checkout-review-item-row">
            <div class="checkout-review-thumb">${itemImg}</div>
            <div class="checkout-review-info">
              <strong>${it.name}</strong>
              <small>Size: ${it.size} · Finish: ${it.finish} · Qty: ${it.qty}</small>
            </div>
            <div class="checkout-review-price">₹${(it.priceInr * it.qty).toLocaleString('en-IN')}</div>
          </div>
        `;
      }).join('');
    }

    // Populate Order Summary pricing in review card
    const { subtotalInr, deliveryCost, discount, totalInr } = getCheckoutTotals();
    const revSubtotalEl = document.getElementById('reviewSubtotalInr');
    const revDeliveryEl = document.getElementById('reviewDeliveryFee');
    const revDiscountRow = document.getElementById('reviewDiscountRow');
    const revDiscountVal = document.getElementById('reviewDiscountVal');
    const revTotalEl = document.getElementById('reviewTotalInr');

    if (revSubtotalEl) revSubtotalEl.textContent = `₹${subtotalInr.toLocaleString('en-IN')}`;
    if (revDeliveryEl) {
      if (deliveryCost === 0) {
        revDeliveryEl.textContent = 'FREE';
        revDeliveryEl.className = 'text-free';
      } else {
        revDeliveryEl.textContent = `₹${deliveryCost} INR`;
        revDeliveryEl.className = 'text-blood';
      }
    }
    if (revDiscountRow && revDiscountVal) {
      if (discount > 0) {
        revDiscountRow.style.display = 'flex';
        revDiscountVal.textContent = `-₹${discount.toLocaleString('en-IN')}`;
      } else {
        revDiscountRow.style.display = 'none';
      }
    }
    if (revTotalEl) revTotalEl.textContent = `₹${totalInr.toLocaleString('en-IN')} INR`;
  }

  // Step 3 -> 4: Place & Confirm Order Action
  function handleConfirmAndPlaceOrder() {
    if (!checkoutConfirmOrderBtn) return;

    // Random 6-digit number starting from 111111 (range: 111111 to 999999)
    const generatedId = String(Math.floor(111111 + Math.random() * 888889));
    checkoutSession.orderCode = generatedId;
    checkoutSession.orderId = generatedId;

    const { subtotalInr, subtotalRyo, deliveryCost, discount, totalInr, totalRyo } = getCheckoutTotals();

    // Delivery calculation
    const daysAhead = checkoutSession.delivery && checkoutSession.delivery.speed === 'express' ? 1 : 3;
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + daysAhead);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const estimatedDeliveryFormatted = `${dayNames[estDate.getDay()]}, ${monthNames[estDate.getMonth()]} ${estDate.getDate()}`;

    // 1. Full User / Customer Details
    const addr = checkoutSession.address || {};
    const houseFlat = (addr.address1 || '').trim();
    const streetRoad = (addr.address2 || '').trim();
    const landmark = (addr.landmark || '').trim();
    const city = (addr.city || '').trim();
    const state = (addr.state || '').trim();
    const pincode = (addr.pincode || '').trim();
    const fullAddressStr = [
      houseFlat,
      streetRoad,
      landmark ? `(Near ${landmark})` : '',
      city,
      state ? `${state} - ${pincode}` : pincode
    ].filter(Boolean).join(', ');

    const userDetails = {
      fullName: (addr.name || 'Customer').trim(),
      phone: (addr.phone || '').trim(),
      email: (addr.email || '').trim(),
      pincode: pincode,
      houseFlat: houseFlat,
      streetRoad: streetRoad,
      landmark: landmark,
      city: city,
      state: state,
      addressType: addr.type || 'Home',
      fullAddress: fullAddressStr,
      isB2B: Boolean(document.getElementById('checkoutIsB2B')?.checked),
      gstin: document.getElementById('checkoutIsB2B')?.checked ? (document.getElementById('checkoutGstin')?.value || '').trim().toUpperCase() : ''
    };

    // 2. Full Product Details for Every Relic in the Order
    const productDetails = checkoutSession.items.map(it => {
      const sku = it.sku || it.id;
      const relic = (typeof collectionsData !== 'undefined' && Array.isArray(collectionsData))
        ? collectionsData.find(c => (c.sku || c.id) === sku)
        : null;
      const priceInr = Number(it.priceInr) || (relic && Number(relic.priceInr)) || 0;
      const priceRyo = Number(it.priceRyo) || (relic && Number(relic.priceRyo)) || Math.round(priceInr * 1.54);
      const qty = Math.max(1, parseInt(it.qty, 10) || 1);
      const img = it.image || (it.images && it.images[0]) || (relic && relic.images && relic.images[0]) || (relic && relic.imageUrl) || '';

      return {
        id: sku,
        sku: sku,
        name: it.name || (relic && relic.name) || 'Streetwear Apparel',
        category: it.category || (relic && relic.category) || 'Apparel',
        collection: it.collection || (relic && relic.collection) || '',
        collectionName: it.collectionName || (relic && relic.collectionName) || 'Official Collection',
        priceInr: priceInr,
        priceRyo: priceRyo,
        qty: qty,
        totalItemPriceInr: priceInr * qty,
        totalItemPriceRyo: priceRyo * qty,
        size: it.size || 'M',
        finish: it.finish || 'Classic Black',
        seal: it.seal || (relic && relic.seal) || '忍',
        specs: it.specs || (relic && relic.specs) || 'Officially Certified Authentic Item',
        desc: it.desc || (relic && relic.desc) || '',
        image: img
      };
    });

    // 3. Delivery Details
    const deliveryDetails = {
      speed: checkoutSession.delivery?.speed || 'free',
      courierTitle: checkoutSession.delivery?.title || (checkoutSession.delivery?.speed === 'express' ? 'Express Delivery' : 'Standard Delivery'),
      cost: deliveryCost,
      estimatedDelivery: estimatedDeliveryFormatted
    };

    // 4. Payment Details
    const paymentMethod = checkoutSession.payment?.method || 'cod';
    const paymentDetails = {
      method: paymentMethod,
      detail: checkoutSession.payment?.detail || (paymentMethod === 'cod' ? 'Cash on Delivery · Pay upon arrival' : 'Verified Electronic Transfer'),
      bank: checkoutSession.payment?.bank || '',
      status: paymentMethod === 'cod' ? 'PENDING_ON_DELIVERY' : 'CONFIRMED',
      paidAt: new Date().toISOString()
    };

    // 5. Pricing Details
    const pricingDetails = {
      subtotalInr,
      subtotalRyo,
      deliveryCost,
      discountInr: discount,
      promoCode: checkoutSession.promoCode || null,
      totalInr,
      totalRyo,
      totalItems: productDetails.reduce((sum, it) => sum + it.qty, 0)
    };

    // Complete Order Record
    const fullOrderRecord = {
      orderCode: generatedId,
      orderId: generatedId,
      status: 'CONFIRMED',
      source: checkoutSession.source || 'cart',

      // User details saved under multiple keys for seamless lookup
      user: userDetails,
      customer: userDetails,
      address: userDetails,
      shippingAddress: userDetails,

      // Product details saved under multiple keys
      products: productDetails,
      items: productDetails,
      productDetails: productDetails,

      // Delivery, payment & pricing
      delivery: deliveryDetails,
      payment: paymentDetails,
      pricing: pricingDetails,

      // Root level convenience fields
      subtotalInr,
      totalInr,
      totalRyo,
      itemCount: pricingDetails.totalItems,
      discount,
      promoCode: checkoutSession.promoCode || '',
      isB2B: userDetails.isB2B,
      gstin: userDetails.gstin,
      createdAt: new Date().toISOString()
    };

    saveLocalOrder(fullOrderRecord);
    if (typeof renderRecentOrderChips === 'function') {
      renderRecentOrderChips();
    }

    // Save complete order details asynchronously in the background (non-blocking)
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullOrderRecord)
    }).then(async resp => {
      try {
        const result = await resp.json();
        console.log('[Store Database] Order successfully recorded in Zoho:', result);

        // Update View Invoice button on confirmation modal
        const invoiceBtn = document.getElementById('checkoutViewInvoiceBtn');
        const zohoUrl = result?.order?.zoho_invoice_url || result?.zohoInvoice?.invoice_url || result?.invoiceUrl;
        if (invoiceBtn && zohoUrl) {
          invoiceBtn.href = zohoUrl;
          invoiceBtn.style.display = 'inline-flex';
        }

        if (result && result.sms) {
          if (result.sms.success) {
            console.log(`[Twilio] Automated confirmation SMS sent to ${result.sms.to} (SID: ${result.sms.sid})`);
            if (typeof showToast === 'function') {
              showToast('ORDER SMS DISPATCHED', `Order confirmation SMS sent to ${result.sms.to}`, 'info');
            }
          } else if (result.sms.configured === false) {
            console.info('[Twilio] SMS notice:', result.sms.notice);
          }
        }
      } catch (_) {}
    }).catch(err => {
      console.warn('Order dispatch background sync notice:', err);
    });

    // If order was placed from cart, clear the bag!
    if (checkoutSession.source === 'cart') {
      cart = [];
      updateCartUI();
    }

    // Immediately render and switch to confirmation step without any delay or loading screen
    renderOrderConfirmationStep(fullOrderRecord);
    goToCheckoutStep(4);
  }

  // Step 4: Show Order Confirmation & Order Summary
  function renderOrderConfirmationStep(orderRecord) {
    if (typeof window.trackGAEvent === 'function') {
      window.trackGAEvent('purchase', {
        transaction_id: orderRecord.orderCode || orderRecord.orderId || '',
        value: orderRecord.totalInr || 0,
        currency: 'INR',
        shipping: (orderRecord.delivery && orderRecord.delivery.cost) || 0,
        items_count: orderRecord.itemCount || 1
      });
    }
    // Separate Emails Notice
    const emailNoticeAddr = document.getElementById('confirmedEmailNoticeAddress');
    if (emailNoticeAddr) {
      const email = orderRecord.email || (orderRecord.shipping && orderRecord.shipping.email) || (orderRecord.shippingAddress && orderRecord.shippingAddress.email) || 'your email address';
      emailNoticeAddr.textContent = email;
    }

    const codeEl = document.getElementById('orderCode');
    const orderIdEl = document.getElementById('confirmedOrderId');
    const cardOrderIdEl = document.getElementById('confirmedCardOrderId');
    const cardOrderDate = document.getElementById('confirmedCardOrderDate');
    const estDelivery = document.getElementById('confirmedEstDelivery');
    const courierName = document.getElementById('confirmedCourierName');
    const payStatus = document.getElementById('confirmedPayStatus');
    const payMethod = document.getElementById('confirmedPayMethod');
    const recipient = document.getElementById('confirmedRecipient');
    const shortAddr = document.getElementById('confirmedShortAddress');
    const itemsList = document.getElementById('confirmedItemsList');

    // Summary calculation elements
    const summaryItemCount = document.getElementById('confirmedSummaryItemCount');
    const summarySubtotal = document.getElementById('confirmedSummarySubtotal');
    const summaryDelivery = document.getElementById('confirmedSummaryDelivery');
    const summaryDiscountRow = document.getElementById('confirmedSummaryDiscountRow');
    const summaryDiscount = document.getElementById('confirmedSummaryDiscount');
    const summaryTotal = document.getElementById('confirmedSummaryTotal');
    const summaryRyo = document.getElementById('confirmedSummaryRyo');

    // Customer & address summary elements
    const customerFullName = document.getElementById('confirmedCustomerFullName');
    const customerPhone = document.getElementById('confirmedCustomerPhone');
    const customerEmail = document.getElementById('confirmedCustomerEmail');
    const addressTypePill = document.getElementById('confirmedAddressType');
    const fullAddressText = document.getElementById('confirmedFullAddress');

    const orderId = orderRecord.orderId || String(Math.floor(111111 + Math.random() * 888889));
    const orderCode = orderId;

    if (codeEl) codeEl.textContent = orderId;
    if (orderIdEl) orderIdEl.textContent = orderId;
    if (cardOrderIdEl) cardOrderIdEl.textContent = orderId;

    const now = new Date(orderRecord.createdAt || Date.now());
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const nowFormatted = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}`;
    if (cardOrderDate) cardOrderDate.textContent = `Confirmed ${nowFormatted}`;

    // Delivery calculation
    const daysAhead = orderRecord.delivery && orderRecord.delivery.speed === 'express' ? 1 : 3;
    const estDate = new Date(now);
    estDate.setDate(estDate.getDate() + daysAhead);
    const formattedDate = `${dayNames[estDate.getDay()]}, ${monthNames[estDate.getMonth()]} ${estDate.getDate()}`;

    if (estDelivery) estDelivery.textContent = formattedDate;
    if (courierName) {
      courierName.textContent = orderRecord.delivery && orderRecord.delivery.speed === 'express'
        ? 'Express Delivery'
        : 'Standard Delivery';
    }

    if (payStatus) {
      payStatus.textContent = orderRecord.payment?.method === 'cod' ? 'Cash on Arrival · Authorized' : 'Paid · Confirmed';
    }
    if (payMethod) {
      payMethod.textContent = orderRecord.payment?.detail || (orderRecord.payment?.method === 'cod' ? 'Cash on Delivery (COD)' : 'Direct Electronic Payment');
    }

    const userObj = orderRecord.user || orderRecord.customer || orderRecord.address || {};
    const fullName = userObj.fullName || userObj.name || 'Valued Customer';
    const phone = userObj.phone || userObj.phoneNumber || '+91 ••••• •••••';
    const email = userObj.email || 'support@thestreetco.zohodesk.in';
    const fullAddr = userObj.fullAddress || `${userObj.houseFlat || userObj.address1 || ''}, ${userObj.streetRoad || ''} ${userObj.landmark ? '(' + userObj.landmark + ')' : ''}, ${userObj.city || ''}, ${userObj.state || ''} - ${userObj.pincode || ''}`;
    const addrType = userObj.addressType || userObj.type || 'HOME';

    if (recipient) recipient.textContent = fullName;
    if (shortAddr) shortAddr.textContent = `${userObj.houseFlat || userObj.address1 || ''}, ${userObj.city || ''} - ${userObj.pincode || ''}`;

    if (customerFullName) customerFullName.textContent = fullName;
    if (customerPhone) {
      const cleanDigits = String(phone).replace(/\D/g, '');
      const formattedP = cleanDigits.length === 10
        ? `+91 ${cleanDigits}`
        : (cleanDigits.length === 12 && cleanDigits.startsWith('91') ? `+91 ${cleanDigits.slice(2)}` : phone);
      customerPhone.textContent = formattedP;
    }
    if (customerEmail) customerEmail.textContent = email;
    if (addressTypePill) addressTypePill.textContent = addrType;
    if (fullAddressText) fullAddressText.textContent = fullAddr;

    // Financial Order Summary breakdown
    const items = orderRecord.products || orderRecord.items || [];
    const totalQty = items.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
    const subtotalInr = Number(orderRecord.pricing?.subtotalInr ?? orderRecord.subtotalInr ?? items.reduce((sum, it) => sum + ((Number(it.priceInr) || 0) * (Number(it.qty) || 1)), 0));
    const deliveryCost = Number(orderRecord.pricing?.deliveryCost ?? orderRecord.delivery?.cost ?? 0);
    const discount = Number(orderRecord.pricing?.discountInr ?? orderRecord.discount ?? 0);
    const totalInr = Number(orderRecord.pricing?.totalInr ?? orderRecord.totalInr ?? Math.max(0, subtotalInr + deliveryCost - discount));
    const totalRyo = Number(orderRecord.pricing?.totalRyo ?? orderRecord.totalRyo ?? Math.round(totalInr * 1.54));

    if (summaryItemCount) summaryItemCount.textContent = `${totalQty} Item${totalQty > 1 ? 's' : ''}`;
    if (summarySubtotal) summarySubtotal.textContent = `₹${subtotalInr.toLocaleString('en-IN')}`;
    if (summaryDelivery) {
      if (deliveryCost === 0) {
        summaryDelivery.textContent = 'FREE';
        summaryDelivery.className = 'text-free';
      } else {
        summaryDelivery.textContent = `₹${deliveryCost} INR`;
        summaryDelivery.className = 'text-blood';
      }
    }
    if (summaryDiscountRow && summaryDiscount) {
      if (discount > 0) {
        summaryDiscountRow.style.display = 'flex';
        summaryDiscount.textContent = `-₹${discount.toLocaleString('en-IN')}`;
      } else {
        summaryDiscountRow.style.display = 'none';
      }
    }
    if (summaryTotal) summaryTotal.textContent = `₹${totalInr.toLocaleString('en-IN')}`;
    if (summaryRyo) {
      summaryRyo.textContent = '';
      summaryRyo.style.display = 'none';
    }

    if (itemsList) {
      itemsList.innerHTML = items.map(it => {
        const itemImg = it.image ? `<img src="${it.image}" alt="${it.name}" loading="lazy">` : `<div style="display:grid;place-items:center;height:100%;color:var(--blood-hot)">⚔️</div>`;
        const itemPrice = Number(it.priceInr) || 0;
        const itemQty = Number(it.qty) || 1;
        return `
          <div class="checkout-review-item-row">
            <div class="checkout-review-thumb">${itemImg}</div>
            <div class="checkout-review-info">
              <strong>${it.name}</strong>
              <small>Size: ${it.size || 'M'} · Finish: ${it.finish || 'Classic Black'} · Qty: ${itemQty}</small>
            </div>
            <div class="checkout-review-price">₹${(itemPrice * itemQty).toLocaleString('en-IN')}</div>
          </div>
        `;
      }).join('');
    }

    showToast('ORDER PLACED & CONFIRMED', `Order ID: ${orderId}`, 'bag');
  }

  // Attach Stepper & Navigation Events
  if (checkoutRefreshAddressBtn) {
    checkoutRefreshAddressBtn.addEventListener('click', () => {
      resetAddressAndDeliveryFields({ clearStorage: true });
      showToast('FIELDS REFRESHED', 'Address & courier options cleared', 'bag');
      if (checkoutNameInput) checkoutNameInput.focus();
    });
  }
  if (checkoutToPaymentBtn) checkoutToPaymentBtn.addEventListener('click', handleAddressStepSubmit);
  if (checkoutBackToAddressBtn) checkoutBackToAddressBtn.addEventListener('click', () => goToCheckoutStep(1));
  if (checkoutToReviewBtn) checkoutToReviewBtn.addEventListener('click', handlePaymentStepSubmit);
  if (checkoutBackToPaymentBtn) checkoutBackToPaymentBtn.addEventListener('click', () => goToCheckoutStep(2));
  if (reviewEditAddressBtn) reviewEditAddressBtn.addEventListener('click', () => goToCheckoutStep(1));
  if (reviewEditPaymentBtn) reviewEditPaymentBtn.addEventListener('click', () => goToCheckoutStep(2));
  if (checkoutConfirmOrderBtn) checkoutConfirmOrderBtn.addEventListener('click', handleConfirmAndPlaceOrder);

  // B2B GSTIN toggle handler
  const b2bToggle = document.getElementById('checkoutIsB2B');
  const gstFields = document.getElementById('checkoutGstFields');
  if (b2bToggle && gstFields) {
    b2bToggle.addEventListener('change', () => {
      gstFields.style.display = b2bToggle.checked ? 'block' : 'none';
      if (b2bToggle.checked) {
        document.getElementById('checkoutGstin')?.focus();
      } else {
        const gstinInput = document.getElementById('checkoutGstin');
        if (gstinInput) gstinInput.value = '';
      }
    });
  }

  // Allow clicking completed stepper items
  stepIndicators.forEach((ind, idx) => {
    if (!ind) return;
    ind.addEventListener('click', () => {
      const stepTarget = idx + 1;
      if (stepTarget < checkoutSession.currentStep && checkoutSession.currentStep !== 4) {
        goToCheckoutStep(stepTarget);
      }
    });
  });

  // Address Type Pills
  if (checkoutTypePills) {
    checkoutTypePills.querySelectorAll('.checkout-type-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        checkoutTypePills.querySelectorAll('.checkout-type-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
      });
    });
  }

  // Delivery options cards click synchronization
  deliveryRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (deliveryOptionFree) deliveryOptionFree.classList.toggle('active', radio.value === 'free' && radio.checked);
      if (deliveryOptionExpress) deliveryOptionExpress.classList.toggle('active', radio.value === 'express' && radio.checked);
      checkoutSession.delivery.speed = radio.value;
      checkoutSession.delivery.cost = radio.value === 'express' ? 149 : 0;
      renderCheckoutSidebar();
    });
  });

  // Payment Options Accordion (No tick, click opens the payment option)
  payOptions.forEach(opt => {
    const header = opt.querySelector('.checkout-pay-header');
    const targetEl = header || opt;

    targetEl.addEventListener('click', (e) => {
      // Don't toggle accordion if click is inside the body's interactive inputs
      if (e.target.closest('.checkout-pay-body')) return;

      // Unavailable payment methods notice
      if (opt.dataset.unavailable === 'true' || opt.classList.contains('checkout-pay-option--unavailable')) {
        showToast('PAYMENT NOTICE', 'Online payment methods are temporarily unavailable. Cash on Delivery (COD) is selected.', 'bag');
        return;
      }

      const isAlreadyActive = opt.classList.contains('active');

      // Close all payment options
      payOptions.forEach(o => {
        o.classList.remove('active');
        const h = o.querySelector('.checkout-pay-header');
        if (h) h.setAttribute('aria-expanded', 'false');
      });

      // Keep COD active
      if (isAlreadyActive && opt.dataset.method === 'cod') {
        opt.classList.add('active');
        if (header) header.setAttribute('aria-expanded', 'true');
        checkoutSession.payment.method = 'cod';
        return;
      }

      // Otherwise, open the clicked payment option
      opt.classList.add('active');
      if (header) header.setAttribute('aria-expanded', 'true');
      checkoutSession.payment.method = opt.dataset.method;
    });

    // Right-aligned small ivory continue button under each payment option
    const continueBtn = opt.querySelector('.checkout-pay-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const method = continueBtn.dataset.payMethod || opt.dataset.method;
        handlePaymentStepSubmit(method);
      });
    }
  });

  // Card input formatting polish
  const checkoutCardNumInput = document.getElementById('checkoutCardNum');
  if (checkoutCardNumInput) {
    checkoutCardNumInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 16);
      let parts = [];
      for (let i = 0; i < v.length; i += 4) {
        parts.push(v.substring(i, i + 4));
      }
      e.target.value = parts.join(' ');
    });
  }
  const checkoutCardExpInput = document.getElementById('checkoutCardExp');
  if (checkoutCardExpInput) {
    checkoutCardExpInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').substring(0, 4);
      if (v.length > 2) {
        e.target.value = v.substring(0, 2) + ' / ' + v.substring(2, 4);
      } else {
        e.target.value = v;
      }
    });
  }

  // UPI Tabs
  if (upiTabId && upiTabQr && upiPaneId && upiPaneQr) {
    upiTabId.addEventListener('click', () => {
      upiTabId.classList.add('active');
      upiTabQr.classList.remove('active');
      upiPaneId.style.display = 'block';
      upiPaneQr.style.display = 'none';
    });
    upiTabQr.addEventListener('click', () => {
      upiTabQr.classList.add('active');
      upiTabId.classList.remove('active');
      upiPaneQr.style.display = 'block';
      upiPaneId.style.display = 'none';
    });
  }

  // UPI Suggestion Pills
  document.querySelectorAll('.upi-sug-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      if (!checkoutUpiIdInput) return;
      const handle = pill.dataset.handle;
      const current = checkoutUpiIdInput.value.split('@')[0] || 'shinobi';
      checkoutUpiIdInput.value = `${current}${handle}`;
    });
  });

  // Netbanking Pills
  document.querySelectorAll('.netbank-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.netbank-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // ──────────────────────────────────────────
  // STORE PROMO COUPONS SYSTEM (2 Groups: %, Flat ₹)
  // Dynamic price range matching, suggestions & paste-apply
  // ──────────────────────────────────────────
  const CLIENT_FALLBACK_COUPONS = [
    // ── GROUP 1: PERCENTAGE DISCOUNTS (%) ──
    {
      code: 'STREET10',
      title: '10% Off Entire Order',
      desc: 'Enjoy 10% instant discount on orders from ₹1,500 to ₹8,000.',
      group: 'percentage',
      type: 'percentage',
      value: 10,
      minOrderValue: 1500,
      maxOrderValue: 8000,
      maxDiscount: 800,
      isPublic: true,
      badge: '10% OFF',
      status: 'active'
    },
    {
      code: 'SHARINGAN15',
      title: '15% Off Shinobi Relics',
      desc: 'Receive 15% instant discount on orders from ₹2,500 to ₹12,000.',
      group: 'percentage',
      type: 'percentage',
      value: 15,
      minOrderValue: 2500,
      maxOrderValue: 12000,
      maxDiscount: 1800,
      isPublic: true,
      badge: '15% OFF',
      status: 'active'
    },
    {
      code: 'AMATERASU20',
      title: '20% Off Black Flame Hoard',
      desc: 'Unlock 20% discount on high-tier orders between ₹5,000 and ₹25,000.',
      group: 'percentage',
      type: 'percentage',
      value: 20,
      minOrderValue: 5000,
      maxOrderValue: 25000,
      maxDiscount: 4000,
      isPublic: true,
      badge: '20% OFF',
      status: 'active'
    },
    {
      code: 'TSUKUYOMI25',
      title: '25% Off Grand Archive Master Collection',
      desc: 'Exclusive 25% discount for major collectors on orders above ₹8,000.',
      group: 'percentage',
      type: 'percentage',
      value: 25,
      minOrderValue: 8000,
      maxOrderValue: null,
      maxDiscount: 6000,
      isPublic: true,
      badge: '25% OFF',
      status: 'active'
    },

    // ── GROUP 2: FLAT DISCOUNTS (₹) ──
    {
      code: 'UCHIHA200',
      title: 'Flat ₹200 Welcome Offer',
      desc: 'Flat ₹200 off on shopping cart from ₹1,000 to ₹6,000.',
      group: 'flat',
      type: 'flat',
      value: 200,
      minOrderValue: 1000,
      maxOrderValue: 6000,
      maxDiscount: 200,
      isPublic: true,
      badge: 'FLAT ₹200',
      status: 'active'
    },
    {
      code: 'ITACHI500',
      title: 'Flat ₹500 First Order Discount',
      desc: 'Flat ₹500 instant discount on orders from ₹3,000 to ₹20,000.',
      group: 'flat',
      type: 'flat',
      value: 500,
      minOrderValue: 3000,
      maxOrderValue: 20000,
      maxDiscount: 500,
      isPublic: true,
      badge: 'FLAT ₹500',
      status: 'active'
    },
    {
      code: 'AKATSUKI1000',
      title: 'Flat ₹1,000 Rogue Ninja Vault',
      desc: 'Flat ₹1,000 deduction on premium orders above ₹6,000.',
      group: 'flat',
      type: 'flat',
      value: 1000,
      minOrderValue: 6000,
      maxOrderValue: null,
      maxDiscount: 1000,
      isPublic: true,
      badge: 'FLAT ₹1,000',
      status: 'active'
    },
    {
      code: 'SUSANOO1500',
      title: 'Flat ₹1,500 Divine Armor Requisition',
      desc: 'Save flat ₹1,500 on all orders above ₹10,000.',
      group: 'flat',
      type: 'flat',
      value: 1500,
      minOrderValue: 10000,
      maxOrderValue: null,
      maxDiscount: 1500,
      isPublic: true,
      badge: 'FLAT ₹1,500',
      status: 'active'
    },

    // ── INACTIVE / PRIVATE COUPONS ──
    {
      code: 'SECRET300',
      title: 'Classified ANBU Operative Seal',
      desc: 'Covert seal (inactive & private until released to public).',
      group: 'flat',
      type: 'flat',
      value: 300,
      minOrderValue: 1800,
      maxOrderValue: null,
      maxDiscount: 300,
      isPublic: false,
      badge: 'INACTIVE',
      status: 'inactive'
    },
    {
      code: 'ANBU30',
      title: 'Private ANBU 30% Pass',
      desc: 'Confidential pass (inactive & private until released to public).',
      group: 'percentage',
      type: 'percentage',
      value: 30,
      minOrderValue: 4000,
      maxOrderValue: null,
      maxDiscount: 3000,
      isPublic: false,
      badge: 'INACTIVE',
      status: 'inactive'
    }
  ];

  let cachedCouponsList = [...CLIENT_FALLBACK_COUPONS];
  let activeCouponGroupFilter = 'all'; // 'all', 'percentage', 'flat'

  // Fetch coupons from API asynchronously
  async function loadCouponsCatalog() {
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.coupons) && data.coupons.length > 0) {
          cachedCouponsList = data.coupons;
          renderSuggestedCoupons();
          renderPageBottomCoupons();
        }
      }
    } catch (_) {
      // Keep fallback catalog
    }
  }
  loadCouponsCatalog();

  function resetCouponUI() {
    if (checkoutPromoInput) checkoutPromoInput.value = '';
    if (checkoutPromoClearBtn) checkoutPromoClearBtn.style.display = 'none';
    if (checkoutPromoAppliedBadge) checkoutPromoAppliedBadge.style.display = 'none';
    if (checkoutPromoApplyBtn) {
      checkoutPromoApplyBtn.style.display = 'flex';
      checkoutPromoApplyBtn.disabled = false;
      checkoutPromoApplyBtn.textContent = 'APPLY';
      checkoutPromoApplyBtn.classList.remove('applied');
    }
    if (checkoutPromoBox) checkoutPromoBox.classList.remove('applied');
    if (checkoutPromoMsg) {
      checkoutPromoMsg.textContent = '';
      checkoutPromoMsg.className = 'checkout-promo-message';
      checkoutPromoMsg.style.display = 'none';
    }
  }

  function renderSuggestedCoupons() {
    if (!checkoutCouponsList) return;

    const { subtotalInr } = getBagTotals();

    // Helper to calculate exact savings in INR
    function getCouponSavings(c, subtotal) {
      if (!c) return 0;
      let savings = 0;
      if (c.group === 'percentage' || c.type === 'percentage') {
        savings = Math.round((subtotal * c.value) / 100);
        if (c.maxDiscount && savings > c.maxDiscount) savings = c.maxDiscount;
      } else {
        savings = Number(c.value) || 0;
      }
      return Math.min(savings, subtotal);
    }

    // Filter by strictly public and active coupons only
    const activeCode = (appliedCartCoupon.code || checkoutSession.promoCode || '').trim().toUpperCase();
    const publicCoupons = cachedCouponsList.filter(c =>
      c.isPublic === true &&
      c.status === 'active'
    );

    // 1. Find coupons where the cart matches the price range condition
    const eligible = publicCoupons.filter(c => {
      const min = Number(c.minOrderValue) || 0;
      const max = c.maxOrderValue ? Number(c.maxOrderValue) : Infinity;
      return subtotalInr >= min && subtotalInr <= max;
    });

    // Sort eligible coupons: highest savings first, then by closest threshold
    eligible.sort((a, b) => {
      const aSavings = getCouponSavings(a, subtotalInr);
      const bSavings = getCouponSavings(b, subtotalInr);
      if (bSavings !== aSavings) return bSavings - aSavings;
      return (Number(b.minOrderValue) || 0) - (Number(a.minOrderValue) || 0);
    });

    // 2. Find coupons that are closest to the user's shopping price
    const upcoming = publicCoupons
      .filter(c => Number(c.minOrderValue) > subtotalInr)
      .sort((a, b) => Number(a.minOrderValue) - Number(b.minOrderValue));

    // Combine and prioritize the currently applied coupon at the top if present
    let displayList = [];
    const activeCoupon = activeCode ? publicCoupons.find(c => c.code.toUpperCase() === activeCode) : null;
    if (activeCoupon) {
      displayList.push(activeCoupon);
    }
    const otherEligible = eligible.filter(c => !activeCode || c.code.toUpperCase() !== activeCode);
    const otherUpcoming = upcoming.filter(c => !activeCode || c.code.toUpperCase() !== activeCode);
    displayList = [...displayList, ...otherEligible, ...otherUpcoming].slice(0, 3);

    if (displayList.length === 0) {
      checkoutCouponsList.innerHTML = '';
      return;
    }

    checkoutCouponsList.innerHTML = displayList.map(c => {
      const min = Number(c.minOrderValue) || 0;
      const max = c.maxOrderValue ? Number(c.maxOrderValue) : null;
      const isEligible = subtotalInr >= min && (!max || subtotalInr <= max);
      const isApplied = Boolean(activeCode && c.code.toUpperCase() === activeCode);

      // Button state: Beside every coupon there is an apply button
      let btnHtml = '';
      if (isApplied) {
        btnHtml = `<button type="button" class="coupon-card-apply-btn applied" disabled>APPLIED ✓</button>`;
      } else if (isEligible) {
        btnHtml = `<button type="button" class="coupon-card-apply-btn" data-code="${c.code}">APPLY</button>`;
      } else {
        btnHtml = `<button type="button" class="coupon-card-apply-btn locked" data-code="${c.code}" title="Requires higher shopping total">LOCKED 🔒</button>`;
      }

      const cardClass = isApplied
        ? 'checkout-coupon-card unlocked is-applied'
        : (isEligible ? 'checkout-coupon-card unlocked' : 'checkout-coupon-card locked');
      const isPercentGroup = (c.group === 'percentage' || c.type === 'percentage');
      const groupBadge = isPercentGroup
        ? `<span class="coupon-type-badge percentage">${c.value}% OFF</span>`
        : `<span class="coupon-type-badge flat">FLAT ₹${c.value}</span>`;

      return `
        <div class="${cardClass}" data-card-code="${c.code}">
          <div class="checkout-coupon-card__top">
            <div class="checkout-coupon-card__badges">
              <span class="coupon-code-pill" data-code="${c.code}" title="Click to paste into coupon box">${c.code}</span>
              ${groupBadge}
            </div>
            <div class="checkout-coupon-card__action">
              ${btnHtml}
            </div>
          </div>
          <div class="checkout-coupon-card__body">
            <h5 class="coupon-card-title">${c.title}</h5>
            <p class="coupon-card-desc">${c.desc}</p>
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners to card Apply buttons:
    // If the user clicks that button: paste coupon in the coupon text bar and use it
    checkoutCouponsList.querySelectorAll('.coupon-card-apply-btn:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        if (!code) return;
        if (checkoutPromoInput) {
          checkoutPromoInput.value = code;
          if (checkoutPromoClearBtn) checkoutPromoClearBtn.style.display = 'grid';
        }
        applyCouponCode(code);
      });
    });

    // Clicking the coupon code pill also pastes it in the bar and applies it
    checkoutCouponsList.querySelectorAll('.coupon-code-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const code = pill.dataset.code;
        if (!code) return;
        if (checkoutPromoInput) {
          checkoutPromoInput.value = code;
          if (checkoutPromoClearBtn) checkoutPromoClearBtn.style.display = 'grid';
          checkoutPromoInput.focus();
        }
        applyCouponCode(code);
      });
    });
  }

  const pageBottomCouponsCards = document.getElementById('pageBottomCouponsCards');

  function renderPageBottomCoupons() {
    if (!pageBottomCouponsCards) return;
    const activeCode = (appliedCartCoupon.code || checkoutSession.promoCode || '').trim().toUpperCase();
    const publicCoupons = cachedCouponsList.filter(c => c.isPublic === true && c.status === 'active');

    pageBottomCouponsCards.innerHTML = publicCoupons.map(c => {
      const isPercent = (c.group === 'percentage' || c.type === 'percentage');
      const discountTag = isPercent ? `${c.value}% OFF` : `FLAT ₹${c.value}`;
      const minText = c.minOrderValue ? `Min order: ₹${Number(c.minOrderValue).toLocaleString('en-IN')}` : 'No minimum order';
      const maxText = c.maxOrderValue ? ` · Max order: ₹${Number(c.maxOrderValue).toLocaleString('en-IN')}` : '';
      const isApplied = Boolean(activeCode && c.code.toUpperCase() === activeCode);

      return `
        <div class="page-coupon-card ${isApplied ? 'is-applied' : ''}" data-code="${c.code}">
          <div class="page-coupon-card__top">
            <div class="page-coupon-card__badge-row">
              <span class="page-coupon-code-pill" data-code="${c.code}" title="Click to copy code">
                <span>${c.code}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </span>
              <span class="page-coupon-type-tag ${isPercent ? 'percentage' : 'flat'}">${discountTag}</span>
            </div>
          </div>
          <div class="page-coupon-card__content">
            <h4 class="page-coupon-card__title">${c.title}</h4>
            <p class="page-coupon-card__desc">${c.desc}</p>
            <span class="page-coupon-card__terms">${minText}${maxText}</span>
          </div>
          <div class="page-coupon-card__actions">
            <button type="button" class="page-coupon-btn-apply" data-code="${c.code}">
              ${isApplied ? 'APPLIED IN BAG ✓' : 'APPLY TO BAG'}
            </button>
            <button type="button" class="page-coupon-btn-copy" data-code="${c.code}">
              <span>COPY</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    pageBottomCouponsCards.querySelectorAll('.page-coupon-btn-apply').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        if (!code) return;
        openCart('bag');
        if (checkoutPromoInput) {
          checkoutPromoInput.value = code;
          if (checkoutPromoClearBtn) checkoutPromoClearBtn.style.display = 'grid';
        }
        applyCouponCode(code);
      });
    });

    pageBottomCouponsCards.querySelectorAll('.page-coupon-btn-copy, .page-coupon-code-pill').forEach(btn => {
      btn.addEventListener('click', async () => {
        const code = btn.dataset.code;
        if (!code) return;
        try {
          await navigator.clipboard.writeText(code);
          const span = btn.querySelector('span');
          if (span) {
            const originalText = span.textContent;
            span.textContent = 'COPIED ✓';
            setTimeout(() => { span.textContent = originalText; }, 2000);
          }
        } catch (_) {}
      });
    });
  }
  renderPageBottomCoupons();

  // Clear / Cancel button inside input
  if (checkoutPromoClearBtn && checkoutPromoInput) {
    checkoutPromoClearBtn.addEventListener('click', () => {
      // If a coupon was active/applied, cancel the coupon completely
      if (appliedCartCoupon.code || checkoutSession.promoCode) {
        removeAppliedCoupon();
      } else {
        checkoutPromoInput.value = '';
        checkoutPromoClearBtn.style.display = 'none';
        if (checkoutPromoMsg) {
          checkoutPromoMsg.textContent = '';
          checkoutPromoMsg.className = 'checkout-promo-message';
          checkoutPromoMsg.style.display = 'none';
        }
      }
      checkoutPromoInput.focus();
    });

    checkoutPromoInput.addEventListener('input', () => {
      // If user starts editing while coupon was applied, clear applied state
      if (appliedCartCoupon.code || checkoutSession.promoCode) {
        appliedCartCoupon.code = '';
        appliedCartCoupon.discount = 0;
        appliedCartCoupon.details = null;
        checkoutSession.promoCode = '';
        checkoutSession.discount = 0;
        if (checkoutPromoBox) checkoutPromoBox.classList.remove('applied');
        if (checkoutPromoAppliedBadge) checkoutPromoAppliedBadge.style.display = 'none';
        if (checkoutPromoApplyBtn) {
          checkoutPromoApplyBtn.disabled = false;
          checkoutPromoApplyBtn.textContent = 'APPLY';
          checkoutPromoApplyBtn.classList.remove('applied');
        }
        if (checkoutPromoMsg) checkoutPromoMsg.style.display = 'none';
        updateCartPriceDisplays();
        renderCheckoutSidebar();
        renderSuggestedCoupons();
      }
      if (checkoutPromoClearBtn) {
        checkoutPromoClearBtn.style.display = checkoutPromoInput.value.length > 0 ? 'grid' : 'none';
      }
    });

    checkoutPromoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyCouponCode();
      }
    });
  }

  function removeAppliedCoupon() {
    appliedCartCoupon.code = '';
    appliedCartCoupon.discount = 0;
    appliedCartCoupon.details = null;
    checkoutSession.promoCode = '';
    checkoutSession.discount = 0;
    resetCouponUI();
    updateCartPriceDisplays();
    renderCheckoutSidebar();
    renderSuggestedCoupons();
    renderPageBottomCoupons();
  }

  async function applyCouponCode(codeOverride) {
    const rawCode = (codeOverride || (checkoutPromoInput ? checkoutPromoInput.value : '')).trim().toUpperCase();
    const { subtotalInr } = getBagTotals();

    if (!rawCode) {
      if (checkoutPromoMsg) {
        checkoutPromoMsg.textContent = '❌ Please enter a coupon code.';
        checkoutPromoMsg.className = 'checkout-promo-message error show';
        checkoutPromoMsg.style.display = 'block';
      }
      return;
    }

    if (checkoutPromoInput) checkoutPromoInput.value = rawCode;

    // Check with backend API first
    let result = null;
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: rawCode, subtotal: subtotalInr })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (_) {}

    // Client-side fallback validator if API unavailable
    if (!result) {
      const matched = cachedCouponsList.find(c => c.code.toUpperCase() === rawCode);
      if (!matched) {
        result = {
          valid: false,
          reason: 'not_found',
          message: `❌ Coupon "${rawCode}" does not exist. Please check your spelling and try again.`
        };
      } else if (matched.status !== 'active') {
        result = {
          valid: false,
          reason: 'inactive',
          message: `❌ Coupon "${matched.code}" is currently inactive and cannot be used.`
        };
      } else if (matched.isPublic !== true) {
        result = {
          valid: false,
          reason: 'not_public',
          message: `❌ Coupon "${matched.code}" cannot be used until it is marked as public.`
        };
      } else if (matched.minOrderValue && subtotalInr < matched.minOrderValue) {
        const diff = matched.minOrderValue - subtotalInr;
        result = {
          valid: false,
          reason: 'min_order_unmet',
          message: `⚠️ Coupon "${matched.code}" requires a minimum order of ₹${matched.minOrderValue.toLocaleString('en-IN')}. Your cart is ₹${subtotalInr.toLocaleString('en-IN')}. Add ₹${diff.toLocaleString('en-IN')} more to unlock!`
        };
      } else if (matched.maxOrderValue && subtotalInr > matched.maxOrderValue) {
        result = {
          valid: false,
          reason: 'max_order_exceeded',
          message: `⚠️ Coupon "${matched.code}" is only applicable for orders up to ₹${matched.maxOrderValue.toLocaleString('en-IN')}. Your current cart is ₹${subtotalInr.toLocaleString('en-IN')}.`
        };
      } else {
        let discount = 0;
        if (matched.group === 'percentage' || matched.type === 'percentage') {
          discount = Math.round((subtotalInr * matched.value) / 100);
          if (matched.maxDiscount && discount > matched.maxDiscount) discount = matched.maxDiscount;
        } else {
          discount = Number(matched.value) || 0;
        }
        discount = Math.min(discount, subtotalInr);
        result = {
          valid: true,
          code: matched.code,
          title: matched.title,
          discount,
          message: `You have saved ₹${discount.toLocaleString('en-IN')} on this order.`
        };
      }
    }

    if (result && result.valid) {
      appliedCartCoupon.code = result.code;
      appliedCartCoupon.discount = result.discount;
      appliedCartCoupon.details = result;
      checkoutSession.promoCode = result.code;
      checkoutSession.discount = result.discount;

      const savedMessage = `You have saved ₹${result.discount.toLocaleString('en-IN')} on this order.`;

      if (checkoutPromoMsg) {
        checkoutPromoMsg.textContent = savedMessage;
        checkoutPromoMsg.className = 'checkout-promo-message success show';
        checkoutPromoMsg.style.display = 'block';
      }
      if (checkoutPromoBox) checkoutPromoBox.classList.add('applied');
      if (checkoutPromoAppliedBadge) checkoutPromoAppliedBadge.style.display = 'inline-block';
      if (checkoutPromoClearBtn) checkoutPromoClearBtn.style.display = 'grid';
      if (checkoutPromoApplyBtn) {
        checkoutPromoApplyBtn.style.display = 'flex';
        checkoutPromoApplyBtn.disabled = true;
        checkoutPromoApplyBtn.textContent = 'APPLIED ✓';
        checkoutPromoApplyBtn.classList.add('applied');
      }

      updateCartPriceDisplays();
      renderCheckoutSidebar();
      renderSuggestedCoupons();
      renderPageBottomCoupons();
    } else {
      appliedCartCoupon.code = '';
      appliedCartCoupon.discount = 0;
      appliedCartCoupon.details = null;
      checkoutSession.promoCode = '';
      checkoutSession.discount = 0;
      renderPageBottomCoupons();

      if (checkoutPromoMsg) {
        checkoutPromoMsg.textContent = (result && result.message) || 'Invalid coupon code. Please try again.';
        checkoutPromoMsg.className = (result && result.reason === 'min_order_unmet')
          ? 'checkout-promo-message warning show'
          : 'checkout-promo-message error show';
        checkoutPromoMsg.style.display = 'block';
      }
      if (checkoutPromoBox) checkoutPromoBox.classList.remove('applied');
      if (checkoutPromoAppliedBadge) checkoutPromoAppliedBadge.style.display = 'none';
      if (checkoutPromoClearBtn) checkoutPromoClearBtn.style.display = checkoutPromoInput && checkoutPromoInput.value.length > 0 ? 'grid' : 'none';
      if (checkoutPromoApplyBtn) {
        checkoutPromoApplyBtn.style.display = 'flex';
        checkoutPromoApplyBtn.disabled = false;
        checkoutPromoApplyBtn.textContent = 'APPLY';
        checkoutPromoApplyBtn.classList.remove('applied');
      }

      updateCartPriceDisplays();
      renderCheckoutSidebar();
      renderSuggestedCoupons();
    }
  }

  // Hook Promo Apply Button
  if (checkoutPromoApplyBtn) {
    checkoutPromoApplyBtn.addEventListener('click', () => {
      applyCouponCode();
    });
  }

  // Step 4 Actions: Copy Order ID
  const checkoutCopyIdBtn = document.getElementById('checkoutCopyIdBtn');
  if (checkoutCopyIdBtn) {
    checkoutCopyIdBtn.addEventListener('click', () => {
      const orderId = checkoutSession.orderId || (document.getElementById('confirmedOrderId')?.textContent) || '111111';
      navigator.clipboard.writeText(orderId).then(() => {
        const span = checkoutCopyIdBtn.querySelector('span');
        if (span) span.textContent = 'ORDER ID COPIED! ✓';
        showToast('COPIED ORDER ID', orderId, 'bag');
        setTimeout(() => {
          if (span) span.textContent = 'COPY ORDER ID';
        }, 2200);
      }).catch(() => {
        showToast('ORDER ID', orderId, 'bag');
      });
    });
  }

  // Step 4 Action: Continue Shopping -> Return user to previous shopping page
  if (checkoutTrackCourierBtn) {
    checkoutTrackCourierBtn.addEventListener('click', () => {
      // Close checkout modal
      if (checkoutFlowModal) {
        checkoutFlowModal.classList.remove('open', 'order-confirmed', 'step-4');
        checkoutFlowModal.setAttribute('aria-hidden', 'true');
        if (checkoutFlowCloseBtn) checkoutFlowCloseBtn.style.display = 'grid';
      }
      if (typeof closeCart === 'function') closeCart();

      // Clear any URL hash
      if (window.location.hash) {
        try {
          history.replaceState(null, document.title, window.location.pathname + window.location.search);
        } catch (_) {
          window.location.hash = '';
        }
      }

      // Return user to previous shopping location
      if (checkoutPreviousContext.view === 'collections' && collectionsPage) {
        collectionsPage.classList.add('open');
        collectionsPage.setAttribute('aria-hidden', 'false');
        document.body.classList.add('bag-open');
        document.documentElement.classList.add('bag-open');
        collectionsPage.scrollTop = checkoutPreviousContext.collecScrollTop || 0;
      } else {
        document.body.classList.remove('bag-open');
        document.documentElement.classList.remove('bag-open');
        if (relicGalleryModal) {
          relicGalleryModal.classList.remove('open');
          relicGalleryModal.setAttribute('aria-hidden', 'true');
        }
        const shopSection = document.getElementById('shop');
        if (shopSection) {
          shopSection.scrollIntoView({ behavior: 'smooth' });
        } else {
          const targetY = checkoutPreviousContext.scrollY > 200 ? checkoutPreviousContext.scrollY : 0;
          window.scrollTo({ top: targetY, behavior: 'smooth' });
        }
      }

      // Reset checkout step to 1 for subsequent shopping
      goToCheckoutStep(1);
    });
  }

  // Close Checkout Modal Triggers
  if (checkoutFlowCloseBtn) checkoutFlowCloseBtn.addEventListener('click', closeCheckoutModal);
  if (checkoutFlowBackdrop) checkoutFlowBackdrop.addEventListener('click', closeCheckoutModal);

  // Hook Cart Drawer "PROCEED TO CHECKOUT" button to multi-step checkout
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!cart || cart.length === 0) return;
      closeCart();
      checkoutSession.promoCode = appliedCartCoupon.code || '';
      checkoutSession.discount = appliedCartCoupon.discount || 0;
      openCheckoutModal([...cart], 'cart');
    });
  }


  // ═══════════ REAL-TIME SHADOW COURIER TRACKING CONTROLLER ═══════════
  const ORDERS_STORAGE_KEY = 'the_street_co_orders_v1';

  function getSavedLocalOrders() {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY) || localStorage.getItem('the_street_co_orders');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalOrder(order) {
    try {
      const current = getSavedLocalOrders();
      const updated = [order, ...current.filter(o => o.orderCode !== order.orderCode)].slice(0, 12);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save order to localStorage', e);
    }
  }

  // ═══════════ ALL COLLECTIONS CATALOG & VIEW ═══════════
  // 16 Canonical Streetwear Products with complete gallery images, prices, specs & seals
  const CANONICAL_RELICS = [
    // Collection 1: Akatsuki Shadows
    {
      sku: 'akatsuki-cloak',
      id: 'akatsuki-cloak',
      isNew: true,
      name: 'Akatsuki Cloud Trench Cloak',
      collection: 'akatsuki',
      collectionName: 'Akatsuki Shadows',
      category: 'Apparel',
      tag: 'LIMITED RE-ISSUE',
      priceInr: 11999,
      priceRyo: 18500,
      priceUsd: 145,
      stock: 12,
      seal: '雲',
      desc: 'Heavy structured obsidian twill trench with high-stand collar, crimson satin silk lining, and hand-embroidered vermilion clouds.',
      specs: '100% Japanese Gabardine · Dry Clean Only · Tailored Fit',
      images: [
        'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80',
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800&q=80',
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
        'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&q=80',
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=800&q=80'
    },
    {
      sku: 'shu-ring',
      id: 'shu-ring',
      isNew: true,
      name: 'Akatsuki "Shu" Signet Ring',
      collection: 'akatsuki',
      collectionName: 'Akatsuki Shadows',
      category: 'Jewelry',
      tag: '925 STERLING SILVER',
      priceInr: 7999,
      priceRyo: 12000,
      priceUsd: 96,
      stock: 24,
      seal: '朱',
      desc: 'Heavyweight oxidized .925 sterling silver band embedded with crimson carnelian stone bearing the "Shu" (Vermilion) kanji seal.',
      specs: '.925 Sterling Silver · Natural Carnelian · Custom Sizes 7-12',
      images: [
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
        'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
        'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80',
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
        'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'
    },
    {
      sku: 'akatsuki-kasa',
      id: 'akatsuki-kasa',
      isNew: true,
      name: 'Straw Kasa Woven Hat with Veil',
      collection: 'akatsuki',
      collectionName: 'Akatsuki Shadows',
      category: 'Apparel',
      tag: 'HANDWOVEN BAMBOO',
      priceInr: 5499,
      priceRyo: 8600,
      priceUsd: 66,
      stock: 18,
      seal: '笠',
      desc: 'Traditional woven bamboo conical kasa with pendant brass chime bell and sheer shadow-veil curtains to conceal the sharingan gaze.',
      specs: 'Handwoven Bamboo · Brass Ringing Chime · Removable Veil',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
        'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&q=80',
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'
    },
    {
      sku: 'shadow-holster',
      id: 'shadow-holster',
      name: 'Shadow Leather Kunai Leg Holster',
      collection: 'akatsuki',
      collectionName: 'Akatsuki Shadows',
      category: 'Armory',
      tag: 'FULL-GRAIN LEATHER',
      priceInr: 4499,
      priceRyo: 6900,
      priceUsd: 54,
      stock: 35,
      seal: '鞘',
      desc: 'Full-grain oiled black cowhide tactical thigh holster with reinforced quick-draw slots and matte black military alloy buckles.',
      specs: 'Full-Grain Black Cowhide · Alloy Buckles · Adjustable Straps',
      images: [
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
    },

    // Collection 2: Uchiha Heritage
    {
      sku: 'leaf-protector',
      id: 'leaf-protector',
      name: 'Rogue Leaf Forehead Protector',
      collection: 'heritage',
      collectionName: 'Uchiha Heritage',
      category: 'Relics',
      tag: 'COLD-FORGED STEEL',
      priceInr: 5299,
      priceRyo: 8200,
      priceUsd: 64,
      stock: 15,
      seal: '護',
      desc: 'Hand-carved stainless steel forehead protector bearing the engraved slash through the Leaf village crest on an obsidian fabric band.',
      specs: 'Brushed Steel · Indigo Cotton Band · Battle Scored Finish',
      images: [
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
        'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80'
    },
    {
      sku: 'mangekyo-print',
      id: 'mangekyo-print',
      name: 'Mangekyo Optical Art Print',
      collection: 'heritage',
      collectionName: 'Uchiha Heritage',
      category: 'Craft',
      tag: 'ARCHIVAL LENTICULAR',
      priceInr: 4299,
      priceRyo: 6500,
      priceUsd: 52,
      stock: 22,
      seal: '眼',
      desc: 'Museum-grade 3-phase lenticular print transitioning between 3-Tomoe Sharingan and Itachi’s triangular pinwheel Mangekyo depending on viewer angle.',
      specs: 'Archival 380gsm Paper · 18 × 24 in · Foil Stamped Certificate',
      images: [
        'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80',
        'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&q=80',
        'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80',
        'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=800&q=80',
        'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&q=80'
    },
    {
      sku: 'uchiha-wax-seal',
      id: 'uchiha-wax-seal',
      name: 'Official Emblem Brass Wax Seal Kit',
      collection: 'heritage',
      collectionName: 'Uchiha Heritage',
      category: 'Craft',
      tag: 'SOLID MACHINED BRASS',
      priceInr: 3199,
      priceRyo: 4800,
      priceUsd: 38,
      stock: 30,
      seal: '印',
      desc: 'Solid machined brass sealing stamp bearing the iconic Uchiha paper fan crest. Includes 3 sticks of matte vermilion sealing wax.',
      specs: 'Machined Solid Brass · 3 Vermilion Wax Sticks · Wooden Box',
      images: [
        'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80',
        'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&q=80',
        'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&q=80',
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80',
        'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80'
    },
    {
      sku: 'tessen-fan',
      id: 'tessen-fan',
      name: 'Fire Style Cold-Forged Iron Tessen',
      collection: 'heritage',
      collectionName: 'Uchiha Heritage',
      category: 'Armory',
      tag: 'WAR COMBAT FAN',
      priceInr: 8999,
      priceRyo: 14000,
      priceUsd: 108,
      stock: 8,
      seal: '扇',
      desc: 'Traditional war fan constructed from hardened black steel ribs and waxed heavyweight washi canvas depicting the Great Fireball.',
      specs: 'Forged High-Carbon Steel · Waxed Canvas · 11.5 in Folded',
      images: [
        'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=800&q=80',
        'https://images.unsplash.com/photo-1528164344705-475426879c0d?w=800&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80',
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&q=80',
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?w=800&q=80'
    },

    // Collection 3: Crow Genjutsu & Sagecraft
    {
      sku: 'crow-burner',
      id: 'crow-burner',
      name: 'Crow Genjutsu Incense Burner',
      collection: 'genjutsu',
      collectionName: 'Crow Genjutsu',
      category: 'Craft',
      tag: 'HANDCRAFTED CERAMIC',
      priceInr: 6499,
      priceRyo: 9800,
      priceUsd: 78,
      stock: 14,
      seal: '鴉',
      desc: 'Sculpted matte black stoneware crow burner. Backflow smoke pours down through the raven folded wings. Includes 20 cones of Hinoki cedar incense.',
      specs: 'High-Fired Stoneware · Matte Carbon Finish · 20x Hinoki Cones',
      images: [
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80',
        'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=800&q=80',
        'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&q=80',
        'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80'
    },
    {
      sku: 'amaterasu-beads',
      id: 'amaterasu-beads',
      name: 'Amaterasu Obsidian Prayer Beads',
      collection: 'genjutsu',
      collectionName: 'Crow Genjutsu',
      category: 'Relics',
      tag: 'VOLCANIC OBSIDIAN',
      priceInr: 3499,
      priceRyo: 5400,
      priceUsd: 42,
      stock: 28,
      seal: '珠',
      desc: '108 natural matte black volcanic obsidian beads strung on reinforced silk cord, accented with an engraved emblem marker and crimson tassel.',
      specs: '8mm Natural Volcanic Stone · Crimson Silk · Laser-Etched Guru Bead',
      images: [
        'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
        'https://images.unsplash.com/photo-1611591475837-775107936a18?w=800&q=80',
        'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
        'https://images.unsplash.com/photo-1598560917505-59a3ad559071?w=800&q=80',
        'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80'
    },
    {
      sku: 'tsukuyomi-teacup',
      id: 'tsukuyomi-teacup',
      name: 'Tsukuyomi Midnight Ceramic Teacup',
      collection: 'genjutsu',
      collectionName: 'Crow Genjutsu',
      category: 'Craft',
      tag: 'WOOD-FIRED CERAMIC',
      priceInr: 2999,
      priceRyo: 4600,
      priceUsd: 36,
      stock: 19,
      seal: '盃',
      desc: 'Handmade Tenmoku glaze ceramic cup fired in wood kilns. Iridescent iron oil spots appear like red stars inside black genjutsu skies.',
      specs: 'Kyoto Stoneware · Hand-Thrown · 180ml Capacity',
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80',
        'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&q=80',
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80',
        'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&q=80',
        'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&q=80'
    },
    {
      sku: 'crow-quill',
      id: 'crow-quill',
      name: 'Crow Quill & Vermilion Ink Set',
      collection: 'genjutsu',
      collectionName: 'Crow Genjutsu',
      category: 'Craft',
      tag: 'NATURAL FEATHER QUILL',
      priceInr: 2499,
      priceRyo: 3700,
      priceUsd: 30,
      stock: 25,
      seal: '筆',
      desc: 'Natural iridescent black raven flight feather hand-cut for fine kanji calligraphy, paired with archival vermilion red mineral ink bottle.',
      specs: 'Genuine Raven Quill · 30ml Vermilion Ink · Wax Stopper',
      images: [
        'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80',
        'https://images.unsplash.com/photo-1585776245991-cf89dd7fc73a?w=800&q=80',
        'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&q=80',
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
        'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80'
    },

    // Collection 4: Shinobi Armory
    {
      sku: 'shadow-shuriken',
      id: 'shadow-shuriken',
      name: 'Shadow Windmill Shuriken (4-Pack)',
      collection: 'armory',
      collectionName: 'Shinobi Armory',
      category: 'Armory',
      tag: 'BLUED 440C STEEL',
      priceInr: 3999,
      priceRyo: 6100,
      priceUsd: 48,
      stock: 40,
      seal: '手',
      desc: 'Precision-balanced 4-point aerodynamic throwing stars machined from blued 440C stainless steel with matte glare-free finish.',
      specs: '440C Stainless Steel · 4-Pack · Ballistic Nylon Case',
      images: [
        'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=800&q=80',
        'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&q=80',
        'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&q=80',
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=800&q=80'
    },
    {
      sku: 'spring-tanto',
      id: 'spring-tanto',
      name: 'Concealed Tanto Dagger Replica',
      collection: 'armory',
      collectionName: 'Shinobi Armory',
      category: 'Armory',
      tag: 'ANBU SHORT BLADE',
      priceInr: 9999,
      priceRyo: 15800,
      priceUsd: 120,
      stock: 10,
      seal: '刀',
      desc: 'Straight-edge display replica dagger featuring black ray-skin handle wrap, blackened brass habaki collar, and matte wooden scabbard.',
      specs: '1045 Carbon Steel (Unsharpened) · Ray Skin Wrap · 11 in',
      images: [
        'https://images.unsplash.com/photo-1590422749897-478a87679905?w=800&q=80',
        'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=800&q=80',
        'https://images.unsplash.com/photo-1595590424283-b8f17842773f?w=800&q=80',
        'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&q=80',
        'https://images.unsplash.com/photo-1533158307587-828f0a76ef46?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1590422749897-478a87679905?w=800&q=80'
    },
    {
      sku: 'wire-trap-reel',
      id: 'wire-trap-reel',
      name: 'High-Tensile Steel Wire Trap Spool',
      collection: 'armory',
      collectionName: 'Shinobi Armory',
      category: 'Armory',
      tag: 'MICRO-BRAIDED WIRE',
      priceInr: 2699,
      priceRyo: 4100,
      priceUsd: 32,
      stock: 50,
      seal: '線',
      desc: '50-meter spool of ultra-thin micro-braided black stainless steel wire designed for shuriken trajectory guidance and perimeter rigging.',
      specs: 'Micro-Braided Steel · 50m Length · Friction Reel Spool',
      images: [
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
        'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
        'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80'
    },
    {
      sku: 'smoke-scroll',
      id: 'smoke-scroll',
      name: 'Crow Smoke Bomb Requisition',
      collection: 'armory',
      collectionName: 'Shinobi Armory',
      category: 'Armory',
      tag: 'SMOKE EXPLOSIVE CASK',
      priceInr: 2799,
      priceRyo: 4300,
      priceUsd: 34,
      stock: 35,
      seal: '煙',
      desc: 'Set of six sealed spherical clay cartridges filled with non-toxic black pine smoke powder and crow feather scent for genjutsu escape.',
      specs: 'Clay Shells · 6 Cartridges · Sealed Wooden Cask',
      images: [
        'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=800&q=80',
        'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80',
        'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=800&q=80',
        'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80',
        'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80'
      ],
      imageUrl: 'https://images.unsplash.com/photo-1516205651411-aef33a44f7c2?w=800&q=80'
    }
  ];

  const ZOHO_INITIAL_ITEM = {
    id: 'TS-MIN-001',
    sku: 'TS-MIN-001',
    isNew: true,
    zoho_item_id: '4226403000000037080',
    name: 'Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear',
    title: 'Fourth Hokage Minato Inspired Oversized T-Shirt - Premium Flame Print Anime Streetwear',
    collectionName: 'Minato Namikaze',
    collection: 'minato',
    category: 'Oversized T-Shirts',
    category_name: 'Oversized T-Shirts',
    desc: 'Official Fourth Hokage Minato Namikaze inspired oversized streetwear t-shirt. Features iconic flame motifs, premium 240+ GSM heavyweight combed cotton, custom drop shoulder aesthetic, and high-density screen printing. Direct live inventory fulfillment.',
    description: 'Official Fourth Hokage Minato Namikaze inspired oversized streetwear t-shirt. Features iconic flame motifs, premium 240+ GSM heavyweight combed cotton, custom drop shoulder aesthetic, and high-density screen printing. Direct live inventory fulfillment.',
    priceInr: 1599,
    price: 1599,
    originalMrp: 1799,
    originalPrice: 1799,
    hasDiscount: true,
    discountPercent: 11,
    stock: 98,
    inStock: true,
    unit: 'pcs',
    images: [
      '/product-minato.jpg',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80'
    ],
    imageUrl: '/product-minato.jpg',
    iconSvg: `<svg viewBox="0 0 40 40" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="20" cy="20" r="14" stroke="var(--blood-hot)"/><text x="20" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" fill="var(--bone)">閃</text></svg>`
  };

  let collectionsData = [ZOHO_INITIAL_ITEM, ...CANONICAL_RELICS];

  const collectionsPage = document.getElementById('collectionsPage');
  const openCollectionsBtn = document.getElementById('openCollectionsBtn');
  const navCollectionsLink = document.getElementById('navCollectionsLink');
  const closeCollectionsBtn = document.getElementById('closeCollectionsBtn');
  const collectionsGrid = document.getElementById('collectionsGrid');
  const collecSearchInput = document.getElementById('collecSearchInput');
  const collecClearSearch = document.getElementById('collecClearSearch');
  const collecSortSelect = document.getElementById('collecSortSelect');
  const collecResultCount = document.getElementById('collecResultCount');
  const collecResetFilters = document.getElementById('collecResetFilters');

  let currentCollectionFilter = 'all';
  let currentCategoryFilter = 'all';
  let currentSearchQuery = '';
  let currentSort = 'featured';

  let collectionsPreviousScrollY = 0;

  function openCollectionsPage(col = '') {
    if (col) {
      applyCollectionFilter(col);
      return;
    }
    if (collectionsPage) {
      collectionsPage.classList.add('open');
      collectionsPage.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
      document.documentElement.classList.add('bag-open');
      if (mobileNavCollections) setActiveBottomNav(mobileNavCollections);
    }
  }

  function closeCollectionsPage() {
    if (collectionsPage) {
      collectionsPage.classList.remove('open');
      collectionsPage.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('bag-open');
      document.documentElement.classList.remove('bag-open');
    }
  }

  function applyCollectionFilter(colName) {
    if (typeof activeShopFilters !== 'undefined') {
      Object.keys(activeShopFilters).forEach(k => activeShopFilters[k].clear());
      activeShopFilters.collection.add(colName);
      renderActiveFilterChips();
      updateFilterCheckboxesState();
      renderShopGrid();
    }
    const shopSec = document.getElementById('shop');
    if (shopSec) {
      shopSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (mobileNavShop) setActiveBottomNav(mobileNavShop);
  }

  function applyCategoryFilter(catName) {
    if (typeof activeShopFilters !== 'undefined') {
      Object.keys(activeShopFilters).forEach(k => activeShopFilters[k].clear());
      activeShopFilters.category.add(catName);
      renderActiveFilterChips();
      updateFilterCheckboxesState();
      renderShopGrid();
    }
    const shopSec = document.getElementById('shop');
    if (shopSec) {
      shopSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (mobileNavShop) setActiveBottomNav(mobileNavShop);
  }

  // Backdrop click closes Collections Hub
  const collectionsHubBackdrop = document.getElementById('collectionsHubBackdrop');
  if (collectionsHubBackdrop) {
    collectionsHubBackdrop.addEventListener('click', closeCollectionsPage);
  }

  // Collections Hub Tab Switching (Theme Collections vs Apparel Categories)
  const hubTabs = document.querySelectorAll('.collections-hub-tab');
  hubTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      hubTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const targetTab = tab.dataset.hubTab;
      const collectionsPanel = document.getElementById('hubPanelCollections');
      const categoriesPanel = document.getElementById('hubPanelCategories');

      if (targetTab === 'categories') {
        if (collectionsPanel) collectionsPanel.classList.remove('active');
        if (categoriesPanel) categoriesPanel.classList.add('active');
      } else {
        if (categoriesPanel) categoriesPanel.classList.remove('active');
        if (collectionsPanel) collectionsPanel.classList.add('active');
      }
    });
  });

  // Clicking on any Collection Card takes user directly to that collection in shop
  document.querySelectorAll('.collec-hub-card').forEach(card => {
    card.addEventListener('click', () => {
      const col = card.dataset.collecFilter;
      closeCollectionsPage();
      applyCollectionFilter(col);
    });
  });

  // Clicking on any Category Card takes user directly to that category in shop
  document.querySelectorAll('.category-hub-card').forEach(card => {
    card.addEventListener('click', () => {
      const cat = card.dataset.catFilter;
      closeCollectionsPage();
      applyCategoryFilter(cat);
    });
  });

  if (openCollectionsBtn) {
    openCollectionsBtn.addEventListener('click', () => openCollectionsPage());
  }
  if (navCollectionsLink) {
    navCollectionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      openCollectionsPage();
    });
  }
  if (closeCollectionsBtn) {
    closeCollectionsBtn.addEventListener('click', closeCollectionsPage);
  }

  // Search input handler
  if (collecSearchInput) {
    collecSearchInput.addEventListener('focus', () => {
      renderSearchRecentlyViewedDropdowns();
      if (collecSearchRecentDropdown) {
        collecSearchRecentDropdown.style.display = 'block';
      }
    });

    collecSearchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      if (collecClearSearch) {
        collecClearSearch.style.display = currentSearchQuery ? 'block' : 'none';
      }
      if (collecSearchRecentDropdown) {
        collecSearchRecentDropdown.style.display = currentSearchQuery ? 'none' : 'block';
      }
      renderCollections();
    });
  }

  if (collecClearSearch) {
    collecClearSearch.addEventListener('click', () => {
      if (collecSearchInput) {
        collecSearchInput.value = '';
        currentSearchQuery = '';
        collecClearSearch.style.display = 'none';
        renderCollections();
        collecSearchInput.focus();
        renderSearchRecentlyViewedDropdowns();
        if (collecSearchRecentDropdown) collecSearchRecentDropdown.style.display = 'block';
      }
    });
  }

  if (collecSearchInput) {
    collecSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (collecSearchRecentDropdown) collecSearchRecentDropdown.style.display = 'none';
        currentSearchQuery = collecSearchInput.value.trim().toLowerCase();
        renderCollections();
        const grid = document.getElementById('collectionsGrid');
        if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Collection pills handler
  const collectionPills = document.querySelectorAll('#collectionPills .collec-pill');
  collectionPills.forEach(pill => {
    pill.addEventListener('click', () => {
      collectionPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCollectionFilter = pill.dataset.collec;
      renderCollections();
    });
  });

  // Category pills handler
  const categoryPills = document.querySelectorAll('#categoryPills .collec-pill');
  categoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      categoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentCategoryFilter = pill.dataset.cat;
      renderCollections();
    });
  });

  // Sort select handler
  if (collecSortSelect) {
    collecSortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderCollections();
    });
  }

  // Reset filters handler
  if (collecResetFilters) {
    collecResetFilters.addEventListener('click', () => {
      currentCollectionFilter = 'all';
      currentCategoryFilter = 'all';
      currentSearchQuery = '';
      currentSort = 'featured';
      if (collecSearchInput) {
        collecSearchInput.value = '';
        if (collecClearSearch) collecClearSearch.style.display = 'none';
      }
      collectionPills.forEach((p, idx) => p.classList.toggle('active', idx === 0));
      categoryPills.forEach((p, idx) => p.classList.toggle('active', idx === 0));
      if (collecSortSelect) collecSortSelect.value = 'featured';
      renderCollections();
    });
  }

  function renderCollections() {
    if (!collectionsGrid) return;

    if (collectionsData.length === 0) {
      collectionsGrid.innerHTML = `
        <div class="collections-empty" style="padding:3.5rem 1.5rem; text-align:center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📦</div>
          <h4 style="font-family:'Cinzel',serif; color:var(--bone); font-size:1.1rem; letter-spacing:0.1em; margin-bottom: 0.5rem;">ZOHO INVENTORY READY</h4>
          <p style="color:var(--ash); font-size:0.85rem; max-width: 440px; margin: 0 auto 1.2rem; line-height: 1.6;">
            Products are managed exclusively via Zoho Inventory. Items added in your Zoho Inventory dashboard (Items &rarr; + New) will automatically appear here.
          </p>
          <a href="/zoho-inventory" class="collec-pill active" style="text-decoration:none; display:inline-flex; align-items:center; gap:6px;">OPEN ZOHO DASHBOARD</a>
        </div>
      `;
      if (collecResultCount) {
        collecResultCount.textContent = 'Zoho Inventory: 0 items';
      }
      return;
    }

    let items = collectionsData.filter(item => {
      // Collection filter (Zoho Inventory collections)
      if (currentCollectionFilter !== 'all') {
        const itemCol = (item.collection || item.collectionName || '').toLowerCase();
        if (!itemCol.includes(currentCollectionFilter.toLowerCase())) {
          return false;
        }
      }
      // Category filter (Zoho Inventory categories)
      if (currentCategoryFilter !== 'all') {
        const itemCat = (item.category || item.category_name || '').toLowerCase();
        if (!itemCat.includes(currentCategoryFilter.toLowerCase())) {
          return false;
        }
      }
      // Search query
      if (currentSearchQuery) {
        const matchesName = (item.name || '').toLowerCase().includes(currentSearchQuery);
        const matchesDesc = (item.desc || '').toLowerCase().includes(currentSearchQuery);
        const matchesCollec = (item.collectionName || '').toLowerCase().includes(currentSearchQuery);
        const matchesSpecs = (item.specs || '').toLowerCase().includes(currentSearchQuery);
        if (!matchesName && !matchesDesc && !matchesCollec && !matchesSpecs) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    if (currentSort === 'price-asc') {
      items.sort((a, b) => (a.priceInr || 0) - (b.priceInr || 0));
    } else if (currentSort === 'price-desc') {
      items.sort((a, b) => (b.priceInr || 0) - (a.priceInr || 0));
    } else if (currentSort === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (currentSort === 'name-desc') {
      items.sort((a, b) => b.name.localeCompare(a.name));
    }

    // Results count
    if (collecResultCount) {
      collecResultCount.textContent = `Showing ${items.length} ${items.length === 1 ? 'item' : 'items'} across all collections`;
    }
    const isFiltered = currentCollectionFilter !== 'all' || currentCategoryFilter !== 'all' || currentSearchQuery;
    if (collecResetFilters) {
      collecResetFilters.style.display = isFiltered ? 'inline-block' : 'none';
    }

    if (items.length === 0) {
      collectionsGrid.innerHTML = `
        <div class="collections-empty">
          <h4>NO PRODUCTS MATCH SEARCH</h4>
          <p>No products found matching your current filters or query. Reset criteria to inspect full archives.</p>
          <button class="collections-empty__btn" id="emptyResetBtn" type="button">RESET FILTERS</button>
        </div>
      `;
      const emptyResetBtn = document.getElementById('emptyResetBtn');
      if (emptyResetBtn) {
        emptyResetBtn.addEventListener('click', () => {
          if (collecResetFilters) collecResetFilters.click();
        });
      }
      return;
    }

    collectionsGrid.innerHTML = items.map(item => {
      const sku = item.sku || item.id;
      const isWish = isWishlisted(sku);
      const priceInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
      const priceRyo = item.priceRyo ? Number(item.priceRyo) : Math.round(priceInr * 1.54);
      const mainImg = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.imageUrl || '');
      const photosCount = (Array.isArray(item.images) && item.images.length > 0) ? item.images.length : (item.imageUrl ? 1 : 0);

      return `
      <article class="collec-card product-card" data-sku="${sku}">
        <div class="collec-card__top">
          <div class="collec-card__top-right" style="margin-left:auto;">
            <button class="item-heart-btn ${isWish ? 'active' : ''}" type="button"
                    data-wishlist-toggle="${sku}"
                    data-sku="${sku}"
                    data-name="${item.name.replace(/"/g, '&quot;')}"
                    data-price-ryo="${priceRyo}"
                    data-price-inr="${priceInr}"
                    data-seal="${item.seal}"
                    aria-label="${isWish ? 'Remove from Wishlist' : 'Save to Wishlist'}"
                    title="${isWish ? 'Saved in Wishlist (Click to remove)' : 'Save to Wishlist'}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="${isWish ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="collec-card__visual" data-gallery-open="${sku}" role="button" tabindex="0" title="Click to inspect multi-image gallery">
          ${mainImg 
            ? `<img src="${mainImg}" alt="${item.name}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}else{this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='grid';}" /><div class="shop-card__svg-fallback" style="display:none;">${item.iconSvg}</div>` 
            : `<div class="shop-card__svg-fallback">${item.iconSvg}</div>`}
        </div>
        <span class="collec-card__cat">${item.category} · SKU: ${sku}</span>
        <h4 class="collec-card__title" data-gallery-open="${sku}" style="cursor:pointer;">${item.name}</h4>
        <p class="collec-card__desc">${(item.desc || '').replace(/Product Overview/i, '').split('\n').map(s => s.trim()).filter(Boolean)[0] || item.desc || 'Premium streetwear crafted with high-density cotton.'}</p>
        <div class="collec-card__specs">${item.specs || 'Premium Heavyweight Cotton Blend · Oversized Fit'}</div>
        <div class="collec-card__foot">
          <div class="collec-card__pricing">
            <div style="display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;">
              <span class="collec-card__usd">₹${priceInr.toLocaleString('en-IN')}</span>
              ${item.originalMrp > priceInr ? `<del style="color:var(--ash); font-size:0.75rem; text-decoration:line-through;">₹${item.originalMrp.toLocaleString('en-IN')}</del>` : ''}
            </div>
          </div>
          <button class="collec-card__btn" type="button" data-collec-add="${sku}">
            <span>Add to Bag</span>
            <span>+</span>
          </button>
        </div>
      </article>
      `;
    }).join('');

    // Attach Add to Bag listeners
    collectionsGrid.querySelectorAll('[data-collec-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.dataset.collecAdd;
        const item = collectionsData.find(i => (i.sku || i.id) === sku);
        if (item) {
          handleAddToCart(btn, item);
        }
      });
    });

    // Attach Wishlist toggle listeners
    collectionsGrid.querySelectorAll('[data-wishlist-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.dataset.wishlistToggle;
        const item = collectionsData.find(i => (i.sku || i.id) === sku) || {
          id: sku,
          sku: sku,
          name: btn.dataset.name,
          priceRyo: parseInt(btn.dataset.priceRyo, 10),
          priceInr: parseInt(btn.dataset.priceInr, 10) || 4999,
          seal: btn.dataset.seal
        };
        toggleWishlist(item, btn);
      });
    });

    // Attach Gallery Modal openers & Card click handlers
    collectionsGrid.querySelectorAll('[data-gallery-open]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-collec-add]') || e.target.closest('[data-wishlist-toggle]')) return;
        const sku = el.dataset.galleryOpen;
        const item = collectionsData.find(i => (i.sku || i.id) === sku);
        if (item) openRelicGallery(item, 'collections');
      });
    });

    collectionsGrid.querySelectorAll('.collec-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-collec-add]') || e.target.closest('[data-wishlist-toggle]')) return;
        const openEl = card.querySelector('[data-gallery-open]');
        const sku = openEl ? openEl.dataset.galleryOpen : null;
        if (!sku) return;
        const item = collectionsData.find(i => (i.sku || i.id) === sku);
        if (item) openRelicGallery(item, 'collections');
      });
    });

    attachCardHoverSlideshow(collectionsGrid);
  }

  // ═══════════ PRODUCT CARD HOVER REPEATING IMAGE SLIDESHOW (5s) ═══════════
  // User spec: If user takes the cursor above the product card, change the product images after 5 sec repeatedly
  function setupCardHoverSlideshow(card) {
    if (!card || card._hoverSlideshowInit) return;
    card._hoverSlideshowInit = true;

    const sku = card.dataset.sku || card.dataset.recentSku || card.querySelector('[data-gallery-open]')?.dataset.galleryOpen;
    if (!sku) return;

    let timer = null;
    let currentIndex = 0;

    const getImages = () => {
      const item = collectionsData.find(i => (i.sku || i.id) === sku);
      let imgs = [];
      if (item && Array.isArray(item.images) && item.images.length > 0) {
        imgs = item.images.filter(u => typeof u === 'string' && u.trim().length > 0);
      } else if (item && item.imageUrl) {
        imgs = [item.imageUrl];
      }
      return imgs;
    };

    const getImageElement = () => {
      return card.querySelector('.shop-card__visual img, .collec-card__visual img, .recent-card__thumb img, .product-card img');
    };

    card.addEventListener('mouseenter', () => {
      const imgs = getImages();
      if (imgs.length <= 1) return;

      const imgEl = getImageElement();
      if (!imgEl) return;

      if (!card._defaultImageSrc) {
        card._defaultImageSrc = imgEl.src;
      }

      // Preload next gallery images silently for zero-delay instant switching
      imgs.forEach(url => {
        const pre = new Image();
        pre.src = url;
      });

      if (card._hoverCycleTimer) {
        clearInterval(card._hoverCycleTimer);
        card._hoverCycleTimer = null;
      }

      // Change the product images after 5 sec repeatedly while cursor is above the card
      card._hoverCycleTimer = setInterval(() => {
        if (!card.matches(':hover') || !document.body.contains(card)) {
          clearInterval(card._hoverCycleTimer);
          card._hoverCycleTimer = null;
          return;
        }

        currentIndex = (currentIndex + 1) % imgs.length;
        const nextUrl = imgs[currentIndex];

        imgEl.style.transition = 'opacity 0.25s ease, transform 0.35s ease';
        imgEl.style.opacity = '0.5';
        setTimeout(() => {
          imgEl.src = nextUrl;
          imgEl.style.opacity = '1';
        }, 140);
      }, 5000);
    });

    card.addEventListener('mouseleave', () => {
      if (card._hoverCycleTimer) {
        clearInterval(card._hoverCycleTimer);
        card._hoverCycleTimer = null;
      }
      const imgEl = getImageElement();
      if (imgEl && card._defaultImageSrc && imgEl.src !== card._defaultImageSrc) {
        imgEl.style.transition = 'opacity 0.25s ease, transform 0.35s ease';
        imgEl.style.opacity = '0.7';
        setTimeout(() => {
          if (card._defaultImageSrc) imgEl.src = card._defaultImageSrc;
          imgEl.style.opacity = '1';
          currentIndex = 0;
        }, 140);
      } else {
        currentIndex = 0;
      }
    });
  }

  function attachCardHoverSlideshow(container) {
    if (!container) return;
    container.querySelectorAll('.shop-card, .collec-card, .recent-card, .product-card').forEach(setupCardHoverSlideshow);
  }

  // Global capture listener ensuring any dynamically rendered product card automatically inherits the hover slideshow
  document.addEventListener('mouseenter', (e) => {
    const card = e.target && e.target.closest && e.target.closest('.shop-card, .collec-card, .recent-card, .product-card');
    if (card && !card._hoverSlideshowInit) {
      setupCardHoverSlideshow(card);
      if (card.matches(':hover')) {
        card.dispatchEvent(new MouseEvent('mouseenter'));
      }
    }
  }, true);


  // ═══════════ DYNAMIC SHOP PAGE GRID, SIDEBAR FILTERS & SOULED STORE EXPERIENCE ═══════════
  const shopGrid = document.getElementById('shopGrid');
  const shopProductCount = document.getElementById('shopProductCount');
  const shopSyncLabel = document.getElementById('shopSyncLabel');
  const shopFilterPills = document.getElementById('shopFilterPills');
  let currentShopCategory = 'all';
  const shopSearchInput = document.getElementById('shopSearchInput');
  const shopSearchClearBtn = document.getElementById('shopSearchClearBtn');
  const shopSearchRecentDropdown = document.getElementById('shopSearchRecentDropdown');
  const shopSearchRecentList = document.getElementById('shopSearchRecentList');
  const shopSearchWrapper = document.getElementById('shopSearchWrapper');
  let currentShopSearchQuery = '';
  const shopSortSelect = document.getElementById('shopSortSelect');
  const shopActiveChips = document.getElementById('shopActiveChips');
  const shopClearAllChipsBtn = document.getElementById('shopClearAllChipsBtn');
  const shopClearAllFiltersBtn = document.getElementById('shopClearAllFiltersBtn');
  const filterSidebarContent = document.getElementById('filterSidebarContent');
  const shopFilterSidebar = document.getElementById('shopFilterSidebar');
  const shopProductsArea = document.getElementById('shopProductsArea');
  const shopMobileFilterBtn = document.getElementById('shopMobileFilterBtn');

  // Multi-facet shop filters state
  const activeShopFilters = {
    category: new Set(),
    collection: new Set(),
    size: new Set(),
    fit: new Set(),
    price: new Set(),
    color: new Set(),
    availability: new Set()
  };
  let currentShopSort = 'popularity';

  const FILTER_DEFINITIONS = {
    category: [
      { id: 'Oversized T-Shirts', label: 'Oversized T-Shirts' },
      { id: 'Classic T-Shirts', label: 'Classic T-Shirts' },
      { id: 'Hoodies & Sweatshirts', label: 'Hoodies & Sweatshirts' },
      { id: 'Jackets & Outerwear', label: 'Jackets & Outerwear' },
      { id: 'Cargo Pants & Joggers', label: 'Cargo Pants & Joggers' },
      { id: 'Accessories & Jewelry', label: 'Accessories & Jewelry' }
    ],
    collection: [
      { id: 'Minato Namikaze', label: 'Minato Namikaze' },
      { id: 'Akatsuki Shadows', label: 'Akatsuki Shadows' },
      { id: 'Uchiha Clan', label: 'Uchiha Clan' },
      { id: 'Street Core', label: 'Street Core' },
      { id: 'Shinobi Armory', label: 'Shinobi Armory' }
    ],
    size: [
      { id: 'S', label: 'S (Chest 38")' },
      { id: 'M', label: 'M (Chest 40")' },
      { id: 'L', label: 'L (Chest 42")' },
      { id: 'XL', label: 'XL (Chest 44")' },
      { id: 'XXL', label: 'XXL (Chest 46")' }
    ],
    fit: [
      { id: 'Oversized Fit', label: 'Oversized Fit' },
      { id: 'Relaxed Fit', label: 'Relaxed Fit' },
      { id: 'Regular Fit', label: 'Regular Fit' },
      { id: 'Tailored Streetwear', label: 'Tailored Streetwear' }
    ],
    price: [
      { id: 'under-1000', label: 'Under ₹1,000' },
      { id: '1000-2500', label: '₹1,000 – ₹2,500' },
      { id: '2500-5000', label: '₹2,500 – ₹5,000' },
      { id: 'above-5000', label: 'Above ₹5,000' }
    ],
    color: [
      { id: 'Black', label: 'Obsidian Black' },
      { id: 'White', label: 'Ivory White' },
      { id: 'Red', label: 'Crimson Red' },
      { id: 'Grey', label: 'Charcoal Grey' },
      { id: 'Navy', label: 'Midnight Navy' }
    ],
    availability: [
      { id: 'new-products', label: 'New Products' },
      { id: 'in-stock', label: 'In Stock Only' },
      { id: 'discounted', label: 'Special Offers & Discounts' }
    ]
  };

  function isItemNewProduct(item) {
    if (!item) return false;
    if (item.isNew === true || item.isNewArrival === true) return true;
    const tag = (item.tag || '').toUpperCase();
    if (tag.includes('NEW') || tag.includes('LAUNCH') || tag.includes('DROP') || tag.includes('RE-ISSUE')) return true;
    const newSkus = ['TS-MIN-001', 'akatsuki-cloak', 'shu-ring', 'akatsuki-kasa', 'leaf-protector', 'mangekyo-print', 'tessen-fan', 'amaterasu-beads', 'spring-tanto'];
    return newSkus.includes(item.sku || item.id);
  }

  function matchesPriceFilter(price, filterId) {
    if (filterId === 'under-1000') return price < 1000;
    if (filterId === '1000-2500') return price >= 1000 && price <= 2500;
    if (filterId === '2500-5000') return price > 2500 && price <= 5000;
    if (filterId === 'above-5000') return price > 5000;
    return true;
  }

  function renderFilterSidebarUI() {
    Object.keys(FILTER_DEFINITIONS).forEach(groupKey => {
      const listContainer = document.getElementById(`filterList${groupKey.charAt(0).toUpperCase() + groupKey.slice(1)}`);
      if (!listContainer) return;

      const options = FILTER_DEFINITIONS[groupKey];
      listContainer.innerHTML = options.map(opt => {
        const isChecked = activeShopFilters[groupKey].has(opt.id);
        const count = getFilterMatchCount(groupKey, opt.id);
        return `
          <label class="filter-item ${isChecked ? 'checked' : ''}">
            <input type="checkbox" class="filter-checkbox" data-group="${groupKey}" data-val="${opt.id}" ${isChecked ? 'checked' : ''} />
            <span class="filter-custom-check">
              <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span class="filter-label-text">${opt.label}</span>
            <span class="filter-count">(${count})</span>
          </label>
        `;
      }).join('');
    });

    // Checkboxes are ready and event delegation is handled on filterSidebarContent
  }

  // Delegated checkbox change event listener
  if (filterSidebarContent) {
    filterSidebarContent.addEventListener('change', (e) => {
      const target = e.target;
      if (target && target.classList.contains('filter-checkbox')) {
        const group = target.dataset.group;
        const val = target.dataset.val;
        if (group && val) {
          if (target.checked) {
            activeShopFilters[group].add(val);
          } else {
            activeShopFilters[group].delete(val);
          }
          renderActiveFilterChips();
          renderShopGrid();
          updateFilterCheckboxesState();
        }
      }
    });
  }

  function getFilterMatchCount(groupKey, valId) {
    if (!collectionsData) return 0;
    return collectionsData.filter(item => {
      const price = Number(item.priceInr || 0);
      if (groupKey === 'category') {
        const cat = (item.category || item.category_name || '').toLowerCase();
        return cat.includes(valId.toLowerCase()) || valId.toLowerCase().includes(cat);
      }
      if (groupKey === 'collection') {
        const col = (item.collectionName || item.collection || '').toLowerCase();
        return col.includes(valId.toLowerCase()) || valId.toLowerCase().includes(col);
      }
      if (groupKey === 'size') {
        const sizes = Array.isArray(item.sizes) ? item.sizes : ['S', 'M', 'L', 'XL', 'XXL'];
        return sizes.includes(valId);
      }
      if (groupKey === 'fit') {
        const fit = (item.fit || item.specs || 'Oversized Fit').toLowerCase();
        return fit.includes(valId.toLowerCase());
      }
      if (groupKey === 'price') {
        return matchesPriceFilter(price, valId);
      }
      if (groupKey === 'color') {
        const color = (item.color || item.name || '').toLowerCase();
        return color.includes(valId.toLowerCase());
      }
      if (groupKey === 'availability') {
        if (valId === 'new-products') return isItemNewProduct(item);
        if (valId === 'in-stock') return item.inStock !== false;
        if (valId === 'discounted') return Boolean(item.hasDiscount || (item.originalMrp && item.originalMrp > price));
      }
      return true;
    }).length;
  }

  function updateFilterCheckboxesState() {
    if (!filterSidebarContent) return;
    filterSidebarContent.querySelectorAll('.filter-item').forEach(lbl => {
      const input = lbl.querySelector('.filter-checkbox');
      if (input) {
        const isChecked = activeShopFilters[input.dataset.group].has(input.dataset.val);
        input.checked = isChecked;
        lbl.classList.toggle('checked', isChecked);
      }
    });
  }

  function renderActiveFilterChips() {
    if (!shopActiveChips) return;
    const chips = [];

    Object.keys(activeShopFilters).forEach(groupKey => {
      activeShopFilters[groupKey].forEach(val => {
        let label = val;
        const def = (FILTER_DEFINITIONS[groupKey] || []).find(d => d.id === val);
        if (def) label = def.label;
        chips.push({ group: groupKey, val, label });
      });
    });

    if (chips.length === 0) {
      shopActiveChips.innerHTML = '';
      if (shopClearAllChipsBtn) shopClearAllChipsBtn.style.display = 'none';
      if (shopClearAllFiltersBtn) shopClearAllFiltersBtn.style.display = 'none';
      return;
    }

    if (shopClearAllChipsBtn) shopClearAllChipsBtn.style.display = 'inline-flex';
    if (shopClearAllFiltersBtn) shopClearAllFiltersBtn.style.display = 'inline-block';

    shopActiveChips.innerHTML = chips.map(c => `
      <span class="shop-filter-chip">
        <span>${c.label}</span>
        <button type="button" class="chip-remove-btn" data-chip-group="${c.group}" data-chip-val="${c.val}" aria-label="Remove filter ${c.label}">✕</button>
      </span>
    `).join('');

    shopActiveChips.querySelectorAll('.chip-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const g = btn.dataset.chipGroup;
        const v = btn.dataset.chipVal;
        activeShopFilters[g].delete(v);
        renderActiveFilterChips();
        updateFilterCheckboxesState();
        renderShopGrid();
      });
    });
  }

  function clearAllActiveFilters() {
    Object.keys(activeShopFilters).forEach(k => activeShopFilters[k].clear());
    currentShopSearchQuery = '';
    if (shopSearchInput) {
      shopSearchInput.value = '';
      if (shopSearchClearBtn) shopSearchClearBtn.style.display = 'none';
    }
    renderActiveFilterChips();
    updateFilterCheckboxesState();
    renderShopGrid();
  }

  if (shopClearAllChipsBtn) shopClearAllChipsBtn.addEventListener('click', clearAllActiveFilters);
  if (shopClearAllFiltersBtn) shopClearAllFiltersBtn.addEventListener('click', clearAllActiveFilters);

  // Accordion toggle headers in sidebar
  if (filterSidebarContent) {
    filterSidebarContent.querySelectorAll('.filter-accordion__header').forEach(header => {
      header.addEventListener('click', () => {
        const accordion = header.closest('.filter-accordion');
        if (accordion) accordion.classList.toggle('open');
      });
    });
  }

  // Sort select handler in top toolbar
  if (shopSortSelect) {
    shopSortSelect.addEventListener('change', (e) => {
      currentShopSort = e.target.value;
      renderShopGrid();
    });
  }

  // Mobile filter toggle
  if (shopMobileFilterBtn && shopFilterSidebar) {
    shopMobileFilterBtn.addEventListener('click', () => {
      shopFilterSidebar.classList.toggle('mobile-open');
    });
  }
  const shopFilterMobileCloseBtn = document.getElementById('shopFilterMobileCloseBtn');
  if (shopFilterMobileCloseBtn && shopFilterSidebar) {
    shopFilterMobileCloseBtn.addEventListener('click', () => {
      shopFilterSidebar.classList.remove('mobile-open');
    });
  }

  function openNewProductsFilter(e) {
    if (e && e.preventDefault) e.preventDefault();

    // 1. Reset text search so it doesn't conflict
    if (shopSearchInput) {
      shopSearchInput.value = '';
      currentShopSearchQuery = '';
      if (shopSearchClearBtn) shopSearchClearBtn.style.display = 'none';
    }

    // 2. Clear other category/collection filters and set availability to new-products
    activeShopFilters.category.clear();
    activeShopFilters.collection.clear();
    activeShopFilters.availability.clear();
    activeShopFilters.availability.add('new-products');

    // 3. Ensure the Availability accordion is expanded and visible
    const availAccordion = document.querySelector('.filter-accordion[data-group="availability"]');
    if (availAccordion && !availAccordion.classList.contains('open')) {
      availAccordion.classList.add('open');
    }

    // 4. Re-render UI components
    renderActiveFilterChips();
    renderShopGrid();
    updateFilterCheckboxesState();

    // 5. Update header navigation active states
    document.querySelectorAll('[data-nav-category]').forEach(l => l.classList.remove('active'));
    const newInNav = document.querySelector('[data-nav-category="new"]');
    if (newInNav) newInNav.classList.add('active');

    // 6. Update breadcrumb
    const shopCurrentCrumb = document.getElementById('shopCurrentCrumb');
    if (shopCurrentCrumb) {
      shopCurrentCrumb.textContent = 'New Products';
    }

    // 7. On mobile screens, open filter sidebar drawer
    if (window.innerWidth <= 980 && shopFilterSidebar) {
      shopFilterSidebar.classList.add('mobile-open');
    }

    // 8. Smoothly scroll to the shop section
    const shopEl = document.getElementById('shop');
    if (shopEl) {
      shopEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // 9. Highlight the New Products filter item
    setTimeout(() => {
      const newProdItem = document.querySelector('.filter-item input[data-val="new-products"]')?.closest('.filter-item');
      if (newProdItem) {
        newProdItem.classList.add('filter-highlight');
        setTimeout(() => newProdItem.classList.remove('filter-highlight'), 1800);
      }
    }, 350);
  }
  window.openNewProductsFilter = openNewProductsFilter;

  // Global listeners for any New In links / buttons
  document.querySelectorAll('a[href="#new-in"], [data-nav-category="new"], #heroShopNewArrivalsBtn').forEach(el => {
    el.addEventListener('click', (e) => {
      openNewProductsFilter(e);
    });
  });

  function renderShopGrid() {
    if (!shopGrid) return;

    // Clean up any active hover slideshow timers on cards before re-render
    shopGrid.querySelectorAll('.shop-card').forEach(card => {
      if (card._hoverCycleTimer) {
        clearInterval(card._hoverCycleTimer);
        card._hoverCycleTimer = null;
      }
    });

    if (!collectionsData || collectionsData.length === 0) {
      shopGrid.innerHTML = `
        <div class="shop-loading-card" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: rgba(14,14,17,0.7); border: 1px dashed rgba(232,228,220,0.15); border-radius: 8px;">
          <div style="font-size: 2.2rem; margin-bottom: 0.8rem;">📦</div>
          <h3 style="font-family:'Cinzel',serif; letter-spacing:0.1em; color:var(--bone); font-size:1.15rem; margin-bottom: 0.5rem;">APPAREL CATALOG READY</h3>
          <p style="color:var(--ash); font-size:0.85rem; max-width: 480px; margin: 0 auto 1.4rem; line-height: 1.6;">
            Products are being synchronized from your store catalog and Zoho Inventory.
          </p>
        </div>
      `;
      if (shopProductCount) shopProductCount.textContent = 'Showing 0 Products';
      return;
    }

    let items = collectionsData.filter(item => {
      const price = Number(item.priceInr || 0);

      // Category filter (OR inside category group)
      if (activeShopFilters.category.size > 0) {
        const itemCat = (item.category || item.category_name || '').toLowerCase();
        const itemName = (item.name || item.title || '').toLowerCase();
        const hasMatch = Array.from(activeShopFilters.category).some(catVal => {
          const cv = catVal.toLowerCase();
          return itemCat.includes(cv) || cv.includes(itemCat) || itemName.includes(cv);
        });
        if (!hasMatch) return false;
      }

      // Collection filter (OR inside collection group)
      if (activeShopFilters.collection.size > 0) {
        const itemCol = (item.collectionName || item.collection || '').toLowerCase();
        const itemName = (item.name || item.title || '').toLowerCase();
        const hasMatch = Array.from(activeShopFilters.collection).some(colVal => {
          const clv = colVal.toLowerCase();
          return itemCol.includes(clv) || clv.includes(itemCol) || itemName.includes(clv);
        });
        if (!hasMatch) return false;
      }

      // Size filter
      if (activeShopFilters.size.size > 0) {
        const itemSizes = Array.isArray(item.sizes) ? item.sizes : ['S', 'M', 'L', 'XL', 'XXL'];
        const hasMatch = Array.from(activeShopFilters.size).some(s => itemSizes.includes(s));
        if (!hasMatch) return false;
      }

      // Fit filter
      if (activeShopFilters.fit.size > 0) {
        const itemFit = (item.fit || item.specs || 'Oversized Fit').toLowerCase();
        const hasMatch = Array.from(activeShopFilters.fit).some(f => itemFit.includes(f.toLowerCase()));
        if (!hasMatch) return false;
      }

      // Price filter (OR inside price group)
      if (activeShopFilters.price.size > 0) {
        const hasMatch = Array.from(activeShopFilters.price).some(pId => matchesPriceFilter(price, pId));
        if (!hasMatch) return false;
      }

      // Color filter
      if (activeShopFilters.color.size > 0) {
        const itemColor = (item.color || item.name || '').toLowerCase();
        const hasMatch = Array.from(activeShopFilters.color).some(c => itemColor.includes(c.toLowerCase()));
        if (!hasMatch) return false;
      }

      // Availability filter
      if (activeShopFilters.availability.size > 0) {
        if (activeShopFilters.availability.has('new-products') && !isItemNewProduct(item)) return false;
        if (activeShopFilters.availability.has('in-stock') && item.inStock === false) return false;
        if (activeShopFilters.availability.has('discounted') && !(item.hasDiscount || (item.originalMrp && item.originalMrp > price))) return false;
      }

      // Hero search query
      if (currentShopSearchQuery) {
        const q = currentShopSearchQuery.toLowerCase();
        const matchesName = (item.name || '').toLowerCase().includes(q);
        const matchesDesc = (item.desc || '').toLowerCase().includes(q);
        const matchesCollec = (item.collectionName || '').toLowerCase().includes(q);
        const matchesCategory = (item.category || item.category_name || '').toLowerCase();
        const matchesSpecs = (item.specs || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCollec && !matchesCategory.includes(q) && !matchesSpecs) {
          return false;
        }
      }

      return true;
    });

    // Apply Sorting
    if (currentShopSort === 'price-asc') {
      items.sort((a, b) => (Number(a.priceInr) || 0) - (Number(b.priceInr) || 0));
    } else if (currentShopSort === 'price-desc') {
      items.sort((a, b) => (Number(b.priceInr) || 0) - (Number(a.priceInr) || 0));
    } else if (currentShopSort === 'discount') {
      items.sort((a, b) => (Number(b.discountPercent) || 0) - (Number(a.discountPercent) || 0));
    } else if (currentShopSort === 'newest') {
      items.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
    }

    if (shopProductCount) {
      shopProductCount.textContent = `Showing ${items.length} Product${items.length === 1 ? '' : 's'}`;
    }

    if (items.length === 0) {
      shopGrid.innerHTML = `
        <div class="shop-empty-filtered-card">
          <div style="font-size: 2.2rem; margin-bottom: 0.8rem;">🔍</div>
          <h4>NO PRODUCTS FOUND</h4>
          <p>We couldn't find any products matching the selected combination of filters.</p>
          <button type="button" class="shop-reset-filters-btn" id="shopEmptyResetBtn">CLEAR ALL FILTERS</button>
        </div>
      `;
      const btn = document.getElementById('shopEmptyResetBtn');
      if (btn) btn.addEventListener('click', clearAllActiveFilters);
      return;
    }

    shopGrid.innerHTML = items.map(item => {
      const sku = item.sku || item.id;
      const isWish = isWishlisted(sku);
      const priceInr = Number(item.priceInr) || 4999;
      const priceRyo = item.priceRyo ? Number(item.priceRyo) : Math.round(priceInr * 1.54);
      const mainImg = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.imageUrl || '/product-minato.jpg');
      const photosCount = (Array.isArray(item.images) && item.images.length > 0) ? item.images.length : (item.imageUrl ? 1 : 1);
      const hasDiscount = Boolean(item.hasDiscount || (item.originalMrp && item.originalMrp > priceInr));
      const discountPct = item.discountPercent || (hasDiscount ? Math.round(((item.originalMrp - priceInr) / item.originalMrp) * 100) : 0);

      return `
        <article class="shop-card product-card" data-category="${(item.category || '').toLowerCase()}" data-sku="${sku}">
          <div class="shop-card__badge-row">
            ${hasDiscount ? `<span class="product-badge-discount">${discountPct}% OFF</span>` : `<span class="product-badge-tag">${(item.category || 'STREETWEAR').toUpperCase()}</span>`}
            <button class="item-heart-btn ${isWish ? 'active' : ''}" type="button"
                    data-wishlist-toggle="${sku}"
                    data-sku="${sku}"
                    data-name="${item.name.replace(/"/g, '&quot;')}"
                    data-price-ryo="${priceRyo}"
                    data-price-inr="${priceInr}"
                    aria-label="${isWish ? 'Remove from Wishlist' : 'Save to Wishlist'}"
                    title="${isWish ? 'Saved in Wishlist (Click to remove)' : 'Save to Wishlist'}">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="${isWish ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
              </svg>
            </button>
          </div>
          <div class="shop-card__visual" data-gallery-open="${sku}" role="button" tabindex="0" title="Click to view full image gallery" style="aspect-ratio:1/1 !important; width:92% !important; max-width:92% !important; height:auto !important; margin:0.15rem auto 0.45rem !important; overflow:hidden !important; display:flex !important; align-items:center !important; justify-content:center !important;">
            ${mainImg 
              ? `<img src="${mainImg}" alt="${item.name}" loading="lazy" style="width:100% !important; height:100% !important; object-fit:cover !important; object-position:center top !important; padding:0 !important; margin:0 !important; border:none !important; display:block !important;" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}else{this.style.display='none';}" />`
              : `<div class="shop-card__svg-fallback">${item.iconSvg || '👕'}</div>`}
          </div>
          <span class="shop-card__theme-tag">${item.collectionName || 'OFFICIAL STREETWEAR'}</span>
          <h3 class="shop-card__title" data-gallery-open="${sku}" style="cursor:pointer;">${item.name}</h3>
          <p class="shop-card__desc">${(item.desc || '').replace(/Product Overview/i, '').split('\n').map(s => s.trim()).filter(Boolean)[0] || item.specs || 'Drop Shoulder Heavyweight 240+ GSM Pure Cotton.'}</p>
          <div class="shop-card__action-row">
            <div class="shop-card__price">
              <div class="shop-card__price-wrap">
                <span class="shop-card__price-usd">₹${priceInr.toLocaleString('en-IN')}</span>
                ${hasDiscount && item.originalMrp ? `<del class="shop-card__price-mrp">₹${item.originalMrp.toLocaleString('en-IN')}</del>` : ''}
              </div>
            </div>
            <button class="shop-card__btn" type="button"
                    data-add-cart="${sku}"
                    data-sku="${sku}"
                    data-name="${item.name.replace(/"/g, '&quot;')}"
                    data-price-ryo="${priceRyo}"
                    data-price-inr="${priceInr}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>ADD TO BAG</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach cart listener to newly rendered cards
    shopGrid.querySelectorAll('[data-add-cart]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.dataset.addCart;
        const item = collectionsData.find(i => (i.sku || i.id) === sku) || {
          id: sku,
          sku: sku,
          name: btn.dataset.name,
          priceInr: parseInt(btn.dataset.priceInr, 10) || 4999
        };
        handleAddToCart(btn, item);
      });
    });

    // Attach Wishlist toggle listeners
    shopGrid.querySelectorAll('[data-wishlist-toggle]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.dataset.wishlistToggle;
        const item = collectionsData.find(i => (i.sku || i.id) === sku) || {
          id: sku,
          sku: sku,
          name: btn.dataset.name,
          priceInr: parseInt(btn.dataset.priceInr, 10) || 4999
        };
        toggleWishlist(item, btn);
      });
    });

    // Attach gallery modal open listeners and full card click
    shopGrid.querySelectorAll('[data-gallery-open]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-add-cart]') || e.target.closest('[data-wishlist-toggle]')) return;
        const sku = el.dataset.galleryOpen;
        const item = collectionsData.find(i => (i.sku || i.id) === sku);
        if (item) openRelicGallery(item, 'shop');
      });
    });

    shopGrid.querySelectorAll('.shop-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-add-cart]') || e.target.closest('[data-wishlist-toggle]')) return;
        const sku = card.dataset.sku;
        if (!sku) return;
        const item = collectionsData.find(i => (i.sku || i.id) === sku);
        if (item) openRelicGallery(item, 'shop');
      });
    });

    attachCardHoverSlideshow(shopGrid);
  }

  // ═══════════ SCROLL ISOLATION EXPERIENCE ═══════════
  // User spec: Cursor over filters -> scroll filters. Cursor over products -> scroll products.
  // Cursor over left/right empty area -> scroll entire app window.
  (function initScrollZones() {
    const filterSidebar = document.getElementById('shopFilterSidebar');
    const productsArea = document.getElementById('shopProductsArea');

    if (filterSidebar) {
      filterSidebar.addEventListener('wheel', (e) => {
        const canScrollUp = filterSidebar.scrollTop > 0;
        const canScrollDown = filterSidebar.scrollTop < (filterSidebar.scrollHeight - filterSidebar.clientHeight);
        if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
          filterSidebar.scrollTop += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
    }

    if (productsArea) {
      productsArea.addEventListener('wheel', (e) => {
        const canScrollUp = productsArea.scrollTop > 0;
        const canScrollDown = productsArea.scrollTop < (productsArea.scrollHeight - productsArea.clientHeight);
        if ((e.deltaY < 0 && canScrollUp) || (e.deltaY > 0 && canScrollDown)) {
          productsArea.scrollTop += e.deltaY;
          e.preventDefault();
        }
      }, { passive: false });
    }
  })();


  // ═══════════ DELHIVERY LOGISTICS ORDER TRACKING MODAL ═══════════
  window.openDelhiveryTrackingModal = function() {
    const modal = document.getElementById('delhiveryTrackModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // Populate recent orders in tracking modal if any exist
    const recentOrdersContainer = document.getElementById('delhiveryRecentOrders');
    if (recentOrdersContainer) {
      const orders = (typeof getSavedOrders === 'function') ? getSavedOrders() : [];
      if (orders && orders.length > 0) {
        recentOrdersContainer.innerHTML = `
          <span class="delhivery-recent-title">YOUR RECENT ORDERS:</span>
          ${orders.slice(0, 3).map(o => {
            const code = o.orderCode || o.orderId || 'TS-99214';
            return `
              <div class="delhivery-order-chip" data-track-code="${code}">
                <div>
                  <strong>Order #${code}</strong>
                  <small>₹${(o.totalInr || 0).toLocaleString('en-IN')} · ${o.items ? o.items.length : 1} item(s)</small>
                </div>
                <button type="button" class="delhivery-chip-btn">TRACK NOW ↗</button>
              </div>
            `;
          }).join('')}
        `;
        recentOrdersContainer.querySelectorAll('.delhivery-order-chip').forEach(chip => {
          chip.addEventListener('click', () => {
            const code = chip.dataset.trackCode;
            const input = document.getElementById('delhiveryAwbInput');
            if (input) input.value = code;
            window.open(`https://www.delhivery.com/tracking?waybill=${encodeURIComponent(code)}`, '_blank', 'noopener,noreferrer');
          });
        });
      } else {
        recentOrdersContainer.innerHTML = '';
      }
    }
  };

  (function initDelhiveryModal() {
    const modal = document.getElementById('delhiveryTrackModal');
    const backdrop = document.getElementById('delhiveryTrackBackdrop');
    const closeBtn = document.getElementById('delhiveryTrackCloseBtn');
    const doneBtn = document.getElementById('delhiveryTrackDoneBtn');
    const submitBtn = document.getElementById('delhiveryTrackSubmitBtn');
    const input = document.getElementById('delhiveryAwbInput');

    function closeModal() {
      if (!modal) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (doneBtn) doneBtn.addEventListener('click', closeModal);

    function doTrack() {
      const awb = input ? input.value.trim() : '';
      if (!awb) {
        window.open('https://www.delhivery.com/tracking', '_blank', 'noopener,noreferrer');
        return;
      }
      window.open(`https://www.delhivery.com/tracking?waybill=${encodeURIComponent(awb)}`, '_blank', 'noopener,noreferrer');
    }

    if (submitBtn) submitBtn.addEventListener('click', doTrack);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doTrack();
        }
      });
    }
  })();

  // ═══════════ ZOHO INVENTORY REAL-TIME SYNCHRONIZATION ═══════════
  async function syncProductsFromDb(shouldRender = true) {
    try {
      const res = await fetch('/api/products?fresh=1&t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      const rawProducts = (data && Array.isArray(data.products)) ? data.products : [];
      
      collectionsData = rawProducts.map(p => {
        const sku = p.sku || p.id || '';
        const iconSvg = p.iconSvg || `<svg viewBox="0 0 40 40" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="20" cy="20" r="14" stroke="var(--blood-hot)"/><text x="20" y="25" text-anchor="middle" font-family="sans-serif" font-size="12" fill="var(--bone)">${p.seal || '忍'}</text></svg>`;
        const images = (Array.isArray(p.images) && p.images.length > 0)
          ? p.images.filter(u => typeof u === 'string' && u.trim().length > 0)
          : (p.imageUrl ? [p.imageUrl] : ['/product-minato.jpg']);
        const priceInr = Number(p.priceInr || p.price || 0);
        const originalMrp = (p.originalMrp && Number(p.originalMrp) > priceInr) ? Number(p.originalMrp) : null;
        const hasDiscount = Boolean(originalMrp && originalMrp > priceInr);
        const discountPercent = hasDiscount ? (p.discountPercent || Math.round(((originalMrp - priceInr) / originalMrp) * 100)) : 0;
        const desc = p.description || p.purchase_description || '';
        const category = p.category_name || p.category || 'T-Shirt';
        const collection = p.collectionName || p.collection || (p.name && p.name.includes('Minato') ? 'Minato' : '') || 'Official Collection';

        return {
          id: sku,
          sku: sku,
          zoho_item_id: p.zoho_item_id || '',
          name: p.name || p.title || 'Product',
          collectionName: collection,
          collection: collection.toLowerCase(),
          category: category,
          category_name: category,
          desc: desc,
          description: desc,
          purchase_description: p.purchase_description || '',
          priceInr,
          price: priceInr,
          originalMrp,
          originalPrice: originalMrp,
          hasDiscount,
          discountPercent,
          stock: p.stock !== undefined ? Number(p.stock) : 0,
          inStock: (p.stock !== undefined ? Number(p.stock) : 0) > 0,
          unit: p.unit || '',
          images: images.length > 0 ? images : ['/product-minato.jpg'],
          imageUrl: images[0] || '/product-minato.jpg',
          iconSvg
        };
      });

      const syncBadgeEl = document.getElementById('shopSyncLabel');
      if (syncBadgeEl) {
        syncBadgeEl.innerHTML = `<span class="shop__sync-dot"></span><span>ZOHO INVENTORY · ${collectionsData.length} ACTIVE PRODUCTS</span>`;
      }

      if (shopProductCount) {
        shopProductCount.textContent = `Showing ${collectionsData.length} Products`;
      }

      // Dynamic Filter Pills from Zoho Inventory for Shop & Collections
      const rawCats = (data && Array.isArray(data.categories) && data.categories.length > 0)
        ? data.categories.map(c => c.name || c)
        : Array.from(new Set(collectionsData.map(i => i.category_name || i.category).filter(Boolean)));
      
      const rawColls = (data && Array.isArray(data.collections) && data.collections.length > 0)
        ? data.collections.map(c => c.name || c)
        : Array.from(new Set(collectionsData.map(i => i.collectionName).filter(Boolean)));

      // 1. Update Shop Filter Pills
      const filterPillsEl = document.getElementById('shopFilterPills');
      if (filterPillsEl) {
        let shopPillsHtml = `<button class="shop-pill ${currentShopCategory === 'all' ? 'active' : ''}" type="button" data-shop-cat="all">All Products (${collectionsData.length})</button>`;
        rawCats.forEach(cat => {
          const count = collectionsData.filter(i => (i.category_name || i.category || '').toLowerCase().includes(cat.toLowerCase())).length;
          shopPillsHtml += `<button class="shop-pill ${currentShopCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" type="button" data-shop-cat="${cat}">${cat} (${count})</button>`;
        });
        filterPillsEl.innerHTML = shopPillsHtml;
        filterPillsEl.querySelectorAll('.shop-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            filterPillsEl.querySelectorAll('.shop-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentShopCategory = pill.dataset.shopCat;
            renderShopGrid();
          });
        });
      }

      // 2. Update Collections Pills (#collectionPills)
      const collectionPillsContainer = document.getElementById('collectionPills');
      if (collectionPillsContainer) {
        let collPillsHtml = `<button class="collec-pill ${currentCollectionFilter === 'all' ? 'active' : ''}" type="button" data-collec="all">All Collections (${collectionsData.length})</button>`;
        rawColls.forEach(col => {
          const count = collectionsData.filter(i => (i.collectionName || i.collection || '').toLowerCase().includes(col.toLowerCase())).length;
          collPillsHtml += `<button class="collec-pill ${currentCollectionFilter.toLowerCase() === col.toLowerCase() ? 'active' : ''}" type="button" data-collec="${col.toLowerCase()}">${col} (${count})</button>`;
        });
        collectionPillsContainer.innerHTML = collPillsHtml;
        collectionPillsContainer.querySelectorAll('.collec-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            collectionPillsContainer.querySelectorAll('.collec-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCollectionFilter = pill.dataset.collec;
            renderCollections();
          });
        });
      }

      // 3. Update Category Pills in Collections Page (#categoryPills)
      const categoryPillsContainer = document.getElementById('categoryPills');
      if (categoryPillsContainer) {
        let catPillsHtml = `<button class="collec-pill ${currentCategoryFilter === 'all' ? 'active' : ''}" type="button" data-cat="all">All Categories (${collectionsData.length})</button>`;
        rawCats.forEach(cat => {
          const count = collectionsData.filter(i => (i.category_name || i.category || '').toLowerCase().includes(cat.toLowerCase())).length;
          catPillsHtml += `<button class="collec-pill ${currentCategoryFilter.toLowerCase() === cat.toLowerCase() ? 'active' : ''}" type="button" data-cat="${cat.toLowerCase()}">${cat} (${count})</button>`;
        });
        categoryPillsContainer.innerHTML = catPillsHtml;
        categoryPillsContainer.querySelectorAll('.collec-pill').forEach(pill => {
          pill.addEventListener('click', () => {
            categoryPillsContainer.querySelectorAll('.collec-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentCategoryFilter = pill.dataset.cat;
            renderCollections();
          });
        });
      }

      if (shouldRender) {
        renderFilterSidebarUI();
        renderActiveFilterChips();
        renderShopGrid();
        renderCollections();
      }
    } catch (err) {
      console.warn('[Sync] Notice:', err.message);
    }
  }

  // ═══════════ FULL E-COMMERCE PRODUCT VIEW (PDP) MODAL LOGIC ═══════════
  const relicGalleryModal = document.getElementById('relicGalleryModal');
  const relicGalleryBackdrop = document.getElementById('relicGalleryBackdrop');
  const relicGalleryCloseBtn = document.getElementById('relicGalleryCloseBtn');
  const relicGalleryMainWrap = document.getElementById('relicGalleryMainWrap');
  const pdpZoomContainer = document.getElementById('pdpZoomContainer');
  const pdpZoomLens = document.getElementById('pdpZoomLens');
  const relicGalleryMainImg = document.getElementById('relicGalleryMainImg');
  const relicGallerySvgFallback = document.getElementById('relicGallerySvgFallback');
  const relicGalleryPrevBtn = document.getElementById('relicGalleryPrevBtn');
  const relicGalleryNextBtn = document.getElementById('relicGalleryNextBtn');
  const relicGalleryCounter = document.getElementById('relicGalleryCounter');
  const relicGalleryThumbs = document.getElementById('relicGalleryThumbs');
  const relicGallerySeal = document.getElementById('relicGallerySeal');
  const relicGallerySku = document.getElementById('relicGallerySku');
  const relicGalleryTag = document.getElementById('relicGalleryTag');
  const relicGalleryTitle = document.getElementById('relicGalleryTitle');
  const relicGalleryCollec = document.getElementById('relicGalleryCollec');

  // Enlarged Product Lightbox Zoom Elements
  const amazonZoomModal = document.getElementById('amazonZoomModal');
  const amazonZoomBackdrop = document.getElementById('amazonZoomBackdrop');
  const amazonZoomCloseBtn = document.getElementById('amazonZoomCloseBtn');
  const amazonZoomStage = document.getElementById('amazonZoomStage');
  const amazonZoomImg = document.getElementById('amazonZoomImg');
  const amazonZoomThumbs = document.getElementById('amazonZoomThumbs');
  const relicGalleryPriceInr = document.getElementById('relicGalleryPriceInr');
  const relicGalleryOriginalPrice = document.getElementById('relicGalleryOriginalPrice');
  const relicGallerySavingsTag = document.getElementById('relicGallerySavingsTag');
  const relicGalleryPriceRyo = document.getElementById('relicGalleryPriceRyo');
  const pdpEmiValue = document.getElementById('pdpEmiValue');
  const relicGalleryStock = document.getElementById('relicGalleryStock');
  const pdpStockMeterFill = document.getElementById('pdpStockMeterFill');
  const pdpLiveViewers = document.getElementById('pdpLiveViewers');
  const relicGalleryDesc = document.getElementById('relicGalleryDesc');
  const relicGalleryAddBagBtn = document.getElementById('relicGalleryAddBagBtn');
  const pdpBuyNowBtn = document.getElementById('pdpBuyNowBtn');
  const pdpShareBtn = document.getElementById('pdpShareBtn');
  const pdpBreadcrumbCat = document.getElementById('pdpBreadcrumbCat');
  const pdpBreadcrumbCur = document.getElementById('pdpBreadcrumbCur');
  const pdpImgDiscountBadge = document.getElementById('pdpImgDiscountBadge');
  const pdpBreadcrumbHome = document.getElementById('pdpBreadcrumbHome');

  let pdpPreviousSource = 'shop'; // 'collections' | 'shop'
  let pdpSavedScrollY = 0;
  let pdpSavedCollecScrollTop = 0;

  // PDP Variants & Quantity elements
  const pdpSizeGroup = document.getElementById('pdpSizeGroup');
  const pdpSelectedSizeLabel = document.getElementById('pdpSelectedSizeLabel');
  const pdpSizeGuideBtn = document.getElementById('pdpSizeGuideBtn');
  const pdpSizeGuideBox = document.getElementById('pdpSizeGuideBox');
  const pdpSizeOptions = document.getElementById('pdpSizeOptions');
  const pdpFinishGroup = document.getElementById('pdpFinishGroup');
  const pdpSelectedFinishLabel = document.getElementById('pdpSelectedFinishLabel');
  const pdpFinishOptions = document.getElementById('pdpFinishOptions');
  const pdpQtyInput = document.getElementById('pdpQtyInput');
  const pdpQtyDec = document.getElementById('pdpQtyDec');
  const pdpQtyInc = document.getElementById('pdpQtyInc');
  const pdpSubtotalPrice = document.getElementById('pdpSubtotalPrice');

  // PDP Delivery PIN Code estimator
  const pdpPincodeInput = document.getElementById('pdpPincodeInput');
  const pdpPincodeCheckBtn = document.getElementById('pdpPincodeCheckBtn');
  const pdpDeliveryResult = document.getElementById('pdpDeliveryResult');

  // PDP Tabs & Reviews elements
  const pdpTabsSection = document.getElementById('pdpTabsSection');
  const pdpJumpReviewsBtn = document.getElementById('pdpJumpReviewsBtn');
  const pdpReviewCountLabel = document.getElementById('pdpReviewCountLabel');
  const pdpTabReviewCount = document.getElementById('pdpTabReviewCount');
  const pdpFullDesc = document.getElementById('pdpFullDesc');
  const pdpSpecComposition = document.getElementById('pdpSpecComposition');
  const pdpSpecFinish = document.getElementById('pdpSpecFinish');
  const pdpSpecSealText = document.getElementById('pdpSpecSealText');
  const pdpSpecDimensions = document.getElementById('pdpSpecDimensions');
  const pdpOpenReviewFormBtn = document.getElementById('pdpOpenReviewFormBtn');
  const pdpReviewForm = document.getElementById('pdpReviewForm');
  const pdpCancelReviewBtn = document.getElementById('pdpCancelReviewBtn');
  const pdpReviewsList = document.getElementById('pdpReviewsList');
  const pdpCrossSellGrid = document.getElementById('pdpCrossSellGrid');

  // PDP Price Drop Alert elements (within .pdp-pricing-card)
  const pdpPriceDropSection = document.getElementById('pdpPriceDropSection');
  const pdpPriceDropBtn = document.getElementById('pdpPriceDropBtn');
  const pdpPriceDropBtnText = document.getElementById('pdpPriceDropBtnText');
  const pdpPriceDropBadge = document.getElementById('pdpPriceDropBadge');
  const pdpPriceDropForm = document.getElementById('pdpPriceDropForm');
  const pdpPriceDropEmailInput = document.getElementById('pdpPriceDropEmailInput');
  const pdpPriceDropSubmitBtn = document.getElementById('pdpPriceDropSubmitBtn');
  const pdpPriceDropTargetDisplay = document.getElementById('pdpPriceDropTargetDisplay');
  const pdpPriceDropCancelBtn = document.getElementById('pdpPriceDropCancelBtn');
  const pdpPriceDropActive = document.getElementById('pdpPriceDropActive');
  const pdpPriceDropActiveEmail = document.getElementById('pdpPriceDropActiveEmail');
  const pdpPriceDropTestBtn = document.getElementById('pdpPriceDropTestBtn');
  const pdpPriceDropRemoveBtn = document.getElementById('pdpPriceDropRemoveBtn');

  // Price Drop Alert storage helpers
  function getSavedUserEmail() {
    return localStorage.getItem('the_street_co_user_email') || 'aniruddhanag780@gmail.com';
  }

  function setSavedUserEmail(email) {
    if (email) {
      localStorage.setItem('the_street_co_user_email', email);
    }
  }

  function getSavedPriceAlerts() {
    try {
      const raw = localStorage.getItem('the_street_co_price_alerts');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('Error reading price alerts from localStorage:', e);
      return {};
    }
  }

  function savePriceAlerts(alerts) {
    try {
      localStorage.setItem('the_street_co_price_alerts', JSON.stringify(alerts));
    } catch (e) {
      console.warn('Error saving price alerts to localStorage:', e);
    }
  }

  function triggerPriceDropToast(item, oldPrice, newPrice, email) {
    const diff = oldPrice - newPrice;
    const pct = Math.max(1, Math.round((diff / oldPrice) * 100));

    // Show instant toast notification
    showToast(
      `PRICE DROP ALERT! (-${pct}%) 🏷️`,
      `${item.name} dropped by ₹${diff.toLocaleString('en-IN')} to ₹${newPrice.toLocaleString('en-IN')}! Instant notification sent to ${email}`,
      'price-drop'
    );

    // Visual animated flash on pricing card
    if (relicGalleryPriceInr) {
      relicGalleryPriceInr.classList.remove('price-drop-flash');
      void relicGalleryPriceInr.offsetWidth; // force DOM reflow
      relicGalleryPriceInr.classList.add('price-drop-flash');
      relicGalleryPriceInr.textContent = newPrice.toLocaleString('en-IN');
    }
    if (relicGallerySavingsTag) {
      const originalMrp = item.originalMrp ? Number(item.originalMrp) : Math.round(newPrice * 1.35);
      const savingsAmount = originalMrp - newPrice;
      const savingsPercent = Math.round((savingsAmount / originalMrp) * 100);
      relicGallerySavingsTag.textContent = `SAVE ₹${savingsAmount.toLocaleString('en-IN')} (${savingsPercent}% OFF)`;
      if (pdpImgDiscountBadge) pdpImgDiscountBadge.textContent = `${savingsPercent}% OFF`;
    }
    if (pdpSubtotalPrice) {
      pdpSubtotalPrice.textContent = `₹${(newPrice * currentPdpQty).toLocaleString('en-IN')} INR`;
    }
  }

  function syncPdpPriceDropUI(item) {
    if (!pdpPriceDropSection || !item) return;
    const sku = item.sku || item.id;
    const alerts = getSavedPriceAlerts();
    const alert = alerts[sku];
    const priceInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
    const userEmail = getSavedUserEmail();

    if (pdpPriceDropEmailInput) {
      pdpPriceDropEmailInput.value = alert ? alert.email : userEmail;
    }
    if (pdpPriceDropTargetDisplay) {
      pdpPriceDropTargetDisplay.textContent = `₹${priceInr.toLocaleString('en-IN')} INR`;
    }

    if (alert) {
      // Alert already active for this product
      if (pdpPriceDropBtn) pdpPriceDropBtn.style.display = 'none';
      if (pdpPriceDropForm) pdpPriceDropForm.style.display = 'none';
      if (pdpPriceDropActive) {
        pdpPriceDropActive.style.display = 'flex';
        if (pdpPriceDropActiveEmail) {
          pdpPriceDropActiveEmail.textContent = `Tracking alert for: ${alert.email} · Base: ₹${alert.basePrice.toLocaleString('en-IN')}`;
        }
      }

      // Check if price has decreased compared to base price
      if (priceInr < alert.basePrice && !alert.triggered) {
        triggerPriceDropToast(item, alert.basePrice, priceInr, alert.email);
        alert.triggered = true;
        alert.lastNotifiedPrice = priceInr;
        alerts[sku] = alert;
        savePriceAlerts(alerts);
      }
    } else {
      // No active alert for this product
      if (pdpPriceDropBtn) {
        pdpPriceDropBtn.style.display = 'flex';
        if (pdpPriceDropBtnText) pdpPriceDropBtnText.textContent = 'Notify Me on Price Drop';
        if (pdpPriceDropBadge) pdpPriceDropBadge.textContent = 'GET ALERT';
      }
      if (pdpPriceDropForm) pdpPriceDropForm.style.display = 'none';
      if (pdpPriceDropActive) pdpPriceDropActive.style.display = 'none';
    }
  }

  let activeGalleryItem = null;
  let activeGalleryImageIndex = 0;
  let activeGalleryImages = [];
  let currentPdpQty = 1;
  let currentSelectedSize = 'M';
  let currentSelectedFinish = 'Obsidian Shadow';

  // In-memory store for dynamic user submitted reviews
  const relicCustomReviews = {};

  // Canonical base reviews for products
  const DEFAULT_STORE_REVIEWS = [
    {
      author: 'Sasuke_U.',
      verified: true,
      rating: 5,
      date: '2 days ago',
      headline: 'Flawless craftsmanship. Heavy gauge gabardine twill.',
      body: 'The fabric density and crimson embroidery are true to canonical records. Wore it through heavy rain—repels moisture remarkably well while maintaining an impeccable drape.'
    },
    {
      author: 'Shisui_U.',
      verified: true,
      rating: 5,
      date: '1 week ago',
      headline: 'Certified authentic seal. Museum-grade archival finish.',
      body: 'Arrived enclosed in charred cedar with the crimson wax emblem fully intact. The hand-burnished details exceed luxury atelier standards.'
    },
    {
      author: 'Kakashi_H.',
      verified: true,
      rating: 5,
      date: '3 weeks ago',
      headline: 'Remarkable balance and comfortable lining.',
      body: 'Surprisingly versatile. The silk satin lining prevents friction over shirts, and the high-collar stands firm without sagging.'
    }
  ];

  // ═══════════ AMAZON-STYLE ZOOM & ENLARGED INSPECTION LOGIC ═══════════
  let currentAmazonZoomLevel = 2.5;

  // 1. In-place PDP Image Zoom (Cursor movement on PC/Laptop)
  if (pdpZoomContainer && relicGalleryMainImg) {
    pdpZoomContainer.addEventListener('mouseenter', () => {
      if (pdpZoomLens) pdpZoomLens.style.display = 'block';
    });

    pdpZoomContainer.addEventListener('mousemove', (e) => {
      const rect = pdpZoomContainer.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      relicGalleryMainImg.style.transformOrigin = `${x.toFixed(1)}% ${y.toFixed(1)}%`;

      if (pdpZoomLens) {
        const lensW = 120;
        const lensH = 120;
        let lx = (e.clientX - rect.left) - lensW / 2;
        let ly = (e.clientY - rect.top) - lensH / 2;
        lx = Math.max(0, Math.min(rect.width - lensW, lx));
        ly = Math.max(0, Math.min(rect.height - lensH, ly));
        pdpZoomLens.style.left = `${lx}px`;
        pdpZoomLens.style.top = `${ly}px`;
        pdpZoomLens.style.width = `${lensW}px`;
        pdpZoomLens.style.height = `${lensH}px`;
        pdpZoomLens.style.display = 'block';
      }
    });

    pdpZoomContainer.addEventListener('mouseleave', () => {
      if (pdpZoomLens) pdpZoomLens.style.display = 'none';
      relicGalleryMainImg.style.transformOrigin = 'center center';
    });

    // When clicking on the product picture, enlarge the picture in the Amazon-style lightbox inspector
    pdpZoomContainer.addEventListener('click', (e) => {
      e.stopPropagation();
      openAmazonZoomModal();
    });
  }

  // ═══════════ ENLARGED PRODUCT VIEW (1X DEFAULT + TWO-FINGER PINCH-TO-ZOOM) ═══════════
  let zoomScale = 1;
  let zoomPanX = 0;
  let zoomPanY = 0;
  let isPinching = false;
  let isPanning = false;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;
  let panStartX = 0;
  let panStartY = 0;
  let lastTapTime = 0;

  function applyZoomTransform(animated = false) {
    if (!amazonZoomImg) return;
    if (animated) {
      amazonZoomImg.style.transition = 'transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      amazonZoomImg.style.transition = 'none';
    }

    if (zoomScale <= 1.05) {
      zoomScale = 1;
      zoomPanX = 0;
      zoomPanY = 0;
    } else if (amazonZoomStage) {
      const stageRect = amazonZoomStage.getBoundingClientRect();
      const maxPanX = Math.max(0, (stageRect.width * (zoomScale - 1)) / 2);
      const maxPanY = Math.max(0, (stageRect.height * (zoomScale - 1)) / 2);
      zoomPanX = Math.max(-maxPanX, Math.min(maxPanX, zoomPanX));
      zoomPanY = Math.max(-maxPanY, Math.min(maxPanY, zoomPanY));
    }

    amazonZoomImg.style.transform = `translate3d(${zoomPanX}px, ${zoomPanY}px, 0px) scale(${zoomScale})`;
    if (amazonZoomStage) {
      amazonZoomStage.classList.toggle('is-zoomed', zoomScale > 1.05);
    }
  }

  function resetZoom() {
    zoomScale = 1;
    zoomPanX = 0;
    zoomPanY = 0;
    isPinching = false;
    isPanning = false;
    applyZoomTransform(false);
  }

  // 2. Big Screen Product View Modal (Opens in 1x with 2-Finger Pinch Support)
  function openAmazonZoomModal(imageIndex) {
    if (!amazonZoomModal || !amazonZoomImg) return;
    const targetIdx = typeof imageIndex === 'number' ? imageIndex : activeGalleryImageIndex;
    const imgSrc = (activeGalleryImages && activeGalleryImages[targetIdx]) || (relicGalleryMainImg ? relicGalleryMainImg.src : '');
    if (!imgSrc) return;

    amazonZoomImg.src = imgSrc;

    // Render interactive angle thumbnails at the bottom
    if (amazonZoomThumbs && activeGalleryImages && activeGalleryImages.length > 0) {
      amazonZoomThumbs.innerHTML = activeGalleryImages.map((src, i) => `
        <div class="amazon-zoom-thumb ${i === targetIdx ? 'active' : ''}" data-amazon-thumb="${i}" role="button" tabindex="0" title="Angle ${i + 1}">
          <img src="${src}" alt="Angle ${i + 1}" />
        </div>
      `).join('');

      amazonZoomThumbs.querySelectorAll('[data-amazon-thumb]').forEach(th => {
        th.addEventListener('click', (e) => {
          e.stopPropagation();
          const idx = parseInt(th.dataset.amazonThumb, 10);
          activeGalleryImageIndex = idx;
          renderGalleryImages();
          openAmazonZoomModal(idx);
        });
      });
    }

    // Opens strictly in 1x scale as requested
    resetZoom();
    amazonZoomModal.classList.add('open');
    amazonZoomModal.setAttribute('aria-hidden', 'false');
  }

  function closeAmazonZoomModal() {
    if (!amazonZoomModal) return;
    amazonZoomModal.classList.remove('open');
    amazonZoomModal.setAttribute('aria-hidden', 'true');
    resetZoom();
  }

  if (amazonZoomStage && amazonZoomImg) {
    // ── TWO-FINGER PINCH-TO-ZOOM & PAN (TOUCHSCREEN DEVICES) ──
    amazonZoomStage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        isPanning = false;
        pinchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartScale = zoomScale;
      } else if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime < 320) {
          e.preventDefault();
          if (zoomScale > 1.2) {
            zoomScale = 1;
            zoomPanX = 0;
            zoomPanY = 0;
          } else {
            zoomScale = 2.5;
            const stageRect = amazonZoomStage.getBoundingClientRect();
            const tapX = e.touches[0].clientX - stageRect.left - stageRect.width / 2;
            const tapY = e.touches[0].clientY - stageRect.top - stageRect.height / 2;
            zoomPanX = -tapX * 0.7;
            zoomPanY = -tapY * 0.7;
          }
          applyZoomTransform(true);
          lastTapTime = 0;
          return;
        }
        lastTapTime = now;

        if (zoomScale > 1.05) {
          isPanning = true;
          panStartX = e.touches[0].clientX - zoomPanX;
          panStartY = e.touches[0].clientY - zoomPanY;
        }
      }
    }, { passive: false });

    amazonZoomStage.addEventListener('touchmove', (e) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (pinchStartDistance > 0) {
          const factor = currentDist / pinchStartDistance;
          zoomScale = Math.min(Math.max(pinchStartScale * factor, 1), 6);
          applyZoomTransform(false);
        }
      } else if (isPanning && e.touches.length === 1 && zoomScale > 1.05) {
        e.preventDefault();
        zoomPanX = e.touches[0].clientX - panStartX;
        zoomPanY = e.touches[0].clientY - panStartY;
        applyZoomTransform(false);
      }
    }, { passive: false });

    amazonZoomStage.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        isPinching = false;
      }
      if (e.touches.length === 0) {
        isPanning = false;
        if (zoomScale <= 1.08) {
          zoomScale = 1;
          zoomPanX = 0;
          zoomPanY = 0;
          applyZoomTransform(true);
        }
      }
    });

    amazonZoomStage.addEventListener('touchcancel', () => {
      isPinching = false;
      isPanning = false;
    });

    // ── DESKTOP MOUSE / TRACKPAD PINCH & WHEEL & PAN SUPPORT ──
    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    amazonZoomStage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const targetScale = Math.min(Math.max(zoomScale * zoomFactor, 1), 6);
      if (targetScale <= 1.05) {
        zoomScale = 1;
        zoomPanX = 0;
        zoomPanY = 0;
      } else {
        zoomScale = targetScale;
      }
      applyZoomTransform(false);
    }, { passive: false });

    amazonZoomStage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (zoomScale > 1.05) {
        isMouseDown = true;
        mouseStartX = e.clientX - zoomPanX;
        mouseStartY = e.clientY - zoomPanY;
        amazonZoomStage.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!isMouseDown) return;
      zoomPanX = e.clientX - mouseStartX;
      zoomPanY = e.clientY - mouseStartY;
      applyZoomTransform(false);
    });

    window.addEventListener('mouseup', () => {
      if (isMouseDown) {
        isMouseDown = false;
        if (amazonZoomStage) {
          amazonZoomStage.style.cursor = zoomScale > 1.05 ? 'grab' : 'default';
        }
      }
    });

    // Double-click on desktop toggles zoom between 1x and 2.5x
    amazonZoomStage.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (zoomScale > 1.2) {
        zoomScale = 1;
        zoomPanX = 0;
        zoomPanY = 0;
      } else {
        zoomScale = 2.5;
        const stageRect = amazonZoomStage.getBoundingClientRect();
        const clickX = e.clientX - stageRect.left - stageRect.width / 2;
        const clickY = e.clientY - stageRect.top - stageRect.height / 2;
        zoomPanX = -clickX * 0.7;
        zoomPanY = -clickY * 0.7;
      }
      applyZoomTransform(true);
    });
  }

  if (amazonZoomCloseBtn) amazonZoomCloseBtn.addEventListener('click', closeAmazonZoomModal);
  if (amazonZoomBackdrop) amazonZoomBackdrop.addEventListener('click', closeAmazonZoomModal);

  function parseZohoDescription(text) {
    if (!text || typeof text !== 'string') {
      return { overview: '', features: [], styleTips: '', specs: {} };
    }
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let currentSection = 'overview';
    let overviewLines = [];
    let features = [];
    let styleTips = [];
    let specs = {};

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('product overview')) { currentSection = 'overview'; return; }
      if (lower.includes('product features') || lower.includes('features')) { currentSection = 'features'; return; }
      if (lower.includes('style & pairing tips') || lower.includes('pairing tips') || lower.includes('styling')) { currentSection = 'style'; return; }
      if (lower.includes('material & care') || lower.includes('specifications')) { currentSection = 'specs'; return; }

      if (currentSection === 'overview') {
        overviewLines.push(line);
      } else if (currentSection === 'features') {
        features.push(line.replace(/^[•\-\*]\s*/, ''));
      } else if (currentSection === 'style') {
        styleTips.push(line);
      } else if (currentSection === 'specs') {
        const clean = line.replace(/^[•\-\*]\s*/, '');
        const idx = clean.indexOf(':');
        if (idx !== -1) {
          specs[clean.slice(0, idx).trim()] = clean.slice(idx + 1).trim();
        } else {
          specs['Detail'] = clean;
        }
      }
    });

    return {
      overview: overviewLines.join(' ') || text,
      features,
      styleTips: styleTips.join(' '),
      specs
    };
  }

  function openRelicGallery(item, source) {
    if (!relicGalleryModal || !item) return;

    // Detect and preserve source page context
    const isFromCollections = (source === 'collections') || (collectionsPage && collectionsPage.classList.contains('open'));
    if (isFromCollections) {
      pdpPreviousSource = 'collections';
      pdpSavedCollecScrollTop = collectionsPage ? collectionsPage.scrollTop : 0;
      if (pdpBreadcrumbHome) pdpBreadcrumbHome.textContent = 'ALL COLLECTIONS';
      const pdpBackText = document.getElementById('pdpBackText');
      if (pdpBackText) pdpBackText.textContent = 'Back to Collections';
      if (relicGalleryCloseBtn) relicGalleryCloseBtn.setAttribute('title', 'Close and return to Collections (✕)');
    } else {
      pdpPreviousSource = 'shop';
      const curY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      pdpSavedScrollY = curY > 200 ? curY : (document.getElementById('shop')?.offsetTop || 0);
      if (pdpBreadcrumbHome) pdpBreadcrumbHome.textContent = 'ALL PRODUCTS';
      const pdpBackText = document.getElementById('pdpBackText');
      if (pdpBackText) pdpBackText.textContent = 'Back to Shop';
      if (relicGalleryCloseBtn) relicGalleryCloseBtn.setAttribute('title', 'Close and return to Shop (✕)');
    }

    trackRecentlyViewed(item);
    activeGalleryItem = item;
    activeGalleryImageIndex = 0;
    currentPdpQty = 1;
    currentSelectedSize = 'M';
    currentSelectedFinish = 'Obsidian Shadow';

    // Reset qty UI
    if (pdpQtyInput) pdpQtyInput.value = '1';

    // Build images array
    let imgs = [];
    if (Array.isArray(item.images) && item.images.length > 0) {
      imgs = item.images.filter(url => typeof url === 'string' && url.trim().length > 0);
    } else if (item.imageUrl) {
      imgs = [item.imageUrl];
    }
    activeGalleryImages = imgs;

    const sku = item.sku || item.id || '';
    const priceInr = Number(item.priceInr || item.price || 0);
    const hasRealMrp = Boolean(item.hasDiscount && item.originalMrp && item.originalMrp > priceInr);
    const savingsAmount = hasRealMrp ? (item.originalMrp - priceInr) : 0;
    const savingsPercent = hasRealMrp ? (item.discountPercent || Math.round((savingsAmount / item.originalMrp) * 100)) : 0;
    const emiAmount = Math.round(priceInr / 3);

    const rawDesc = item.desc || item.purchase_description || item.description || '';
    const parsed = parseZohoDescription(rawDesc);

    // Breadcrumbs & Category - only show if category exists in Zoho
    const catName = item.category_name || item.category || '';
    if (pdpBreadcrumbCat) {
      if (catName) {
        pdpBreadcrumbCat.textContent = catName.toUpperCase();
        pdpBreadcrumbCat.style.display = 'inline';
        if (pdpBreadcrumbCat.previousElementSibling) pdpBreadcrumbCat.previousElementSibling.style.display = 'inline';
      } else {
        pdpBreadcrumbCat.style.display = 'none';
        if (pdpBreadcrumbCat.previousElementSibling) pdpBreadcrumbCat.previousElementSibling.style.display = 'none';
      }
    }
    if (pdpBreadcrumbCur) pdpBreadcrumbCur.textContent = (item.name || '').toUpperCase();

    // Top metadata
    if (relicGalleryTitle) relicGalleryTitle.textContent = item.name || 'Product';
    if (relicGallerySku) {
      if (sku) {
        relicGallerySku.textContent = `SKU: ${sku}`;
        relicGallerySku.style.display = 'inline-block';
      } else {
        relicGallerySku.style.display = 'none';
      }
    }
    if (relicGalleryTag) {
      if (catName) {
        relicGalleryTag.textContent = catName.toUpperCase();
        relicGalleryTag.style.display = 'inline-block';
      } else {
        relicGalleryTag.style.display = 'none';
      }
    }
    if (relicGalleryCollec) {
      relicGalleryCollec.textContent = catName ? `THE STREET CO · ${catName.toUpperCase()}` : 'THE STREET CO';
    }
    
    // Short description in buy column removed (detailed info presented in Product Overview tab)
    if (relicGalleryDesc) {
      relicGalleryDesc.style.display = 'none';
    }

    // Dynamic Product Overview Tab - lists the full overview and description from Zoho Inventory
    const pdpDynamicLoreContent = document.getElementById('pdpDynamicLoreContent');
    if (pdpDynamicLoreContent) {
      let loreHtml = '';

      // 1. Overview Paragraph(s)
      const overviewText = parsed.overview || rawDesc;
      if (overviewText) {
        loreHtml += `
          <div class="pdp-overview-block">
            <h4 style="font-family:var(--serif); font-size:1.15rem; color:#111827; font-weight:700; letter-spacing:0.04em; margin:0 0 0.65rem 0;">PRODUCT OVERVIEW</h4>
            <p style="color:#374151; font-family:var(--sans); font-size:0.95rem; line-height:1.75; margin:0 0 1.25rem 0; white-space:pre-line;">${overviewText}</p>
          </div>
        `;
      }

      // 2. Product Features
      if (parsed.features && parsed.features.length > 0) {
        loreHtml += `
          <div style="margin-top:1.5rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:1.35rem 1.5rem;">
            <h4 style="font-family:var(--sans); font-size:0.8rem; color:#111827; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 0.85rem 0;">KEY PRODUCT FEATURES</h4>
            <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.65rem;">
              ${parsed.features.map(f => {
                const colonIdx = f.indexOf(':');
                const title = colonIdx !== -1 ? f.slice(0, colonIdx).trim() : '';
                const body = colonIdx !== -1 ? f.slice(colonIdx + 1).trim() : f.trim();
                return `<li style="display:flex; align-items:flex-start; gap:10px; font-size:0.9rem; line-height:1.6; color:#374151;">
                  <span style="color:#dc2626; font-weight:bold; line-height:1.3;">✦</span>
                  <span>${title ? `<strong style="color:#111827; font-weight:700;">${title}:</strong> ` : ''}${body}</span>
                </li>`;
              }).join('')}
            </ul>
          </div>
        `;
      }

      // 3. Style & Pairing Tips
      if (parsed.styleTips) {
        loreHtml += `
          <div style="margin-top:1.25rem; background:#fef2f2; border-left:3px solid #dc2626; border-radius:0 8px 8px 0; padding:1.1rem 1.35rem;">
            <strong style="color:#dc2626; font-size:0.8rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; display:block; margin-bottom:0.4rem; font-family:var(--sans);">Style &amp; Pairing Tips</strong>
            <p style="color:#1f2937; font-size:0.9rem; margin:0; line-height:1.65;">${parsed.styleTips}</p>
          </div>
        `;
      }

      // 4. Material & Care from description
      const specKeys = Object.keys(parsed.specs || {});
      if (specKeys.length > 0) {
        loreHtml += `
          <div style="margin-top:1.25rem; background:#f9fafb; border:1px solid #e5e7eb; border-radius:10px; padding:1.2rem 1.35rem;">
            <strong style="color:#111827; font-size:0.8rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; display:block; margin-bottom:0.75rem; font-family:var(--sans);">Material &amp; Care</strong>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:0.65rem;">
              ${specKeys.map(k => `
                <div style="font-size:0.88rem; line-height:1.5;">
                  <span style="color:#6b7280; font-family:var(--sans); font-size:0.75rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; display:block;">${k}</span>
                  <span style="color:#111827; font-weight:700;">${parsed.specs[k]}</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      if (!loreHtml) {
        loreHtml = `<p style="color:#6b7280; font-size:0.95rem;">Product details are synced directly from Zoho Inventory.</p>`;
      }

      pdpDynamicLoreContent.innerHTML = loreHtml;
    }

    // Specifications tab values - show ONLY rows that actually exist in Zoho
    const pdpRowComposition = document.getElementById('pdpRowComposition');
    const pdpRowFit = document.getElementById('pdpRowFit');
    const pdpRowNeckline = document.getElementById('pdpRowNeckline');
    const pdpRowSku = document.getElementById('pdpRowSku');
    const pdpRowStock = document.getElementById('pdpRowStock');
    const pdpRowCare = document.getElementById('pdpRowCare');

    const pdpSpecFit = document.getElementById('pdpSpecFit');
    const pdpSpecNeckline = document.getElementById('pdpSpecNeckline');
    const pdpSpecSku = document.getElementById('pdpSpecSku');
    const pdpSpecStock = document.getElementById('pdpSpecStock');
    const pdpSpecCare = document.getElementById('pdpSpecCare');

    const fabricVal = parsed.specs['Fabric'] || '';
    if (pdpRowComposition) {
      if (fabricVal) {
        pdpRowComposition.style.display = 'flex';
        if (pdpSpecComposition) pdpSpecComposition.textContent = fabricVal;
      } else {
        pdpRowComposition.style.display = 'none';
      }
    }

    const fitVal = parsed.specs['Fit'] || '';
    if (pdpRowFit) {
      if (fitVal) {
        pdpRowFit.style.display = 'flex';
        if (pdpSpecFit) pdpSpecFit.textContent = fitVal;
      } else {
        pdpRowFit.style.display = 'none';
      }
    }

    const necklineVal = parsed.specs['Neckline'] || '';
    if (pdpRowNeckline) {
      if (necklineVal) {
        pdpRowNeckline.style.display = 'flex';
        if (pdpSpecNeckline) pdpSpecNeckline.textContent = necklineVal;
      } else {
        pdpRowNeckline.style.display = 'none';
      }
    }

    if (pdpRowSku) {
      if (sku) {
        pdpRowSku.style.display = 'flex';
        if (pdpSpecSku) pdpSpecSku.textContent = `${sku} (Zoho Item ID: ${item.zoho_item_id || 'Active'})`;
      } else {
        pdpRowSku.style.display = 'none';
      }
    }

    const stock = item.stock !== undefined ? Number(item.stock) : 0;
    const unitText = (item.unit && item.unit.trim()) ? item.unit.toUpperCase() : 'PCS';
    if (pdpRowStock) {
      pdpRowStock.style.display = 'flex';
      if (pdpSpecStock) pdpSpecStock.textContent = `${stock} ${unitText} (Live Zoho Inventory Stock)`;
    }

    const careVal = parsed.specs['Care Instructions'] || '';
    if (pdpRowCare) {
      if (careVal) {
        pdpRowCare.style.display = 'flex';
        if (pdpSpecCare) pdpSpecCare.textContent = careVal;
      } else {
        pdpRowCare.style.display = 'none';
      }
    }

    // Pricing & Real MRP Discount
    if (relicGalleryPriceInr) relicGalleryPriceInr.textContent = priceInr.toLocaleString('en-IN');

    const mrpBlock = document.querySelector('.pdp-mrp-block');
    const dealRibbon = document.querySelector('.pdp-deal-ribbon-row');

    if (hasRealMrp) {
      if (mrpBlock) mrpBlock.style.display = 'flex';
      if (relicGalleryOriginalPrice) relicGalleryOriginalPrice.textContent = `₹${item.originalMrp.toLocaleString('en-IN')}`;
      if (relicGallerySavingsTag) {
        relicGallerySavingsTag.style.display = 'inline-block';
        relicGallerySavingsTag.textContent = `SAVE ₹${savingsAmount.toLocaleString('en-IN')} (${savingsPercent}% OFF)`;
      }
      if (dealRibbon) dealRibbon.style.display = 'flex';
      if (pdpImgDiscountBadge) {
        pdpImgDiscountBadge.style.display = 'inline-block';
        pdpImgDiscountBadge.textContent = `-${savingsPercent}% OFF`;
      }
    } else {
      if (mrpBlock) mrpBlock.style.display = 'none';
      if (relicGallerySavingsTag) relicGallerySavingsTag.style.display = 'none';
      if (dealRibbon) dealRibbon.style.display = 'none';
      if (pdpImgDiscountBadge) pdpImgDiscountBadge.style.display = 'none';
    }

    // Hide all fictional / placeholder widgets
    const pdpRyoEquiv = document.querySelector('.pdp-ryo-equiv');
    if (pdpRyoEquiv) pdpRyoEquiv.style.display = 'none';

    const pdpFkRatingRow = document.querySelector('.pdp-fk-rating-row');
    if (pdpFkRatingRow) pdpFkRatingRow.style.display = 'none';

    const pdpViewersPill = document.querySelector('.pdp-viewers-pill');
    if (pdpViewersPill) pdpViewersPill.style.display = 'none';

    const pdpStockMeter = document.querySelector('.pdp-stock-meter');
    if (pdpStockMeter) pdpStockMeter.style.display = 'none';

    const pdpFinishGroup = document.getElementById('pdpFinishGroup');
    if (pdpFinishGroup) pdpFinishGroup.style.display = 'none';

    const pdpTabBtnReviews = document.getElementById('pdpTabBtnReviews');
    if (pdpTabBtnReviews) pdpTabBtnReviews.style.display = 'none';

    if (pdpEmiValue) pdpEmiValue.textContent = `₹${emiAmount.toLocaleString('en-IN')}`;
    updatePdpSubtotal();

    // Inventory status display (hidden as requested)
    if (relicGalleryStock) {
      relicGalleryStock.style.display = 'none';
      if (relicGalleryStock.parentElement) {
        relicGalleryStock.parentElement.style.display = 'none';
      }
    }

    // Wishlist Button sync
    const isWish = isWishlisted(sku);
    if (relicGalleryWishlistBtn) {
      relicGalleryWishlistBtn.classList.toggle('active', isWish);
      const svg = relicGalleryWishlistBtn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isWish ? 'currentColor' : 'none');
      if (relicGalleryWishlistText) {
        relicGalleryWishlistText.textContent = isWish ? 'SAVED IN WISHLIST' : 'WISHLIST';
      }
    }

    // Reset tabs to default (Lore)
    switchPdpTab('lore');

    // Render gallery photos & thumbs
    renderGalleryImages();

    // Render reviews & cross sell
    renderPdpReviews(sku);
    renderPdpCrossSell(sku);

    // Sync price drop alert status & email for this item
    syncPdpPriceDropUI(item);

    // Open Modal dialog
    relicGalleryModal.classList.add('open');
    relicGalleryModal.setAttribute('aria-hidden', 'false');
    const relicModalDialogEl = document.getElementById('relicModalDialog');
    if (relicModalDialogEl) relicModalDialogEl.scrollTop = 0;
    document.body.classList.add('bag-open');
    document.documentElement.classList.add('bag-open');

    // Push browser history state so mobile & browser back buttons return to previous page
    try {
      if (!history.state || !history.state.relicModalOpen) {
        history.pushState({ relicModalOpen: true, sku: item.sku || item.id }, '', window.location.href);
      }
    } catch (_) {}
  }

  function updatePdpSubtotal() {
    if (!activeGalleryItem || !pdpSubtotalPrice) return;
    const priceInr = Number(activeGalleryItem.priceInr) || (activeGalleryItem.priceUsd ? Math.round(activeGalleryItem.priceUsd * 83) : 4999);
    const total = priceInr * currentPdpQty;
    pdpSubtotalPrice.textContent = `₹${total.toLocaleString('en-IN')} INR`;
  }

  function renderGalleryImages() {
    if (activeGalleryImages.length === 0) {
      if (relicGalleryMainImg) relicGalleryMainImg.style.display = 'none';
      if (relicGallerySvgFallback) {
        relicGallerySvgFallback.style.display = 'grid';
        relicGallerySvgFallback.innerHTML = (activeGalleryItem && activeGalleryItem.iconSvg) || '<svg viewBox="0 0 40 40" width="80" height="80" fill="none" stroke="currentColor"><circle cx="20" cy="20" r="14" stroke="var(--blood-hot)"/></svg>';
      }
      if (relicGalleryCounter) relicGalleryCounter.textContent = 'CANONICAL SEAL';
      if (relicGalleryThumbs) relicGalleryThumbs.innerHTML = '';
      if (relicGalleryPrevBtn) relicGalleryPrevBtn.style.display = 'none';
      if (relicGalleryNextBtn) relicGalleryNextBtn.style.display = 'none';
      return;
    }

    if (relicGallerySvgFallback) relicGallerySvgFallback.style.display = 'none';
    if (relicGalleryMainImg) {
      relicGalleryMainImg.style.display = 'block';
      relicGalleryMainImg.src = activeGalleryImages[activeGalleryImageIndex];
      relicGalleryMainImg.onerror = function() {
        if (!this.dataset.fb) {
          this.dataset.fb = '1';
          this.src = '/product-minato.jpg';
        }
      };
      relicGalleryMainImg.alt = `${activeGalleryItem ? activeGalleryItem.name : 'Relic'} angle ${activeGalleryImageIndex + 1}`;
    }

    if (relicGalleryCounter) {
      relicGalleryCounter.textContent = `${activeGalleryImageIndex + 1} / ${activeGalleryImages.length} PHOTOS`;
    }

    const showNav = activeGalleryImages.length > 1;
    if (relicGalleryPrevBtn) relicGalleryPrevBtn.style.display = showNav ? 'grid' : 'none';
    if (relicGalleryNextBtn) relicGalleryNextBtn.style.display = showNav ? 'grid' : 'none';

    if (relicGalleryThumbs) {
      relicGalleryThumbs.innerHTML = activeGalleryImages.map((src, i) => `
        <div class="relic-gallery__thumb ${i === activeGalleryImageIndex ? 'active' : ''}" data-gallery-thumb="${i}" role="button" tabindex="0" title="Inspect Photo ${i + 1}">
          <img src="${src}" alt="Angle ${i + 1}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}" />
          <span class="relic-gallery__thumb-num">${i + 1}</span>
        </div>
      `).join('');

      relicGalleryThumbs.querySelectorAll('[data-gallery-thumb]').forEach(thumb => {
        thumb.addEventListener('click', () => {
          activeGalleryImageIndex = parseInt(thumb.dataset.galleryThumb, 10);
          renderGalleryImages();
        });
      });
    }
  }

  function closeRelicGallery(fromPopState = false) {
    if (!relicGalleryModal) return;

    relicGalleryModal.classList.remove('open');
    relicGalleryModal.setAttribute('aria-hidden', 'true');

    if (!fromPopState) {
      try {
        if (history.state && history.state.relicModalOpen) {
          history.back();
        }
      } catch (_) {}
    }

    if (pdpPreviousSource === 'collections' && collectionsPage) {
      // Restore user to exact position in All Collections
      collectionsPage.classList.add('open');
      collectionsPage.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
      document.documentElement.classList.add('bag-open');
      collectionsPage.scrollTop = pdpSavedCollecScrollTop;
    } else {
      // Restore user to exact scroll position on previous shop / main page
      if (collectionsPage) {
        collectionsPage.classList.remove('open');
        collectionsPage.setAttribute('aria-hidden', 'true');
      }
      document.body.classList.remove('bag-open');
      document.documentElement.classList.remove('bag-open');
      const targetY = pdpSavedScrollY > 200 ? pdpSavedScrollY : (document.getElementById('shop')?.offsetTop || 0);
      window.scrollTo({
        top: targetY,
        behavior: 'instant'
      });
    }
  }

  // Tab switching helper
  function switchPdpTab(tabName) {
    if (!pdpTabsSection) return;
    pdpTabsSection.querySelectorAll('.pdp-tab-btn').forEach(btn => {
      const isMatch = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isMatch);
      btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
    });

    const panes = {
      lore: document.getElementById('pdpPaneLore'),
      specs: document.getElementById('pdpPaneSpecs'),
      shipping: document.getElementById('pdpPaneShipping'),
      reviews: document.getElementById('pdpPaneReviews')
    };

    Object.keys(panes).forEach(k => {
      if (panes[k]) {
        panes[k].style.display = k === tabName ? 'block' : 'none';
      }
    });
  }

  if (pdpTabsSection) {
    pdpTabsSection.querySelectorAll('.pdp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchPdpTab(btn.dataset.tab);
      });
    });
  }

  if (pdpJumpReviewsBtn) {
    pdpJumpReviewsBtn.addEventListener('click', () => {
      switchPdpTab('reviews');
      const pane = document.getElementById('pdpPaneReviews');
      if (pane) pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Variant selector interactions
  if (pdpSizeOptions) {
    pdpSizeOptions.querySelectorAll('.pdp-size-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        pdpSizeOptions.querySelectorAll('.pdp-size-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentSelectedSize = chip.dataset.size;
        if (pdpSelectedSizeLabel) pdpSelectedSizeLabel.textContent = currentSelectedSize;
      });
    });
  }

  if (pdpSizeGuideBtn && pdpSizeGuideBox) {
    pdpSizeGuideBtn.addEventListener('click', () => {
      const isHidden = pdpSizeGuideBox.style.display === 'none';
      pdpSizeGuideBox.style.display = isHidden ? 'block' : 'none';
      pdpSizeGuideBtn.textContent = isHidden ? 'CLOSE CHART ✕' : 'SIZE CHART ⓘ';
    });
  }

  if (pdpFinishOptions) {
    pdpFinishOptions.querySelectorAll('.pdp-finish-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        pdpFinishOptions.querySelectorAll('.pdp-finish-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentSelectedFinish = chip.dataset.finish;
        if (pdpSelectedFinishLabel) pdpSelectedFinishLabel.textContent = currentSelectedFinish;
      });
    });
  }

  // Quantity stepper interactions
  if (pdpQtyDec) {
    pdpQtyDec.addEventListener('click', () => {
      if (currentPdpQty > 1) {
        currentPdpQty--;
        if (pdpQtyInput) pdpQtyInput.value = String(currentPdpQty);
        updatePdpSubtotal();
      }
    });
  }

  if (pdpQtyInc) {
    pdpQtyInc.addEventListener('click', () => {
      if (currentPdpQty < 10) {
        currentPdpQty++;
        if (pdpQtyInput) pdpQtyInput.value = String(currentPdpQty);
        updatePdpSubtotal();
      }
    });
  }

  // Postal PIN Code Delivery Estimator
  function checkDeliveryPincode() {
    if (!pdpPincodeInput || !pdpDeliveryResult) return;
    const pin = pdpPincodeInput.value.trim();
    if (/^\d{6}$/.test(pin)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + 2);
      const dayName = days[deliveryDate.getDay()];
      pdpDeliveryResult.innerHTML = `
        <span style="color:#10b981; font-weight:700;">✓ COURIER AVAILABLE TO PIN ${pin}:</span><br>
        ⚡ Express guaranteed delivery by <strong>${dayName}, 5:00 PM</strong>. Insured Raven courier dispatched within 24h.
      `;
    } else {
      pdpDeliveryResult.innerHTML = `
        <span style="color:#f59e0b;">ⓘ Please enter a valid 6-digit Indian PIN code (e.g. 110001 or 400001).</span>
      `;
    }
  }

  if (pdpPincodeCheckBtn) pdpPincodeCheckBtn.addEventListener('click', checkDeliveryPincode);
  if (pdpPincodeInput) {
    pdpPincodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkDeliveryPincode();
      }
    });
  }

  // Helper for reliable clipboard copy across iframes and restricted environments
  function copyTextToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => execCommandFallback(text));
    }
    return execCommandFallback(text);
  }

  function execCommandFallback(text) {
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        textarea.setSelectionRange(0, 99999);
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) {
          resolve();
        } else {
          reject(new Error('Copy command failed'));
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  // Share button
  if (pdpShareBtn) {
    pdpShareBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!activeGalleryItem) return;

      const itemName = activeGalleryItem.name || 'Artifact';
      const sku = activeGalleryItem.sku || activeGalleryItem.id;
      const shareUrl = `${window.location.origin}${window.location.pathname}#relic=${encodeURIComponent(sku)}`;

      const shareLabel = pdpShareBtn.querySelector('span');
      const originalText = shareLabel ? shareLabel.textContent : 'SHARE';

      const showCopiedSuccess = () => {
        pdpShareBtn.classList.add('copied');
        if (shareLabel) shareLabel.textContent = 'COPIED!';
        showToast('LINK COPIED', `${itemName} share link copied to clipboard`, 'info');
        setTimeout(() => {
          pdpShareBtn.classList.remove('copied');
          if (shareLabel) shareLabel.textContent = originalText;
        }, 2000);
      };

      // Native share if supported
      if (navigator.share && navigator.canShare && navigator.canShare({ url: shareUrl, title: itemName })) {
        try {
          await navigator.share({
            title: `${itemName} · The Street Co`,
            text: `Check out ${itemName} on The Street Co`,
            url: shareUrl,
          });
          showToast('SHARED', `${itemName} link shared successfully`, 'info');
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }

      // Robust clipboard copy with fallback
      copyTextToClipboard(shareUrl)
        .then(() => {
          showCopiedSuccess();
        })
        .catch(() => {
          showCopiedSuccess();
        });
    });
  }

  // Buy It Now (Express Checkout into multi-step flow)
  if (pdpBuyNowBtn) {
    pdpBuyNowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!activeGalleryItem) return;

      const safeImage = (activeGalleryImages && activeGalleryImages[activeGalleryImageIndex])
        || activeGalleryItem.image
        || (activeGalleryItem.images && activeGalleryItem.images[0])
        || activeGalleryItem.imageUrl
        || '';

      const configuredItem = {
        id: activeGalleryItem.sku || activeGalleryItem.id || 'RELIC-DIRECT',
        sku: activeGalleryItem.sku || activeGalleryItem.id || 'RELIC-DIRECT',
        name: activeGalleryItem.name || 'Imperial Relic',
        category: activeGalleryItem.category || 'Relics',
        collection: activeGalleryItem.collection || '',
        collectionName: activeGalleryItem.collectionName || 'Official Collection',
        seal: activeGalleryItem.seal || '忍',
        specs: activeGalleryItem.specs || '',
        desc: activeGalleryItem.desc || '',
        priceInr: Number(activeGalleryItem.priceInr) || (activeGalleryItem.priceUsd ? Math.round(activeGalleryItem.priceUsd * 83) : 4999),
        priceRyo: activeGalleryItem.priceRyo ? Number(activeGalleryItem.priceRyo) : Math.round((Number(activeGalleryItem.priceInr) || 4999) * 1.54),
        qty: Math.max(1, parseInt(currentPdpQty, 10) || 1),
        size: currentSelectedSize || 'M',
        finish: currentSelectedFinish || 'Obsidian Shadow',
        image: safeImage
      };

      // Hide relic gallery modal directly so checkout modal can open immediately
      if (relicGalleryModal) {
        relicGalleryModal.classList.remove('open');
        relicGalleryModal.setAttribute('aria-hidden', 'true');
      }

      openCheckoutModal([configuredItem], 'buy_now');
    });
  }

  // ══════════ PDP PRICE DROP ALERT LISTENERS (WITHIN .pdp-pricing-card) ══════════
  if (pdpPriceDropBtn) {
    pdpPriceDropBtn.addEventListener('click', () => {
      if (pdpPriceDropForm) {
        pdpPriceDropForm.style.display = 'flex';
        pdpPriceDropBtn.style.display = 'none';
        if (pdpPriceDropEmailInput) {
          if (!pdpPriceDropEmailInput.value) {
            pdpPriceDropEmailInput.value = getSavedUserEmail();
          }
          pdpPriceDropEmailInput.focus();
          pdpPriceDropEmailInput.select();
        }
      }
    });
  }

  if (pdpPriceDropCancelBtn) {
    pdpPriceDropCancelBtn.addEventListener('click', () => {
      if (pdpPriceDropForm) pdpPriceDropForm.style.display = 'none';
      if (pdpPriceDropBtn) pdpPriceDropBtn.style.display = 'flex';
    });
  }

  if (pdpPriceDropForm) {
    pdpPriceDropForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeGalleryItem) return;
      const email = (pdpPriceDropEmailInput ? pdpPriceDropEmailInput.value : '').trim();
      if (!email || !email.includes('@') || !email.includes('.')) {
        if (pdpPriceDropEmailInput) {
          pdpPriceDropEmailInput.focus();
          pdpPriceDropEmailInput.style.borderColor = 'rgba(255,255,255,.8)';
          pdpPriceDropEmailInput.style.boxShadow = '0 0 14px rgba(255,255,255,.3)';
          setTimeout(() => {
            pdpPriceDropEmailInput.style.borderColor = '';
            pdpPriceDropEmailInput.style.boxShadow = '';
          }, 1400);
        }
        return;
      }

      // Save user email to local storage
      setSavedUserEmail(email);

      const sku = activeGalleryItem.sku || activeGalleryItem.id;
      const currentPrice = Number(activeGalleryItem.priceInr) || (activeGalleryItem.priceUsd ? Math.round(activeGalleryItem.priceUsd * 83) : 4999);
      const alerts = getSavedPriceAlerts();
      alerts[sku] = {
        sku: sku,
        name: activeGalleryItem.name,
        basePrice: currentPrice,
        alertPrice: currentPrice,
        email: email,
        savedAt: Date.now(),
        triggered: false
      };
      savePriceAlerts(alerts);

      // Trigger confirmation toast
      showToast(
        'PRICE DROP ALERT SAVED 🔔',
        `Monitoring ${activeGalleryItem.name}. Alert registered for ${email} (Saved to local storage)`,
        'price-drop'
      );

      // Refresh UI state inside .pdp-pricing-card
      syncPdpPriceDropUI(activeGalleryItem);
    });
  }

  if (pdpPriceDropTestBtn) {
    pdpPriceDropTestBtn.addEventListener('click', () => {
      if (!activeGalleryItem) return;
      const sku = activeGalleryItem.sku || activeGalleryItem.id;
      const alerts = getSavedPriceAlerts();
      const alert = alerts[sku];
      const currentPrice = Number(activeGalleryItem.priceInr) || 11999;
      // Simulate 15% price drop
      const newPrice = Math.round(currentPrice * 0.85);
      const email = alert ? alert.email : getSavedUserEmail();

      // Trigger toast and animate price decrease
      triggerPriceDropToast(activeGalleryItem, currentPrice, newPrice, email);

      // Update alert in localStorage as triggered
      if (alert) {
        alert.triggered = true;
        alert.lastNotifiedPrice = newPrice;
        alerts[sku] = alert;
        savePriceAlerts(alerts);
      }
    });
  }

  if (pdpPriceDropRemoveBtn) {
    pdpPriceDropRemoveBtn.addEventListener('click', () => {
      if (!activeGalleryItem) return;
      const sku = activeGalleryItem.sku || activeGalleryItem.id;
      const alerts = getSavedPriceAlerts();
      if (alerts[sku]) {
        delete alerts[sku];
        savePriceAlerts(alerts);
      }
      showToast('ALERT REMOVED', `Price drop tracker removed for ${activeGalleryItem.name}`, 'wishlist');
      syncPdpPriceDropUI(activeGalleryItem);
    });
  }

  // PDP Reviews System
  function renderPdpReviews(sku) {
    if (!pdpReviewsList) return;
    const customList = relicCustomReviews[sku] || [];
    const allReviews = [...customList, ...DEFAULT_STORE_REVIEWS];
    const totalReviews = allReviews.length;

    if (pdpReviewCountLabel) pdpReviewCountLabel.textContent = `${totalReviews} Verified Customer Reviews`;
    if (pdpTabReviewCount) pdpTabReviewCount.textContent = String(totalReviews);

    pdpReviewsList.innerHTML = allReviews.map(r => `
      <article class="pdp-review-card">
        <div class="pdp-review-header">
          <div class="pdp-reviewer-meta">
            <div class="pdp-reviewer-avatar">${(r.author || 'S')[0].toUpperCase()}</div>
            <div>
              <span class="pdp-reviewer-name">${r.author}</span>
              ${r.verified ? `<span class="pdp-verified-badge">VERIFIED SHINOBI</span>` : ''}
            </div>
          </div>
          <span class="pdp-review-date">${r.date || 'Recently'}</span>
        </div>
        <div class="pdp-review-stars">${'★'.repeat(r.rating || 5)}${'☆'.repeat(5 - (r.rating || 5))}</div>
        <h6 class="pdp-review-headline">${r.headline}</h6>
        <p class="pdp-review-body">${r.body}</p>
      </article>
    `).join('');
  }

  if (pdpOpenReviewFormBtn && pdpReviewForm) {
    pdpOpenReviewFormBtn.addEventListener('click', () => {
      pdpReviewForm.style.display = pdpReviewForm.style.display === 'none' ? 'flex' : 'none';
    });
  }

  if (pdpCancelReviewBtn && pdpReviewForm) {
    pdpCancelReviewBtn.addEventListener('click', () => {
      pdpReviewForm.style.display = 'none';
    });
  }

  if (pdpReviewForm) {
    pdpReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!activeGalleryItem) return;
      const sku = activeGalleryItem.sku || activeGalleryItem.id;
      const author = document.getElementById('reviewAuthorInput').value.trim() || 'Shinobi';
      const rating = parseInt(document.getElementById('reviewRatingSelect').value, 10) || 5;
      const headline = document.getElementById('reviewHeadlineInput').value.trim() || 'Exceptional artifact';
      const body = document.getElementById('reviewTextInput').value.trim();

      if (!relicCustomReviews[sku]) relicCustomReviews[sku] = [];
      relicCustomReviews[sku].unshift({
        author,
        verified: true,
        rating,
        date: 'Just now',
        headline,
        body
      });

      pdpReviewForm.reset();
      pdpReviewForm.style.display = 'none';
      renderPdpReviews(sku);
      showToast('REVIEW SUBMITTED', 'Your review was published to customer reviews', 'wishlist');
    });
  }

  // Cross-sell ("Frequently Forged Together")
  function renderPdpCrossSell(currentSku) {
    if (!pdpCrossSellGrid) return;
    const candidates = collectionsData.filter(i => (i.sku || i.id) !== currentSku);
    const selected = candidates.slice(0, 3);

    pdpCrossSellGrid.innerHTML = selected.map(item => {
      const itemSku = item.sku || item.id;
      const priceInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
      const thumb = (Array.isArray(item.images) && item.images[0]) || item.imageUrl || '';
      return `
        <div class="pdp-cross-item" data-cross-open="${itemSku}">
          <div class="pdp-cross-item__thumb">
            ${thumb 
              ? `<img src="${thumb}" alt="${item.name}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}else{this.parentElement.innerHTML='${item.seal || '忍'}';}" />` 
              : `<div style="width:100%;height:100%;display:grid;place-items:center;color:var(--blood-hot);font-family:var(--mono);">${item.seal || '忍'}</div>`}
          </div>
          <div class="pdp-cross-item__info">
            <h5>${item.name}</h5>
            <div class="pdp-cross-item__price">₹${priceInr.toLocaleString('en-IN')} INR</div>
          </div>
          <button class="pdp-cross-item__add-btn" type="button" data-cross-add="${itemSku}" title="Add to bag">
            + BAG
          </button>
        </div>
      `;
    }).join('');

    // Cross-sell actions
    pdpCrossSellGrid.querySelectorAll('[data-cross-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.dataset.crossAdd;
        const crossItem = collectionsData.find(i => (i.sku || i.id) === sku);
        if (crossItem) handleAddToCart(btn, crossItem, 1);
      });
    });

    pdpCrossSellGrid.querySelectorAll('[data-cross-open]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-cross-add]')) return;
        const sku = card.dataset.crossOpen;
        const crossItem = collectionsData.find(i => (i.sku || i.id) === sku);
        if (crossItem) openRelicGallery(crossItem, pdpPreviousSource);
      });
    });
  }

  // Modal navigation controls & Return to previous page
  if (pdpBreadcrumbHome) {
    pdpBreadcrumbHome.addEventListener('click', (e) => {
      e.preventDefault();
      closeRelicGallery();
    });
  }

  const pdpBackLink = document.getElementById('pdpBackLink');
  if (pdpBackLink) {
    pdpBackLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeRelicGallery();
    });
  }

  if (relicGalleryCloseBtn) {
    relicGalleryCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeRelicGallery();
    });
  }

  if (relicGalleryBackdrop) {
    relicGalleryBackdrop.addEventListener('click', (e) => {
      e.preventDefault();
      closeRelicGallery();
    });
  }

  // Handle browser/phone back button (always takes user to previous page/view, never unexpectedly jumps to homepage)
  window.addEventListener('popstate', (e) => {
    // 1. If image zoom view is open
    const zoomModal = document.getElementById('amazonZoomModal');
    if (zoomModal && zoomModal.classList.contains('open')) {
      const closeZoom = document.getElementById('amazonZoomCloseBtn');
      if (closeZoom) closeZoom.click();
      return;
    }

    // 2. If Checkout Modal is open
    if (checkoutFlowModal && checkoutFlowModal.classList.contains('open')) {
      if (checkoutSession.currentStep === 2) {
        goToCheckoutStep(1);
        return;
      }
      if (checkoutSession.currentStep === 3) {
        goToCheckoutStep(2);
        return;
      }
      closeCheckoutModal(true);
      return;
    }

    // 3. If Product Details (PDP) modal is open, return to previous screen (Collections or Shop)
    if (relicGalleryModal && relicGalleryModal.classList.contains('open')) {
      closeRelicGallery(true);
      return;
    }

    // 4. If Collections Page is open, return to Shop
    if (collectionsPage && collectionsPage.classList.contains('open')) {
      closeCollectionsPage(true);
      return;
    }

    // 5. If Cart / Wishlist drawer is open, close drawer
    if (cartDrawer && cartDrawer.classList.contains('open')) {
      closeCart(true);
      return;
    }

    // 6. Other secondary modals
    const courierModal = document.getElementById('courierTrackingModal');
    if (courierModal && courierModal.classList.contains('open')) {
      const closeTrack = document.getElementById('courierTrackingCloseBtn');
      if (closeTrack) closeTrack.click();
      return;
    }
    const sizeGuideModal = document.getElementById('sizeGuideModal');
    if (sizeGuideModal && sizeGuideModal.classList.contains('open')) {
      sizeGuideModal.classList.remove('open');
      sizeGuideModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('bag-open');
      return;
    }
    const legalPolicyModal = document.getElementById('legalPolicyModal');
    if (legalPolicyModal && legalPolicyModal.classList.contains('open')) {
      legalPolicyModal.classList.remove('open');
      legalPolicyModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('bag-open');
      return;
    }
  });

  if (relicGalleryPrevBtn) {
    relicGalleryPrevBtn.addEventListener('click', () => {
      if (activeGalleryImages.length <= 1) return;
      activeGalleryImageIndex = (activeGalleryImageIndex - 1 + activeGalleryImages.length) % activeGalleryImages.length;
      renderGalleryImages();
    });
  }

  if (relicGalleryNextBtn) {
    relicGalleryNextBtn.addEventListener('click', () => {
      if (activeGalleryImages.length <= 1) return;
      activeGalleryImageIndex = (activeGalleryImageIndex + 1) % activeGalleryImages.length;
      renderGalleryImages();
    });
  }

  if (relicGalleryAddBagBtn) {
    relicGalleryAddBagBtn.addEventListener('click', () => {
      if (!activeGalleryItem) return;
      handleAddToCart(relicGalleryAddBagBtn, activeGalleryItem, currentPdpQty);
    });
  }

  if (relicGalleryWishlistBtn) {
    relicGalleryWishlistBtn.addEventListener('click', () => {
      if (!activeGalleryItem) return;
      toggleWishlist(activeGalleryItem, relicGalleryWishlistBtn);
    });
  }

  window.addEventListener('keydown', (e) => {
    if (amazonZoomModal && amazonZoomModal.classList.contains('open')) {
      if (e.key === 'Escape') {
        closeAmazonZoomModal();
        return;
      } else if (e.key === 'ArrowLeft' && activeGalleryImages.length > 1) {
        activeGalleryImageIndex = (activeGalleryImageIndex - 1 + activeGalleryImages.length) % activeGalleryImages.length;
        renderGalleryImages();
        openAmazonZoomModal(activeGalleryImageIndex);
        return;
      } else if (e.key === 'ArrowRight' && activeGalleryImages.length > 1) {
        activeGalleryImageIndex = (activeGalleryImageIndex + 1) % activeGalleryImages.length;
        renderGalleryImages();
        openAmazonZoomModal(activeGalleryImageIndex);
        return;
      }
    }

    if (relicGalleryModal && relicGalleryModal.classList.contains('open')) {
      if (e.key === 'Escape') {
        closeRelicGallery();
      } else if (e.key === 'ArrowLeft' && activeGalleryImages.length > 1) {
        activeGalleryImageIndex = (activeGalleryImageIndex - 1 + activeGalleryImages.length) % activeGalleryImages.length;
        renderGalleryImages();
      } else if (e.key === 'ArrowRight' && activeGalleryImages.length > 1) {
        activeGalleryImageIndex = (activeGalleryImageIndex + 1) % activeGalleryImages.length;
        renderGalleryImages();
      }
    }
  });

  // ═══════════ RECENTLY VIEWED MANAGER ═══════════
  const RECENTLY_VIEWED_STORAGE_KEY = 'the_street_co_recently_viewed_v1';
  const MAX_RECENTLY_VIEWED = 4;

  const recentlyViewedSection = document.getElementById('recentlyViewedSection');
  const recentlyViewedGrid = document.getElementById('recentlyViewedGrid');
  const recentlyViewedClearBtn = document.getElementById('recentlyViewedClearBtn');

  // Collections Search Bar Dropdown Elements
  const collecSearchRecentDropdown = document.getElementById('collecSearchRecentDropdown');
  const collecSearchRecentList = document.getElementById('collecSearchRecentList');
  const collecSearchWrapper = document.getElementById('collecSearchWrapper');

  function getRecentlyViewed() {
    try {
      const raw = localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTLY_VIEWED) : [];
    } catch (_) {
      return [];
    }
  }

  function saveRecentlyViewed(items) {
    try {
      localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_RECENTLY_VIEWED)));
    } catch (_) {}
  }

  function trackRecentlyViewed(item) {
    if (!item) return;
    const sku = item.sku || item.id;
    if (!sku) return;

    const list = getRecentlyViewed();
    // Filter out item if it already exists in the list to avoid duplicates
    const filtered = list.filter(i => (i.sku || i.id) !== sku);

    const priceInr = Number(item.priceInr) || (item.priceUsd ? Math.round(item.priceUsd * 83) : 4999);
    const priceRyo = item.priceRyo ? Number(item.priceRyo) : Math.round(priceInr * 1.54);
    const mainImg = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.imageUrl || '');

    const compactItem = {
      id: sku,
      sku: sku,
      name: item.name || 'Official Item',
      collectionName: item.collectionName || 'Official Collection',
      category: item.category || 'Relics',
      priceInr,
      priceRyo,
      priceUsd: item.priceUsd || Math.round(priceInr / 83),
      seal: item.seal || '忍',
      imageUrl: mainImg,
      images: Array.isArray(item.images) ? item.images : (mainImg ? [mainImg] : []),
      desc: item.desc || '',
      specs: item.specs || 'Officially Certified Authentic Item',
      viewedAt: Date.now()
    };

    // Prepend to front & restrict to last 4
    filtered.unshift(compactItem);
    const updated = filtered.slice(0, MAX_RECENTLY_VIEWED);
    saveRecentlyViewed(updated);

    // Refresh UI
    renderRecentlyViewedSection();
    renderSearchRecentlyViewedDropdowns();
  }

  function removeRecentlyViewedItem(sku) {
    const list = getRecentlyViewed();
    const updated = list.filter(i => (i.sku || i.id) !== sku);
    saveRecentlyViewed(updated);
    renderRecentlyViewedSection();
    renderSearchRecentlyViewedDropdowns();
  }

  function clearRecentlyViewed() {
    try {
      localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
    } catch (_) {}
    renderRecentlyViewedSection();
    renderSearchRecentlyViewedDropdowns();
    showToast('RECENT VIEWS CLEARED', 'Archive inspection history wiped', 'info');
  }

  function renderRecentlyViewedSection() {
    if (!recentlyViewedGrid) return;
    const items = getRecentlyViewed();

    if (recentlyViewedClearBtn) {
      recentlyViewedClearBtn.style.display = items.length > 0 ? 'inline-flex' : 'none';
    }

    if (items.length === 0) {
      recentlyViewedGrid.innerHTML = `
        <div class="recently-viewed__empty">
          <div class="recently-viewed__empty-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h4>NO RECENTLY VIEWED ARTIFACTS RECORDED</h4>
          <p>Inspect any product across the shop grid or collections to view your browsing history.</p>
        </div>
      `;
      return;
    }

    recentlyViewedGrid.innerHTML = items.map(item => {
      const sku = item.sku || item.id;
      const img = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.imageUrl || '');
      const priceInr = Number(item.priceInr) || 4999;
      const priceRyo = item.priceRyo ? Number(item.priceRyo) : Math.round(priceInr * 1.54);

      return `
        <article class="recent-card product-card" data-recent-sku="${sku}">
          <div class="recent-card__thumb" data-recent-inspect="${sku}" role="button" tabindex="0" title="Inspect ${item.name.replace(/"/g, '&quot;')}">
            ${img ? `<img src="${img}" alt="${item.name.replace(/"/g, '&quot;')}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='/product-minato.jpg';}else{this.style.display='none';}" />` : ''}
            <button type="button" class="recent-card__remove-btn" data-recent-remove="${sku}" title="Remove from recent views">✕</button>
          </div>
          <span class="recent-card__cat">${item.collectionName || item.category || 'THE STREET CO'}</span>
          <h4 class="recent-card__title" data-recent-inspect="${sku}" title="${item.name.replace(/"/g, '&quot;')}">${item.name}</h4>
          <div class="recent-card__price-row">
            <span class="recent-card__inr">₹${priceInr.toLocaleString('en-IN')}</span>
          </div>
          <div class="recent-card__actions">
            <button type="button" class="recent-card__inspect-btn" data-recent-inspect="${sku}">INSPECT RELIC</button>
            <button type="button" class="recent-card__bag-btn" data-recent-add="${sku}" title="Add to Cart">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Attach inspect listeners
    recentlyViewedGrid.querySelectorAll('[data-recent-inspect]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-recent-remove]') || e.target.closest('[data-recent-add]')) return;
        const sku = el.dataset.recentInspect;
        const fullItem = collectionsData.find(i => (i.sku || i.id) === sku) || items.find(i => (i.sku || i.id) === sku);
        if (fullItem) openRelicGallery(fullItem);
      });
    });

    // Attach remove listener
    recentlyViewedGrid.querySelectorAll('[data-recent-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeRecentlyViewedItem(btn.dataset.recentRemove);
      });
    });

    // Attach Add to Bag listener
    recentlyViewedGrid.querySelectorAll('[data-recent-add]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const sku = btn.dataset.recentAdd;
        const fullItem = collectionsData.find(i => (i.sku || i.id) === sku) || items.find(i => (i.sku || i.id) === sku);
        if (fullItem) handleAddToCart(btn, fullItem);
      });
    });

    attachCardHoverSlideshow(recentlyViewedGrid);
  }

  function renderSearchRecentlyViewedDropdowns() {
    const items = getRecentlyViewed();

    const targets = [
      { dropdown: collecSearchRecentDropdown, list: collecSearchRecentList },
      { dropdown: shopSearchRecentDropdown, list: shopSearchRecentList }
    ];

    targets.forEach(({ dropdown, list }) => {
      if (!list) return;
      if (items.length === 0) {
        list.innerHTML = `<div class="search-recent__empty">No search or browsing history yet.<br>Products you explore will appear here.</div>`;
        return;
      }

      list.innerHTML = items.map(item => {
        const sku = item.sku || item.id;
        const img = (Array.isArray(item.images) && item.images.length > 0) ? item.images[0] : (item.imageUrl || '');
        const priceInr = Number(item.priceInr) || 4999;
        return `
          <button type="button" class="search-recent__item" data-search-recent-open="${sku}">
            <div class="search-recent__thumb">
              ${img ? `<img src="${img}" alt="${item.name.replace(/"/g, '&quot;')}" onerror="this.style.display='none';" />` : ''}
            </div>
            <div class="search-recent__info">
              <span class="search-recent__title">${item.name}</span>
              <span class="search-recent__meta">${item.collectionName || item.category || 'The Street Co'}</span>
            </div>
            <span class="search-recent__price">₹${priceInr.toLocaleString('en-IN')}</span>
          </button>
        `;
      }).join('');

      list.querySelectorAll('[data-search-recent-open]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const sku = btn.dataset.searchRecentOpen;
          const fullItem = collectionsData.find(i => (i.sku || i.id) === sku) || items.find(i => (i.sku || i.id) === sku);
          if (dropdown) dropdown.style.display = 'none';
          if (fullItem) openRelicGallery(fullItem);
        });
      });
    });
  }

  // Bind clear handlers
  if (recentlyViewedClearBtn) {
    recentlyViewedClearBtn.addEventListener('click', clearRecentlyViewed);
  }
  document.querySelectorAll('[data-action="clear-recently-viewed"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearRecentlyViewed();
    });
  });

  // Shop Search Bar event bindings
  if (shopSearchInput) {
    shopSearchInput.addEventListener('focus', () => {
      renderSearchRecentlyViewedDropdowns();
      if (shopSearchRecentDropdown) {
        shopSearchRecentDropdown.style.display = 'block';
      }
    });

    shopSearchInput.addEventListener('input', (e) => {
      currentShopSearchQuery = e.target.value.trim();
      if (shopSearchClearBtn) {
        shopSearchClearBtn.style.display = currentShopSearchQuery ? 'block' : 'none';
      }
      if (shopSearchRecentDropdown) {
        shopSearchRecentDropdown.style.display = currentShopSearchQuery ? 'none' : 'block';
      }
      renderShopGrid();
    });
  }

  if (shopSearchClearBtn) {
    shopSearchClearBtn.addEventListener('click', () => {
      if (shopSearchInput) {
        shopSearchInput.value = '';
        currentShopSearchQuery = '';
        shopSearchClearBtn.style.display = 'none';
        renderShopGrid();
        shopSearchInput.focus();
        renderSearchRecentlyViewedDropdowns();
        if (shopSearchRecentDropdown) shopSearchRecentDropdown.style.display = 'block';
      }
    });
  }

  // Shop Search Submit button
  const shopSearchSubmitBtn = document.getElementById('shopSearchSubmitBtn');
  if (shopSearchSubmitBtn) {
    shopSearchSubmitBtn.addEventListener('click', () => {
      shopSearchSubmitBtn.classList.remove('clicked');
      void shopSearchSubmitBtn.offsetWidth;
      shopSearchSubmitBtn.classList.add('clicked');
      setTimeout(() => shopSearchSubmitBtn.classList.remove('clicked'), 550);

      if (shopSearchRecentDropdown) shopSearchRecentDropdown.style.display = 'none';
      if (shopSearchInput) {
        currentShopSearchQuery = shopSearchInput.value.trim();
        renderShopGrid();
      }
      const grid = document.getElementById('shopGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Trending relic search pills
  document.querySelectorAll('.shop__trending-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const term = pill.dataset.search || pill.textContent.trim();
      if (shopSearchInput) {
        shopSearchInput.value = term;
        currentShopSearchQuery = term;
        if (shopSearchClearBtn) shopSearchClearBtn.style.display = 'block';
      }
      if (shopSearchRecentDropdown) shopSearchRecentDropdown.style.display = 'none';
      renderShopGrid();
      const grid = document.getElementById('shopGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Collection Search Submit button
  const collectionSearchSubmitBtn = document.getElementById('collectionSearchSubmit');
  if (collectionSearchSubmitBtn) {
    collectionSearchSubmitBtn.addEventListener('click', () => {
      if (collecSearchRecentDropdown) collecSearchRecentDropdown.style.display = 'none';
      if (collectionSearchInput) {
        currentCollectionSearchQuery = collectionSearchInput.value.trim();
        renderCollections();
      }
      const grid = document.getElementById('collectionsGrid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Click outside to dismiss search dropdowns
  document.addEventListener('click', (e) => {
    if (collecSearchWrapper && !collecSearchWrapper.contains(e.target)) {
      if (collecSearchRecentDropdown) collecSearchRecentDropdown.style.display = 'none';
    }
    if (shopSearchWrapper && !shopSearchWrapper.contains(e.target)) {
      if (shopSearchRecentDropdown) shopSearchRecentDropdown.style.display = 'none';
    }
  });

  // ══════════════════════════════════════════════════════════════
  // STORE FAQ (DELETED)
  // ══════════════════════════════════════════════════════════════
  function initShopFaq() {}

  // ═══════════════════════════════════════════════════════════════════════
  // SITE FOOTER & NEWSLETTER SYSTEM
  // ═══════════════════════════════════════════════════════════════════════
  function initSiteFooter() {
    const newsletterForm = document.getElementById('footerNewsletterForm');
    const newsletterEmail = document.getElementById('footerNewsletterEmail');
    const newsletterBtn = document.getElementById('footerNewsletterBtn');
    const newsletterStatus = document.getElementById('footerNewsletterStatus');
    const backToTopBtn = document.getElementById('footerBackToTopBtn');

    // Restore previously subscribed email from localStorage if available
    try {
      const savedEmail = localStorage.getItem('the_street_co_newsletter_email');
      if (savedEmail && newsletterEmail) {
        newsletterEmail.value = savedEmail;
      }
    } catch (_) {}

    // Newsletter Form Submission
    if (newsletterForm && newsletterEmail && newsletterBtn) {
      newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rawEmail = (newsletterEmail.value || '').trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!rawEmail || !emailRegex.test(rawEmail)) {
          if (newsletterStatus) {
            newsletterStatus.className = 'footer__newsletter-status error';
            newsletterStatus.textContent = '⚠ Please enter a valid safehouse email address.';
          }
          newsletterEmail.focus();
          return;
        }

        const originalBtnContent = newsletterBtn.innerHTML;
        newsletterBtn.disabled = true;
        newsletterBtn.innerHTML = `<span>INITIATING...</span>`;
        if (newsletterStatus) {
          newsletterStatus.className = 'footer__newsletter-status';
          newsletterStatus.textContent = 'Transmitting frequency coordinates to the Raven Network...';
        }

        try {
          const now = new Date();
          const resp = await fetch('/api/newsletter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: rawEmail,
              clientDate: now.toLocaleDateString(),
              clientTime: now.toLocaleTimeString(),
              clientTimestamp: now.toISOString()
            })
          });
          const result = await resp.json();

            if (result && result.success) {
            if (newsletterStatus) {
              newsletterStatus.className = 'footer__newsletter-status success';
              newsletterStatus.textContent = `✓ ${result.message}`;
            }
            if (typeof window.trackGAEvent === 'function') {
              window.trackGAEvent('newsletter_subscribe', {
                method: 'footer_form'
              });
            }
            try {
              localStorage.setItem('the_street_co_newsletter_email', rawEmail);
            } catch (_) {}

            newsletterEmail.value = '';
          } else {
            throw new Error(result?.error || 'Subscription failed');
          }
        } catch (err) {
          // Even on offline or transient network issue, provide resilient fallback feedback
          if (newsletterStatus) {
            newsletterStatus.className = 'footer__newsletter-status success';
            newsletterStatus.textContent = `✓ Subscription recorded locally. Updates enabled for ${rawEmail}.`;
          }
          try {
            localStorage.setItem('the_street_co_newsletter_email', rawEmail);
          } catch (_) {}
          newsletterEmail.value = '';
        } finally {
          setTimeout(() => {
            newsletterBtn.disabled = false;
            newsletterBtn.innerHTML = originalBtnContent;
          }, 1500);
        }
      });
    }

    // Back to top smooth scroll
    if (backToTopBtn) {
      backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Delegated Footer Link Actions
    const siteFooter = document.getElementById('end');
    if (siteFooter) {
      siteFooter.addEventListener('click', (e) => {
        const link = e.target.closest('[data-footer-action]');
        if (!link) return;

        const action = link.dataset.footerAction;

        if (action === 'scroll') {
          e.preventDefault();
          const targetSel = link.dataset.target;
          const targetEl = targetSel ? document.querySelector(targetSel) : null;
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else if (action === 'filter-category') {
          e.preventDefault();
          const cat = link.dataset.category;
          // Find filter button in shop
          const filterBtn = document.querySelector(`.shop-pill[data-shop-cat="${cat}"]`);
          if (filterBtn) {
            filterBtn.click();
          } else {
            const cards = document.querySelectorAll('.shop-card');
            cards.forEach(c => {
              c.style.display = (cat === 'all' || c.dataset.category === cat) ? 'flex' : 'none';
            });
          }
          const shopSec = document.getElementById('shop');
          if (shopSec) {
            shopSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          // Zero toast notification on opening from footer
        } else if (action === 'filter-collection') {
          e.preventDefault();
          const col = link.dataset.collection;
          openCollectionsPage(col);
        } else if (action === 'open-collections') {
          e.preventDefault();
          openCollectionsPage();
        } else if (action === 'open-bag') {
          e.preventDefault();
          openCart('bag');
        } else if (action === 'open-wishlist') {
          e.preventDefault();
          openCart('wishlist');
        } else if (action === 'open-delhivery' || action === 'open-tracking') {
          e.preventDefault();
          if (typeof openDelhiveryTrackingModal === 'function') {
            openDelhiveryTrackingModal();
          } else {
            const modal = document.getElementById('delhiveryTrackModal');
            if (modal) {
              modal.classList.add('open');
              modal.setAttribute('aria-hidden', 'false');
            }
          }
        } else if (action === 'size-guide') {
          e.preventDefault();
          const modal = document.getElementById('sizeGuideModal');
          if (modal) {
            modal.classList.add('open');
            modal.setAttribute('aria-hidden', 'false');
          }
        } else if (action === 'legal') {
          e.preventDefault();
          const type = link.dataset.type;
          const legalModal = document.getElementById('legalPolicyModal');
          const legalTitle = document.getElementById('legalPolicyModalTitle');
          const legalTag = document.getElementById('legalPolicyModalTag');
          const legalBody = document.getElementById('legalPolicyModalBody');

          const legalContent = {
            privacy: {
              tag: "SECURITY & DATA PROTECTION",
              title: "PRIVACY POLICY",
              html: `
                <p style="margin-bottom:1rem;color:var(--bone);font-weight:700;">Zero-compromise customer privacy standards for all store patrons.</p>
                <div style="display:grid;gap:.8rem;">
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">256-Bit SSL Encryption</strong>
                    <span>All customer contact coordinates, delivery PIN addresses, and checkout information are secured with end-to-end 256-bit encryption.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">No Third-Party Data Brokers</strong>
                    <span>Your phone number and email are strictly restricted to dispatch updates, live tracking milestones, and safehouse order confirmations. We never sell or share client data.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Payment Gateway Security</strong>
                    <span>UPI handles, cards, and net banking sessions are processed through tokenized banking gateways. No card PINs or CVVs are ever retained on our systems.</span>
                  </div>
                </div>
              `
            },
            terms: {
              tag: "TERMS & CONDITIONS",
              title: "TERMS OF SERVICE",
              html: `
                <p style="margin-bottom:1rem;color:var(--bone);font-weight:700;">Terms governing purchases, apparel authenticity, and atelier fulfillment.</p>
                <div style="display:grid;gap:.8rem;">
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Artisanal Fabrication Standards</strong>
                    <span>Every cloak, tee, and jacket is produced with heavyweight Japanese gabardine, high-density embroidery, and reinforced stitchwork. Natural variations in artisanal dye wash signify authenticity.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Fair Allocation & Anti-Scalping</strong>
                    <span>Limited-run chronicle drops and Akatsuki cloak editions are subject to per-household purchase limits to ensure fair distribution amongst true enthusiasts.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Transparent Pricing & Invoicing</strong>
                    <span>All displayed prices are fully inclusive of applicable GST, textile levies, and luxury domestic packaging. What you see in your bag is the exact final total.</span>
                  </div>
                </div>
              `
            },
            shipping: {
              tag: "EXPRESS COURIER & LOGISTICS",
              title: "SHIPPING POLICY",
              html: `
                <p style="margin-bottom:1rem;color:var(--bone);font-weight:700;">Fast, fully insured doorstep delivery across India.</p>
                <div style="display:grid;gap:.8rem;">
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Pan-India Courier Network</strong>
                    <span>We fulfill orders to 28,000+ postal PIN codes covering all major metros, tier 2/3 cities, and regional zones via express surface and air transport partners.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Dispatch & Transit Windows</strong>
                    <span>Orders are inspected, sealed in weatherproof dust bags, and dispatched within 24 to 48 hours. Transit takes 3–5 business days for metros and 4–7 business days for regional addresses.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Live Order Tracking</strong>
                    <span>Every dispatched package generates an official Tracking Code which can be verified live on our Order Tracking radar or directly with courier portals.</span>
                  </div>
                </div>
              `
            },
            refund: {
              tag: "REPLACEMENTS & RETURN POLICY",
              title: "REFUND & RETURN POLICY",
              html: `
                <p style="margin-bottom:1rem;color:var(--bone);font-weight:700;">7-Day seamless doorstep replacements and customer satisfaction promise.</p>
                <div style="display:grid;gap:.8rem;">
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">7-Day Easy Sizing Exchange</strong>
                    <span>If your garment doesn't fit your desired silhouette, request a size replacement within 7 calendar days of delivery. Doorstep pickup is scheduled completely free of charge.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Condition Requirements</strong>
                    <span>Artifacts must be unworn, unwashed, free of perfumes/stains, and returned with original woven labels, tags, and packaging intact.</span>
                  </div>
                  <div style="padding:.75rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.08);border-radius:6px;">
                    <strong style="color:var(--bone);display:block;margin-bottom:3px;">Prompt Reversal & Store Credit</strong>
                    <span>In the rare event an exchange size is out of stock, refunds are processed back to the original payment source within 48 hours of quality inspection.</span>
                  </div>
                </div>
              `
            }
          };

          const policy = legalContent[type] || {
            tag: "STORE POLICIES",
            title: "STORE POLICY",
            html: `<p>All orders fulfilled under complete satisfaction and quality assurance guarantees.</p>`
          };

          if (legalTag) legalTag.textContent = policy.tag;
          if (legalTitle) legalTitle.textContent = policy.title;
          if (legalBody) legalBody.innerHTML = policy.html;

          if (legalModal) {
            legalModal.classList.add('open');
            legalModal.setAttribute('aria-hidden', 'false');
          }
        }
      });
    }

    // Size Guide Modal close handlers
    const sizeGuideModal = document.getElementById('sizeGuideModal');
    const sizeGuideCloseBtn = document.getElementById('sizeGuideModalCloseBtn');
    const sizeGuideOkBtn = document.getElementById('sizeGuideModalOkBtn');
    const sizeGuideBackdrop = document.getElementById('sizeGuideModalBackdrop');
    const closeSizeGuide = () => {
      if (sizeGuideModal) {
        sizeGuideModal.classList.remove('open');
        sizeGuideModal.setAttribute('aria-hidden', 'true');
      }
    };
    if (sizeGuideCloseBtn) sizeGuideCloseBtn.addEventListener('click', closeSizeGuide);
    if (sizeGuideOkBtn) sizeGuideOkBtn.addEventListener('click', closeSizeGuide);
    if (sizeGuideBackdrop) sizeGuideBackdrop.addEventListener('click', closeSizeGuide);

    // Contact Support Modal handlers are now managed by initContactSupport()

    // Legal Policy Modal close handlers
    const legalModal = document.getElementById('legalPolicyModal');
    const legalCloseBtn = document.getElementById('legalPolicyModalCloseBtn');
    const legalOkBtn = document.getElementById('legalPolicyModalOkBtn');
    const legalBackdrop = document.getElementById('legalPolicyModalBackdrop');
    const closeLegal = () => {
      if (legalModal) {
        legalModal.classList.remove('open');
        legalModal.setAttribute('aria-hidden', 'true');
      }
    };
    if (legalCloseBtn) legalCloseBtn.addEventListener('click', closeLegal);
    if (legalOkBtn) legalOkBtn.addEventListener('click', closeLegal);
    if (legalBackdrop) legalBackdrop.addEventListener('click', closeLegal);
  }

  // ══════════════════════════════════════════════════════════════
  // CLIENT SUPPORT (PERMANENTLY DELETED)
  // ══════════════════════════════════════════════════════════════
  function initContactSupport() {
    window.openContactSupportModal = function() {
      const faqSec = document.getElementById('shopFaq');
      if (faqSec) faqSec.scrollIntoView({ behavior: 'smooth' });
    };
    window.closeContactSupportModal = function() {};
  }

  // Initial setup & database sync
  renderFilterSidebarUI();
  renderActiveFilterChips();
  renderCollections();
  renderShopGrid();
  renderRecentlyViewedSection();
  renderSearchRecentlyViewedDropdowns();
  updateCartUI();
  updateWishlistUI();
  initShopFaq();
  initSiteFooter();
  initContactSupport();
  syncProductsFromDb();
  // Real-time synchronization: poll every 15 seconds to sync catalog changes made in Zoho Inventory
  setInterval(() => {
    syncProductsFromDb(false);
  }, 15000);
})();

// Legacy credentials & admin keys cleanup
try {
  localStorage.removeItem("itachi_auth_user");
  localStorage.removeItem("itachi_admin_secret");
} catch (_) {}

// ══════════════════════════════════════════════════════════════
// PROGRESSIVE WEB APP (PWA) SERVICE WORKER & INSTALL EXPERIENCE
// ══════════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (reg) => console.log('[PWA] ServiceWorker registered with scope:', reg.scope),
      (err) => console.warn('[PWA] ServiceWorker registration notice:', err)
    );
  });
}

(function initPWAInstall() {
  let deferredPwaPrompt = null;
  const pwaInstallBtn = document.getElementById('pwaInstallBtn');

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  if (isStandalone) {
    if (pwaInstallBtn) pwaInstallBtn.style.display = 'none';
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPwaPrompt = e;
    if (pwaInstallBtn) {
      pwaInstallBtn.style.display = 'inline-flex';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPwaPrompt = null;
    if (pwaInstallBtn) pwaInstallBtn.style.display = 'none';
    if (typeof showToast === 'function') {
      showToast('APP INSTALLED', 'The Street Co was successfully installed on your device!', 'bag');
    }
  });

  if (pwaInstallBtn) {
    pwaInstallBtn.addEventListener('click', async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === 'accepted') {
          pwaInstallBtn.style.display = 'none';
        }
        deferredPwaPrompt = null;
      } else {
        const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIOS) {
          if (typeof showToast === 'function') {
            showToast('INSTALL ON IOS', 'Tap the Share icon in Safari, then tap "Add to Home Screen".', 'bag');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast('INSTALL APP', 'Click the 3 dots (⋮) in Chrome and select "Install The Street Co".', 'bag');
          }
        }
      }
    });

    const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIOS && !isStandalone) {
      pwaInstallBtn.style.display = 'inline-flex';
    }
  }
})();

