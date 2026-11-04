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

// VIP & Street Cash UI Global Fallback (prevents any ReferenceError across scopes)
window.renderVipUI = function() {
  if (typeof window.renderStreetCashUI === "function") {
    window.renderStreetCashUI();
  }
};
var renderVipUI = window.renderVipUI;

// Global Mobile Navigation Active State Helper
function setActiveBottomNav(activeItem) {
  if (typeof activeItem === "string") {
    activeItem = document.getElementById(activeItem);
  }
  if (!activeItem) return;
  document.querySelectorAll(".mobile-bottom-bar__item").forEach(item => {
    if (item !== activeItem) item.classList.remove("active");
  });
  activeItem.classList.add("active");
}
window.setActiveBottomNav = setActiveBottomNav;

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
    if (typeof activeItem === "string") {
      activeItem = document.getElementById(activeItem);
    }
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
      if (typeof window.closeCollectionsPage === 'function') {
        window.closeCollectionsPage();
      } else {
        const cp = document.getElementById('collectionsPage');
        if (cp) cp.classList.remove('open');
      }
      lockNavScrollSync(900);
      setActiveBottomNav(mobileNavHome);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (mobileNavShop) {
    mobileNavShop.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof window.closeCollectionsPage === 'function') {
        window.closeCollectionsPage();
      } else {
        const cp = document.getElementById('collectionsPage');
        if (cp) cp.classList.remove('open');
      }
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
      if (typeof window.openCollectionsPage === 'function') {
        window.openCollectionsPage();
      } else {
        const cp = document.getElementById('collectionsPage');
        if (cp) {
          cp.classList.add('open');
          cp.setAttribute('aria-hidden', 'false');
          document.body.classList.add('collections-page-open');
          document.documentElement.classList.add('collections-page-open');
        }
      }
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
    const cp = document.getElementById('collectionsPage');
    if (cp && cp.classList.contains('open')) {
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
  function showToast(titleOrName, optionalDetail, type = 'general') {
    if (!shopToast) return;

    let title = '';
    let itemText = '';

    if (optionalDetail) {
      title = String(titleOrName || '').trim();
      itemText = String(optionalDetail || '').trim();
    } else {
      const isWishlist = type === 'wishlist';
      const isPriceDrop = type === 'price-drop';
      if (isWishlist) title = 'Saved to Wishlist';
      else if (isPriceDrop) title = 'Price Drop Alert';
      else if (type === 'cart' || type === 'bag') title = 'Added to Bag';
      else title = 'Notice';
      itemText = String(titleOrName || '').trim();
    }

    const titleLower = title.toLowerCase();
    const isCartToast = (type === 'cart' || type === 'bag') || (titleLower.includes('bag') || titleLower.includes('cart') || (titleLower.includes('added') && !titleLower.includes('address')));
    const isWishlistToast = type === 'wishlist' || titleLower.includes('wishlist');
    const isPriceDropToast = type === 'price-drop' || titleLower.includes('price drop');

    // Convert shouting all-caps into clean, elegant sentence case
    if (title === 'ADDED TO BAG') title = 'Added to Bag';
    else if (title === 'SAVED TO WISHLIST') title = 'Saved to Wishlist';
    else if (title === 'REMOVED FROM WISHLIST') title = 'Removed from Wishlist';
    else if (title === 'MOVED TO CART') title = 'Moved to Bag';
    else if (title === 'ALL ITEMS MOVED TO CART') title = 'All Items Moved';
    else if (title === 'PRICE DROP ALERT') title = 'Price Alert';
    else if (title === 'ALERT REMOVED') title = 'Alert Removed';
    else if (title === 'ORDER SMS DISPATCHED') title = 'SMS Sent';
    else if (title === 'ORDER PLACED & CONFIRMED') title = 'Order Confirmed';
    else if (title === 'FIELDS REFRESHED') title = 'Fields Cleared';
    else if (title === 'COPIED ORDER ID' || title === 'ORDER ID') title = 'Copied';
    else if (title === 'LINK COPIED') title = 'Link Copied';
    else if (title === 'SHARED') title = 'Shared';
    else if (title === 'APP INSTALLED') title = 'App Installed';

    const isRemoved = title.toLowerCase().includes('removed');

    shopToast.innerHTML = `
      <div class="shop-toast__inner">
        <div class="shop-toast__icon ${isWishlistToast ? 'wishlist-toast-icon' : (isCartToast ? 'cart-toast-icon' : '')}" aria-hidden="true">
          ${isWishlistToast ? `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="${isRemoved ? 'none' : '#dc2626'}" stroke="#dc2626" stroke-width="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          ` : `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `}
        </div>
        <div class="shop-toast__body">
          <span class="shop-toast__title">${title}</span>
          ${itemText && itemText !== title ? `
            <span style="color:#d4d4d8;font-size:.65rem;user-select:none;">·</span>
            <span class="shop-toast__name" title="${itemText}">${itemText}</span>
          ` : ''}
        </div>
        ${isCartToast ? `<button type="button" class="shop-toast__btn" id="toastOpenBagBtn">View Bag</button>` : ''}
        ${(isWishlistToast && !isRemoved) ? `<button type="button" class="shop-toast__btn" id="toastOpenWishlistBtn">View</button>` : ''}
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
    }, 3200);
  }

  // Globally accessible toast notification matching product-add-to-cart style
  window.streetCoShowToast = showToast;

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

    // Compute estimated Street Cash points: Per 1,000 Rs spent will give you 199 The Street Cash (0.199 pts/Rs)
    const earnedStreetCash = Math.floor(totalInr * 0.199);
    const cartStreetCashEarnPoints = document.getElementById('cartStreetCashEarnPoints');
    const cartStreetCashEarnRow = document.getElementById('cartStreetCashEarnRow');
    if (cartStreetCashEarnPoints) {
      cartStreetCashEarnPoints.textContent = String(earnedStreetCash.toLocaleString('en-IN'));
    }
    if (cartStreetCashEarnRow) {
      cartStreetCashEarnRow.style.display = totalInr > 0 ? 'flex' : 'none';
    }

    // Sync auto-applied Street Cash voucher card in cart drawer footer
    const cartStreetCashCard = document.getElementById('cartStreetCashAppliedCard');
    const cartStreetCashCodeBadge = document.getElementById('cartStreetCashCodeBadge');
    const appliedCode = (appliedCartCoupon && appliedCartCoupon.code) || '';
    const isStreetCashCode = appliedCode && (
      appliedCode.startsWith('STREETCASH-') ||
      (typeof streetCashState !== 'undefined' && Array.isArray(streetCashState.streetCashCoupons) && streetCashState.streetCashCoupons.some(c => c.code === appliedCode))
    );
    if (cartStreetCashCard) {
      if (isStreetCashCode && discount > 0) {
        cartStreetCashCard.style.display = 'block';
        if (cartStreetCashCodeBadge) cartStreetCashCodeBadge.textContent = appliedCode;
      } else {
        cartStreetCashCard.style.display = 'none';
      }
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
    const hubCartBadge = document.getElementById('hubCartBadge');
    if (hubCartBadge) {
      hubCartBadge.textContent = String(totalQty);
      hubCartBadge.style.display = totalQty > 0 ? 'inline-flex' : 'none';
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
    if (typeof autoApplyStreetCashCouponIfAvailable === 'function') {
      autoApplyStreetCashCouponIfAvailable();
    }

    if (typeof window.trackGAEvent === 'function') {
      window.trackGAEvent('add_to_cart', {
        item_id: sku,
        item_name: item.name,
        price: priceInr,
        quantity: qtyToAdd,
        currency: 'INR'
      });
    }

    if (btn) {
      btn.classList.add('btn-clicked');
      setTimeout(() => btn.classList.remove('btn-clicked'), 200);
    }
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

  // Automatically apply active Street Cash coupon to bag
  async function autoApplyStreetCashCouponIfAvailable() {
    let activeCode = window.activeStreetCashCouponCode;
    if (!activeCode && typeof streetCashState !== 'undefined' && Array.isArray(streetCashState.streetCashCoupons)) {
      const activeC = streetCashState.streetCashCoupons.find(c => !c.isRedeemed && c.status === 'active');
      if (activeC) activeCode = activeC.code;
    }
    if (!activeCode) {
      try { activeCode = localStorage.getItem('the_street_cash_active_coupon'); } catch(_) {}
    }
    if (activeCode && (!appliedCartCoupon || !appliedCartCoupon.code)) {
      try {
        await applyCouponCode(activeCode);
      } catch (_) {}
    }
  }
  window.autoApplyStreetCashCouponIfAvailable = autoApplyStreetCashCouponIfAvailable;

  // Open/close drawer with strict background scroll lock
  function openCart(tab = 'bag') {
    if (cartDrawer) {
      cartDrawer.classList.add('open');
      cartDrawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('bag-open');
      document.documentElement.classList.add('bag-open');
      const bottomBar = document.getElementById('mobileBottomBar');
      if (bottomBar) {
        bottomBar.classList.add('hidden-by-drawer');
        bottomBar.style.setProperty('display', 'none', 'important');
      }
      const hintEl = document.getElementById('hint');
      if (hintEl) hintEl.classList.add('hide');
      switchDrawerTab(tab);
      if (typeof renderSuggestedCoupons === 'function') {
        renderSuggestedCoupons();
      }
      autoApplyStreetCashCouponIfAvailable();

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
      const bottomBar = document.getElementById('mobileBottomBar');
      if (bottomBar) {
        bottomBar.classList.remove('hidden-by-drawer');
        bottomBar.style.removeProperty('display');
      }
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
  const checkoutLocationSearch = document.getElementById('checkoutLocationSearch');
  const checkoutLocationClearBtn = document.getElementById('checkoutLocationClearBtn');
  const checkoutDetectLocationBtn = document.getElementById('checkoutDetectLocationBtn');
  const checkoutAutofillBanner = document.getElementById('checkoutAutofillBanner');
  const checkoutLocationDropdown = document.getElementById('checkoutLocationDropdown');
  const checkoutBackToStoreBtn = document.getElementById('checkoutBackToStoreBtn');
  const checkoutHeaderEditAddressBtn = document.getElementById('checkoutHeaderEditAddressBtn');
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
    if (checkoutLocationSearch) checkoutLocationSearch.value = '';
    if (checkoutLocationClearBtn) checkoutLocationClearBtn.style.display = 'none';
    if (checkoutAutofillBanner) checkoutAutofillBanner.style.display = 'none';
    if (checkoutLocationDropdown) checkoutLocationDropdown.style.display = 'none';
    if (checkoutNameInput) checkoutNameInput.value = '';
    if (checkoutPhoneInput) checkoutPhoneInput.value = '';
    if (checkoutEmailInput) checkoutEmailInput.value = '';
    if (checkoutPincodeInput) checkoutPincodeInput.value = '';
    if (checkoutAddress1Input) checkoutAddress1Input.value = '';
    if (checkoutAddress2Input) checkoutAddress2Input.value = '';
    if (checkoutLandmarkInput) checkoutLandmarkInput.value = '';
    if (checkoutCityInput) checkoutCityInput.value = '';
    if (checkoutStateInput) {
      checkoutStateInput.value = '';
      checkoutStateInput.classList.add('is-placeholder');
    }
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
    if (typeof window.streetCoRefreshCheckoutAddresses === 'function') {
      window.streetCoRefreshCheckoutAddresses();
    }

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
    let items = (checkoutSession.items && checkoutSession.items.length > 0)
      ? checkoutSession.items
      : (typeof cart !== 'undefined' && cart.length > 0 ? cart : []);
    const subtotalInr = items.reduce((sum, it) => sum + (Number(it.priceInr || 0) * (Number(it.qty) || 1)), 0);
    const subtotalRyo = items.reduce((sum, it) => sum + (Number(it.priceRyo || 0) * (Number(it.qty) || 1)), 0);
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

    // Show sidebar (Order Summary) on steps 1, 2, 3; hide on step 4 (Order Confirmation has its own single card)
    if (checkoutContentWrap) {
      if (stepNumber === 4) {
        checkoutContentWrap.classList.add('hide-sidebar');
      } else {
        checkoutContentWrap.classList.remove('hide-sidebar');
      }
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

    // On step 2 (Payment page), select UPI by default (or preserve chosen method)
    if (stepNumber === 2) {
      const activeMethod = checkoutSession.payment.method || 'upi';
      payOptions.forEach(opt => {
        if (opt.dataset.method === activeMethod) {
          opt.classList.add('active');
          const hdr = opt.querySelector('.checkout-pay-header');
          if (hdr) hdr.setAttribute('aria-expanded', 'true');
          checkoutSession.payment.method = activeMethod;
          checkoutSession.payment.detail = activeMethod === 'upi'
            ? 'UPI Payment (Google Pay / PhonePe / Paytm / QR)'
            : 'Cash on Delivery (COD) · Pay upon arrival';
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

    // Set active step classes and attributes on modal
    if (checkoutFlowModal) {
      checkoutFlowModal.setAttribute('data-step', String(stepNumber));
      checkoutFlowModal.classList.toggle('step-1-active', stepNumber === 1);
      checkoutFlowModal.classList.toggle('step-2-active', stepNumber === 2);
      checkoutFlowModal.classList.toggle('step-3-active', stepNumber === 3);
      checkoutFlowModal.classList.toggle('step-4-active', stepNumber === 4);
    }

    // Dynamic top-left header button handling:
    // Step 1: "RETURN TO SHOP" (Edit Address removed on address page)
    // Step 2 (Payment page): "EDIT ADDRESS" in position of Return to Shop; Return to Shop removed!
    // Step 3 (Conform page) & Step 4 (Order confirmed): Both removed
    const backToStoreBtn = document.getElementById('checkoutBackToStoreBtn');
    const headerEditAddressBtn = document.getElementById('checkoutHeaderEditAddressBtn');
    if (stepNumber === 1) {
      if (backToStoreBtn) backToStoreBtn.style.setProperty('display', 'inline-flex', 'important');
      if (headerEditAddressBtn) headerEditAddressBtn.style.setProperty('display', 'none', 'important');
    } else if (stepNumber === 2) {
      if (backToStoreBtn) backToStoreBtn.style.setProperty('display', 'none', 'important');
      if (headerEditAddressBtn) headerEditAddressBtn.style.setProperty('display', 'inline-flex', 'important');
    } else {
      if (backToStoreBtn) backToStoreBtn.style.setProperty('display', 'none', 'important');
      if (headerEditAddressBtn) headerEditAddressBtn.style.setProperty('display', 'none', 'important');
    }

    // Sidebar Order Summary visibility:
    // Step 1 (Address) & Step 2 (Payment): Show sidebar order summary
    // Step 3 (Review & Confirm) & Step 4 (Confirmed): Hide sidebar (only 1 order summary inside review cards)
    const checkoutSidebar = document.getElementById('checkoutSidebar');
    if (checkoutSidebar) {
      if (stepNumber === 3 || stepNumber === 4) {
        checkoutSidebar.style.setProperty('display', 'none', 'important');
      } else {
        checkoutSidebar.style.removeProperty('display');
        checkoutSidebar.style.display = '';
      }
    }

    // Scroll modal and views container to top on step transition so the user starts at the top
    if (checkoutFlowModal) checkoutFlowModal.scrollTop = 0;
    const modalDialog = document.getElementById('checkoutModalDialog');
    if (modalDialog) modalDialog.scrollTop = 0;
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

    validateField(checkoutNameInput, document.getElementById('checkoutNameError'), 'Please enter recipient full name');
    validateField(checkoutPhoneInput, document.getElementById('checkoutPhoneError'), 'Please enter a valid 10-digit mobile number', v => /^\d{10}$/.test(v.replace(/\s+/g, '')));
    validateField(checkoutAddress1Input, document.getElementById('checkoutAddress1Error'), 'Please enter house address / flat / building');
    validateField(checkoutAddress2Input, document.getElementById('checkoutAddress2Error'), 'Please enter street, road or area');
    validateField(checkoutCityInput, document.getElementById('checkoutCityError'), 'Town / city required');
    validateField(checkoutStateInput, document.getElementById('checkoutStateError'), 'Please select state');
    validateField(checkoutPincodeInput, document.getElementById('checkoutPincodeError'), 'Please enter a valid 6-digit postal PIN', v => /^\d{6}$/.test(v.trim()));

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

    // Persist address for future convenience & save to user account (with Default tick box)
    try {
      localStorage.setItem('the_street_co_last_addr', JSON.stringify(checkoutSession.address));
      const setDefaultCheckbox = document.getElementById('checkoutSetDefaultAddress');
      const shouldSetDefault = Boolean(setDefaultCheckbox && setDefaultCheckbox.checked);
      if (typeof window.streetCoSaveCheckoutAddressToAccount === 'function') {
        window.streetCoSaveCheckoutAddressToAccount(checkoutSession.address, shouldSetDefault);
      }
    } catch (e) { /* ignore */ }

    // Advance to Step 2: Payment Page
    goToCheckoutStep(2);
  }
  window.streetCoProceedToPaymentStep = handleAddressStepSubmit;

  // Step 2 Validation & Proceed (Supports UPI Dynamic QR and COD)
  function handlePaymentStepSubmit(chosenMethod) {
    let activeMethod = (typeof chosenMethod === 'string' && chosenMethod) ? chosenMethod : (checkoutSession.payment?.method || 'upi');
    if (activeMethod === 'upi') {
      openUpiPaymentGateway();
      return;
    }

    const detail = 'Cash on Delivery (COD) · Pay upon doorstep arrival';
    checkoutSession.payment = {
      method: 'cod',
      detail: detail
    };

    // Advance to Step 3: Confirm Order ("conform order")
    goToCheckoutStep(3);
  }

  // ══════════ UPI PAYMENT PAGE (EXACT SCREENSHOT UPIR CONTROLLER) ══════════
  let upierCountdownTimer = null;
  let upierPaymentPollInterval = null;
  const UPI_DEFAULT_VPA = 'aniruddhanag780@fam';
  const UPI_DEFAULT_PAYEE = 'The Street Co';

  function openUpiPaymentGateway() {
    let { totalInr } = getCheckoutTotals();
    if (!totalInr || totalInr <= 0) {
      if (checkoutSession && checkoutSession.items && checkoutSession.items.length > 0) {
        totalInr = checkoutSession.items.reduce((sum, it) => sum + ((Number(it.priceInr) || 0) * (Number(it.qty) || 1)), 0);
      } else if (typeof cart !== 'undefined' && cart.length > 0) {
        totalInr = cart.reduce((sum, it) => sum + ((Number(it.priceInr) || 0) * (Number(it.qty) || 1)), 0);
      }
      totalInr = Math.max(1, totalInr || 1599);
    }

    const overlay = document.getElementById('upiPaymentGatewayModal');
    const amountEl = document.getElementById('upierAmountDisplay');
    const orderIdEl = document.getElementById('upierOrderIdDisplay');
    const timerClockEl = document.getElementById('upierTimerClock');
    const qrWrapEl = document.getElementById('upierQrWrap');
    const payBtnEl = document.getElementById('upierPayButton');
    const utrToggleBtn = document.getElementById('upierUtrToggleBtn');
    const utrForm = document.getElementById('upierUtrForm');
    const utrInput = document.getElementById('upierUtrInput');
    const utrSubmitBtn = document.getElementById('upierUtrSubmitBtn');
    const closeBtn = document.getElementById('upiGatewayCloseBtn');
    const pollStatusEl = document.getElementById('upierPollStatus');
    const pollStatusTextEl = document.getElementById('upierPollStatusText');

    if (!overlay) return;

    // Generate random 6-digit order reference (ORD-169396 format as in image)
    const refNum = String(Math.floor(100000 + Math.random() * 900000));
    const formattedOrderId = `ORD-${refNum}`;

    // Fill amount and order ID exactly matching screenshot
    if (amountEl) amountEl.textContent = `₹${totalInr.toLocaleString('en-IN')}`;
    if (orderIdEl) orderIdEl.textContent = `Order ID: ${formattedOrderId}`;

    // Construct NPCI standard UPI intent URI
    const upiUri = `upi://pay?pa=${encodeURIComponent(UPI_DEFAULT_VPA)}&pn=${encodeURIComponent(UPI_DEFAULT_PAYEE)}&am=${totalInr}&cu=INR&tn=${encodeURIComponent('The Street Co Order ' + formattedOrderId)}`;

    // Set mobile deep link
    if (payBtnEl) {
      payBtnEl.href = upiUri;
    }

    // Render crisp dynamic QR code
    if (qrWrapEl) {
      qrWrapEl.innerHTML = '<div class="upier-qr-skeleton">Generating QR...</div>';
      fetch(`/api/upi/qr?format=svg&text=${encodeURIComponent(upiUri)}`)
        .then(res => {
          if (!res.ok) throw new Error('API error');
          return res.text();
        })
        .then(svgText => {
          if (svgText && svgText.includes('<svg')) {
            qrWrapEl.innerHTML = svgText;
          } else {
            qrWrapEl.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}" alt="UPI QR Code" />`;
          }
        })
        .catch(() => {
          qrWrapEl.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiUri)}" alt="UPI QR Code" />`;
        });
    }

    // 9:59 Countdown Timer (599 seconds) as given in screenshot
    if (upierCountdownTimer) clearInterval(upierCountdownTimer);
    let secondsLeft = 599; // 9 min 59 sec

    function updateTimer() {
      const m = Math.floor(secondsLeft / 60);
      const s = secondsLeft % 60;
      if (timerClockEl) {
        timerClockEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    }
    updateTimer();

    upierCountdownTimer = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(upierCountdownTimer);
        upierCountdownTimer = null;
        if (timerClockEl) timerClockEl.textContent = '00:00';
      } else {
        updateTimer();
      }
    }, 1000);

    // Live Polling Routine for FamPay receipt via Gmail OAuth
    if (upierPaymentPollInterval) {
      clearInterval(upierPaymentPollInterval);
      upierPaymentPollInterval = null;
    }

    if (pollStatusEl) {
      pollStatusEl.classList.remove('verified');
      pollStatusEl.style.setProperty('display', 'none', 'important');
    }
    if (pollStatusTextEl) pollStatusTextEl.textContent = '';

    const qrOpenedEpoch = Math.floor(Date.now() / 1000 - 30);

    async function checkPaymentStatus() {
      try {
        const token = window.streetCoFirebaseAuth?.getCachedGmailToken?.();
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const verifyUrl = `/api/verify-payment?amount=${totalInr}&orderId=${encodeURIComponent(formattedOrderId)}&since=${qrOpenedEpoch}`;
        const res = await fetch(verifyUrl, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (data.verified) {
          if (upierPaymentPollInterval) {
            clearInterval(upierPaymentPollInterval);
            upierPaymentPollInterval = null;
          }
          if (upierCountdownTimer) {
            clearInterval(upierCountdownTimer);
            upierCountdownTimer = null;
          }
          if (pollStatusEl) {
            pollStatusEl.style.setProperty('display', 'flex', 'important');
            pollStatusEl.classList.add('verified');
          }
          if (pollStatusTextEl) pollStatusTextEl.textContent = `✓ Payment Verified via FamPay! (₹${totalInr.toLocaleString('en-IN')})`;

          setTimeout(() => {
            completeUpiPayment(totalInr, refNum, `Verified via FamPay Receipt (${data.messageId || 'Auto'})`);
          }, 1200);
        }
      } catch (_) {}
    }

    // Run first check after 2.5s, then poll every 4s
    setTimeout(checkPaymentStatus, 2500);
    upierPaymentPollInterval = setInterval(checkPaymentStatus, 4000);

    // Ensure UTR form is strictly hidden initially as requested
    if (utrForm) {
      utrForm.classList.remove('open');
      utrForm.style.setProperty('display', 'none', 'important');
    }
    if (utrInput) utrInput.value = '';

    // Only open UTR entering box when user clicks "Paid from another app? Enter 12-digit UTR manually"
    if (utrToggleBtn) {
      utrToggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (utrForm) {
          const isOpen = utrForm.classList.contains('open');
          if (isOpen) {
            utrForm.classList.remove('open');
            utrForm.style.setProperty('display', 'none', 'important');
          } else {
            utrForm.classList.add('open');
            utrForm.style.setProperty('display', 'flex', 'important');
            if (utrInput) {
              setTimeout(() => utrInput.focus(), 50);
            }
          }
        }
      };
    }

    // Wire UTR submit button
    if (utrSubmitBtn) {
      utrSubmitBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const utrVal = utrInput ? utrInput.value.trim() : '';
        const utrText = utrVal.length >= 6 ? `UTR: ${utrVal}` : `UTR Confirmed: ${formattedOrderId}`;
        completeUpiPayment(totalInr, refNum, utrText);
      };
    }

    // Wire back/cancel button
    const cancelFn = () => closeUpiPaymentGateway();
    if (closeBtn) closeBtn.onclick = cancelFn;

    // Open overlay
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.scrollTop = 0;
  }
  window.openUpiPaymentGateway = openUpiPaymentGateway;
  window.closeUpiPaymentGateway = closeUpiPaymentGateway;

  function closeUpiPaymentGateway() {
    if (upierCountdownTimer) {
      clearInterval(upierCountdownTimer);
      upierCountdownTimer = null;
    }
    if (upierPaymentPollInterval) {
      clearInterval(upierPaymentPollInterval);
      upierPaymentPollInterval = null;
    }
    const overlay = document.getElementById('upiPaymentGatewayModal');
    if (overlay) {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function completeUpiPayment(totalInr, refNum, verificationNote) {
    closeUpiPaymentGateway();

    const note = verificationNote || `UPI Ref: ORD-${refNum}`;

    // Configure session payment state
    checkoutSession.payment = {
      method: 'upi',
      detail: `Paid Online via UPI (aniruddhanag780@fam) · ${note}`,
      txnId: `ORD-${refNum}`,
      status: 'PAID'
    };

    // Place and confirm the order directly -> switches to Step 4 Order Confirmation
    handleConfirmAndPlaceOrder();
  }
  window.completeUpiPayment = completeUpiPayment;

  // ══════════ MERCHANT GMAIL SETUP MODAL CONTROLLER ══════════
  function initMerchantGmailSetupModal() {
    const modal = document.getElementById('merchantGmailSetupModal');
    const triggerBtn = document.getElementById('upierMerchantSetupBtn');
    const closeBtn = document.getElementById('merchantModalCloseBtn');
    const backdrop = document.getElementById('merchantModalBackdrop');
    const connectBtn = document.getElementById('merchantGoogleConnectBtn');
    const connectBtnText = document.getElementById('merchantGoogleConnectBtnText');
    const testBtn = document.getElementById('merchantTestVerifyBtn');
    const disconnectBtn = document.getElementById('merchantDisconnectBtn');
    const statusBadge = document.getElementById('merchantStatusBadge');
    const emailDisplay = document.getElementById('merchantEmailDisplay');
    const feedbackMsg = document.getElementById('merchantFeedbackMsg');

    function updateStatusUi(connected, email) {
      if (statusBadge) {
        statusBadge.textContent = connected ? 'Connected' : 'Not Connected';
        statusBadge.className = `merchant-status-badge ${connected ? 'connected' : ''}`;
      }
      if (emailDisplay) {
        emailDisplay.textContent = email || 'aniruddhanag780@gmail.com';
      }
      if (connectBtnText) {
        connectBtnText.textContent = connected ? 'Reconnect / Switch Google Account' : 'Connect Merchant Gmail via Google OAuth';
      }
      if (disconnectBtn) {
        disconnectBtn.style.display = connected ? 'inline-block' : 'none';
      }
    }

    async function checkMerchantStatus() {
      try {
        const res = await fetch('/api/merchant/gmail-status');
        if (res.ok) {
          const data = await res.json();
          updateStatusUi(data.connected, data.email);
        }
      } catch (_) {}
    }

    function openModal() {
      if (modal) {
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        checkMerchantStatus();
      }
    }

    function closeModal() {
      if (modal) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
      }
    }

    if (triggerBtn) triggerBtn.onclick = openModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    if (connectBtn) {
      connectBtn.onclick = async () => {
        try {
          if (feedbackMsg) {
            feedbackMsg.style.display = 'block';
            feedbackMsg.className = 'merchant-feedback-msg';
            feedbackMsg.textContent = 'Opening Google Sign-In...';
          }
          if (window.streetCoFirebaseAuth?.connectMerchantGmail) {
            const res = await window.streetCoFirebaseAuth.connectMerchantGmail();
            updateStatusUi(true, res.email);
            if (feedbackMsg) {
              feedbackMsg.className = 'merchant-feedback-msg success';
              feedbackMsg.textContent = `Successfully connected Gmail for ${res.email}! Upier will now auto-verify FamPay receipts.`;
            }
          } else {
            throw new Error('Google Auth not ready');
          }
        } catch (err) {
          if (feedbackMsg) {
            feedbackMsg.className = 'merchant-feedback-msg error';
            feedbackMsg.textContent = err.message || 'Google Sign-In was cancelled or failed.';
          }
        }
      };
    }

    if (testBtn) {
      testBtn.onclick = async () => {
        try {
          if (feedbackMsg) {
            feedbackMsg.style.display = 'block';
            feedbackMsg.className = 'merchant-feedback-msg';
            feedbackMsg.textContent = 'Testing connection to Gmail API...';
          }
          const token = window.streetCoFirebaseAuth?.getCachedGmailToken?.();
          const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
          const res = await fetch('/api/verify-payment?amount=0', { headers });
          const data = await res.json();
          if (data.reason === 'no_token') {
            feedbackMsg.className = 'merchant-feedback-msg error';
            feedbackMsg.textContent = 'No active Gmail connection found. Please connect your Google account first.';
          } else if (data.reason === 'token_expired') {
            feedbackMsg.className = 'merchant-feedback-msg error';
            feedbackMsg.textContent = 'Session token expired. Please click Connect to refresh.';
          } else {
            feedbackMsg.className = 'merchant-feedback-msg success';
            feedbackMsg.textContent = 'Gmail API is connected and ready! Recent messages scanned successfully.';
          }
        } catch (err) {
          if (feedbackMsg) {
            feedbackMsg.className = 'merchant-feedback-msg error';
            feedbackMsg.textContent = 'Error testing connection: ' + err.message;
          }
        }
      };
    }

    if (disconnectBtn) {
      disconnectBtn.onclick = async () => {
        try {
          await fetch('/api/merchant/disconnect-gmail', { method: 'POST' });
          updateStatusUi(false, 'aniruddhanag780@gmail.com');
          if (feedbackMsg) {
            feedbackMsg.className = 'merchant-feedback-msg';
            feedbackMsg.textContent = 'Disconnected Gmail verification.';
          }
        } catch (_) {}
      };
    }

    checkMerchantStatus();
  }
  window.initMerchantGmailSetupModal = initMerchantGmailSetupModal;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMerchantGmailSetupModal);
  } else {
    initMerchantGmailSetupModal();
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
      const extra = [addr.address2, addr.landmark].filter(Boolean).join(', ');
      const extraPart = extra ? `, ${extra}` : '';
      reviewAddress.textContent = `${addr.address1 || ''}${extraPart}, ${addr.city || ''}, ${addr.state || ''} - ${addr.pincode || ''}`.replace(/^,\s*/, '');
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

    // Complete Order Record (linked to user's account phone for MongoDB Atlas)
    const loggedAccountPhone = (typeof window.streetCoGetAccountPhone === 'function' ? window.streetCoGetAccountPhone() : '') ||
      String(userDetails.phone || '').replace(/\D/g, '').slice(-10);

    const fullOrderRecord = {
      orderCode: generatedId,
      orderId: generatedId,
      accountPhone: loggedAccountPhone,
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

        if (result?.order?.streetCashEarned) {
          const earnedPts = result.order.streetCashEarned;
          const scInfo = result.order.streetCashAwarded;
          const extraTxt = scInfo?.isFirstOrder ? ' (+49 pts First Order Milestone included!)' : '';
          if (window.notifyStreetCashReceived) {
            window.notifyStreetCashReceived(earnedPts, `Order #${generatedId}${extraTxt}`, scInfo?.newBalance);
          }
          if (window.syncStreetCashFromBackend) {
            window.syncStreetCashFromBackend();
          }
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
  if (checkoutHeaderEditAddressBtn) checkoutHeaderEditAddressBtn.addEventListener('click', () => goToCheckoutStep(1));
  if (checkoutToReviewBtn) checkoutToReviewBtn.addEventListener('click', handlePaymentStepSubmit);
  if (checkoutBackToPaymentBtn) checkoutBackToPaymentBtn.addEventListener('click', () => goToCheckoutStep(2));
  if (reviewEditAddressBtn) reviewEditAddressBtn.addEventListener('click', () => goToCheckoutStep(1));
  if (reviewEditPaymentBtn) reviewEditPaymentBtn.addEventListener('click', () => goToCheckoutStep(2));
  if (checkoutConfirmOrderBtn) checkoutConfirmOrderBtn.addEventListener('click', handleConfirmAndPlaceOrder);

  // State selection change listener (toggle placeholder color & clear error)
  if (checkoutStateInput) {
    checkoutStateInput.addEventListener('change', () => {
      checkoutStateInput.classList.toggle('is-placeholder', !checkoutStateInput.value);
      checkoutStateInput.classList.remove('error');
      const err = document.getElementById('checkoutStateError');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    });
  }

  // Live input error clearing for address inputs
  [
    { input: checkoutNameInput, errId: 'checkoutNameError' },
    { input: checkoutPhoneInput, errId: 'checkoutPhoneError' },
    { input: checkoutAddress1Input, errId: 'checkoutAddress1Error' },
    { input: checkoutAddress2Input, errId: 'checkoutAddress2Error' },
    { input: checkoutCityInput, errId: 'checkoutCityError' },
    { input: checkoutPincodeInput, errId: 'checkoutPincodeError' }
  ].forEach(({ input, errId }) => {
    if (input) {
      input.addEventListener('input', () => {
        input.classList.remove('error');
        const err = document.getElementById(errId);
        if (err) { err.textContent = ''; err.classList.remove('show'); }
      });
    }
  });

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

      // If user clicked on UPI, immediately open the UPI payment page
      if (opt.dataset.method === 'upi') {
        openUpiPaymentGateway();
      }
    });

    // Right-aligned continue button under each payment option
    const continueBtn = opt.querySelector('.checkout-pay-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const method = continueBtn.dataset.payMethod || opt.dataset.method;
        if (method === 'upi') {
          openUpiPaymentGateway();
          return;
        }
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
    },
    {
      code: 'FITBUNDLE10',
      title: '10% Off Complete Lookbook Outfit Bundle',
      desc: 'Instant 10% bundle savings when shopping a complete curated lookbook fit.',
      group: 'percentage',
      type: 'percentage',
      value: 10,
      minOrderValue: 1500,
      maxOrderValue: null,
      maxDiscount: 3500,
      isPublic: true,
      badge: '10% BUNDLE',
      status: 'active'
    },
    {
      code: 'VIP100',
      title: 'VIP Street Cred ₹100 Reward Voucher',
      desc: 'Redeemed via Street Cred Loyalty Club (200 Points).',
      group: 'flat',
      type: 'flat',
      value: 100,
      minOrderValue: 999,
      maxOrderValue: null,
      maxDiscount: 100,
      isPublic: true,
      badge: 'VIP ₹100',
      status: 'active'
    },
    {
      code: 'VIP250',
      title: 'VIP Street Cred ₹250 Reward Voucher',
      desc: 'Redeemed via Street Cred Loyalty Club (450 Points).',
      group: 'flat',
      type: 'flat',
      value: 250,
      minOrderValue: 1499,
      maxOrderValue: null,
      maxDiscount: 250,
      isPublic: true,
      badge: 'VIP ₹250',
      status: 'active'
    },
    {
      code: 'VIP500',
      title: 'VIP Street Cred ₹500 Reward Voucher',
      desc: 'Redeemed via Street Cred Loyalty Club (850 Points).',
      group: 'flat',
      type: 'flat',
      value: 500,
      minOrderValue: 2499,
      maxOrderValue: null,
      maxDiscount: 500,
      isPublic: true,
      badge: 'VIP ₹500',
      status: 'active'
    },
    {
      code: 'VIP1000',
      title: 'VIP Street Cred ₹1,000 Obsidian Voucher',
      desc: 'Redeemed via Street Cred Loyalty Club (1,500 Points).',
      group: 'flat',
      type: 'flat',
      value: 1000,
      minOrderValue: 4999,
      maxOrderValue: null,
      maxDiscount: 1000,
      isPublic: true,
      badge: 'VIP ₹1,000',
      status: 'active'
    }
  ];

  // Expose cart & coupon helpers for Lookbook Bundle & VIP Loyalty Suite
  window.streetCoAddToCart = handleAddToCart;
  window.streetCoOpenCart = openCart;
  window.streetCoApplyCoupon = function(code) {
    setTimeout(() => applyCouponCode(code), 80);
  };
  window.streetCoShowToast = showToast;

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

      const savedMessage = `✓ Coupon "${result.code}" applied! You have saved ₹${result.discount.toLocaleString('en-IN')} on this order.`;

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

  // Close Checkout Modal Triggers & Full-Page Return
  if (checkoutFlowCloseBtn) checkoutFlowCloseBtn.addEventListener('click', () => closeCheckoutModal());
  if (checkoutBackToStoreBtn) checkoutBackToStoreBtn.addEventListener('click', () => closeCheckoutModal());
  if (checkoutFlowBackdrop) checkoutFlowBackdrop.addEventListener('click', () => closeCheckoutModal());

  // Hook Cart Drawer "PROCEED TO CHECKOUT" button to multi-step checkout
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (!cart || cart.length === 0) {
        if (typeof showToast === 'function') {
          showToast('CART IS EMPTY', 'Please add an item to your bag before proceeding to checkout', 'cart');
        }
        return;
      }
      closeCart(true);
      checkoutSession.promoCode = appliedCartCoupon.code || '';
      checkoutSession.discount = appliedCartCoupon.discount || 0;
      openCheckoutModal([...cart], 'cart');
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ADDRESS & LOCATION AUTOFILL CONTROLLER
  // ═══════════════════════════════════════════════════════════════════════
  function autofillCheckoutAddressFields(data, source = 'Address Lookup') {
    if (!data) return;

    if (data.pincode && checkoutPincodeInput) {
      checkoutPincodeInput.value = data.pincode;
      checkoutPincodeInput.classList.remove('error');
      const err = document.getElementById('checkoutPincodeError');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    }
    if (data.address1 && checkoutAddress1Input) {
      checkoutAddress1Input.value = data.address1;
      checkoutAddress1Input.classList.remove('error');
      const err = document.getElementById('checkoutAddress1Error');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    }
    if (data.address2 && checkoutAddress2Input) {
      checkoutAddress2Input.value = data.address2;
      checkoutAddress2Input.classList.remove('error');
      const err = document.getElementById('checkoutAddress2Error');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    }
    if (data.landmark && checkoutLandmarkInput) {
      checkoutLandmarkInput.value = data.landmark;
    }
    if (data.city && checkoutCityInput) {
      checkoutCityInput.value = data.city;
      checkoutCityInput.classList.remove('error');
      const err = document.getElementById('checkoutCityError');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    }
    if (data.state && checkoutStateInput) {
      if (checkoutStateInput.tagName === 'SELECT') {
        const rawState = (data.state || '').trim().toLowerCase();
        let matched = false;
        for (let i = 0; i < checkoutStateInput.options.length; i++) {
          const opt = checkoutStateInput.options[i];
          const val = (opt.value || '').toLowerCase();
          const txt = (opt.text || '').toLowerCase();
          if (val && (val === rawState || txt === rawState)) {
            checkoutStateInput.selectedIndex = i;
            matched = true;
            break;
          }
        }
        if (!matched) {
          for (let i = 0; i < checkoutStateInput.options.length; i++) {
            const opt = checkoutStateInput.options[i];
            const val = (opt.value || '').toLowerCase();
            if (val && (rawState.includes(val) || val.includes(rawState))) {
              checkoutStateInput.selectedIndex = i;
              matched = true;
              break;
            }
          }
        }
      } else {
        checkoutStateInput.value = data.state;
      }
      checkoutStateInput.classList.remove('error');
      checkoutStateInput.classList.toggle('is-placeholder', !checkoutStateInput.value);
      const err = document.getElementById('checkoutStateError');
      if (err) { err.textContent = ''; err.classList.remove('show'); }
    }

    // Update checkoutSession address state
    if (checkoutSession && checkoutSession.address) {
      checkoutSession.address.pincode = checkoutPincodeInput ? checkoutPincodeInput.value : '';
      checkoutSession.address.address1 = checkoutAddress1Input ? checkoutAddress1Input.value : '';
      checkoutSession.address.address2 = checkoutAddress2Input ? checkoutAddress2Input.value : '';
      checkoutSession.address.landmark = checkoutLandmarkInput ? checkoutLandmarkInput.value : '';
      checkoutSession.address.city = checkoutCityInput ? checkoutCityInput.value : '';
      checkoutSession.address.state = checkoutStateInput ? checkoutStateInput.value : '';
    }

    // No extra helper texts or banners as requested
    if (checkoutAutofillBanner) {
      checkoutAutofillBanner.style.display = 'none';
    }
  }

  function initAddressLocationAutocomplete() {
    const address1Input = document.getElementById('checkoutAddress1');
    if (!address1Input) return;

    // Autocomplete dropdown below checkoutAddress1
    let fallbackDropdown = document.getElementById('checkoutAddress1FallbackDropdown');
    if (!fallbackDropdown) {
      fallbackDropdown = document.createElement('div');
      fallbackDropdown.id = 'checkoutAddress1FallbackDropdown';
      fallbackDropdown.className = 'checkout-loc-dropdown';
      fallbackDropdown.style.display = 'none';
      if (address1Input.parentNode) {
        address1Input.parentNode.style.position = 'relative';
        address1Input.parentNode.appendChild(fallbackDropdown);
      }
    }

    let searchDebounceTimer = null;
    address1Input.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (q.length < 3) {
        if (fallbackDropdown) fallbackDropdown.style.display = 'none';
        return;
      }

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`)
          .then(res => res.json())
          .then(data => {
            if (!data || !data.features || data.features.length === 0) {
              if (fallbackDropdown) fallbackDropdown.style.display = 'none';
              return;
            }
            fallbackDropdown.innerHTML = data.features.map((feat, idx) => {
              const p = feat.properties || {};
              const title = [p.name, p.street, p.housenumber].filter(Boolean).join(' ') || p.name || 'Location';
              const subtitle = [p.district, p.city, p.state, p.postcode, p.country].filter(Boolean).join(', ');
              return `
                <div class="checkout-loc-item" data-idx="${idx}">
                  <span class="checkout-loc-name">📍 ${title}</span>
                  <small class="checkout-loc-detail">${subtitle}</small>
                </div>
              `;
            }).join('');
            fallbackDropdown.style.display = 'block';

            fallbackDropdown.querySelectorAll('.checkout-loc-item').forEach(item => {
              item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.idx, 10);
                const feat = data.features[idx];
                if (!feat) return;
                const p = feat.properties || {};
                autofillCheckoutAddressFields({
                  address1: [p.housenumber, p.name !== p.city ? p.name : ''].filter(Boolean).join(' ') || p.name || '',
                  address2: [p.street, p.district].filter(Boolean).join(', ') || p.district || '',
                  landmark: p.suburb || p.district || '',
                  city: p.city || p.county || '',
                  state: p.state || '',
                  pincode: p.postcode || ''
                }, 'Location Search');
                fallbackDropdown.style.display = 'none';
              });
            });
          })
          .catch(() => {
            if (fallbackDropdown) fallbackDropdown.style.display = 'none';
          });
      }, 350);
    });

    document.addEventListener('click', (e) => {
      if (fallbackDropdown && !e.target.closest('#checkoutAddress1') && !e.target.closest('#checkoutAddress1FallbackDropdown')) {
        fallbackDropdown.style.display = 'none';
      }
    });
  }

  // Initialize location autocomplete
  initAddressLocationAutocomplete();


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

  const RETURNS_STORAGE_KEY = 'the_street_co_returns_v1';

  function getSavedReturnExchangeRequests() {
    try {
      const raw = localStorage.getItem(RETURNS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveReturnExchangeRequest(req) {
    try {
      const current = getSavedReturnExchangeRequests();
      const updated = [req, ...current.filter(r => r && r.id !== req.id && r.orderCode !== req.orderCode)];
      localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.warn('Failed to save return request', e);
      return [];
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
    const cp = collectionsPage || document.getElementById('collectionsPage');
    if (cp) {
      cp.classList.add('open');
      cp.setAttribute('aria-hidden', 'false');
      document.body.classList.add('collections-page-open');
      document.documentElement.classList.add('collections-page-open');
      document.body.classList.remove('bag-open');
      document.documentElement.classList.remove('bag-open');
      const mobileNavCollec = document.getElementById('mobileNavCollections');
      if (typeof setActiveBottomNav === 'function') {
        setActiveBottomNav(mobileNavCollec);
      } else if (typeof window.setActiveBottomNav === 'function') {
        window.setActiveBottomNav(mobileNavCollec);
      }
    }
  }
  window.openCollectionsPage = openCollectionsPage;

  function closeCollectionsPage() {
    const cp = collectionsPage || document.getElementById('collectionsPage');
    if (cp) {
      cp.classList.remove('open');
      cp.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('collections-page-open');
      document.documentElement.classList.remove('collections-page-open');
      if (typeof window.syncMobileBottomNav === 'function') {
        window.syncMobileBottomNav();
      }
    }
  }
  window.closeCollectionsPage = closeCollectionsPage;

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
    const mobileNavShopEl = document.getElementById('mobileNavShop');
    if (mobileNavShopEl && typeof setActiveBottomNav === 'function') {
      setActiveBottomNav(mobileNavShopEl);
    }
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
    const mobileNavShopEl = document.getElementById('mobileNavShop');
    if (mobileNavShopEl && typeof setActiveBottomNav === 'function') {
      setActiveBottomNav(mobileNavShopEl);
    }
  }

  // Backdrop click closes Collections Hub
  const collectionsHubBackdrop = document.getElementById('collectionsHubBackdrop');
  if (collectionsHubBackdrop) {
    collectionsHubBackdrop.addEventListener('click', closeCollectionsPage);
  }

  // Header Search button inside Collection Page
  const collecHeaderSearchBtn = document.getElementById('collecHeaderSearchBtn') || document.getElementById('hubHeaderSearchBtn');
  if (collecHeaderSearchBtn) {
    collecHeaderSearchBtn.addEventListener('click', () => {
      closeCollectionsPage();
      const shopSec = document.getElementById('shop');
      if (shopSec) shopSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const searchInp = document.getElementById('shopSearchInput');
      if (searchInp) {
        setTimeout(() => searchInp.focus(), 350);
      }
      const mobileNavShopEl = document.getElementById('mobileNavShop');
      if (mobileNavShopEl && typeof setActiveBottomNav === 'function') {
        setActiveBottomNav(mobileNavShopEl);
      }
    });
  }

  // Header Push Notification button inside Collection Page
  const collecHeaderNotifBtn = document.getElementById('collecHeaderNotifBtn');
  if (collecHeaderNotifBtn) {
    collecHeaderNotifBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.openNotificationsModal === 'function') {
        window.openNotificationsModal();
      }
    });
  }

  // Header Bag button inside Hub / Collection Page
  const hubHeaderBagBtn = document.getElementById('collecCartBtn') || document.getElementById('hubHeaderBagBtn');
  if (hubHeaderBagBtn) {
    hubHeaderBagBtn.addEventListener('click', () => {
      closeCollectionsPage();
      if (typeof openCart === 'function') {
        openCart('bag');
      }
    });
  }

  // Shop All Products Quick Bar
  const hubQuickShopAll = document.getElementById('hubQuickShopAll');
  if (hubQuickShopAll) {
    hubQuickShopAll.addEventListener('click', () => {
      closeCollectionsPage();
      if (typeof activeShopFilters !== 'undefined') {
        Object.keys(activeShopFilters).forEach(k => activeShopFilters[k].clear());
        renderActiveFilterChips();
        updateFilterCheckboxesState();
        renderShopGrid();
      }
      const shopSec = document.getElementById('shop');
      if (shopSec) shopSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const mobileNavShopEl = document.getElementById('mobileNavShop');
      if (mobileNavShopEl && typeof setActiveBottomNav === 'function') {
        setActiveBottomNav(mobileNavShopEl);
      }
    });
  }

  // Collections Hub Tab Switching (ALL / CATEGORIES / THEMES)
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
      const secCategories = document.getElementById('hubSectionCategories');
      const secCollections = document.getElementById('hubSectionCollections');

      if (targetTab === 'categories') {
        if (secCategories) secCategories.style.display = 'block';
        if (secCollections) secCollections.style.display = 'none';
      } else if (targetTab === 'collections') {
        if (secCategories) secCategories.style.display = 'none';
        if (secCollections) secCollections.style.display = 'block';
      } else {
        // 'all'
        if (secCategories) secCategories.style.display = 'block';
        if (secCollections) secCollections.style.display = 'block';
      }
    });
  });

  // Section Accordion Toggles
  const hubToggleCategories = document.getElementById('hubToggleCategories');
  if (hubToggleCategories) {
    hubToggleCategories.addEventListener('click', () => {
      const panel = document.getElementById('hubPanelCategories');
      const chev = hubToggleCategories.querySelector('.hub-acc-chevron');
      if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'grid' : 'none';
        if (chev) chev.style.transform = isHidden ? 'none' : 'rotate(180deg)';
      }
    });
  }

  const hubToggleCollections = document.getElementById('hubToggleCollections');
  if (hubToggleCollections) {
    hubToggleCollections.addEventListener('click', () => {
      const panel = document.getElementById('hubPanelCollections');
      const chev = hubToggleCollections.querySelector('.hub-acc-chevron');
      if (panel) {
        const isHidden = panel.style.display === 'none';
        panel.style.display = isHidden ? 'grid' : 'none';
        if (chev) chev.style.transform = isHidden ? 'none' : 'rotate(180deg)';
      }
    });
  }

  // Delegated Click Handler on Collections Hub for ANY card/image/text with filter data
  if (collectionsPage) {
    collectionsPage.addEventListener('click', (e) => {
      const catCard = e.target.closest('[data-cat-filter]');
      if (catCard) {
        const cat = catCard.dataset.catFilter;
        if (cat) {
          closeCollectionsPage();
          applyCategoryFilter(cat);
          return;
        }
      }

      const collecCard = e.target.closest('[data-collec-filter]');
      if (collecCard) {
        const col = collecCard.dataset.collecFilter;
        if (col) {
          closeCollectionsPage();
          applyCollectionFilter(col);
          return;
        }
      }
    });
  }

  if (openCollectionsBtn) {
    openCollectionsBtn.addEventListener('click', () => openCollectionsPage());
  }
  if (navCollectionsLink) {
    navCollectionsLink.addEventListener('click', (e) => {
      e.preventDefault();
      openCollectionsPage();
    });
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
  const shopMobileFilterBadge = document.getElementById('shopMobileFilterBadge');
  const shopFilterBackdrop = document.getElementById('shopFilterBackdrop');
  const shopFilterMobileCloseBtn = document.getElementById('shopFilterMobileCloseBtn');
  const filterSidebarFooter = document.getElementById('filterSidebarFooter');
  const filterFooterResetBtn = document.getElementById('filterFooterResetBtn');
  const filterFooterApplyBtn = document.getElementById('filterFooterApplyBtn');
  const filterFooterApplyCount = document.getElementById('filterFooterApplyCount');

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
      {
        id: 'Minato Namikaze',
        label: 'Minato Namikaze',
        subtitle: 'Yellow Flash',
        kanji: '閃',
        img: '/product-minato.jpg'
      },
      {
        id: 'Akatsuki Shadows',
        label: 'Akatsuki Shadows',
        subtitle: 'Crimson Cloud',
        kanji: '雲',
        img: 'https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80'
      },
      {
        id: 'Uchiha Clan',
        label: 'Uchiha Clan',
        subtitle: 'Flame Legacy',
        kanji: '団',
        img: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80'
      },
      {
        id: 'Crow Genjutsu',
        label: 'Crow Genjutsu',
        subtitle: 'Raven Mirage',
        kanji: '鴉',
        img: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80'
      },
      {
        id: 'Street Core',
        label: 'Street Core',
        subtitle: 'Tokyo Shadow',
        kanji: '街',
        img: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&q=80'
      },
      {
        id: 'Shinobi Armory',
        label: 'Shinobi Armory',
        subtitle: 'Tactical Steel',
        kanji: '刃',
        img: 'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?w=400&q=80'
      }
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

      if (groupKey === 'collection') {
        listContainer.classList.add('filter-collection-boxes');
        listContainer.innerHTML = options.map((opt, idx) => {
          const isChecked = activeShopFilters.collection.has(opt.id);
          const count = getFilterMatchCount('collection', opt.id);
          const bgImg = opt.img || '/product-minato.jpg';
          const kanji = opt.kanji || '忍';
          const sub = opt.subtitle || 'Collection';
          const idxStr = String(idx + 1).padStart(2, '0');
          return `
            <label class="filter-collec-square ${isChecked ? 'checked active' : ''}" data-val="${opt.id}" title="${opt.label}">
              <input type="checkbox" class="filter-checkbox filter-box-sr" data-group="collection" data-val="${opt.id}" ${isChecked ? 'checked' : ''} />
              <img src="${bgImg}" alt="${opt.label}" class="filter-collec-square__bg" loading="lazy" />
              <div class="filter-collec-square__scrim"></div>
              <span class="filter-collec-square__kanji" aria-hidden="true">${kanji}</span>
              <div class="filter-collec-square__top">
                <span class="filter-collec-square__index">${idxStr}</span>
                <div class="filter-collec-square__check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
              <div class="filter-collec-square__meta">
                <span class="filter-collec-square__sub">${sub}</span>
                <span class="filter-collec-square__name">${opt.label}</span>
                <span class="filter-collec-square__count">${count} items</span>
              </div>
              <div class="filter-collec-square__glow" aria-hidden="true"></div>
            </label>
          `;
        }).join('');
        return;
      }

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
        const itemName = (item.name || item.title || '').toLowerCase();
        const target = valId.toLowerCase();
        return col.includes(target) || target.includes(col) || itemName.includes(target);
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
    filterSidebarContent.querySelectorAll('.filter-item, .filter-collec-square').forEach(lbl => {
      const input = lbl.querySelector('.filter-checkbox');
      if (input) {
        const isChecked = activeShopFilters[input.dataset.group].has(input.dataset.val);
        input.checked = isChecked;
        lbl.classList.toggle('checked', isChecked);
        lbl.classList.toggle('active', isChecked);
      }
    });
  }

  function getFilteredShopCatalogItems() {
    if (!collectionsData || collectionsData.length === 0) return [];

    return collectionsData.filter(item => {
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
  }

  function updateActiveFilterBadge() {
    let totalActive = 0;
    Object.keys(activeShopFilters).forEach(g => {
      totalActive += activeShopFilters[g].size;
    });

    if (shopMobileFilterBadge) {
      if (totalActive > 0) {
        shopMobileFilterBadge.textContent = String(totalActive);
        shopMobileFilterBadge.style.display = 'inline-flex';
      } else {
        shopMobileFilterBadge.style.display = 'none';
      }
    }

    if (filterFooterApplyCount) {
      const matchCount = getFilteredShopCatalogItems().length;
      filterFooterApplyCount.textContent = `(${matchCount})`;
    }
  }

  function renderActiveFilterChips() {
    updateActiveFilterBadge();
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
      updateActiveFilterBadge();
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

  // Mobile Filter Drawer Controller:
  // 1. Shows filter page from the beginning (scrollTop = 0)
  // 2. Cut / Close on clicking the outer screen (backdrop) or outside click
  // 3. Clear apply button to confirm and close
  function openMobileFilters() {
    if (!shopFilterSidebar) return;

    // Show filter page from the beginning (reset scroll to top)
    shopFilterSidebar.scrollTop = 0;
    if (filterSidebarContent) {
      filterSidebarContent.scrollTop = 0;
    }

    shopFilterSidebar.classList.add('mobile-open');
    if (shopMobileFilterBtn) {
      shopMobileFilterBtn.classList.add('active');
      shopMobileFilterBtn.setAttribute('aria-expanded', 'true');
    }
    if (shopFilterBackdrop) {
      shopFilterBackdrop.classList.add('active');
    }
    document.body.classList.add('filter-drawer-open');

    updateActiveFilterBadge();
  }

  function closeMobileFilters() {
    if (!shopFilterSidebar) return;
    shopFilterSidebar.classList.remove('mobile-open');
    if (shopMobileFilterBtn) {
      shopMobileFilterBtn.classList.remove('active');
      shopMobileFilterBtn.setAttribute('aria-expanded', 'false');
    }
    if (shopFilterBackdrop) {
      shopFilterBackdrop.classList.remove('active');
    }
    document.body.classList.remove('filter-drawer-open');
  }

  // Trigger button click handler
  if (shopMobileFilterBtn) {
    shopMobileFilterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (shopFilterSidebar && shopFilterSidebar.classList.contains('mobile-open')) {
        closeMobileFilters();
      } else {
        openMobileFilters();
      }
    });
  }

  // Header close button handler
  if (shopFilterMobileCloseBtn) {
    shopFilterMobileCloseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileFilters();
    });
  }

  // Outside screen / Backdrop click cuts/closes the filter page
  if (shopFilterBackdrop) {
    shopFilterBackdrop.addEventListener('click', (e) => {
      e.stopPropagation();
      closeMobileFilters();
    });
  }

  // Click outside to cut / close filter page if user clicks anywhere on the outer screen
  document.addEventListener('click', (e) => {
    if (!shopFilterSidebar || !shopFilterSidebar.classList.contains('mobile-open')) return;
    if (shopMobileFilterBtn && shopMobileFilterBtn.contains(e.target)) return;
    if (!shopFilterSidebar.contains(e.target)) {
      closeMobileFilters();
    }
  });

  // ESC key cuts/closes the filter drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shopFilterSidebar && shopFilterSidebar.classList.contains('mobile-open')) {
      closeMobileFilters();
    }
  });

  // Sticky drawer footer APPLY FILTERS button
  if (filterFooterApplyBtn) {
    filterFooterApplyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderShopGrid();
      closeMobileFilters();
      const shopSection = document.getElementById('shop');
      if (shopSection) {
        shopSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Sticky drawer footer RESET button
  if (filterFooterResetBtn) {
    filterFooterResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearAllActiveFilters();
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
      openMobileFilters();
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

    let items = [...getFilteredShopCatalogItems()];

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
        } else if (action === 'contact' || action === 'support') {
          e.preventDefault();
          if (typeof window.openZohoDeskChat === 'function') {
            window.openZohoDeskChat();
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
  // CLIENT SUPPORT & CONCIERGE MODAL
  // ══════════════════════════════════════════════════════════════
  function initContactSupport() {
    window.openZohoDeskChat = function() {
      const legalModal = document.getElementById('legalPolicyModal');
      const legalTitle = document.getElementById('legalPolicyModalTitle');
      const legalTag = document.getElementById('legalPolicyModalTag');
      const legalBody = document.getElementById('legalPolicyModalBody');
      if (legalTag) legalTag.textContent = "CLIENT CARE & CONCIERGE";
      if (legalTitle) legalTitle.textContent = "CONTACT US";
      if (legalBody) {
        legalBody.innerHTML = `
          <p style="margin-bottom:1.2rem;color:var(--bone);font-weight:700;">Direct assistance from The Street Co Concierge team.</p>
          <div style="display:grid;gap:.9rem;">
            <div style="padding:1rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.1);border-radius:8px;">
              <strong style="color:var(--bone);display:block;margin-bottom:4px;font-size:0.85rem;">Direct Concierge Email</strong>
              <p style="margin:0 0 8px;font-size:0.75rem;color:#a1a1aa;line-height:1.45;">Reach out for assistance regarding order fulfillment, sizing consultations, or exchanges:</p>
              <a href="mailto:support@thestreetco.zohodesk.in" style="color:#ef4444;font-family:var(--mono);font-size:0.8rem;font-weight:700;text-decoration:underline;">support@thestreetco.zohodesk.in</a>
              <div style="margin-top:6px;font-size:0.7rem;color:#71717a;">Average reply time within 2–4 business hours.</div>
            </div>
            <div style="padding:1rem;background:rgba(232,228,220,.03);border:1px solid rgba(232,228,220,.1);border-radius:8px;">
              <strong style="color:var(--bone);display:block;margin-bottom:4px;font-size:0.85rem;">WhatsApp Instant Concierge</strong>
              <p style="margin:0 0 8px;font-size:0.75rem;color:#a1a1aa;line-height:1.45;">Live order status, tracking verification & quick queries:</p>
              <a href="https://wa.me/916296731835?text=Hello%20The%20Street%20Co%2C%20I%20need%20assistance%20with%20an%20order" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:#22c55e;font-family:var(--mono);font-size:0.8rem;font-weight:700;text-decoration:none;">
                <span>+91 62967 31835 ↗</span>
              </a>
            </div>
          </div>
        `;
      }
      if (legalModal) {
        legalModal.classList.add('open');
        legalModal.setAttribute('aria-hidden', 'false');
      }
    };

    window.closeZohoDeskChat = function() {
      const legalModal = document.getElementById('legalPolicyModal');
      if (legalModal) {
        legalModal.classList.remove('open');
        legalModal.setAttribute('aria-hidden', 'true');
      }
    };

    window.openContactSupportModal = window.openZohoDeskChat;
    window.closeContactSupportModal = window.closeZohoDeskChat;
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

// Legacy credentials & live chat cleanup
try {
  localStorage.removeItem("itachi_auth_user");
  localStorage.removeItem("itachi_admin_secret");
  localStorage.removeItem("live_chat_provider");
  localStorage.removeItem("live_chat_widget_code");
  localStorage.removeItem("zoho_salesiq_widget_code");
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

// Hash routing for Collections & Categories page
if (window.location.hash === '#collections' || window.location.hash === '#categories') {
  setTimeout(() => {
    if (typeof window.openCollectionsPage === 'function') window.openCollectionsPage();
  }, 200);
}
window.addEventListener('hashchange', () => {
  if (window.location.hash === '#collections' || window.location.hash === '#categories') {
    if (typeof window.openCollectionsPage === 'function') window.openCollectionsPage();
  }
});

function openDelhiveryTracker(orderNum) {
  const trackModal = document.getElementById('delhiveryTrackModal');
  const numInput = document.getElementById('delhiveryTrackNumberInput');
  if (numInput && orderNum) numInput.value = orderNum;
  if (trackModal) {
    trackModal.classList.add('open');
    trackModal.setAttribute('aria-hidden', 'false');
  }
  const trackBtn = document.getElementById('delhiveryFetchTrackBtn');
  if (trackBtn) trackBtn.click();
}
window.openDelhiveryTracker = openDelhiveryTracker;

// ══════════════════════════════════════════════════════════════
// STORE NOTIFICATIONS & WEB NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
(function initStoreNotifications() {
  // Custom Toast notification for drop messages
  function showForegroundPushToast(title, body, url) {
    let container = document.getElementById('pushToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'pushToastContainer';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:12px;max-width:380px;width:calc(100% - 48px);pointer-events:none;';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.cssText = 'background:#ffffff;color:#111111;border:1px solid #e5e5e5;border-left:4px solid #111111;border-radius:8px;padding:14px 16px;box-shadow:0 12px 32px rgba(0,0,0,0.12);font-family:var(--sans,sans-serif);pointer-events:auto;animation:pushToastSlideIn 0.3s cubic-bezier(0.16,1,0.3,1);cursor:pointer;';
    toast.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
        <div style="flex:1;">
          <div style="font-size:10px;font-family:var(--mono,monospace);font-weight:700;letter-spacing:1.5px;color:#dc2626;margin-bottom:4px;text-transform:uppercase;">THE STREET CO · DROP ALERT</div>
          <div style="font-size:13px;font-weight:700;color:#111111;line-height:1.3;margin-bottom:4px;">${title}</div>
          <div style="font-size:12px;color:#71717a;line-height:1.4;">${body}</div>
        </div>
        <button type="button" style="background:none;border:none;color:#a1a1aa;font-size:16px;cursor:pointer;padding:0 4px;line-height:1;" aria-label="Close notification">✕</button>
      </div>
    `;

    toast.querySelector('button').addEventListener('click', (e) => {
      e.stopPropagation();
      toast.remove();
    });

    toast.addEventListener('click', () => {
      if (url && url !== '/') {
        window.location.href = url;
      }
      toast.remove();
    });

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s ease';
        setTimeout(() => toast.remove(), 400);
      }
    }, 7000);
  }

  // ══════════════════════════════════════════════════════════════
  // LOCAL NOTIFICATIONS STORAGE & FEED MANAGEMENT
  // ══════════════════════════════════════════════════════════════
  const NOTIF_STORAGE_KEY = 'thestreetco_notifications_v3';

  const PROPER_INITIAL_NOTIFICATIONS = [
    {
      id: 'drop_capsule_01',
      title: 'AKATSUKI CLOUDS CAPSULE LIVE',
      body: '450 GSM Heavyweight Terry Drop is now live. Limited capsule of 50 numbered pieces worldwide.',
      tag: 'NEW DROP',
      timestamp: Date.now() - 1000 * 60 * 25,
      iconEmoji: '🔥'
    },
    {
      id: 'drop_perk_02',
      title: 'VIP EXPRESS DISPATCH ACTIVE',
      body: 'Complimentary priority courier shipping applied automatically to all orders today.',
      tag: 'PRIVILEGE',
      timestamp: Date.now() - 1000 * 60 * 60 * 3,
      iconEmoji: '⚡'
    },
    {
      id: 'drop_tracking_03',
      title: 'DELHIVERY LIVE TRACKING READY',
      body: 'Real-time shipment milestones and instant delivery alerts are synced to your account.',
      tag: 'ORDERS',
      timestamp: Date.now() - 1000 * 60 * 60 * 22,
      iconEmoji: '📦'
    }
  ];

  const NOTIF_LAST_SEEN_KEY = 'thestreetco_notifs_last_seen_time';

  function getLastSeenTime() {
    try {
      const val = localStorage.getItem(NOTIF_LAST_SEEN_KEY);
      return val ? parseInt(val, 10) : 0;
    } catch (_) {
      return 0;
    }
  }

  function setLastSeenTimeToNow() {
    try {
      localStorage.setItem(NOTIF_LAST_SEEN_KEY, String(Date.now()));
    } catch (_) {}
    updateNotificationCountBadge();
  }

  function getUnseenNotificationCount() {
    const list = getLocalNotifications();
    if (!list || list.length === 0) return 0;
    const lastSeen = getLastSeenTime();
    if (!lastSeen) {
      return list.length;
    }
    return list.filter(n => (n.timestamp || 0) > lastSeen).length;
  }

  function getLocalNotifications() {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (raw !== null) {
        return JSON.parse(raw);
      }
    } catch (_) {}
    return PROPER_INITIAL_NOTIFICATIONS;
  }

  function saveLocalNotifications(list) {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(list));
      updateNotificationCountBadge();
    } catch (_) {}
  }

  function addLocalNotification(item) {
    const list = getLocalNotifications();
    list.unshift(item);
    if (list.length > 50) list.length = 50;
    saveLocalNotifications(list);
    updateNotificationCountBadge();
    renderNotificationsFeed();
  }

  function removeLocalNotification(id) {
    const list = getLocalNotifications().filter(n => n.id !== id);
    saveLocalNotifications(list);
    updateNotificationCountBadge();
    renderNotificationsFeed();
  }

  function clearAllLocalNotifications() {
    saveLocalNotifications([]);
    setLastSeenTimeToNow();
    renderNotificationsFeed();
  }

  function updateNotificationCountBadge() {
    const count = getUnseenNotificationCount();
    const badges = document.querySelectorAll('.header-notif-count');
    badges.forEach(badge => {
      if (!badge) return;
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.setAttribute('data-count', String(count));
        badge.classList.remove('is-zero');
        badge.style.setProperty('display', 'inline-flex', 'important');
      } else {
        badge.textContent = '0';
        badge.setAttribute('data-count', '0');
        badge.classList.add('is-zero');
        badge.style.setProperty('display', 'none', 'important');
      }
    });

    // Permanently remove any legacy red/green dot element
    const dot = document.getElementById('headerNotifDot');
    if (dot) dot.remove();
  }

  // ══════════════════════════════════════════════════════════════
  // NOTIFICATIONS MODAL & PROPER FEED RENDERING
  // ══════════════════════════════════════════════════════════════
  window.openNotificationsModal = function() {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Mark current notifications as seen when opening the drawer
    setLastSeenTimeToNow();

    updateModalPushBadge();
    renderNotificationsFeed();
  };

  window.closeNotificationsModal = function() {
    const modal = document.getElementById('notificationsModal');
    if (!modal) return;

    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.removeProperty('overflow');
  };

  function updateModalPushBadge() {
    const enableBtn = document.getElementById('notifEmptyEnableBtn');
    if (!enableBtn) return;

    if (typeof Notification === 'undefined' || Notification.permission === 'granted' || Notification.permission === 'denied') {
      enableBtn.style.display = 'none';
    } else {
      enableBtn.style.display = 'inline-flex';
      enableBtn.textContent = 'Enable Drop Alerts';
    }
  }

  function renderNotificationsFeed() {
    const emptyState = document.getElementById('notificationsEmptyState');
    const feed = document.getElementById('notificationsFeed');
    const clearBtn = document.getElementById('notificationsClearBtn');

    if (!emptyState || !feed) return;

    const notifs = getLocalNotifications();

    if (notifs.length === 0) {
      emptyState.classList.remove('is-hidden');
      emptyState.style.setProperty('display', 'flex', 'important');
      feed.classList.add('is-hidden');
      feed.style.setProperty('display', 'none', 'important');
      if (clearBtn) clearBtn.style.display = 'none';
      updateModalPushBadge();
    } else {
      emptyState.classList.add('is-hidden');
      emptyState.style.setProperty('display', 'none', 'important');
      feed.classList.remove('is-hidden');
      feed.style.setProperty('display', 'flex', 'important');
      if (clearBtn) clearBtn.style.display = 'inline-block';

      feed.innerHTML = notifs.map(n => {
        const timeAgo = formatTimeAgo(n.timestamp || Date.now());
        const tag = n.tag || 'DROP ALERT';
        const icon = n.iconEmoji || (tag.includes('ORDER') ? '📦' : '🔥');

        return `
          <div class="notification-card" data-id="${n.id}">
            <div class="notification-card__icon">${icon}</div>
            <div class="notification-card__content">
              <div class="notification-card__meta">
                <span class="notification-card__tag">${escapeHtml(tag)}</span>
                <span class="notification-card__time">${timeAgo}</span>
              </div>
              <h4 class="notification-card__title">${escapeHtml(n.title)}</h4>
              <p class="notification-card__body">${escapeHtml(n.body)}</p>
            </div>
            <button type="button" class="notification-card__del" data-del-id="${n.id}" title="Remove alert">✕</button>
          </div>
        `;
      }).join('');

      // Attach delete handlers
      feed.querySelectorAll('.notification-card__del').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-del-id');
          if (id) removeLocalNotification(id);
        });
      });
    }
  }

  function formatTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - Number(timestamp)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Request push notification permission
  window.requestPushNotificationPermission = async function() {
    if (!('Notification' in window)) {
      showForegroundPushToast('Notifications Unsupported', 'Your browser does not support web notifications.', '/');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showForegroundPushToast('🔔 Notifications Activated', 'You will now receive instant drop alerts and order updates from The Street Co.', '/');
        const badge = document.getElementById('pushOptInBadge');
        if (badge) badge.remove();

        updatePushUiState(true);
        updateModalPushBadge();
        return true;
      } else {
        updateModalPushBadge();
        return false;
      }
    } catch (err) {
      console.warn('Error requesting permission:', err);
      return false;
    }
  };

  // Dispatch a test drop alert
  window.sendTestPushAlert = async function() {
    const testItem = {
      id: 'notif_' + Date.now(),
      title: '🔥 VIP Capsule Drop Live',
      body: 'Heavyweight oversized drop is now accessible for VIP members. Exclusive pieces limited to 50 garments.',
      tag: 'DROP ALERT',
      iconEmoji: '⚡',
      timestamp: Date.now(),
      url: '#shop'
    };

    addLocalNotification(testItem);
    showForegroundPushToast('🚀 Drop Alert Dispatched', 'Test drop alert added to your notifications feed.', '/');
    renderNotificationsFeed();
    return { success: true };
  };

  function updatePushUiState(isSubscribed) {
    const btn = document.getElementById('enablePushBtn');
    if (btn) {
      btn.innerHTML = isSubscribed ? '✓ Push Notifications Active' : '🔔 Enable Push Notifications';
      btn.style.color = isSubscribed ? '#4ade80' : '';
    }
    const headerBtn = document.getElementById('headerPushNotifBtn');
    if (headerBtn) {
      headerBtn.setAttribute('title', isSubscribed ? 'VIP Notifications Active (Click to View Feed)' : 'View Drop Notifications');
    }
    const dot = document.getElementById('headerNotifDot');
    if (dot) dot.remove();
    updateNotificationCountBadge();
  }

  // ══════════════════════════════════════════════════════════════
  // EVENT LISTENERS INITIALIZATION
  // ══════════════════════════════════════════════════════════════
  function initNotificationEventListeners() {
    // Header notification bell click: opens Notifications Modal
    const headerNotifBtn = document.getElementById('headerPushNotifBtn');
    if (headerNotifBtn) {
      headerNotifBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.openNotificationsModal();
      });
    }

    // Direct URL hash check (e.g., /#notifications)
    function checkUrlForNotifications() {
      if (window.location.hash === '#notifications' || window.location.pathname === '/notifications') {
        window.openNotificationsModal();
      }
    }
    window.addEventListener('hashchange', checkUrlForNotifications);
    checkUrlForNotifications();

    // Modal close triggers
    const closeBtn = document.getElementById('notificationsModalCloseBtn');
    const footerCloseBtn = document.getElementById('notificationsFooterCloseBtn');
    const backdrop = document.getElementById('notificationsModalBackdrop');

    if (closeBtn) closeBtn.addEventListener('click', window.closeNotificationsModal);
    if (footerCloseBtn) footerCloseBtn.addEventListener('click', window.closeNotificationsModal);
    if (backdrop) backdrop.addEventListener('click', window.closeNotificationsModal);

    // Clear All button in modal footer
    const clearBtn = document.getElementById('notificationsClearBtn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        clearAllLocalNotifications();
      });
    }

    // Empty state CTAs
    const exploreBtn = document.getElementById('notifEmptyExploreBtn');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        window.closeNotificationsModal();
        const shopEl = document.getElementById('shop') || document.getElementById('new-in');
        if (shopEl) shopEl.scrollIntoView({ behavior: 'smooth' });
      });
    }

    const testBtn = document.getElementById('notifEmptyTestBtn');
    if (testBtn) {
      testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'DISPATCHING...';
        if (window.sendTestPushAlert) {
          await window.sendTestPushAlert();
        }
        testBtn.disabled = false;
        testBtn.innerHTML = '<span>🔔 SEND TEST DROP ALERT</span>';
      });
    }

    const emptyEnableBtn = document.getElementById('notifEmptyEnableBtn');
    if (emptyEnableBtn) {
      emptyEnableBtn.addEventListener('click', async () => {
        emptyEnableBtn.disabled = true;
        emptyEnableBtn.textContent = 'PERMITTING...';
        await window.requestPushNotificationPermission();
        emptyEnableBtn.disabled = false;
        emptyEnableBtn.textContent = 'ENABLE ALERTS';
      });
    }

    // Escape key closes modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById('notificationsModal');
        if (modal && modal.classList.contains('open')) {
          window.closeNotificationsModal();
        }
      }
    });
  }

  // Initialize listeners & sync badge count
  initNotificationEventListeners();
  updateNotificationCountBadge();
})();

/* ═══════════════════════════════════════════════════════════════════════════
   NEXT-GEN STOREFRONT EXPERIENCE SUITE CONTROLLER
   1. Interactive Shop-the-Fit Lookbook & Outfit Builder
   2. Smart Fit Finder & Size Calculator Quiz
   3. Live Flash Drop Countdown & Waitlist Vault
   4. VIP Street Cred Loyalty & Referral Rewards Club
   5. Self-Service Order Lookup & 7-Day Size Exchange Portal
   ═══════════════════════════════════════════════════════════════════════════ */
(function initNextGenStorefrontSuite() {
  const FIT_STORAGE_KEY = 'the_street_co_fit_profile_v1';
  const VIP_STORAGE_KEY = 'the_street_co_vip_profile_v1';
  const WAITLIST_STORAGE_KEY = 'the_street_co_drop_waitlist_v1';

  // ── 1. CURATED LOOKBOOK ENSEMBLES ──
  const LOOKBOOK_DATA = {
    'look-01': {
      id: 'look-01',
      title: 'Tokyo Shadow Ensemble',
      meta: 'Look 01 · Heavyweight Streetwear · 3 Curated Pieces',
      note: '480 GSM loopwheel cotton hoodie paired with articulated cargo trousers and a tactical utility bag.',
      heroImage: '/product-minato.jpg',
      pieces: [
        {
          pin: '01',
          x: 46,
          y: 34,
          sku: 'TS-MIN-001',
          name: 'Minato Yellow Flash Oversized Heavy Tee',
          category: 'Oversized T-Shirts',
          fabric: '320 GSM Combed Cotton · Drop Shoulder',
          priceInr: 1999,
          image: '/product-minato.jpg',
          defaultSize: 'L'
        },
        {
          pin: '02',
          x: 52,
          y: 66,
          sku: 'TS-STR-004',
          name: 'Tokyo Shadow Tactical Cargo Trousers',
          category: 'Cargo Pants & Joggers',
          fabric: 'Ripstop Cotton Twill · 6-Pocket Articulated Fit',
          priceInr: 2699,
          image: '/product-ts-min-001.jpg',
          defaultSize: 'L'
        },
        {
          pin: '03',
          x: 32,
          y: 50,
          sku: 'TS-ACC-002',
          name: 'Obsidian Crossbody Utility Sling Bag',
          category: 'Accessories & Bags',
          fabric: 'Ballistic Nylon · Matte Fidlock Buckle',
          priceInr: 1599,
          image: '/og-preview.jpg',
          defaultSize: 'M'
        }
      ]
    },
    'look-02': {
      id: 'look-02',
      title: 'Tailored Archive Silhouette',
      meta: 'Look 02 · Structured Luxury Street · 3 Curated Pieces',
      note: 'Architectural double-breasted streetwear blazer layered over an ivory heavyweight tee and pleated wide trousers.',
      heroImage: '/product-ts-min-001.jpg',
      pieces: [
        {
          pin: '01',
          x: 48,
          y: 30,
          sku: 'TS-UCH-002',
          name: 'Uchiha Crest Tailored Streetwear Blazer',
          category: 'Jackets & Outerwear',
          fabric: 'Japanese Gabardine Twill · Satin Lined',
          priceInr: 3999,
          image: '/product-ts-min-001.jpg',
          defaultSize: 'L'
        },
        {
          pin: '02',
          x: 50,
          y: 48,
          sku: 'TS-CLS-003',
          name: 'Archive Ivory Heavyweight Crewneck Tee',
          category: 'Classic T-Shirts',
          fabric: '280 GSM Organic Supima Cotton',
          priceInr: 1499,
          image: '/product-minato.jpg',
          defaultSize: 'M'
        },
        {
          pin: '03',
          x: 54,
          y: 74,
          sku: 'TS-BTM-007',
          name: 'Wide-Leg Pleated Archive Trousers',
          category: 'Cargo Pants & Joggers',
          fabric: 'Structured Wool-Blend Drape',
          priceInr: 2899,
          image: '/og-image.jpg',
          defaultSize: 'L'
        }
      ]
    },
    'look-03': {
      id: 'look-03',
      title: 'Utilitarian Street Armor',
      meta: 'Look 03 · All-Weather Capsule · 3 Curated Pieces',
      note: 'Heavyweight French terry hoodie paired with relaxed parachute joggers and brushed steel street hardware.',
      heroImage: '/og-image.jpg',
      pieces: [
        {
          pin: '01',
          x: 45,
          y: 36,
          sku: 'TS-AKA-005',
          name: 'Crimson Cloud 480 GSM Oversized Hoodie',
          category: 'Hoodies & Sweatshirts',
          fabric: '480 GSM Heavyweight French Terry',
          priceInr: 3299,
          image: '/og-image.jpg',
          defaultSize: 'XL'
        },
        {
          pin: '02',
          x: 53,
          y: 68,
          sku: 'TS-ARM-006',
          name: 'Shinobi Armory Parachute Utility Joggers',
          category: 'Cargo Pants & Joggers',
          fabric: 'Water-Repellent Matte Nylon',
          priceInr: 2499,
          image: '/product-minato.jpg',
          defaultSize: 'L'
        },
        {
          pin: '03',
          x: 36,
          y: 54,
          sku: 'TS-ACC-009',
          name: 'Brushed Titanium Cuban Chain & Tag',
          category: 'Accessories & Jewelry',
          fabric: '316L Surgical Grade Stainless Steel',
          priceInr: 1299,
          image: '/product-ts-min-001.jpg',
          defaultSize: 'M'
        }
      ]
    }
  };

  let activeLookId = 'look-01';
  let activePinIndex = 0;
  let selectedLookSizes = {};

  function getSavedFitSize() {
    try {
      const saved = JSON.parse(localStorage.getItem(FIT_STORAGE_KEY) || 'null');
      return saved && saved.recommendedSize ? saved.recommendedSize : null;
    } catch (_) {
      return null;
    }
  }

  function renderLookbook(lookId) {
    const look = LOOKBOOK_DATA[lookId] || LOOKBOOK_DATA['look-01'];
    activeLookId = look.id;

    const stageImg = document.getElementById('lookbookStageImg');
    const stageMeta = document.getElementById('lookbookStageMeta');
    const stageTitle = document.getElementById('lookbookStageTitle');
    const stageNote = document.getElementById('lookbookStageNote');
    const hotspotsContainer = document.getElementById('lookbookHotspotsContainer');
    const piecesList = document.getElementById('lookbookPiecesList');
    const origPriceEl = document.getElementById('lookbookBundleOriginalPrice');
    const finalPriceEl = document.getElementById('lookbookBundleFinalPrice');

    if (stageImg) {
      stageImg.src = look.heroImage;
      stageImg.onerror = function() {
        this.onerror = null;
        this.src = '/product-minato.jpg';
      };
    }
    if (stageMeta) stageMeta.textContent = look.meta;
    if (stageTitle) stageTitle.textContent = look.title;
    if (stageNote) stageNote.textContent = look.note;

    const savedFitSize = getSavedFitSize();

    if (hotspotsContainer) {
      hotspotsContainer.innerHTML = look.pieces.map((p, idx) => `
        <button type="button"
          class="lookbook-hotspot-pin ${idx === activePinIndex ? 'active' : ''}"
          style="left:${p.x}%; top:${p.y}%;"
          data-hotspot-idx="${idx}"
          aria-label="Inspect ${p.name}">
          ${p.pin}
        </button>
      `).join('');

      hotspotsContainer.querySelectorAll('[data-hotspot-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          activePinIndex = parseInt(btn.getAttribute('data-hotspot-idx'), 10) || 0;
          renderLookbook(activeLookId);
        });
      });
    }

    if (piecesList) {
      piecesList.innerHTML = look.pieces.map((p, idx) => {
        const key = `${look.id}_${p.sku}`;
        const chosenSize = selectedLookSizes[key] || savedFitSize || p.defaultSize || 'L';
        selectedLookSizes[key] = chosenSize;

        return `
          <div class="lookbook-piece-row ${idx === activePinIndex ? 'is-highlighted' : ''}" data-piece-row="${idx}">
            <div class="lookbook-piece-thumb">
              <img src="${p.image}" alt="${p.name}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/product-minato.jpg';" />
            </div>
            <div class="lookbook-piece-info">
              <h4>${p.pin} · ${p.name}</h4>
              <div class="lookbook-piece-meta">${p.category} · ${p.fabric}</div>
              <div class="lookbook-piece-controls">
                <label style="font-size:0.72rem;color:#52525b;font-weight:600;">Size:</label>
                <select class="lookbook-size-select" data-look-size-key="${key}">
                  ${['S', 'M', 'L', 'XL', 'XXL'].map(sz => `<option value="${sz}" ${sz === chosenSize ? 'selected' : ''}>${sz}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="lookbook-piece-price-col">
              <span class="lookbook-piece-price">₹${p.priceInr.toLocaleString('en-IN')}</span>
              <button type="button" class="lookbook-piece-single-btn" data-add-single-idx="${idx}">+ Add Piece</button>
            </div>
          </div>
        `;
      }).join('');

      piecesList.querySelectorAll('.lookbook-size-select').forEach(sel => {
        sel.addEventListener('change', () => {
          selectedLookSizes[sel.getAttribute('data-look-size-key')] = sel.value;
        });
      });

      piecesList.querySelectorAll('[data-add-single-idx]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-add-single-idx'), 10) || 0;
          const piece = look.pieces[idx];
          if (!piece) return;
          const sz = selectedLookSizes[`${look.id}_${piece.sku}`] || piece.defaultSize || 'L';
          if (typeof window.streetCoAddToCart === 'function') {
            window.streetCoAddToCart(btn, {
              id: piece.sku,
              sku: piece.sku,
              name: `${piece.name} (Size ${sz})`,
              category: piece.category,
              priceInr: piece.priceInr,
              image: piece.image,
              size: sz
            }, 1);
          }
        });
      });
    }

    const totalOriginal = look.pieces.reduce((sum, p) => sum + p.priceInr, 0);
    const discountedTotal = Math.round(totalOriginal * 0.9);
    if (origPriceEl) origPriceEl.textContent = `₹${totalOriginal.toLocaleString('en-IN')}`;
    if (finalPriceEl) finalPriceEl.textContent = `₹${discountedTotal.toLocaleString('en-IN')} INR`;
  }

  document.querySelectorAll('[data-look-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-look-tab]').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      activePinIndex = 0;
      renderLookbook(tab.getAttribute('data-look-tab'));
    });
  });

  const addBundleBtn = document.getElementById('lookbookAddBundleBtn');
  if (addBundleBtn) {
    addBundleBtn.addEventListener('click', () => {
      const look = LOOKBOOK_DATA[activeLookId] || LOOKBOOK_DATA['look-01'];
      look.pieces.forEach(piece => {
        const sz = selectedLookSizes[`${look.id}_${piece.sku}`] || piece.defaultSize || 'L';
        if (typeof window.streetCoAddToCart === 'function') {
          window.streetCoAddToCart(addBundleBtn, {
            id: piece.sku,
            sku: piece.sku,
            name: `${piece.name} (Size ${sz})`,
            category: piece.category,
            priceInr: piece.priceInr,
            image: piece.image,
            size: sz
          }, 1);
        }
      });

      awardVipPoints('bundle_' + activeLookId, `Added ${look.title} Complete Outfit`, 50);

      if (typeof window.streetCoOpenCart === 'function') {
        window.streetCoOpenCart('bag');
      }
      if (typeof window.streetCoApplyCoupon === 'function') {
        window.streetCoApplyCoupon('FITBUNDLE10');
      }
    });
  }

  // ── 2. SMART FIT FINDER & SIZE RECOMMENDATION QUIZ ──
  let selectedBuild = 'athletic';
  let selectedDrape = 'signature';
  let latestRecommendedSize = getSavedFitSize() || 'L';

  function updateFitBadgesEverywhere(size, confidence = 96) {
    if (!size) return;
    latestRecommendedSize = size;
    const headerBadge = document.getElementById('headerFitBadgeText');
    const dockBadge = document.getElementById('dockFitBadgeLabel');
    const pdpText = document.getElementById('pdpFitFinderStatusText');

    if (headerBadge) headerBadge.textContent = `Fit: Size ${size}`;
    if (dockBadge) dockBadge.textContent = `My Fit: ${size}`;
    if (pdpText) {
      pdpText.innerHTML = `Your Smart Fit Profile recommends <strong>Size ${size}</strong> (${confidence}% Match)`;
    }
  }

  window.openFitFinderModal = function() {
    const modal = document.getElementById('suiteFitFinderModal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeFitFinderModal = function() {
    const modal = document.getElementById('suiteFitFinderModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  document.querySelectorAll('#fitBuildGroup .suite-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#fitBuildGroup .suite-seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedBuild = btn.getAttribute('data-build') || 'athletic';
    });
  });

  document.querySelectorAll('#fitDrapeGroup .suite-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#fitDrapeGroup .suite-seg-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDrape = btn.getAttribute('data-drape') || 'signature';
    });
  });

  const fitForm = document.getElementById('suiteFitFinderForm');
  if (fitForm) {
    fitForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const heightCm = Number(document.getElementById('fitHeightCm')?.value) || 176;
      const weightKg = Number(document.getElementById('fitWeightKg')?.value) || 72;

      // Deterministic size score index (0=S, 1=M, 2=L, 3=XL, 4=XXL)
      let score = 1;
      if (heightCm < 168 && weightKg < 62) score = 0;
      else if (heightCm < 175 && weightKg < 72) score = 1;
      else if (heightCm < 183 && weightKg < 84) score = 2;
      else if (heightCm < 190 && weightKg < 96) score = 3;
      else score = 4;

      if (selectedBuild === 'broad') score = Math.min(4, score + 1);
      if (selectedBuild === 'lean' && score > 0 && weightKg < 65) score = Math.max(0, score - 1);

      if (selectedDrape === 'oversized') score = Math.min(4, score + 1);
      if (selectedDrape === 'tailored' && score > 0) score = Math.max(0, score - 1);

      const sizes = ['S', 'M', 'L', 'XL', 'XXL'];
      const recommendedSize = sizes[score] || 'L';
      const confidence = 94 + (score % 5);

      const notesByDrape = {
        tailored: `Size ${recommendedSize} delivers a clean, structured shoulder line with minimal excess fabric for ${heightCm}cm / ${weightKg}kg.`,
        signature: `Size ${recommendedSize} gives our signature relaxed streetwear drape with balanced chest comfort for ${heightCm}cm / ${weightKg}kg.`,
        oversized: `Size ${recommendedSize} provides an authentic boxy, drop-shoulder streetwear silhouette for ${heightCm}cm / ${weightKg}kg.`
      };

      const profile = {
        heightCm,
        weightKg,
        build: selectedBuild,
        drape: selectedDrape,
        recommendedSize,
        confidence,
        updatedAt: new Date().toISOString()
      };

      try {
        localStorage.setItem(FIT_STORAGE_KEY, JSON.stringify(profile));
      } catch (_) {}

      fetch('/api/fit-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      }).catch(() => {});

      const resCard = document.getElementById('fitResultCard');
      const resTitle = document.getElementById('fitRecommendedSizeDisplay');
      const resNote = document.getElementById('fitRecommendedNote');
      if (resCard) resCard.style.display = 'block';
      if (resTitle) resTitle.textContent = `Size ${recommendedSize} · ${confidence}% Match`;
      if (resNote) resNote.textContent = notesByDrape[selectedDrape] || notesByDrape.signature;

      updateFitBadgesEverywhere(recommendedSize, confidence);
      awardVipPoints('fit_quiz_completed', 'Completed Smart Fit Size Quiz', 50);
    });
  }

  const applySizeBtn = document.getElementById('fitApplySizeEverywhereBtn');
  if (applySizeBtn) {
    applySizeBtn.addEventListener('click', () => {
      const targetBtn = document.querySelector(`#pdpSizeOptions .pdp-size-chip[data-size="${latestRecommendedSize}"]`);
      if (targetBtn) targetBtn.click();

      Object.keys(LOOKBOOK_DATA).forEach(lookKey => {
        LOOKBOOK_DATA[lookKey].pieces.forEach(p => {
          selectedLookSizes[`${lookKey}_${p.sku}`] = latestRecommendedSize;
        });
      });
      renderLookbook(activeLookId);
      window.closeFitFinderModal();
      if (typeof window.streetCoShowToast === 'function') {
        window.streetCoShowToast('FIT PROFILE APPLIED', `Size ${latestRecommendedSize} selected across storefront & lookbook`);
      }
    });
  }

  // ── 3. LIVE FLASH DROP COUNTDOWN & WAITLIST VAULT ──
  const UPCOMING_DROPS = [
    {
      dropId: 'DROP-01',
      edition: 'Archive Release #01 · Limited to 150 Units',
      title: 'Obsidian Susanoo 500 GSM Armored Trench Hoodie',
      desc: 'Milled from custom 500 GSM heavyweight loopwheel cotton with embroidered metallic crest and storm-flap collar.',
      priceInr: 4299,
      image: '/product-minato.jpg',
      demandPct: 88
    },
    {
      dropId: 'DROP-02',
      edition: 'Archive Release #02 · Limited to 100 Units',
      title: 'Akatsuki Midnight Waxed Canvas Tactical Jacket',
      desc: 'Weatherproof Japanese waxed canvas shell with concealed magnetic utility pockets and vermilion satin lining.',
      priceInr: 5499,
      image: '/product-ts-min-001.jpg',
      demandPct: 79
    },
    {
      dropId: 'DROP-03',
      edition: 'Archive Release #03 · Limited to 200 Units',
      title: 'Shibuya Heavyweight Selvedge Cargo Denim',
      desc: '14oz raw selvedge black denim engineered with articulated knee pleats and custom brushed-steel hardware.',
      priceInr: 3699,
      image: '/og-image.jpg',
      demandPct: 93
    }
  ];

  let waitlistCounts = { 'DROP-01': 142, 'DROP-02': 98, 'DROP-03': 214 };

  function getReservedDrops() {
    try {
      return JSON.parse(localStorage.getItem(WAITLIST_STORAGE_KEY) || '{}');
    } catch (_) {
      return {};
    }
  }

  function renderDropVaultGrid() {
    const grid = document.getElementById('dropVaultGrid');
    if (!grid) return;
    const reserved = getReservedDrops();

    grid.innerHTML = UPCOMING_DROPS.map(d => {
      const isReserved = Boolean(reserved[d.dropId]);
      const count = waitlistCounts[d.dropId] || 120;
      return `
        <article class="drop-vault-card">
          <div>
            <div class="drop-vault-card__media">
              <img src="${d.image}" alt="${d.title}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/product-minato.jpg';" />
            </div>
            <div class="drop-vault-card__body">
              <div class="drop-vault-card__meta">${d.edition} · ₹${d.priceInr.toLocaleString('en-IN')} INR</div>
              <h3 class="drop-vault-card__title">${d.title}</h3>
              <p class="drop-vault-card__desc">${d.desc}</p>
              <div style="margin-top:0.35rem;">
                <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:#d4d4d8;font-variant-numeric:tabular-nums;">
                  <span>${count} collectors on waitlist</span>
                  <span>${d.demandPct}% Allocated</span>
                </div>
                <div class="drop-vault-demand-bar">
                  <div class="drop-vault-demand-fill" style="width:${d.demandPct}%;"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="drop-vault-card__footer">
            <button type="button"
              class="drop-vault-waitlist-btn ${isReserved ? 'is-reserved' : ''}"
              data-open-waitlist="${d.dropId}">
              ${isReserved ? `✓ Priority Pass Reserved (${reserved[d.dropId]})` : 'Join Priority Drop Waitlist →'}
            </button>
          </div>
        </article>
      `;
    }).join('');

    grid.querySelectorAll('[data-open-waitlist]').forEach(btn => {
      btn.addEventListener('click', () => {
        const dropId = btn.getAttribute('data-open-waitlist');
        const drop = UPCOMING_DROPS.find(item => item.dropId === dropId) || UPCOMING_DROPS[0];
        window.openDropWaitlistModal(drop);
      });
    });
  }

  fetch('/api/drop-waitlist')
    .then(r => r.json())
    .then(data => {
      if (data && data.counts) {
        waitlistCounts = { ...waitlistCounts, ...data.counts };
        renderDropVaultGrid();
      }
    })
    .catch(() => {});

  window.openDropWaitlistModal = function(drop) {
    const modal = document.getElementById('suiteDropWaitlistModal');
    const idInput = document.getElementById('waitlistDropIdInput');
    const titleEl = document.getElementById('waitlistDropSelectedTitle');
    const confirmBox = document.getElementById('waitlistConfirmationBox');
    if (idInput && drop) idInput.value = drop.dropId;
    if (titleEl && drop) titleEl.textContent = `${drop.title} · ₹${drop.priceInr.toLocaleString('en-IN')} INR`;
    if (confirmBox) confirmBox.style.display = 'none';
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeDropWaitlistModal = function() {
    const modal = document.getElementById('suiteDropWaitlistModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  const waitlistForm = document.getElementById('dropWaitlistForm');
  if (waitlistForm) {
    waitlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dropId = document.getElementById('waitlistDropIdInput')?.value || 'DROP-01';
      const drop = UPCOMING_DROPS.find(d => d.dropId === dropId) || UPCOMING_DROPS[0];
      const email = document.getElementById('waitlistEmailInput')?.value || '';
      const phone = document.getElementById('waitlistPhoneInput')?.value || '';
      const preferredSize = document.getElementById('waitlistSizeSelect')?.value || 'L';
      const submitBtn = document.getElementById('waitlistSubmitBtn');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Reserving Priority Pass...';
      }

      let passCode = 'VAULT-' + Math.floor(100000 + Math.random() * 900000);
      try {
        const res = await fetch('/api/drop-waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dropId,
            dropTitle: drop.title,
            email,
            phone,
            preferredSize
          })
        });
        const data = await res.json();
        if (data && data.reservationCode) passCode = data.reservationCode;
      } catch (_) {}

      const reserved = getReservedDrops();
      reserved[dropId] = passCode;
      try {
        localStorage.setItem(WAITLIST_STORAGE_KEY, JSON.stringify(reserved));
      } catch (_) {}

      waitlistCounts[dropId] = (waitlistCounts[dropId] || 120) + 1;
      renderDropVaultGrid();
      awardVipPoints('waitlist_' + dropId, `Joined Drop Vault Waitlist (${drop.title})`, 60);

      const confirmBox = document.getElementById('waitlistConfirmationBox');
      if (confirmBox) {
        confirmBox.style.display = 'block';
        confirmBox.innerHTML = `
          <strong style="display:block;color:#0e0e11;font-size:0.88rem;">✓ Priority Pass Reserved: ${passCode}</strong>
          <p style="margin:0.3rem 0 0;font-size:0.78rem;color:#52525b;">We have registered <strong>${email}</strong> for Size <strong>${preferredSize}</strong>. Early-access link dispatches 30 minutes prior to drop.</p>
        `;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lock In Priority Waitlist Pass';
      }
    });
  }

  // Live Countdown Timer (Target: 2 days 14 hours 38 mins from initial load)
  const dropTargetTimestamp = Date.now() + ((2 * 86400) + (14 * 3600) + (38 * 60) + 45) * 1000;
  function updateDropCountdown() {
    const diff = Math.max(0, Math.floor((dropTargetTimestamp - Date.now()) / 1000));
    const days = String(Math.floor(diff / 86400)).padStart(2, '0');
    const hours = String(Math.floor((diff % 86400) / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const secs = String(diff % 60).padStart(2, '0');

    const dEl = document.getElementById('dropTimerDays');
    const hEl = document.getElementById('dropTimerHours');
    const mEl = document.getElementById('dropTimerMins');
    const sEl = document.getElementById('dropTimerSecs');
    if (dEl) dEl.textContent = days;
    if (hEl) hEl.textContent = hours;
    if (mEl) mEl.textContent = mins;
    if (sEl) sEl.textContent = secs;
  }
  setInterval(updateDropCountdown, 1000);
  updateDropCountdown();

  // ── 4. THE STREET CASH — VIP LOYALTY & REWARDS SYSTEM ──
  // Rules:
  // - Math: 0.199 points per 1 Rs spent (Math.floor(total * 0.199))
  // - Strict Display Rule: NEVER say 0.199 pts. MUST display: "Per 1,000 Rs spent will give you 199 The Street Cash"
  // - Minimum points to redeem: 499 The Street Cash = ₹499 OFF Coupon (strictly one-time use)
  // - Saved in MongoDB in 'coupons' collection
  // - AI Stylist integration to pair outfits with the redeemed voucher

  const STREET_CASH_STORAGE_KEY = 'the_street_co_street_cash_cache';

  let streetCashState = {
    phone: '',
    streetCashBalance: 0,
    streetCashEarnedTotal: 0,
    streetCashSpentTotal: 0,
    streetCashHistory: [],
    streetCashCoupons: [],
    tier: { name: 'VIP Street Insider', level: 1, badge: 'INITIATE', perk: 'Earn 199 The Street Cash per ₹1,000 spent' },
    canRedeem: false,
    minRedemptionPoints: 499,
    minRedemptionInr: 499,
    displayRateNotice: 'Per 1,000 Rs spent will give you 199 The Street Cash',
    isLoading: false
  };

  try {
    const cachedSc = JSON.parse(localStorage.getItem(STREET_CASH_STORAGE_KEY) || 'null');
    if (cachedSc && typeof cachedSc.streetCashBalance === 'number') {
      streetCashState = { ...streetCashState, ...cachedSc };
    }
  } catch (_) {}

  function saveStreetCashCache() {
    try {
      localStorage.setItem(STREET_CASH_STORAGE_KEY, JSON.stringify(streetCashState));
    } catch (_) {}
  }

  function getActiveUserPhone() {
    let p = '';
    if (typeof accountState !== 'undefined' && accountState && accountState.phone) {
      p = accountState.phone;
    }
    if (!p) {
      try {
        p = localStorage.getItem('the_street_co_user_phone') || '';
      } catch (_) {}
    }
    return String(p || '').replace(/\D/g, '').slice(-10);
  }

  window.notifyStreetCashReceived = function(points, reason, newBalance) {
    const ptsNum = Number(points) || 0;
    if (ptsNum <= 0) return;
    const balanceTxt = newBalance !== undefined ? ` · Vault Balance: ${newBalance} The Street Cash` : '';
    if (window.streetCoShowToast) {
      window.streetCoShowToast(
        '🎁 The Street Cash Credited!',
        `+${ptsNum} The Street Cash credited to your vault for ${reason || 'VIP Rewards'}!${balanceTxt} SMS confirmation dispatched.`
      );
    }
  };

  async function syncStreetCashFromBackend(phoneToFetch = '') {
    const phone = phoneToFetch || getActiveUserPhone();
    try {
      const url = phone ? `/api/loyalty/status?phone=${phone}` : `/api/loyalty/status`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success) {
        streetCashState = {
          ...streetCashState,
          phone: data.phone || phone,
          streetCashBalance: Number(data.streetCashBalance) || 0,
          streetCashEarnedTotal: Number(data.streetCashEarnedTotal) || 0,
          streetCashSpentTotal: Number(data.streetCashSpentTotal) || 0,
          streetCashHistory: Array.isArray(data.streetCashHistory) ? data.streetCashHistory : [],
          streetCashCoupons: Array.isArray(data.streetCashCoupons) ? data.streetCashCoupons : [],
          streetCashBonuses: data.streetCashBonuses || {},
          tier: data.tier || streetCashState.tier,
          canRedeem: Boolean(data.canRedeem),
          minRedemptionPoints: data.minRedemptionPoints || 499,
          displayRateNotice: data.displayRateNotice || 'Per 1,000 Rs spent will give you 199 The Street Cash'
        };
        saveStreetCashCache();
        renderStreetCashUI();

        // If any bonuses were newly awarded during backend sync, alert user with toast notification
        if (Array.isArray(data.newlyAwardedBonuses) && data.newlyAwardedBonuses.length > 0) {
          data.newlyAwardedBonuses.forEach(b => {
            window.notifyStreetCashReceived(b.points, b.reason || b.label, data.streetCashBalance);
          });
        }
      }
    } catch (err) {
      console.warn('[The Street Cash sync notice]:', err.message);
    }
  }

  function updateMissionUI(key, isDone) {
    const item = document.getElementById(`missionItem_${key}`);
    const check = document.getElementById(`scCheck_${key}`);
    const goBtn = document.getElementById(`scGo_${key}`);
    if (!item) return;

    if (isDone) {
      if (check) {
        check.style.background = '#0E0E11';
        check.style.borderColor = '#0E0E11';
        check.style.color = '#F3E5AB';
        check.textContent = '✓';
      }
      if (goBtn) {
        goBtn.style.background = 'rgba(14,14,17,0.06)';
        goBtn.style.borderColor = 'rgba(14,14,17,0.18)';
        goBtn.style.color = '#0E0E11';
        goBtn.style.cursor = 'default';
        goBtn.innerHTML = `<span>Claimed ✓</span>`;
        goBtn.onclick = null;
      }
      item.style.borderColor = '#E2DBD0';
      item.style.background = '#FAF9F6';
    } else {
      if (check) {
        check.style.background = '#FFFFFF';
        check.style.borderColor = '#D6CEBE';
        check.style.color = 'transparent';
        check.textContent = '✓';
      }
      if (goBtn) {
        goBtn.style.background = key === 'first_order' ? 'linear-gradient(135deg, #F3E5AB, #D4AF37)' : '#0E0E11';
        goBtn.style.borderColor = key === 'first_order' ? '#D4AF37' : '#0E0E11';
        goBtn.style.color = key === 'first_order' ? '#0B0A09' : '#FFFFFF';
        goBtn.style.cursor = 'pointer';
        goBtn.innerHTML = `Go →`;
        goBtn.onclick = function() {
          if (window.handleMissionGo) window.handleMissionGo(key);
        };
      }
      item.style.borderColor = '#EBE4D8';
      item.style.background = '#FAF8F5';
    }
  }

  window.handleMissionGo = function(key) {
    const activePhone = getActiveUserPhone();
    if (key === 'account_creation') {
      if (activePhone && activePhone.length === 10) {
        if (window.streetCoShowToast) window.streetCoShowToast('Account Verified', 'You are already logged in! 75 The Street Cash has been credited.');
      } else {
        window.closeVipLoyaltyModal();
        if (typeof window.openCheckoutAuthGate === 'function') {
          window.openCheckoutAuthGate();
        } else if (typeof window.openAccountPage === 'function') {
          window.openAccountPage();
        }
      }
    } else if (key === 'profile_name') {
      window.closeVipLoyaltyModal();
      if (typeof window.openAccountPage === 'function') {
        window.openAccountPage();
        setTimeout(() => {
          const nameInput = document.getElementById('accFirstName') || document.getElementById('accountFirstName');
          if (nameInput) {
            nameInput.focus();
            nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    } else if (key === 'profile_email') {
      window.closeVipLoyaltyModal();
      if (typeof window.openAccountPage === 'function') {
        window.openAccountPage();
        setTimeout(() => {
          const emailInput = document.getElementById('accEmail') || document.getElementById('accountEmail');
          if (emailInput) {
            emailInput.focus();
            emailInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
    } else if (key === 'first_order') {
      window.closeVipLoyaltyModal();
      const shopTarget = document.getElementById('catalog') || document.querySelector('.elanora-hero') || document.body;
      if (shopTarget) shopTarget.scrollIntoView({ behavior: 'smooth' });
      if (window.streetCoShowToast) {
        window.streetCoShowToast('Explore Collection', 'Place your 1st order to earn +49 bonus points plus standard Street Cash!');
      }
    }
  };

  function renderStreetCashUI() {
    const balance = Math.max(0, Number(streetCashState.streetCashBalance) || 0);
    const balanceStr = balance.toLocaleString('en-IN');
    const inrValueStr = balance.toLocaleString('en-IN');

    // 1. Digital card balance & Inr value
    const balanceEl = document.getElementById('vipModalPointsBalance');
    if (balanceEl) balanceEl.textContent = balanceStr;

    const inrEl = document.getElementById('streetCashInrValueDisplay');
    if (inrEl) inrEl.textContent = inrValueStr;

    // Topbar Street Cash Button sync (Mobile & Desktop)
    const headerScBtn = document.getElementById('headerStreetCashBtn');
    const headerScBadge = document.getElementById('headerStreetCashBadge');
    if (headerScBtn) {
      headerScBtn.title = balance > 0 
        ? `The Street Cash: ${balanceStr} pts (Click to view & redeem)` 
        : `The Street Cash VIP Pass (Earn 199 pts per ₹1,000 spent)`;
      if (headerScBadge) {
        if (balance >= 499) {
          headerScBadge.textContent = '₹499';
          headerScBadge.style.background = 'linear-gradient(135deg, #15803D, #16A34A)';
        } else {
          headerScBadge.textContent = 'VIP';
          headerScBadge.style.background = 'linear-gradient(135deg, #C5A880, #A88658)';
        }
      }
    }

    // 2. User phone on wallet card
    const phoneEl = document.getElementById('streetCashUserPhoneDisplay');
    const activePhone = streetCashState.phone || getActiveUserPhone();
    if (phoneEl) {
      if (activePhone && activePhone.length === 10) {
        phoneEl.textContent = `+91 ${activePhone.slice(0, 5)} ${activePhone.slice(5)}`;
      } else {
        phoneEl.textContent = 'Guest VIP Pass';
      }
    }

    // 3. Tier badge
    const tierBadge = document.getElementById('streetCashTierBadge');
    if (tierBadge) {
      tierBadge.textContent = streetCashState.tier?.name || (balance >= 499 ? 'VIP Street Insider' : 'Initiate Club');
    }

    // 4. Milestone Progress toward 499 The Street Cash (or next multiple)
    const milestoneLabel = document.getElementById('streetCashMilestoneLabel');
    const percentEl = document.getElementById('streetCashProgressPercent');
    const progressBar = document.getElementById('streetCashProgressBar');
    const neededNote = document.getElementById('streetCashNeededNote');

    const nextMultiple = Math.max(499, Math.ceil((balance + 1) / 499) * 499);
    const progressPercent = balance >= 499 ? 100 : Math.min(100, Math.round((balance / 499) * 100));

    if (milestoneLabel) {
      milestoneLabel.textContent = `Next Milestone: ${nextMultiple} The Street Cash (₹${nextMultiple} Flat Discount)`;
    }
    if (percentEl) percentEl.textContent = `${progressPercent}%`;
    if (progressBar) progressBar.style.width = `${progressPercent}%`;

    if (neededNote) {
      if (balance >= 499) {
        neededNote.innerHTML = `<span style="color:#15803D;font-weight:700;">✓ Ready to redeem!</span> <span style="color:#52525B;">You have enough The Street Cash to claim your ₹499 OFF coupon right now.</span>`;
      } else {
        const diff = 499 - balance;
        neededNote.innerHTML = `<span style="color:#52525B;">Need <strong style="color:#0E0E11;font-weight:700;">${diff} more The Street Cash</strong> to unlock your ₹499 OFF voucher.</span><br><span style="color:#71717A;font-size:0.74rem;">Per 1,000 Rs spent will give you 199 The Street Cash.</span>`;
      }
    }

    // 5. Store Rewards "Redeem" Button
    const walletRedeemBtn = document.getElementById('streetCashWalletRedeemBtn');
    if (walletRedeemBtn) {
      walletRedeemBtn.disabled = false;
      walletRedeemBtn.innerHTML = `<span>Redeem (₹499 OFF)</span>`;
    }

    // 6. Active Minted Street Cash Coupon Card (under luxury wallet card)
    const mintedCard = document.getElementById('streetCashMintedCouponCard');
    const mintedCodeDisplay = document.getElementById('streetCashMintedCodeDisplay');
    const coupons = streetCashState.streetCashCoupons || [];
    const activeCoupon = coupons.find(c => !c.isRedeemed && c.status === 'active') ||
      (window.activeStreetCashCouponCode ? { code: window.activeStreetCashCouponCode } : null);

    if (activeCoupon && activeCoupon.code) {
      window.activeStreetCashCouponCode = activeCoupon.code;
      try { localStorage.setItem('the_street_cash_active_coupon', activeCoupon.code); } catch(_) {}
      if (mintedCard && mintedCodeDisplay) {
        mintedCard.style.display = 'block';
        mintedCodeDisplay.textContent = activeCoupon.code;
      }
    } else if (mintedCard && !window.activeStreetCashCouponCode) {
      mintedCard.style.display = 'none';
    }

    // 7. Automatically Update VIP Member Missions & Boosts (Checkboxes & Status)
    const bonuses = streetCashState.streetCashBonuses || {};
    const hasLoggedIn = activePhone && activePhone.length === 10;
    const localUser = (typeof accountState !== 'undefined' && accountState) ? accountState : {};

    // Mission 1: Account Creation (+75 pts)
    const isAccDone = Boolean(bonuses.account_creation || hasLoggedIn);
    updateMissionUI('account_creation', isAccDone);

    // Mission 2: Name Upload (+25 pts)
    const hasName = Boolean(bonuses.profile_name || (localUser.firstName && localUser.firstName.trim()) || (localUser.lastName && localUser.lastName.trim()));
    updateMissionUI('profile_name', hasName);

    // Mission 3: Email Added (+35 pts)
    const hasEmail = Boolean(bonuses.profile_email || (localUser.email && localUser.email.includes('@')));
    updateMissionUI('profile_email', hasEmail);

    // Mission 4: 1st Order (+49 pts)
    const isOrderDone = Boolean(bonuses.first_order);
    updateMissionUI('first_order', isOrderDone);
  }

  // Window actions
  window.openVipLoyaltyModal = function() {
    const modal = document.getElementById('suiteVipLoyaltyModal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
    syncStreetCashFromBackend();
  };

  window.closeVipLoyaltyModal = function() {
    const modal = document.getElementById('suiteVipLoyaltyModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  window.openStreetCashHub = function() {
    window.openVipLoyaltyModal();
  };

  window.handleWalletRedeemStreetCash = async function() {
    const activePhone = getActiveUserPhone();
    if (!activePhone || activePhone.length !== 10) {
      if (typeof window.openCheckoutAuthGate === 'function') {
        window.openCheckoutAuthGate(function() {
          window.handleWalletRedeemStreetCash();
        });
      } else if (typeof window.openAccountPage === 'function') {
        window.closeVipLoyaltyModal();
        window.openAccountPage();
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Account Login Required', 'Please sign in with your mobile number to redeem The Street Cash.');
        }
      }
      return;
    }

    const currentBalance = Math.max(0, Number(streetCashState.streetCashBalance) || 0);
    if (currentBalance < 499) {
      const diff = 499 - currentBalance;
      if (window.streetCoShowToast) {
        window.streetCoShowToast('Insufficient Street Cash', `Need at least 499 The Street Cash to redeem. You need ${diff} more points!`);
      }
      return;
    }

    const btn = document.getElementById('streetCashWalletRedeemBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span>✨ Redeeming...</span>`;
    }

    try {
      const res = await fetch('/api/loyalty/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activePhone, points: 499 })
      });
      const data = await res.json();
      if (!data || !data.success) {
        throw new Error(data?.error || 'Unable to redeem points at this time.');
      }

      const mintedCoupon = data.coupon;
      const couponCode = mintedCoupon?.code;

      streetCashState.streetCashBalance = data.remainingBalance;
      if (mintedCoupon) {
        streetCashState.streetCashCoupons = [mintedCoupon, ...(streetCashState.streetCashCoupons || [])];
      }
      if (couponCode) {
        window.activeStreetCashCouponCode = couponCode;
        try { localStorage.setItem('the_street_cash_active_coupon', couponCode); } catch(_) {}
      }
      saveStreetCashCache();
      renderStreetCashUI();

      // Show notification to the user that Street Cash is redeemed successfully
      if (window.streetCoShowToast) {
        window.streetCoShowToast('Street Cash Redeemed!', 'Your Street Cash is redeemed successfully! ₹499 OFF voucher created.');
      }

      // Display coupon in card directly under wallet card
      const couponCard = document.getElementById('streetCashMintedCouponCard');
      const codeDisplay = document.getElementById('streetCashMintedCodeDisplay');
      if (couponCard && codeDisplay && couponCode) {
        couponCard.style.display = 'block';
        codeDisplay.textContent = couponCode;
        couponCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Auto-apply this coupon to cart immediately
      if (couponCode && typeof applyCouponCode === 'function') {
        applyCouponCode(couponCode).catch(() => {});
      }
    } catch (err) {
      if (window.streetCoShowToast) {
        window.streetCoShowToast('Redemption Failed', err.message);
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>✨ Redeem (₹499 OFF)</span>`;
      }
    }
  };

  window.copyActiveStreetCashCoupon = function() {
    const code = window.activeStreetCashCouponCode ||
      (streetCashState.streetCashCoupons?.find(c => !c.isRedeemed && c.status === 'active')?.code) ||
      document.getElementById('streetCashMintedCodeDisplay')?.textContent?.trim() ||
      localStorage.getItem('the_street_cash_active_coupon');

    if (code && !code.includes('XXXX')) {
      navigator.clipboard.writeText(code).then(() => {
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Coupon Copied!', `${code} copied to clipboard! Auto-applied in bag.`);
        }
      }).catch(() => {
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Coupon Code', `${code} saved to your account and applied in bag.`);
        }
      });
    }
  };

  // Backwards compatible aliases
  window.handleRedeemStreetCash = window.handleWalletRedeemStreetCash;
  window.refreshStreetCashWallet = function() {
    syncStreetCashFromBackend().then(() => {
      if (window.streetCoShowToast) window.streetCoShowToast('Street Cash Synced', 'Live balance refreshed from MongoDB.');
    });
  };

  window.handleClaimBonusStreetCash = async function(actionId, label, points) {
    const activePhone = getActiveUserPhone();
    if (!activePhone || activePhone.length !== 10) {
      if (window.streetCoShowToast) {
        window.streetCoShowToast('Sign In Required', 'Please log in to claim community Street Cash bonuses.');
      }
      return;
    }

    try {
      const res = await fetch('/api/loyalty/earn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: activePhone, actionId, label, points })
      });
      const data = await res.json();
      if (data && data.success) {
        streetCashState.streetCashBalance = data.newBalance;
        saveStreetCashCache();
        renderStreetCashUI();
        if (window.streetCoShowToast) {
          window.streetCoShowToast(`+${points} The Street Cash!`, label);
        }
      } else if (data && data.alreadyClaimed) {
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Already Claimed', data.message);
        }
      }
    } catch (err) {
      console.warn('[Claim bonus error]:', err.message);
    }
  };

  window.applyStreetCashToCart = function(couponCode) {
    window.closeVipLoyaltyModal();
    if (typeof window.streetCoOpenCart === 'function') {
      window.streetCoOpenCart('bag');
    }
    if (typeof window.streetCoApplyCoupon === 'function') {
      window.streetCoApplyCoupon(couponCode);
    }
  };

  // Initial sync on startup
  setTimeout(() => {
    syncStreetCashFromBackend();
  }, 1000);

  // ── 5. SELF-SERVICE ORDER LOOKUP & 7-DAY SIZE EXCHANGE PORTAL ──
  window.openOrderExchangeModal = function() {
    const modal = document.getElementById('suiteOrderExchangeModal');
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeOrderExchangeModal = function() {
    const modal = document.getElementById('suiteOrderExchangeModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  async function performOrderLookup(queryStr) {
    const resultsArea = document.getElementById('orderLookupResultsArea');
    if (!resultsArea) return;
    const q = (queryStr || '').trim();
    if (!q) return;

    resultsArea.innerHTML = `<div class="suite-result-card">Searching verified orders for <strong>${q}</strong>...</div>`;

    let orders = [];
    try {
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (data && Array.isArray(data.orders)) {
        orders = data.orders;
      }
    } catch (_) {}

    // Also check localStorage orders
    try {
      const localOrders = JSON.parse(localStorage.getItem('the_street_co_orders') || '[]');
      const upperQ = q.toUpperCase().replace(/^#/, '');
      localOrders.forEach(lo => {
        const code = String(lo.orderCode || lo.orderId || '').toUpperCase();
        if (code === upperQ && !orders.some(o => String(o.orderCode || o.orderId).toUpperCase() === code)) {
          orders.push(lo);
        }
      });
    } catch (_) {}

    if (orders.length === 0) {
      resultsArea.innerHTML = `
        <div class="suite-result-card">
          <strong>No matching orders found for "${q}"</strong>
          <p style="font-size:0.8rem;color:#52525b;margin:0.35rem 0 0;">Tip: Click <strong>"Load Sample Order (#784920)"</strong> above to test the live GST Invoice &amp; 7-Day Size Exchange workflow.</p>
        </div>
      `;
      return;
    }

    resultsArea.innerHTML = orders.map(ord => {
      const code = ord.orderCode || ord.orderId || '784920';
      const items = ord.products || ord.items || [];
      const total = ord.grandTotalInr || ord.totalInr || 4048;
      const exchanges = ord.exchanges || [];

      return `
        <div class="suite-result-card" style="margin-bottom:1rem;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;border-bottom:1px solid #e5dfd5;padding-bottom:0.65rem;margin-bottom:0.75rem;">
            <div>
              <strong style="font-size:0.95rem;color:#0e0e11;">Order #${code} · ${ord.status || 'CONFIRMED'}</strong>
              <span style="display:block;font-size:0.75rem;color:#71717a;">Total: ₹${Number(total).toLocaleString('en-IN')} INR · Eligible for 7-Day Size Exchange</span>
            </div>
            <a href="/invoice/${code}" target="_blank" rel="noopener noreferrer" class="lookbook-piece-single-btn" style="text-decoration:none;">GST Tax Invoice ↗</a>
          </div>

          <div style="display:flex;flex-direction:column;gap:0.65rem;">
            ${items.map((it, idx) => `
              <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;background:#ffffff;padding:0.65rem;border-radius:6px;border:1px solid #e4e4e7;">
                <div>
                  <strong style="font-size:0.84rem;color:#0e0e11;display:block;">${it.name || it.title}</strong>
                  <span style="font-size:0.74rem;color:#71717a;">Current Size: ${it.size || 'M'} · ₹${Number(it.priceInr || 1999).toLocaleString('en-IN')}</span>
                </div>
                <button type="button" class="lookbook-piece-single-btn" data-open-exchange-form="${code}_${idx}">
                  Request 7-Day Size Exchange
                </button>
              </div>
              <form class="suite-exchange-inline-form" id="exchangeForm_${code}_${idx}" style="display:none;background:#ffffff;padding:0.9rem;border-radius:8px;border:1px solid #0e0e11;" data-order-code="${code}" data-item-name="${it.name || it.title}" data-current-size="${it.size || 'M'}">
                <div style="font-size:0.78rem;font-weight:700;margin-bottom:0.55rem;">7-Day Doorstep Size Exchange — ${it.name || it.title}</div>
                <div class="suite-form-grid">
                  <div class="suite-field">
                    <label>Replacement Size Needed</label>
                    <select class="suite-select" name="requestedSize">
                      ${['S', 'M', 'L', 'XL', 'XXL'].map(sz => `<option value="${sz}" ${sz === 'L' ? 'selected' : ''}>Exchange for Size ${sz}</option>`).join('')}
                    </select>
                  </div>
                  <div class="suite-field">
                    <label>Reason for Exchange</label>
                    <select class="suite-select" name="reason">
                      <option value="Slightly tight in shoulders/chest">Slightly tight in shoulders/chest</option>
                      <option value="Prefer looser oversized drape">Prefer looser oversized drape</option>
                      <option value="Prefer closer tailored fit">Prefer closer tailored fit</option>
                    </select>
                  </div>
                </div>
                <button type="submit" class="suite-primary-btn">Confirm Free Doorstep Reverse Pickup</button>
              </form>
            `).join('')}
          </div>

          ${exchanges.length > 0 ? `
            <div style="margin-top:0.75rem;padding-top:0.65rem;border-top:1px solid #e5dfd5;font-size:0.76rem;color:#15803d;">
              ${exchanges.map(ex => `<div>✓ Active Exchange <strong>#${ex.exchangeId}</strong>: Size ${ex.currentSize} → Size ${ex.requestedSize} (${ex.scheduledPickupDate})</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    resultsArea.querySelectorAll('[data-open-exchange-form]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-open-exchange-form');
        const form = document.getElementById(`exchangeForm_${key}`);
        if (form) {
          form.style.display = form.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    resultsArea.querySelectorAll('.suite-exchange-inline-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderCode = form.getAttribute('data-order-code');
        const itemName = form.getAttribute('data-item-name');
        const currentSize = form.getAttribute('data-current-size');
        const requestedSize = form.querySelector('[name="requestedSize"]')?.value || 'L';
        const reason = form.querySelector('[name="reason"]')?.value || 'Size adjustment';

        try {
          const res = await fetch('/api/exchanges/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderCode,
              itemName,
              currentSize,
              requestedSize,
              reason
            })
          });
          const data = await res.json();
          if (data && data.success) {
            form.innerHTML = `
              <div style="color:#15803d;font-size:0.82rem;font-weight:600;">
                ✓ Exchange #${data.exchange.exchangeId} Approved! Free Delhivery reverse pickup scheduled for ${data.exchange.scheduledPickupDate} (Size ${currentSize} → Size ${requestedSize}).
              </div>
            `;
            if (typeof window.streetCoShowToast === 'function') {
              window.streetCoShowToast('7-DAY EXCHANGE SCHEDULED', `Exchange #${data.exchange.exchangeId} confirmed`);
            }
          }
        } catch (_) {}
      });
    });
  }

  document.getElementById('orderLookupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('orderLookupQueryInput')?.value || '';
    performOrderLookup(val);
  });

  document.getElementById('orderLookupLoadDemoBtn')?.addEventListener('click', () => {
    const input = document.getElementById('orderLookupQueryInput');
    if (input) input.value = '784920';
    performOrderLookup('784920');
  });

  // Initial renders
  renderLookbook('look-01');
  renderDropVaultGrid();
  renderStreetCashUI();
  function renderVipUI() {
    renderStreetCashUI();
  }
  window.renderVipUI = renderVipUI;
  const initialFit = getSavedFitSize();
  if (initialFit) updateFitBadgesEverywhere(initialFit, 96);
})();



/* ═══════════════════════════════════════════════════════════════════════════
   PHONE LOGIN POPUP/PAGE, UNIFIED 6-DIGIT OTP POPUP/PAGE, LEFT-SIDEBAR ACCOUNT
   & UNIFIED SAVED ADDRESS CARDS (Address-1, Address-2...) + MONGODB ATLAS SYNC
   ═══════════════════════════════════════════════════════════════════════════ */
(function initUserAccountPage() {
  const ACCOUNT_STORAGE_KEY = 'the_street_co_account_v2';

  function normalizeClientAddresses(rawAddresses = [], preferredDefaultId = '') {
    if (!Array.isArray(rawAddresses)) return { addresses: [], defaultAddressId: '' };

    const cleaned = rawAddresses
      .filter(a => a && typeof a === 'object' && (a.address1 || a.houseFlat || a.city || a.pincode))
      .map((a, idx) => {
        const id = String(a.id || `addr_${idx + 1}_${Date.now()}`).trim();
        const name = String(a.name || a.fullName || '').trim();
        const phone = String(a.phone || '').replace(/\D/g, '').slice(-10);
        const email = String(a.email || '').trim();
        const address1 = String(a.address1 || a.houseFlat || '').trim();
        const address2 = String(a.address2 || a.streetRoad || '').trim();
        const landmark = String(a.landmark || '').trim();
        const city = String(a.city || '').trim();
        const state = String(a.state || '').trim();
        const pincode = String(a.pincode || '').replace(/\D/g, '').slice(0, 6);
        const type = String(a.type || a.addressType || 'Home').trim();
        const fullAddress = [
          address1,
          address2,
          landmark ? `(Near ${landmark})` : '',
          city,
          state ? `${state} - ${pincode}` : pincode
        ].filter(Boolean).join(', ');

        return {
          id,
          label: a.type || a.addressType || 'Delivery Address',
          name,
          fullName: name,
          phone,
          email,
          address1,
          houseFlat: address1,
          address2,
          streetRoad: address2,
          landmark,
          city,
          state,
          pincode,
          type,
          addressType: type,
          fullAddress,
          isDefault: Boolean(a.isDefault),
          createdAt: a.createdAt || new Date().toISOString()
        };
      });

    let resolvedDefaultId = String(preferredDefaultId || '').trim();
    if (resolvedDefaultId && !cleaned.some(a => a.id === resolvedDefaultId)) {
      resolvedDefaultId = '';
    }
    if (!resolvedDefaultId) {
      for (let i = cleaned.length - 1; i >= 0; i--) {
        if (cleaned[i].isDefault) {
          resolvedDefaultId = cleaned[i].id;
          break;
        }
      }
    }

    const finalAddresses = cleaned.map((a) => ({
      ...a,
      label: a.type || a.addressType || 'Delivery Address',
      isDefault: Boolean(resolvedDefaultId && a.id === resolvedDefaultId)
    }));

    return {
      addresses: finalAddresses,
      defaultAddressId: resolvedDefaultId
    };
  }

  function loadLocalAccount() {
    try {
      const saved = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        const norm = normalizeClientAddresses(saved.addresses || [], saved.defaultAddressId || '');
        return {
          firstName: saved.firstName || '',
          lastName: saved.lastName || '',
          phone: saved.phone || '',
          phoneVerified: Boolean(saved.phoneVerified),
          email: saved.email || '',
          emailVerified: Boolean(saved.emailVerified),
          addresses: norm.addresses,
          defaultAddressId: norm.defaultAddressId,
          orders: Array.isArray(saved.orders) ? saved.orders : []
        };
      }
    } catch (_) {}

    return {
      firstName: '',
      lastName: '',
      phone: '',
      phoneVerified: false,
      email: '',
      emailVerified: false,
      addresses: [],
      defaultAddressId: '',
      orders: []
    };
  }

  let accountState = loadLocalAccount();
  let selectedCheckoutAddressId = accountState.defaultAddressId || (accountState.addresses[0] && accountState.addresses[0].id) || '';

  // Active OTP state: mode is 'phone' or 'email'
  let activeOtpContext = {
    mode: 'phone', // 'phone' | 'email'
    targetPhone: '',
    targetEmail: '',
    firstName: '',
    lastName: ''
  };

  window.streetCoGetAccountPhone = function() {
    const clean = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    return clean.length === 10 ? clean : '';
  };

  window.streetCoIsUserLoggedIn = function() {
    accountState = loadLocalAccount();
    const clean = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    return clean.length === 10 && Boolean(accountState.phoneVerified);
  };

  // Tracks where the user came from ("cart" or "product") when blocked by the Checkout Auth Gate
  let pendingAuthReturnContext = null;

  function saveLocalAccount(nextState) {
    const merged = { ...accountState, ...nextState };
    const norm = normalizeClientAddresses(merged.addresses || [], merged.defaultAddressId || '');
    accountState = {
      ...merged,
      addresses: norm.addresses,
      defaultAddressId: norm.defaultAddressId
    };

    if (accountState.defaultAddressId && (!selectedCheckoutAddressId || !accountState.addresses.some(a => a.id === selectedCheckoutAddressId))) {
      selectedCheckoutAddressId = accountState.defaultAddressId;
    } else if (!selectedCheckoutAddressId && accountState.addresses.length > 0) {
      selectedCheckoutAddressId = accountState.addresses[0].id;
    }

    try {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accountState));
      if (accountState.email && accountState.emailVerified) {
        localStorage.setItem('the_street_co_user_email', accountState.email);
      }
      // Also sync default address or account profile to checkout address cache
      const defaultAddr = accountState.addresses.find(a => a.isDefault) || accountState.addresses[0];
      if (defaultAddr) {
        localStorage.setItem('the_street_co_last_addr', JSON.stringify(defaultAddr));
      } else {
        const lastAddr = JSON.parse(localStorage.getItem('the_street_co_last_addr') || '{}');
        const fullName = [accountState.firstName, accountState.lastName].filter(Boolean).join(' ').trim();
        if (fullName) lastAddr.fullName = fullName;
        if (accountState.phone) lastAddr.phone = accountState.phone;
        if (accountState.email && accountState.emailVerified) lastAddr.email = accountState.email;
        localStorage.setItem('the_street_co_last_addr', JSON.stringify(lastAddr));
      }
    } catch (_) {}
  }

  async function syncAddressesToMongo(addresses, defaultAddressId) {
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    try {
      const res = await fetch('/api/account/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          addresses,
          defaultAddressId
        })
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.addresses)) {
        saveLocalAccount({
          addresses: data.addresses,
          defaultAddressId: data.defaultAddressId || ''
        });
      }
    } catch (_) {}
  }

  // Add or update an address in the user's account, label as Address-1, Address-2, etc., and set default if checked
  async function addAddressToUserAccount(addrInput, setAsDefault = false) {
    if (!addrInput) return null;
    const cleanPhone = String(addrInput.phone || accountState.phone || '').replace(/\D/g, '').slice(-10);
    const cleanPincode = String(addrInput.pincode || '').replace(/\D/g, '').slice(0, 6);
    const address1 = String(addrInput.address1 || addrInput.houseFlat || '').trim();
    const address2 = String(addrInput.address2 || addrInput.streetRoad || '').trim();
    const city = String(addrInput.city || '').trim();
    const state = String(addrInput.state || '').trim();

    if (!address1 || !city || !state || cleanPincode.length !== 6) return null;

    const currentList = Array.isArray(accountState.addresses) ? [...accountState.addresses] : [];

    // Check if an identical address already exists to avoid duplicate cards when clicking Continue
    const existingIdx = currentList.findIndex(a =>
      a.address1.toLowerCase() === address1.toLowerCase() &&
      a.address2.toLowerCase() === address2.toLowerCase() &&
      a.pincode === cleanPincode &&
      a.city.toLowerCase() === city.toLowerCase()
    );

    let targetId = '';
    if (existingIdx >= 0) {
      targetId = currentList[existingIdx].id;
      currentList[existingIdx] = {
        ...currentList[existingIdx],
        name: String(addrInput.name || addrInput.fullName || currentList[existingIdx].name || '').trim(),
        phone: cleanPhone || currentList[existingIdx].phone,
        email: String(addrInput.email || currentList[existingIdx].email || '').trim(),
        address1,
        address2,
        landmark: String(addrInput.landmark || '').trim(),
        city,
        state,
        pincode: cleanPincode,
        type: addrInput.type || 'Home',
        isDefault: setAsDefault ? true : currentList[existingIdx].isDefault
      };
    } else {
      targetId = `addr_${currentList.length + 1}_${Date.now()}`;
      currentList.push({
        id: targetId,
        name: String(addrInput.name || addrInput.fullName || '').trim(),
        phone: cleanPhone,
        email: String(addrInput.email || '').trim(),
        address1,
        address2,
        landmark: String(addrInput.landmark || '').trim(),
        city,
        state,
        pincode: cleanPincode,
        type: addrInput.type || 'Home',
        isDefault: Boolean(setAsDefault),
        createdAt: new Date().toISOString()
      });
    }

    const nextDefaultId = setAsDefault
      ? targetId
      : (accountState.defaultAddressId || '');

    // If setAsDefault is true, clear isDefault on other addresses before normalizing
    const prepared = currentList.map(a => ({
      ...a,
      isDefault: setAsDefault ? (a.id === targetId) : Boolean(a.id === nextDefaultId)
    }));

    const norm = normalizeClientAddresses(prepared, nextDefaultId);
    selectedCheckoutAddressId = targetId;

    saveLocalAccount({
      addresses: norm.addresses,
      defaultAddressId: norm.defaultAddressId
    });

    renderAccountAddressesUI();
    renderCheckoutAddressesUI();

    await syncAddressesToMongo(norm.addresses, norm.defaultAddressId);
    return norm.addresses.find(a => a.id === targetId) || norm.addresses[norm.addresses.length - 1] || null;
  }

  window.streetCoSaveCheckoutAddressToAccount = function(addr, setAsDefault = true) {
    return addAddressToUserAccount(addr, setAsDefault);
  };

  async function setDefaultUserAddress(addressId) {
    if (!addressId) return;
    const updated = (accountState.addresses || []).map(a => ({
      ...a,
      isDefault: a.id === addressId
    }));
    const norm = normalizeClientAddresses(updated, addressId);
    selectedCheckoutAddressId = addressId;
    saveLocalAccount({
      addresses: norm.addresses,
      defaultAddressId: norm.defaultAddressId
    });
    renderAccountAddressesUI();
    renderCheckoutAddressesUI();
    await syncAddressesToMongo(norm.addresses, norm.defaultAddressId);
    if (window.streetCoShowToast) {
      const matched = norm.addresses.find(a => a.id === addressId);
      window.streetCoShowToast('Default Address Set', matched ? `Delivering by default to ${matched.name || 'this address'}` : 'Delivery address updated.', 'general');
    }
  }

  async function removeUserAddress(addressId) {
    if (!addressId) return;
    const remaining = (accountState.addresses || []).filter(a => a.id !== addressId);
    const nextDefault = accountState.defaultAddressId === addressId
      ? (remaining[0] ? remaining[0].id : '')
      : accountState.defaultAddressId;
    const norm = normalizeClientAddresses(remaining, nextDefault);
    if (selectedCheckoutAddressId === addressId) {
      selectedCheckoutAddressId = norm.defaultAddressId || (norm.addresses[0] && norm.addresses[0].id) || '';
    }
    saveLocalAccount({
      addresses: norm.addresses,
      defaultAddressId: norm.defaultAddressId
    });
    renderAccountAddressesUI();
    renderCheckoutAddressesUI();
    await syncAddressesToMongo(norm.addresses, norm.defaultAddressId);
  }

  let pendingRemoveAddressId = null;

  window.openRemoveAddressModal = function(addressId) {
    if (!addressId) return;
    pendingRemoveAddressId = addressId;
    const modal = document.getElementById('accountRemoveAddressConfirmModal');
    if (!modal) return;

    const chosen = (accountState.addresses || []).find(a => a.id === addressId);
    const nameEl = document.getElementById('removeAddressRecipientName');
    const previewEl = document.getElementById('removeAddressPreviewText');

    if (nameEl) nameEl.textContent = (chosen && (chosen.name || chosen.fullName)) || 'Recipient';
    if (previewEl) previewEl.textContent = (chosen && chosen.fullAddress) || 'Delivery address details';

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('logout-modal-open');
  };

  window.closeRemoveAddressModal = function() {
    pendingRemoveAddressId = null;
    const modal = document.getElementById('accountRemoveAddressConfirmModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('logout-modal-open');
  };

  const accountConfirmRemoveAddressBtn = document.getElementById('accountConfirmRemoveAddressBtn');
  if (accountConfirmRemoveAddressBtn) {
    accountConfirmRemoveAddressBtn.addEventListener('click', async () => {
      const idToRemove = pendingRemoveAddressId;
      if (!idToRemove) {
        window.closeRemoveAddressModal();
        return;
      }
      accountConfirmRemoveAddressBtn.disabled = true;
      try {
        await removeUserAddress(idToRemove);
        window.closeRemoveAddressModal();
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Address Removed', 'Delivery address removed from your account.', 'general');
        }
      } finally {
        accountConfirmRemoveAddressBtn.disabled = false;
      }
    });
  }

  // Populate Checkout Step 1 underlying form inputs from a saved address object
  function applyAddressToCheckoutInputs(addr) {
    if (!addr) return;
    const nameInp = document.getElementById('checkoutName');
    const phoneInp = document.getElementById('checkoutPhone');
    const emailInp = document.getElementById('checkoutEmail');
    const addr1Inp = document.getElementById('checkoutAddress1');
    const addr2Inp = document.getElementById('checkoutAddress2');
    const landmarkInp = document.getElementById('checkoutLandmark');
    const cityInp = document.getElementById('checkoutCity');
    const stateInp = document.getElementById('checkoutState');
    const pinInp = document.getElementById('checkoutPincode');

    if (nameInp) { nameInp.value = addr.name || addr.fullName || ''; nameInp.classList.remove('error'); }
    if (phoneInp) { phoneInp.value = String(addr.phone || '').replace(/\D/g, '').slice(-10); phoneInp.classList.remove('error'); }
    if (emailInp) { emailInp.value = addr.email || ''; }
    if (addr1Inp) { addr1Inp.value = addr.address1 || addr.houseFlat || ''; addr1Inp.classList.remove('error'); }
    if (addr2Inp) { addr2Inp.value = addr.address2 || addr.streetRoad || ''; addr2Inp.classList.remove('error'); }
    if (landmarkInp) { landmarkInp.value = addr.landmark || ''; }
    if (cityInp) { cityInp.value = addr.city || ''; cityInp.classList.remove('error'); }
    if (pinInp) { pinInp.value = addr.pincode || ''; pinInp.classList.remove('error'); }
    if (stateInp && addr.state) {
      stateInp.value = addr.state;
      stateInp.classList.remove('is-placeholder', 'error');
    }
    [
      'checkoutNameError',
      'checkoutPhoneError',
      'checkoutAddress1Error',
      'checkoutAddress2Error',
      'checkoutCityError',
      'checkoutStateError',
      'checkoutPincodeError'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = ''; el.classList.remove('show'); }
    });
  }

  function prefillAddressFormWithAccountDefaults(prefix) {
    const fullName = [accountState.firstName, accountState.lastName].filter(Boolean).join(' ').trim();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    const verifiedEmail = accountState.email || '';

    if (prefix === 'checkout') {
      const nameInp = document.getElementById('checkoutName');
      const phoneInp = document.getElementById('checkoutPhone');
      const emailInp = document.getElementById('checkoutEmail');
      const addr1Inp = document.getElementById('checkoutAddress1');
      const addr2Inp = document.getElementById('checkoutAddress2');
      const landmarkInp = document.getElementById('checkoutLandmark');
      const cityInp = document.getElementById('checkoutCity');
      const stateInp = document.getElementById('checkoutState');
      const pinInp = document.getElementById('checkoutPincode');
      const defaultTick = document.getElementById('checkoutSetDefaultAddress');

      if (nameInp) nameInp.value = fullName;
      if (phoneInp) phoneInp.value = cleanPhone;
      if (emailInp) emailInp.value = verifiedEmail;
      if (addr1Inp) addr1Inp.value = '';
      if (addr2Inp) addr2Inp.value = '';
      if (landmarkInp) landmarkInp.value = '';
      if (cityInp) cityInp.value = '';
      if (stateInp) { stateInp.value = ''; stateInp.classList.add('is-placeholder'); }
      if (pinInp) pinInp.value = '';
      if (defaultTick) defaultTick.checked = true;
    } else if (prefix === 'account') {
      const nameInp = document.getElementById('accountAddrName');
      const phoneInp = document.getElementById('accountAddrPhone');
      const emailInp = document.getElementById('accountAddrEmail');
      const addr1Inp = document.getElementById('accountAddrLine1');
      const addr2Inp = document.getElementById('accountAddrLine2');
      const landmarkInp = document.getElementById('accountAddrLandmark');
      const cityInp = document.getElementById('accountAddrCity');
      const stateInp = document.getElementById('accountAddrState');
      const pinInp = document.getElementById('accountAddrPincode');
      const defaultTick = document.getElementById('accountSetDefaultAddress');

      if (nameInp) nameInp.value = fullName;
      if (phoneInp) phoneInp.value = cleanPhone;
      if (emailInp) emailInp.value = verifiedEmail;
      if (addr1Inp) addr1Inp.value = '';
      if (addr2Inp) addr2Inp.value = '';
      if (landmarkInp) landmarkInp.value = '';
      if (cityInp) cityInp.value = '';
      if (stateInp) { stateInp.value = ''; stateInp.classList.add('is-placeholder'); }
      if (pinInp) pinInp.value = '';
      if (defaultTick) defaultTick.checked = true;
    }
  }

  // Render Saved Address Cards + Add Address Card in Account Page
  function renderAccountAddressesUI() {
    const grid = document.getElementById('accountSavedAddressCardsGrid');
    if (!grid) return;

    const addresses = Array.isArray(accountState.addresses) ? accountState.addresses : [];

    const cardsHtml = addresses.map((addr) => {
      const isDefault = Boolean(addr.isDefault);
      const phoneDisplay = addr.phone ? `+91 ${addr.phone}` : '';

      return `
        <div class="saved-address-card ${isDefault ? 'saved-address-card--selected' : ''}" data-addr-id="${addr.id}">
          <div class="saved-address-card__body">
            <h4 class="saved-address-card__recipient">${addr.name || 'Recipient'}</h4>
            ${phoneDisplay ? `<span class="saved-address-card__phone">${phoneDisplay}</span>` : ''}
            <p class="saved-address-card__text">${addr.fullAddress}</p>
          </div>
          <div class="saved-address-card__actions">
            ${!isDefault
              ? `<button type="button" class="saved-address-card__btn" data-action="set-default" data-addr-id="${addr.id}">Set as Default</button>`
              : ''
            }
            <button type="button" class="saved-address-card__btn saved-address-card__btn--danger" data-action="delete-addr" data-addr-id="${addr.id}">Remove</button>
          </div>
        </div>
      `;
    }).join('');

    const createCardHtml = `
      <button type="button" class="create-address-card" id="accountCreateAddressCardBtn">
        <span class="create-address-card__icon">+</span>
        <span class="create-address-card__title">Add New Delivery Address</span>
        <span class="create-address-card__sub">Click to enter a delivery address and set it as your default address</span>
      </button>
    `;

    grid.innerHTML = cardsHtml + createCardHtml;

    const createBtn = document.getElementById('accountCreateAddressCardBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openAccountAddressEntryForm();
      });
    }

    grid.querySelectorAll('[data-action="set-default"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-addr-id');
        setDefaultUserAddress(id);
      });
    });

    grid.querySelectorAll('[data-action="delete-addr"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-addr-id');
        window.openRemoveAddressModal(id);
      });
    });
  }

  function openAccountAddressEntryForm() {
    const cardsView = document.getElementById('accountAddressCardsView');
    const formWrap = document.getElementById('accountAddressFormWrap');
    const heading = document.getElementById('accountAddressFormHeading');
    if (heading) heading.textContent = 'Create Delivery Address';
    prefillAddressFormWithAccountDefaults('account');
    showFlowFeedback('accountAddressFormFeedback', '');
    if (cardsView) cardsView.style.display = 'none';
    if (formWrap) formWrap.style.display = 'block';
    document.getElementById('accountAddrName')?.focus();
  }

  function closeAccountAddressEntryForm() {
    const cardsView = document.getElementById('accountAddressCardsView');
    const formWrap = document.getElementById('accountAddressFormWrap');
    if (formWrap) formWrap.style.display = 'none';
    if (cardsView) cardsView.style.display = 'block';
    renderAccountAddressesUI();
  }

  // Render Saved Address Cards + Create Address Card in Checkout Step 1
  function renderCheckoutAddressesUI() {
    const grid = document.getElementById('checkoutSavedAddressCardsGrid');
    const cardsView = document.getElementById('checkoutAddressCardsView');
    const formWrap = document.getElementById('checkoutAddressFormWrap');
    if (!grid) return;

    const addresses = Array.isArray(accountState.addresses) ? accountState.addresses : [];

    // Ensure a valid selectedCheckoutAddressId (prefer default address)
    if (addresses.length > 0) {
      const exists = addresses.some(a => a.id === selectedCheckoutAddressId);
      if (!exists) {
        const def = addresses.find(a => a.isDefault) || addresses[0];
        selectedCheckoutAddressId = def.id;
      }
      const activeAddr = addresses.find(a => a.id === selectedCheckoutAddressId) || addresses[0];
      if (activeAddr) {
        applyAddressToCheckoutInputs(activeAddr);
      }
    }

    const cardsHtml = addresses.map((addr) => {
      const isDefault = Boolean(addr.isDefault);
      const isSelected = addr.id === selectedCheckoutAddressId;
      const phoneDisplay = addr.phone ? `+91 ${addr.phone}` : '';

      return `
        <div class="saved-address-card ${isSelected ? 'saved-address-card--selected' : ''}" data-checkout-addr-id="${addr.id}">
          <div class="saved-address-card__body">
            <h4 class="saved-address-card__recipient">${addr.name || 'Recipient'}</h4>
            ${phoneDisplay ? `<span class="saved-address-card__phone">${phoneDisplay}</span>` : ''}
            <p class="saved-address-card__text">${addr.fullAddress}</p>
          </div>
          <div class="saved-address-card__actions">
            <button type="button" class="saved-address-card__btn" data-checkout-action="select-addr" data-addr-id="${addr.id}">
              ${isSelected ? 'Delivering Here ✓' : 'Select Address'}
            </button>
            ${!isDefault
              ? `<button type="button" class="saved-address-card__btn" data-checkout-action="set-default" data-addr-id="${addr.id}">Set as Default</button>`
              : ''
            }
          </div>
        </div>
      `;
    }).join('');

    const createCardHtml = `
      <button type="button" class="create-address-card" id="checkoutCreateAddressCardBtn">
        <span class="create-address-card__icon">+</span>
        <span class="create-address-card__title">Add Delivery Address</span>
        <span class="create-address-card__sub">Click to enter your delivery address</span>
      </button>
    `;

    grid.innerHTML = cardsHtml + createCardHtml;

    // Show the Cards View if saved addresses exist; otherwise show Address Form directly
    if (cardsView && formWrap) {
      if (addresses.length > 0) {
        cardsView.style.display = 'block';
        formWrap.style.display = 'none';
      } else {
        cardsView.style.display = 'none';
        formWrap.style.display = 'block';
      }
    }

    const createBtn = document.getElementById('checkoutCreateAddressCardBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        openCheckoutAddressEntryForm();
      });
    }

    grid.querySelectorAll('[data-checkout-addr-id]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-checkout-action="set-default"]')) return;
        const id = card.getAttribute('data-checkout-addr-id');
        selectedCheckoutAddressId = id;
        const chosen = addresses.find(a => a.id === id);
        if (chosen) {
          applyAddressToCheckoutInputs(chosen);
        }
        renderCheckoutAddressesUI();
        if (window.streetCoShowToast && chosen) {
          window.streetCoShowToast('Address Selected', `Delivering to ${chosen.name || 'selected address'}.`, 'general');
        }
      });
    });

    grid.querySelectorAll('[data-checkout-action="set-default"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-addr-id');
        setDefaultUserAddress(id);
      });
    });
  }

  window.streetCoRefreshCheckoutAddresses = function() {
    accountState = loadLocalAccount();
    const def = accountState.addresses.find(a => a.isDefault) || accountState.addresses[0];
    if (def) {
      selectedCheckoutAddressId = def.id;
      applyAddressToCheckoutInputs(def);
    }
    renderCheckoutAddressesUI();
  };

  function openCheckoutAddressEntryForm() {
    const cardsView = document.getElementById('checkoutAddressCardsView');
    const formWrap = document.getElementById('checkoutAddressFormWrap');
    prefillAddressFormWithAccountDefaults('checkout');
    showFlowFeedback('checkoutAddressFormFeedback', '');
    if (cardsView) cardsView.style.display = 'none';
    if (formWrap) formWrap.style.display = 'block';
    document.getElementById('checkoutName')?.focus();
  }

  function closeCheckoutAddressEntryForm() {
    const cardsView = document.getElementById('checkoutAddressCardsView');
    const formWrap = document.getElementById('checkoutAddressFormWrap');
    if (formWrap) formWrap.style.display = 'none';
    if (cardsView) cardsView.style.display = 'block';
    renderCheckoutAddressesUI();
  }

  // Wire Checkout Step 1 Cards View & Address Form Buttons
  const checkoutCancelAddressFormBtn = document.getElementById('checkoutCancelAddressFormBtn');
  if (checkoutCancelAddressFormBtn) {
    checkoutCancelAddressFormBtn.addEventListener('click', () => {
      closeCheckoutAddressEntryForm();
    });
  }

  const checkoutCardsContinueBtn = document.getElementById('checkoutCardsContinueBtn');
  if (checkoutCardsContinueBtn) {
    checkoutCardsContinueBtn.addEventListener('click', () => {
      const addresses = Array.isArray(accountState.addresses) ? accountState.addresses : [];
      if (addresses.length === 0) {
        if (typeof window.streetCoProceedToPaymentStep === 'function') {
          window.streetCoProceedToPaymentStep();
        } else {
          handleAddressStepSubmit();
        }
        return;
      }
      const chosen = addresses.find(a => a.id === selectedCheckoutAddressId) || addresses.find(a => a.isDefault) || addresses[0];
      if (chosen) {
        applyAddressToCheckoutInputs(chosen);
      }
      if (typeof window.streetCoProceedToPaymentStep === 'function') {
        window.streetCoProceedToPaymentStep();
      } else {
        handleAddressStepSubmit();
      }
    });
  }

  const checkoutAddAddressBtn = document.getElementById('checkoutAddAddressBtn');
  if (checkoutAddAddressBtn) {
    checkoutAddAddressBtn.addEventListener('click', async () => {
      const nameVal = document.getElementById('checkoutName')?.value.trim() || '';
      const phoneVal = document.getElementById('checkoutPhone')?.value.replace(/\D/g, '').slice(-10) || '';
      const emailVal = document.getElementById('checkoutEmail')?.value.trim() || '';
      const addr1Val = document.getElementById('checkoutAddress1')?.value.trim() || '';
      const addr2Val = document.getElementById('checkoutAddress2')?.value.trim() || '';
      const landmarkVal = document.getElementById('checkoutLandmark')?.value.trim() || '';
      const cityVal = document.getElementById('checkoutCity')?.value.trim() || '';
      const stateVal = document.getElementById('checkoutState')?.value.trim() || '';
      const pinVal = document.getElementById('checkoutPincode')?.value.replace(/\D/g, '').slice(0, 6) || '';
      const setDefaultChecked = Boolean(document.getElementById('checkoutSetDefaultAddress')?.checked);

      if (!nameVal) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please enter recipient Full Name.', true);
        document.getElementById('checkoutName')?.focus();
        return;
      }
      if (phoneVal.length !== 10) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please enter a valid 10-digit Mobile Number.', true);
        document.getElementById('checkoutPhone')?.focus();
        return;
      }
      if (!addr1Val) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please enter House Address / Flat No. / Building.', true);
        document.getElementById('checkoutAddress1')?.focus();
        return;
      }
      if (!addr2Val) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please enter Street / Road / Area.', true);
        document.getElementById('checkoutAddress2')?.focus();
        return;
      }
      if (!cityVal) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please enter Town / City.', true);
        document.getElementById('checkoutCity')?.focus();
        return;
      }
      if (!stateVal) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please select your State.', true);
        document.getElementById('checkoutState')?.focus();
        return;
      }
      if (pinVal.length !== 6) {
        showFlowFeedback('checkoutAddressFormFeedback', 'Please enter a valid 6-digit PIN / ZIP Code.', true);
        document.getElementById('checkoutPincode')?.focus();
        return;
      }

      checkoutAddAddressBtn.disabled = true;
      const savedAddr = await addAddressToUserAccount({
        name: nameVal,
        phone: phoneVal,
        email: emailVal,
        address1: addr1Val,
        address2: addr2Val,
        landmark: landmarkVal,
        city: cityVal,
        state: stateVal,
        pincode: pinVal,
        type: 'Home'
      }, setDefaultChecked);
      checkoutAddAddressBtn.disabled = false;

      if (savedAddr) {
        applyAddressToCheckoutInputs(savedAddr);
        closeCheckoutAddressEntryForm();
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Address Saved', `${savedAddr.name || 'Delivery address'} added to your account${savedAddr.isDefault ? ' as Default' : ''}.`, 'general');
        }
      }
    });
  }

  // Wire Account Page Left-Sidebar Navigation (01 Personal Information, 02 Delivery Address, 03 Log Out)
  function updateLogoutPageSummary() {
    accountState = loadLocalAccount();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    const fullName = [accountState.firstName, accountState.lastName].filter(Boolean).join(' ').trim();

    const nameEl = document.getElementById('accountLogoutUserNameDisplay');
    const phoneEl = document.getElementById('accountLogoutUserPhoneDisplay');
    const emailEl = document.getElementById('accountLogoutUserEmailDisplay');
    const popupPhoneEl = document.getElementById('logoutConfirmModalUserPhone');
    const popupNameEl = document.getElementById('logoutConfirmModalUserName');

    const formattedPhone = cleanPhone.length === 10
      ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
      : 'Active Member';

    if (nameEl) nameEl.textContent = fullName || 'The Street Co Member';
    if (phoneEl) phoneEl.textContent = formattedPhone;
    if (emailEl) {
      if (accountState.email && accountState.emailVerified) {
        emailEl.textContent = `${accountState.email} · Verified & Synced with MongoDB`;
      } else if (accountState.email) {
        emailEl.textContent = `${accountState.email} · Synced with MongoDB`;
      } else {
        emailEl.textContent = 'Account profile synced with MongoDB Atlas Cloud';
      }
    }

    if (popupPhoneEl) popupPhoneEl.textContent = formattedPhone;
    if (popupNameEl) popupNameEl.textContent = fullName || 'Active Member';
  }

  window.openLogoutConfirmPopup = function() {
    updateLogoutPageSummary();
    const modal = document.getElementById('accountLogoutConfirmModal');
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('logout-modal-open');
  };

  window.closeLogoutConfirmPopup = function() {
    const modal = document.getElementById('accountLogoutConfirmModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('logout-modal-open');
  };

  window.streetCoPerformLogout = async function() {
    window.closeLogoutConfirmPopup();
    window.closeAccountPage();

    if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.signOutUserAuth === 'function') {
      try {
        await window.streetCoFirebaseAuth.signOutUserAuth();
      } catch (_) {}
    }

    // Reset account state in memory and localStorage
    saveLocalAccount({
      phone: '',
      phoneVerified: false,
      firstName: '',
      lastName: '',
      email: '',
      emailVerified: false,
      addresses: [],
      defaultAddressId: '',
      orders: []
    });

    try {
      localStorage.removeItem('the_street_co_user_phone');
      localStorage.removeItem('the_street_co_user_email');
      localStorage.removeItem('the_street_co_last_addr');
    } catch (_) {}

    // Reset all form inputs
    const firstNameInput = document.getElementById('accountFirstName');
    const lastNameInput = document.getElementById('accountLastName');
    const loggedPhoneInput = document.getElementById('accountLoggedPhoneInput');
    const emailInput = document.getElementById('accountEmailInput');
    if (firstNameInput) firstNameInput.value = '';
    if (lastNameInput) lastNameInput.value = '';
    if (loggedPhoneInput) loggedPhoneInput.value = '';
    if (emailInput) {
      emailInput.value = '';
      delete emailInput.dataset.userEditing;
    }

    // Reset tab to personal for subsequent logins
    switchAccountTab('personal');

    if (window.streetCoShowToast) {
      window.streetCoShowToast('Logged out successfully.');
    }
  };

  // ── ORDER HISTORY (MONGODB ATLAS SYNCED) ──
  async function refreshAccountOrdersFromMongo(showToastFeedback = false) {
    accountState = loadLocalAccount();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return;

    const refreshBtn = document.getElementById('accountOrdersRefreshBtn');
    if (refreshBtn) refreshBtn.classList.add('is-refreshing');

    try {
      const res = await fetch(`/api/account/orders?phone=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.orders)) {
        saveLocalAccount({
          orders: data.orders
        });
        renderAccountOrdersUI();
        if (showToastFeedback && window.streetCoShowToast) {
          window.streetCoShowToast(`Synced ${data.orders.length} order${data.orders.length === 1 ? '' : 's'} from MongoDB Atlas.`);
        }
      }
    } catch (err) {
      console.warn('[MongoDB orders fetch error]:', err);
    } finally {
      if (refreshBtn) refreshBtn.classList.remove('is-refreshing');
    }
  }

  function renderAccountOrdersUI() {
    const container = document.getElementById('accountOrdersContainer');
    if (!container) return;

    accountState = loadLocalAccount();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);

    // Combine orders from accountState.orders with local browser orders matching this account
    const memoryOrders = Array.isArray(accountState.orders) ? accountState.orders : [];
    const localOrders = typeof getSavedLocalOrders === 'function' ? getSavedLocalOrders() : [];
    const matchedLocal = localOrders.filter(o => {
      if (!o) return false;
      const orderPhone = String(o.accountPhone || o.shippingAddress?.phone || o.user?.phone || o.contactDetails?.phone || '').replace(/\D/g, '').slice(-10);
      return orderPhone === cleanPhone;
    });

    const orderMap = new Map();
    for (const ord of [...memoryOrders, ...matchedLocal]) {
      if (!ord) continue;
      const code = ord.orderCode || ord.orderId;
      if (code && !orderMap.has(code)) {
        orderMap.set(code, ord);
      }
    }

    const allOrders = Array.from(orderMap.values()).sort((a, b) => {
      const dateA = new Date(a.orderDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.orderDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    // Update tab sub-label
    const subLabel = document.getElementById('accountNavOrdersSub');
    if (subLabel) {
      subLabel.textContent = allOrders.length > 0
        ? `${allOrders.length} Order${allOrders.length === 1 ? '' : 's'}`
        : 'View Past Orders & Items';
    }

    if (allOrders.length === 0) {
      const formattedPhone = cleanPhone.length === 10
        ? `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`
        : 'your account';

      container.innerHTML = `
        <div class="account-orders-empty-state">
          <div class="account-orders-empty-icon-wrap">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <span class="account-orders-empty-kicker">ORDER HISTORY · 0 ORDERS FOUND</span>
          <h4 class="account-orders-empty-title">You Haven't Placed Any Orders Yet</h4>
          <p class="account-orders-empty-desc">
            We couldn't find any completed purchases under your logged-in mobile number (<strong>${formattedPhone}</strong>). Once you place an order, all your items, product pictures, delivery status, and tracking details will automatically appear right here.
          </p>

          <div class="account-orders-empty-perks">
            <div class="account-orders-empty-perk">
              <span class="account-orders-empty-perk__icon">📦</span>
              <div class="account-orders-empty-perk__text">
                <strong>Live Courier Tracking</strong>
                <small>Track dispatch &amp; arrival times</small>
              </div>
            </div>
            <div class="account-orders-empty-perk">
              <span class="account-orders-empty-perk__icon">🖼️</span>
              <div class="account-orders-empty-perk__text">
                <strong>Item Previews &amp; Specs</strong>
                <small>High-res pics, size &amp; quantity</small>
              </div>
            </div>
            <div class="account-orders-empty-perk">
              <span class="account-orders-empty-perk__icon">🧾</span>
              <div class="account-orders-empty-perk__text">
                <strong>Cloud Receipts</strong>
                <small>Permanent backup in MongoDB</small>
              </div>
            </div>
          </div>

          <div class="account-orders-empty-actions">
            <button type="button" class="account-orders-shop-now-btn" onclick="if(window.streetCoCreateSampleOrder){window.streetCoCreateSampleOrder();}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
              <span>Preview Sample Order</span>
            </button>
            <button type="button" class="account-orders-shop-now-btn account-orders-shop-now-btn--ghost" onclick="if(window.closeAccountPage){window.closeAccountPage();}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <span>Explore Collections &amp; Shop</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    // ── RENDER SHORT ORDER HISTORY CARDS ──
    const returnRequests = typeof getSavedReturnExchangeRequests === 'function' ? getSavedReturnExchangeRequests() : [];
    const html = allOrders.map((ord) => {
      const orderCode = ord.orderCode || ord.orderId || 'ORD';
      const orderDateStr = ord.orderDateFormatted || (ord.orderDate ? new Date(ord.orderDate).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }) : 'Recently Placed');

      const returnReq = returnRequests.find(r => r.orderCode === orderCode) || ord.returnRequest;
      const isExchange = returnReq && returnReq.type === 'exchange';
      const isReturn = returnReq && returnReq.type === 'return';

      const paymentMethod = String(ord.paymentMethod || ord.payment?.method || 'COD').toUpperCase();
      const payLabel = paymentMethod === 'COD' ? 'Cash on Delivery' : (paymentMethod === 'UPI' ? 'UPI' : (paymentMethod === 'CARD' ? 'Credit / Debit Card' : paymentMethod));

      const shipAddr = ord.shippingAddress || ord.address || ord.user || ord.contactDetails || {};
      const shipName = shipAddr.fullName || shipAddr.name || accountState.firstName || 'Customer';
      const city = shipAddr.city || '';
      const state = shipAddr.state || '';
      const pincode = shipAddr.pincode || '';
      const destSummary = [city, state].filter(Boolean).join(', ') || pincode || 'India';

      const items = Array.isArray(ord.items) && ord.items.length > 0
        ? ord.items
        : (Array.isArray(ord.products) ? ord.products : (Array.isArray(ord.productDetails) ? ord.productDetails : []));

      const subtotal = Number(ord.subtotalInr || items.reduce((sum, it) => sum + (Number(it.totalItemPriceInr) || ((Number(it.priceInr || it.price) || 0) * (it.qty || it.quantity || 1))), 0));
      const discount = Number(ord.discountInr || ord.discount || 0);
      const shippingFee = Number(ord.deliveryFeeInr || ord.delivery?.cost || (ord.delivery?.speed === 'express' ? 149 : 0));
      const grandTotal = Number(ord.grandTotalInr || ord.totalInr || (subtotal + shippingFee - discount));

      // Build compact thumbnail preview strip (max 3 displayed + remaining counter)
      const displayedItems = items.slice(0, 3);
      const remainingItemCount = items.length - displayedItems.length;
      const thumbsHtml = displayedItems.map(it => {
        const sku = it.sku || it.id || '';
        const relic = (typeof collectionsData !== 'undefined' && Array.isArray(collectionsData))
          ? collectionsData.find(c => (c.sku || c.id) === sku)
          : null;

        const itemImg = it.image || it.imageUrl || it.img || (Array.isArray(it.images) ? it.images[0] : '') ||
          (relic && (relic.image || relic.imageUrl || (Array.isArray(relic.images) ? relic.images[0] : ''))) ||
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';

        const itemName = it.name || it.title || (relic && relic.name) || 'Streetwear Item';
        return `<img src="${itemImg}" alt="${itemName}" class="account-order-short-thumb" loading="lazy" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';" />`;
      }).join('');

      const firstItemName = items[0]?.name || items[0]?.title || 'Streetwear Item';
      const itemsSummaryText = items.length === 1
        ? firstItemName
        : (items.length === 2 ? `${firstItemName} + 1 other item` : `${firstItemName} + ${items.length - 1} more items`);

      const isAwaitingZoho = ord.status === 'AWAITING_ZOHO_CONFIRMATION' || ord.zoho_status === 'pending_confirmation';
      const isDelivered = ord.status === 'DELIVERED' || ord.deliveryStatus === 'DELIVERY_DONE';

      let statusBadgeMarkup = '<span class="account-order-short-badge">CONFIRMED</span>';
      if (isExchange) {
        statusBadgeMarkup = '<span class="account-order-short-badge account-order-short-badge--exchange">EXCHANGE REQUESTED</span>';
      } else if (isReturn) {
        statusBadgeMarkup = '<span class="account-order-short-badge account-order-short-badge--return">RETURN REQUESTED</span>';
      } else if (isDelivered) {
        statusBadgeMarkup = '<span class="account-order-short-badge account-order-short-badge--delivered">DELIVERED</span>';
      } else if (isAwaitingZoho) {
        statusBadgeMarkup = '<span class="account-order-short-badge account-order-short-badge--awaiting">AWAITING ZOHO CONFIRMATION</span>';
      }

      return `
        <article class="account-order-card account-order-card--short is-clickable" data-order-code="${orderCode}" onclick="if(window.openFullOrderModal){window.openFullOrderModal('${orderCode}');}" role="button" tabindex="0" title="Click to view full order history popup">
          <!-- Short Order Card Header -->
          <div class="account-order-card__header account-order-short__header">
            <div class="account-order-card__meta">
              <div class="account-order-short__title-row">
                <h4 class="account-order-card__code">Order #${orderCode}</h4>
                ${statusBadgeMarkup}
              </div>
              <span class="account-order-card__date">${orderDateStr}</span>
            </div>
          </div>

          <!-- Short Order Card Body (Thumbnail previews & brief details) -->
          <div class="account-order-short__body">
            <div class="account-order-short__thumbs-wrap">
              ${thumbsHtml}
              ${remainingItemCount > 0 ? `<span class="account-order-short-thumb-more">+${remainingItemCount}</span>` : ''}
            </div>
            <div class="account-order-short__details">
              <div class="account-order-short__items-title">
                <strong>${items.length} ${items.length === 1 ? 'Item' : 'Items'}:</strong>
                <span>${itemsSummaryText}</span>
              </div>
              <div class="account-order-short__destination">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>Deliver to: <strong>${shipName}</strong> (${destSummary})</span>
              </div>
            </div>
          </div>

          <!-- Short Order Card Footer (Payment, Total Price & Return/Exchange) -->
          <div class="account-order-card__footer account-order-short__footer">
            <div class="account-order-short__pay-summary">
              <span class="account-order-short__label">Payment:</span>
              <span class="account-order-short__value">${payLabel}</span>
            </div>
            <div class="account-order-short__footer-right">
              <div class="account-order-short__total-summary">
                <span class="account-order-short__label">Total:</span>
                <strong class="account-order-short__total-val">₹${grandTotal.toLocaleString('en-IN')}</strong>
              </div>
              <button type="button" class="account-order-return-btn ${returnReq ? 'account-order-return-btn--active' : ''}" onclick="event.stopPropagation(); if(window.openReturnExchangeModal){window.openReturnExchangeModal('${orderCode}');}" title="Return or exchange items for Order #${orderCode}">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 4v6h6"></path>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>${returnReq ? 'Track Return / Exchange' : 'Return or Exchange'}</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    container.innerHTML = html;
  }

  // ── FULL ORDER HISTORY MODAL POPUP (OPENED ON SHORT CARD CLICK) ──
  window.openFullOrderModal = function(orderCode) {
    accountState = loadLocalAccount();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    const memoryOrders = Array.isArray(accountState.orders) ? accountState.orders : [];
    const localOrders = typeof getSavedLocalOrders === 'function' ? getSavedLocalOrders() : [];
    const all = [...memoryOrders, ...localOrders];
    const ord = all.find(o => o && (String(o.orderCode) === String(orderCode) || String(o.orderId) === String(orderCode)));
    if (!ord) return;

    const modal = document.getElementById('accountFullOrderModal');
    const titleEl = document.getElementById('fullOrderModalCode');
    const dateEl = document.getElementById('fullOrderModalDate');
    const bodyEl = document.getElementById('fullOrderModalBody');
    if (!modal || !bodyEl) return;

    const code = ord.orderCode || ord.orderId || orderCode;
    const returnReqs = typeof getSavedReturnExchangeRequests === 'function' ? getSavedReturnExchangeRequests() : [];
    const returnReq = returnReqs.find(r => r && (String(r.orderCode) === String(code) || String(r.orderCode) === String(orderCode))) || ord.returnRequest || null;

    const orderDateStr = ord.orderDateFormatted || (ord.orderDate ? new Date(ord.orderDate).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) : 'Recently Placed');

    if (titleEl) titleEl.textContent = `Order #${code}`;
    if (dateEl) dateEl.textContent = orderDateStr;

    const paymentMethod = String(ord.paymentMethod || ord.payment?.method || 'COD').toUpperCase();
    const payLabel = paymentMethod === 'COD' ? 'Cash on Delivery' : (paymentMethod === 'UPI' ? 'UPI' : (paymentMethod === 'CARD' ? 'Credit / Debit Card' : paymentMethod));

    const shipAddr = ord.shippingAddress || ord.address || ord.user || ord.contactDetails || {};
    const shipName = shipAddr.fullName || shipAddr.name || accountState.firstName || 'Customer';
    const shipPhone = String(shipAddr.phone || ord.contactDetails?.phone || accountState.phone || '').replace(/\D/g, '').slice(-10);
    const line1 = shipAddr.houseFlat || shipAddr.address1 || '';
    const line2 = shipAddr.streetRoad || shipAddr.address2 || '';
    const landmark = shipAddr.landmark || '';
    const city = shipAddr.city || '';
    const state = shipAddr.state || '';
    const pincode = shipAddr.pincode || '';
    const fullAddrParts = [line1, line2, landmark ? `(Landmark: ${landmark})` : '', city, state ? `${state} - ${pincode}` : pincode].filter(Boolean);
    const fullDeliveryAddress = shipAddr.fullAddress || fullAddrParts.join(', ') || 'Address on file';

    const items = Array.isArray(ord.items) && ord.items.length > 0
      ? ord.items
      : (Array.isArray(ord.products) ? ord.products : (Array.isArray(ord.productDetails) ? ord.productDetails : []));

    const subtotal = Number(ord.subtotalInr || items.reduce((sum, it) => sum + (Number(it.totalItemPriceInr) || ((Number(it.priceInr || it.price) || 0) * (it.qty || it.quantity || 1))), 0));
    const discount = Number(ord.discountInr || ord.discount || 0);
    const shippingFee = Number(ord.deliveryFeeInr || ord.delivery?.cost || (ord.delivery?.speed === 'express' ? 149 : 0));
    const grandTotal = Number(ord.grandTotalInr || ord.totalInr || (subtotal + shippingFee - discount));

    const itemsHtml = items.map(it => {
      const sku = it.sku || it.id || '';
      const relic = (typeof collectionsData !== 'undefined' && Array.isArray(collectionsData))
        ? collectionsData.find(c => (c.sku || c.id) === sku)
        : null;

      let itemImg = it.image || it.imageUrl || it.img || (Array.isArray(it.images) ? it.images[0] : '') ||
        (relic && (relic.image || relic.imageUrl || (Array.isArray(relic.images) ? relic.images[0] : ''))) ||
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';

      const itemName = it.name || it.title || (relic && relic.name) || 'The Street Co Apparel';
      const itemQty = Math.max(1, parseInt(it.qty || it.quantity, 10) || 1);
      const itemPrice = Number(it.priceInr || it.price || (relic && relic.priceInr) || 0);
      const itemTotal = Number(it.totalItemPriceInr || (itemPrice * itemQty));
      const itemSize = it.size || 'M';
      const itemFinish = it.finish || (relic && relic.finish) || '';

      return `
        <div class="full-order-item-card">
          <div class="full-order-item__pic-wrap">
            <img src="${itemImg}" alt="${itemName}" class="full-order-item__pic" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';" />
          </div>
          <div class="full-order-item__details">
            <h5 class="full-order-item__title">${itemName}</h5>
            <div class="full-order-item__meta-tags">
              <span class="full-order-item__tag">Size: ${itemSize}</span>
              ${itemFinish ? `<span class="full-order-item__tag">${itemFinish}</span>` : ''}
              <span class="full-order-item__tag full-order-item__tag--qty">Quantity: ${itemQty}</span>
            </div>
            <div class="full-order-item__price-calc">
              <span>₹${itemPrice.toLocaleString('en-IN')} × ${itemQty}</span>
              <strong>= ₹${itemTotal.toLocaleString('en-IN')}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const isAwaitingZoho = ord.status === 'AWAITING_ZOHO_CONFIRMATION' || ord.zoho_status === 'pending_confirmation';
    const isDelivered = ord.status === 'DELIVERED' || ord.deliveryStatus === 'DELIVERY_DONE';
    const isConfirmed = ord.status === 'CONFIRMED' || isDelivered;

    bodyEl.innerHTML = `
      <div class="full-order-modal-sections">
        <!-- Live Status Timeline Tracker (Synced with Zoho Inventory & Delhivery) -->
        <div class="full-order-tracker">
          <div class="full-order-tracker__step is-done">
            <span class="full-order-tracker__dot">✓</span>
            <span>Order Placed</span>
          </div>
          <div class="full-order-tracker__step ${isConfirmed ? 'is-done' : (isAwaitingZoho ? 'is-active' : '')}">
            <span class="full-order-tracker__dot">${isConfirmed ? '✓' : (isAwaitingZoho ? '●' : '○')}</span>
            <span>Zoho Confirmed</span>
          </div>
          <div class="full-order-tracker__step ${isDelivered ? 'is-done' : (isConfirmed ? 'is-active' : '')}">
            <span class="full-order-tracker__dot">${isDelivered ? '✓' : (isConfirmed ? '●' : '○')}</span>
            <span>Dispatched</span>
          </div>
          <div class="full-order-tracker__step ${isDelivered ? 'is-done' : ''}">
            <span class="full-order-tracker__dot">${isDelivered ? '✓' : '○'}</span>
            <span>Delivered</span>
          </div>
        </div>

        ${isAwaitingZoho ? `
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.28); border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; font-size: 12.5px; color: #d97706; line-height: 1.5;">
            ⏳ <strong>Awaiting Zoho Confirmation:</strong> Your order has been registered in Zoho Inventory. Your official Zoho Invoice will be generated, and your confirmation SMS and email will be dispatched as soon as confirmed by our merchant team.
          </div>
        ` : ''}

        ${isConfirmed && !isDelivered ? `
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.28); border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #10b981;">✓ CONFIRMED IN ZOHO INVENTORY</div>
              <div style="font-size: 11.5px; color: #71717a; margin-top: 2px;">Official Zoho Invoice: <strong>#${ord.invoice_number || 'INV'}</strong></div>
            </div>
            <a href="/invoice/${code}" target="_blank" rel="noopener noreferrer" class="lookbook-piece-single-btn" style="text-decoration:none; padding: 6px 12px; font-size: 11px;">
              View Official Zoho Invoice ↗
            </a>
          </div>
        ` : ''}

        ${isDelivered ? `
          <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.28); border-radius: 8px; padding: 12px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <div style="font-size: 12px; font-weight: 700; color: #0891b2;">✓ DELIVERED VIA DELHIVERY EXPRESS</div>
              <div style="font-size: 11.5px; color: #71717a; margin-top: 2px;">Delhivery Done email sent · 7-Day Free Size Exchange / Return Eligible</div>
            </div>
            <a href="/invoice/${code}" target="_blank" rel="noopener noreferrer" class="lookbook-piece-single-btn" style="text-decoration:none; padding: 6px 12px; font-size: 11px;">
              View Zoho Invoice ↗
            </a>
          </div>
        ` : ''}

        <!-- 1. Purchased Items with Full Pictures -->
        <div class="full-order-section">
          <h4 class="full-order-section-title">Purchased Items (${items.length})</h4>
          <div class="full-order-items-grid">
            ${itemsHtml || '<p>No item details.</p>'}
          </div>
        </div>

        <!-- 2. Full Delivery Address -->
        <div class="full-order-section">
          <h4 class="full-order-section-title">Full Delivery Address</h4>
          <div class="full-order-address-box">
            <div class="full-order-address-name">
              <strong>${shipName}</strong>
              ${shipPhone ? `<span class="full-order-address-phone">· Mobile: +91 ${shipPhone}</span>` : ''}
            </div>
            <div class="full-order-address-full">${fullDeliveryAddress}</div>
          </div>
        </div>

        <!-- 3. Payment Method & Price Breakdown -->
        <div class="full-order-section">
          <h4 class="full-order-section-title">Payment &amp; Price Breakdown</h4>
          <div class="full-order-pricing-box">
            <div class="full-order-payment-banner">
              <span>Payment Method:</span>
              <strong>${payLabel}</strong>
            </div>
            <div class="full-order-price-lines">
              <div class="full-order-price-line">
                <span>Full Price (Subtotal):</span>
                <span>₹${subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div class="full-order-price-line">
                <span>Discount:</span>
                <span class="${discount > 0 ? 'text-discount' : ''}">${discount > 0 ? `-₹${discount.toLocaleString('en-IN')}` : '₹0'}</span>
              </div>
              <div class="full-order-price-line">
                <span>Shipping Price:</span>
                <span>${shippingFee > 0 ? `₹${shippingFee.toLocaleString('en-IN')}` : 'FREE (₹0)'}</span>
              </div>
              <div class="full-order-price-line full-order-price-line--total">
                <strong>Grand Total:</strong>
                <strong>₹${grandTotal.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Return or Exchange Action Section -->
        <div class="full-order-section">
          <div class="full-order-actions-bar">
            <div class="full-order-actions-info">
              <span class="full-order-actions-kicker">7-DAY RETURN &amp; EXCHANGE POLICY</span>
              <p class="full-order-actions-note">${returnReq ? `Reverse pickup active (${returnReq.id}) · Scheduled within 48h` : 'Free doorstep size exchange or return eligible within 7 days of delivery.'}</p>
            </div>
            <button type="button" class="full-order-return-btn" onclick="if(window.openReturnExchangeModal){window.openReturnExchangeModal('${code}');}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M1 4v6h6"></path>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
              </svg>
              <span>${returnReq ? 'Track Return / Exchange Status' : 'Return or Exchange'}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('order-modal-open');
  };

  // ═══════════ RETURN & EXCHANGE MODAL CONTROLLERS ═══════════
  window.openReturnExchangeModal = function(orderCode) {
    accountState = loadLocalAccount();
    const memoryOrders = Array.isArray(accountState.orders) ? accountState.orders : [];
    const localOrders = typeof getSavedLocalOrders === 'function' ? getSavedLocalOrders() : [];
    const all = [...memoryOrders, ...localOrders];
    const ord = all.find(o => o && (String(o.orderCode) === String(orderCode) || String(o.orderId) === String(orderCode)));
    if (!ord) return;

    const modal = document.getElementById('returnExchangeModal');
    const titleEl = document.getElementById('returnExchangeModalTitle');
    const subtitleEl = document.getElementById('returnExchangeModalSubtitle');
    const bodyEl = document.getElementById('returnExchangeModalBody');
    if (!modal || !bodyEl) return;

    const code = ord.orderCode || ord.orderId || orderCode;
    const returnReqs = getSavedReturnExchangeRequests();
    const existingReq = returnReqs.find(r => r.orderCode === code) || ord.returnRequest;

    if (titleEl) titleEl.textContent = `Return or Exchange — Order #${code}`;

    const shipAddr = ord.shippingAddress || ord.address || ord.user || ord.contactDetails || {};
    const shipName = shipAddr.fullName || shipAddr.name || accountState.firstName || 'Customer';
    const shipPhone = String(shipAddr.phone || ord.contactDetails?.phone || accountState.phone || '').replace(/\D/g, '').slice(-10);
    const line1 = shipAddr.houseFlat || shipAddr.address1 || '';
    const line2 = shipAddr.streetRoad || shipAddr.address2 || '';
    const landmark = shipAddr.landmark || '';
    const city = shipAddr.city || '';
    const state = shipAddr.state || '';
    const pincode = shipAddr.pincode || '';
    const fullAddrParts = [line1, line2, landmark ? `(Landmark: ${landmark})` : '', city, state ? `${state} - ${pincode}` : pincode].filter(Boolean);
    const fullDeliveryAddress = shipAddr.fullAddress || fullAddrParts.join(', ') || 'Your delivery address on file';

    const items = Array.isArray(ord.items) && ord.items.length > 0
      ? ord.items
      : (Array.isArray(ord.products) ? ord.products : (Array.isArray(ord.productDetails) ? ord.productDetails : []));

    if (existingReq) {
      if (subtitleEl) subtitleEl.textContent = `Active Request: ${existingReq.id} · Free Doorstep Courier`;
      const isEx = existingReq.type === 'exchange';
      bodyEl.innerHTML = `
        <div class="return-tracking-card">
          <div class="return-tracking-header">
            <div>
              <span class="return-tracking-badge">${isEx ? 'EXCHANGE IN PROGRESS' : 'RETURN IN PROGRESS'}</span>
              <h4 style="margin: 0.45rem 0 0.15rem; font-size: 1.05rem; font-weight: 700; color: #0E0E11;">
                ${isEx ? `Replacement Size: ${existingReq.requestedSize || 'Selected Size'}` : 'Refund Scheduled'}
              </h4>
              <p style="margin: 0; font-size: 0.8rem; color: #71717A;">
                Reference ID: <strong>${existingReq.id}</strong> · Placed on ${new Date(existingReq.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #8C857B;">REVERSE LOGISTICS</span>
              <div style="font-size: 0.88rem; font-weight: 700; color: #0E0E11;">Delhivery Express</div>
            </div>
          </div>

          <div class="return-tracking-steps">
            <div class="return-tracking-step">
              <span class="return-tracking-step-dot">✓</span>
              <div class="return-tracking-step-body">
                <span class="return-tracking-step-title">Request Approved</span>
                <span class="return-tracking-step-desc">Your ${isEx ? 'size exchange' : 'return'} request has been automatically validated under our 7-day policy.</span>
              </div>
            </div>
            <div class="return-tracking-step">
              <span class="return-tracking-step-dot">✓</span>
              <div class="return-tracking-step-body">
                <span class="return-tracking-step-title">Reverse Courier Assigned</span>
                <span class="return-tracking-step-desc">Tracking AWB #STC-${existingReq.id.replace(/\D/g, '') || '98214'} created.</span>
              </div>
            </div>
            <div class="return-tracking-step">
              <span class="return-tracking-step-dot return-tracking-step-dot--pending">●</span>
              <div class="return-tracking-step-body">
                <span class="return-tracking-step-title">Doorstep Reverse Pickup</span>
                <span class="return-tracking-step-desc">Our courier partner will collect the packed garments within 24–48 hours.</span>
              </div>
            </div>
            <div class="return-tracking-step">
              <span class="return-tracking-step-dot return-tracking-step-dot--pending">○</span>
              <div class="return-tracking-step-body">
                <span class="return-tracking-step-title">${isEx ? 'Replacement Garment Dispatched' : 'Refund Credited'}</span>
                <span class="return-tracking-step-desc">${isEx ? 'Your replacement size will be dispatched immediately once pickup is scanned.' : 'Amount credited to original payment method or UPI within 2 business days.'}</span>
              </div>
            </div>
          </div>

          <div class="return-pickup-box">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <div class="return-pickup-info">
              <span class="return-pickup-title">Pickup Address</span>
              <span class="return-pickup-address">${existingReq.pickupAddress || fullDeliveryAddress}</span>
              <span class="return-pickup-note">Please keep the item in original condition with brand tags attached.</span>
            </div>
          </div>

          <div class="return-modal-actions">
            <button type="button" class="return-btn-cancel" onclick="window.cancelReturnExchangeRequest('${code}');">
              Cancel Request
            </button>
            <button type="button" class="return-btn-submit" onclick="window.closeReturnExchangeModal();">
              Done
            </button>
          </div>
        </div>
      `;
    } else {
      if (subtitleEl) subtitleEl.textContent = 'Choose items to exchange for a different size or return for a refund';

      const itemsListHtml = items.map((it, idx) => {
        const sku = it.sku || it.id || '';
        const relic = (typeof collectionsData !== 'undefined' && Array.isArray(collectionsData))
          ? collectionsData.find(c => (c.sku || c.id) === sku)
          : null;
        let itemImg = it.image || it.imageUrl || it.img || (Array.isArray(it.images) ? it.images[0] : '') ||
          (relic && (relic.image || relic.imageUrl || (Array.isArray(relic.images) ? relic.images[0] : ''))) ||
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';
        const itemName = it.name || it.title || (relic && relic.name) || 'Streetwear Garment';
        const itemSize = it.size || 'M';
        const itemQty = Math.max(1, parseInt(it.qty || it.quantity, 10) || 1);
        const itemPrice = Number(it.priceInr || it.price || (relic && relic.priceInr) || 0);

        return `
          <label class="return-item-row ${idx === 0 ? 'is-selected' : ''}" id="returnItemRow_${idx}">
            <input type="checkbox" class="return-item-checkbox" name="returnItemCheckbox" value="${idx}" data-sku="${sku}" data-name="${itemName}" data-size="${itemSize}" ${idx === 0 ? 'checked' : ''} onchange="document.getElementById('returnItemRow_${idx}').classList.toggle('is-selected', this.checked);" />
            <img src="${itemImg}" alt="${itemName}" class="return-item-thumb" onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200&auto=format&fit=crop&q=80';" />
            <div class="return-item-meta">
              <div class="return-item-name">${itemName}</div>
              <div class="return-item-sub">
                <span>Ordered Size: <strong>${itemSize}</strong></span>
                <span>·</span>
                <span>Qty: ${itemQty}</span>
              </div>
            </div>
            <div class="return-item-price">₹${itemPrice.toLocaleString('en-IN')}</div>
          </label>
        `;
      }).join('');

      bodyEl.innerHTML = `
        <div class="return-tabs-nav" role="tablist">
          <button type="button" class="return-tab-btn is-active" id="returnTabExchangeBtn" onclick="window.setReturnExchangeType('exchange');" role="tab" aria-selected="true">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 4v6h6"></path>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            <span>Exchange Size (Free Replacement)</span>
          </button>
          <button type="button" class="return-tab-btn" id="returnTabReturnBtn" onclick="window.setReturnExchangeType('return');" role="tab" aria-selected="false">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 14 4 9 9 4"></polyline>
              <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
            </svg>
            <span>Return Item (Refund)</span>
          </button>
        </div>

        <!-- 1. Select Items -->
        <div class="return-form-group">
          <label class="return-form-label">1. Select Garments to Return / Exchange</label>
          <div class="return-items-selection">
            ${itemsListHtml}
          </div>
        </div>

        <!-- 2A. Exchange Size Selector -->
        <div class="return-form-group" id="returnSizeGroup">
          <label class="return-form-label">2. Select Replacement Size (Exchange)</label>
          <div class="return-size-selector" id="returnSizeSelector">
            <button type="button" class="return-size-chip" data-size="XS" onclick="window.selectReturnSize('XS');">XS</button>
            <button type="button" class="return-size-chip" data-size="S" onclick="window.selectReturnSize('S');">S</button>
            <button type="button" class="return-size-chip" data-size="M" onclick="window.selectReturnSize('M');">M</button>
            <button type="button" class="return-size-chip is-selected" data-size="L" onclick="window.selectReturnSize('L');">L</button>
            <button type="button" class="return-size-chip" data-size="XL" onclick="window.selectReturnSize('XL');">XL</button>
            <button type="button" class="return-size-chip" data-size="XXL" onclick="window.selectReturnSize('XXL');">XXL</button>
          </div>
          <input type="hidden" id="returnSelectedSize" value="L" />
        </div>

        <!-- 2B. Return Refund Method Preview (No Size Needed for Return) -->
        <div class="return-form-group" id="returnRefundGroup" style="display:none;">
          <label class="return-form-label">2. Return for Full Refund (No Size Needed)</label>
          <div style="background: #FAF9F5; border: 1.5px solid #EAE6DC; border-radius: 8px; padding: 0.85rem 1rem; font-size: 0.85rem; color: #0E0E11;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:700; color:#10B981; margin-bottom:4px;">
              <span>✓ Full Purchase Price Refund</span>
              <span style="font-size:0.75rem; background:rgba(16,185,129,0.12); padding:2px 6px; border-radius:4px; font-weight:700;">NO SIZE NEEDED</span>
            </div>
            <p style="margin: 0; font-size: 0.78rem; color: #71717A; line-height: 1.45;">
              You are returning this garment for a direct refund. No replacement size is required. 100% of your payment will be refunded to your source account or bank UPI upon doorstep pickup verification.
            </p>
          </div>
        </div>

        <!-- 3. Reason for Return or Exchange -->
        <div class="return-form-group">
          <label class="return-form-label" for="returnReasonSelect">3. Reason for Request</label>
          <select class="return-select" id="returnReasonSelect">
            <option value="Fit / Size too small or tight">Fit / Size too small or tight</option>
            <option value="Fit / Size too loose or oversized">Fit / Size too loose or oversized</option>
            <option value="Looking for different drape / color">Looking for different drape / color</option>
            <option value="Fabric or quality not as expected">Fabric or quality not as expected</option>
            <option value="Received damaged or defective piece">Received damaged or defective piece</option>
            <option value="Changed mind / Don't need anymore">Changed mind / Don't need anymore</option>
          </select>
        </div>

        <!-- 4. Optional Additional Notes -->
        <div class="return-form-group">
          <label class="return-form-label" for="returnNotesInput">4. Additional Notes (Optional)</label>
          <textarea class="return-textarea" id="returnNotesInput" rows="2" placeholder="Any specific fit preferences or instructions for our team..."></textarea>
        </div>

        <!-- 5. Pickup Address Confirmation -->
        <div class="return-pickup-box">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <div class="return-pickup-info">
            <span class="return-pickup-title">Doorstep Pickup Address</span>
            <span class="return-pickup-address">${fullDeliveryAddress}</span>
            <span class="return-pickup-note">Free doorstep reverse courier pickup scheduled within 48 hours of confirmation.</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="return-modal-actions">
          <button type="button" class="return-btn-cancel" onclick="window.closeReturnExchangeModal();">
            Cancel
          </button>
          <button type="button" class="return-btn-submit" id="returnSubmitBtn" onclick="window.submitReturnExchangeForm('${code}');">
            <span>Confirm Exchange Request</span>
          </button>
        </div>
      `;
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('order-modal-open');
  };

  window.setReturnExchangeType = function(type) {
    const exchangeBtn = document.getElementById('returnTabExchangeBtn');
    const returnBtn = document.getElementById('returnTabReturnBtn');
    const sizeGroup = document.getElementById('returnSizeGroup');
    const refundGroup = document.getElementById('returnRefundGroup');
    const submitBtn = document.getElementById('returnSubmitBtn');

    if (type === 'exchange') {
      if (exchangeBtn) {
        exchangeBtn.classList.add('is-active');
        exchangeBtn.setAttribute('aria-selected', 'true');
      }
      if (returnBtn) {
        returnBtn.classList.remove('is-active');
        returnBtn.setAttribute('aria-selected', 'false');
      }
      if (sizeGroup) sizeGroup.style.display = 'block';
      if (refundGroup) refundGroup.style.display = 'none';
      if (submitBtn) submitBtn.innerHTML = '<span>Confirm Exchange Request</span>';
    } else {
      if (exchangeBtn) {
        exchangeBtn.classList.remove('is-active');
        exchangeBtn.setAttribute('aria-selected', 'false');
      }
      if (returnBtn) {
        returnBtn.classList.add('is-active');
        returnBtn.setAttribute('aria-selected', 'true');
      }
      // Strictly hide product size for return!
      if (sizeGroup) sizeGroup.style.display = 'none';
      if (refundGroup) refundGroup.style.display = 'block';
      if (submitBtn) submitBtn.innerHTML = '<span>Confirm Return Request (Full Refund)</span>';
    }
  };

  window.selectReturnSize = function(size) {
    const hidden = document.getElementById('returnSelectedSize');
    if (hidden) hidden.value = size;
    const chips = document.querySelectorAll('#returnSizeSelector .return-size-chip');
    chips.forEach(c => {
      c.classList.toggle('is-selected', c.getAttribute('data-size') === size);
    });
  };

  window.submitReturnExchangeForm = async function(orderCode) {
    const isExchange = document.getElementById('returnTabExchangeBtn')?.classList.contains('is-active');
    const type = isExchange ? 'exchange' : 'return';
    const checkboxes = document.querySelectorAll('input[name="returnItemCheckbox"]:checked');
    if (checkboxes.length === 0) {
      if (typeof showToast === 'function') {
        showToast('PLEASE SELECT AN ITEM', 'Select at least one garment to return or exchange.', 'cart');
      }
      return;
    }

    const selectedItems = Array.from(checkboxes).map(cb => ({
      name: cb.getAttribute('data-name') || 'Streetwear Garment',
      sku: cb.getAttribute('data-sku') || '',
      size: cb.getAttribute('data-size') || ''
    }));

    // In return you do NOT need product size (strictly null/omitted)
    const requestedSize = isExchange ? (document.getElementById('returnSelectedSize')?.value || 'L') : null;
    const reason = document.getElementById('returnReasonSelect')?.value || (isExchange ? 'Fit / Size too small or tight' : 'Looking for refund / changed mind');
    const notes = document.getElementById('returnNotesInput')?.value || '';

    accountState = loadLocalAccount();
    const memoryOrders = Array.isArray(accountState.orders) ? accountState.orders : [];
    const localOrders = typeof getSavedLocalOrders === 'function' ? getSavedLocalOrders() : [];
    const all = [...memoryOrders, ...localOrders];
    const ord = all.find(o => o && (String(o.orderCode) === String(orderCode) || String(o.orderId) === String(orderCode)));

    const shipAddr = ord ? (ord.shippingAddress || ord.address || ord.user || ord.contactDetails || {}) : {};
    const customerName = shipAddr.fullName || shipAddr.name || accountState.firstName || 'Customer';
    const customerPhone = String(shipAddr.phone || ord?.contactDetails?.phone || accountState.phone || '').replace(/\D/g, '').slice(-10);
    const customerEmail = shipAddr.email || ord?.contactDetails?.email || accountState.email || '';
    const fullDeliveryAddress = shipAddr.fullAddress || [shipAddr.houseFlat, shipAddr.streetRoad, shipAddr.city, shipAddr.state, shipAddr.pincode].filter(Boolean).join(', ') || 'Your address on file';

    const returnId = 'RET-' + Math.floor(10000 + Math.random() * 90000);
    const req = {
      id: returnId,
      orderCode: orderCode,
      type: type,
      items: selectedItems,
      itemNames: selectedItems.map(i => i.name).join(', '),
      requestedSize: requestedSize, // null for return!
      reason: reason,
      notes: notes,
      pickupAddress: fullDeliveryAddress,
      customerName,
      customerPhone,
      customerEmail,
      status: 'PICKUP_SCHEDULED',
      createdAt: new Date().toISOString()
    };

    const submitBtn = document.getElementById('returnSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Registering in Zoho Inventory...</span>';
    }

    // Save in Zoho Inventory as a Sales Return via backend
    try {
      const apiRes = await fetch('/api/returns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: returnId,
          orderCode: orderCode,
          type: type,
          items: selectedItems,
          itemNames: req.itemNames,
          requestedSize: requestedSize,
          reason: reason,
          notes: notes,
          pickupAddress: fullDeliveryAddress,
          customerName,
          customerPhone,
          customerEmail,
          zoho_salesorder_id: ord?.zoho_salesorder_id || null
        })
      });
      const apiData = await apiRes.json();
      if (apiData && apiData.success && apiData.returnRecord) {
        req.salesreturn_number = apiData.returnRecord.salesreturn_number;
        req.zoho_salesreturn_id = apiData.returnRecord.zoho_salesreturn_id;
        req.reverseAwb = apiData.returnRecord.reverseAwb;
      }
    } catch (apiErr) {
      console.warn('[Zoho Return Save Notice]:', apiErr.message);
    }

    saveReturnExchangeRequest(req);

    if (ord) {
      ord.returnStatus = type === 'exchange' ? 'EXCHANGE REQUESTED' : 'RETURN REQUESTED';
      ord.returnRequest = req;
      saveLocalOrder(ord);
      if (Array.isArray(accountState.orders)) {
        const accOrd = accountState.orders.find(o => String(o.orderCode) === String(orderCode) || String(o.orderId) === String(orderCode));
        if (accOrd) {
          accOrd.returnStatus = ord.returnStatus;
          accOrd.returnRequest = req;
          saveLocalAccount({ orders: accountState.orders });
        }
      }
    }

    if (typeof showToast === 'function') {
      const zohoRefNotice = req.salesreturn_number ? `Zoho Return #${req.salesreturn_number}` : 'Recorded in Zoho Inventory';
      showToast(
        type === 'exchange' ? 'EXCHANGE REQUEST SUBMITTED' : 'RETURN REQUEST SUBMITTED',
        `Order #${orderCode} · ${zohoRefNotice} · Free reverse pickup scheduled within 48h`,
        'cart'
      );
    }

    renderAccountOrdersUI();
    window.openReturnExchangeModal(orderCode);
  };

  window.cancelReturnExchangeRequest = function(orderCode) {
    try {
      const returnReqs = getSavedReturnExchangeRequests();
      const updated = returnReqs.filter(r => r.orderCode !== orderCode);
      localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(updated));

      const localOrders = typeof getSavedLocalOrders === 'function' ? getSavedLocalOrders() : [];
      const ord = localOrders.find(o => String(o.orderCode) === String(orderCode) || String(o.orderId) === String(orderCode));
      if (ord) {
        delete ord.returnStatus;
        delete ord.returnRequest;
        saveLocalOrder(ord);
      }
      accountState = loadLocalAccount();
      if (Array.isArray(accountState.orders)) {
        const accOrd = accountState.orders.find(o => String(o.orderCode) === String(orderCode) || String(o.orderId) === String(orderCode));
        if (accOrd) {
          delete accOrd.returnStatus;
          delete accOrd.returnRequest;
          saveLocalAccount({ orders: accountState.orders });
        }
      }

      if (typeof showToast === 'function') {
        showToast('REQUEST CANCELLED', `Return/Exchange request for Order #${orderCode} has been cancelled.`, 'cart');
      }

      renderAccountOrdersUI();
      window.openReturnExchangeModal(orderCode);
    } catch (e) {
      console.warn('Failed to cancel request', e);
    }
  };

  window.closeReturnExchangeModal = function() {
    const modal = document.getElementById('returnExchangeModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
    const fullOrderModal = document.getElementById('accountFullOrderModal');
    if (!fullOrderModal || !fullOrderModal.classList.contains('open')) {
      document.body.classList.remove('order-modal-open');
    }
  };

  // Helper to create a realistic sample order for instant UI preview
  window.streetCoCreateSampleOrder = function() {
    accountState = loadLocalAccount();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10) || '9876543210';
    const sampleOrder = {
      orderCode: 'SC-' + Math.floor(10000 + Math.random() * 90000),
      orderDate: new Date().toISOString(),
      status: 'CONFIRMED',
      accountPhone: cleanPhone,
      paymentMethod: 'COD',
      items: [
        {
          id: 'sample-1',
          sku: 'STREET-01',
          name: 'The Obsidian Heavyweight Graphic Hoodie',
          size: 'L',
          finish: 'Acid Mineral Wash',
          qty: 1,
          priceInr: 2499,
          totalItemPriceInr: 2499,
          image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500&auto=format&fit=crop&q=80'
        },
        {
          id: 'sample-2',
          sku: 'STREET-02',
          name: 'Tokyo Oversized Distressed Tee',
          size: 'XL',
          finish: 'Vintage Carbon',
          qty: 1,
          priceInr: 1499,
          totalItemPriceInr: 1499,
          image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80'
        }
      ],
      shippingAddress: {
        fullName: accountState.firstName ? `${accountState.firstName} ${accountState.lastName || ''}`.trim() : 'Alex Vance',
        phone: cleanPhone,
        houseFlat: 'Flat 402, Skyline Residency',
        streetRoad: 'Bandra West, Linking Road',
        landmark: 'Near Starbucks Coffee',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        fullAddress: 'Flat 402, Skyline Residency, Bandra West, Linking Road, Near Starbucks Coffee, Mumbai, Maharashtra - 400050'
      },
      subtotalInr: 3998,
      discountInr: 500,
      deliveryFeeInr: 0,
      grandTotalInr: 3498
    };

    saveLocalOrder(sampleOrder);
    accountState.orders = [sampleOrder, ...(accountState.orders || [])];
    saveLocalAccount({ orders: accountState.orders });
    if (typeof showToast === 'function') {
      showToast('SAMPLE ORDER CREATED', 'Previewing short order history card. Click it to view the full popup!', 'info');
    }
    renderAccountOrdersUI();
  };

  window.closeFullOrderModal = function() {
    const modal = document.getElementById('accountFullOrderModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const returnModal = document.getElementById('returnExchangeModal');
    if (!returnModal || !returnModal.classList.contains('open')) {
      document.body.classList.remove('order-modal-open');
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const returnModal = document.getElementById('returnExchangeModal');
      if (returnModal && returnModal.classList.contains('open')) {
        window.closeReturnExchangeModal();
        return;
      }
      const modal = document.getElementById('accountFullOrderModal');
      if (modal && modal.classList.contains('open')) {
        window.closeFullOrderModal();
      }
    }
  });

  function switchAccountTab(pageKey) {
    const personalBtn = document.getElementById('accountNavPersonalBtn');
    const addressBtn = document.getElementById('accountNavAddressBtn');
    const ordersBtn = document.getElementById('accountNavOrdersBtn');
    const logoutBtn = document.getElementById('accountNavLogoutBtn');

    const personalPane = document.getElementById('accountPersonalPage');
    const addressPane = document.getElementById('accountDeliveryAddressPage');
    const ordersPane = document.getElementById('accountOrderHistoryPage');
    const logoutPane = document.getElementById('accountLogoutPage');

    if (personalBtn) personalBtn.classList.toggle('active', pageKey === 'personal');
    if (addressBtn) addressBtn.classList.toggle('active', pageKey === 'address');
    if (ordersBtn) ordersBtn.classList.toggle('active', pageKey === 'orders');
    if (logoutBtn) logoutBtn.classList.toggle('active', pageKey === 'logout');

    if (personalPane) {
      personalPane.style.display = pageKey === 'personal' ? 'block' : 'none';
      personalPane.classList.toggle('active', pageKey === 'personal');
    }
    if (addressPane) {
      addressPane.style.display = pageKey === 'address' ? 'block' : 'none';
      addressPane.classList.toggle('active', pageKey === 'address');
    }
    if (ordersPane) {
      ordersPane.style.display = pageKey === 'orders' ? 'block' : 'none';
      ordersPane.classList.toggle('active', pageKey === 'orders');
    }
    if (logoutPane) {
      logoutPane.style.display = pageKey === 'logout' ? 'block' : 'none';
      logoutPane.classList.toggle('active', pageKey === 'logout');
    }

    if (pageKey === 'address') {
      closeAccountAddressEntryForm();
      renderAccountAddressesUI();
    } else if (pageKey === 'orders') {
      renderAccountOrdersUI();
      refreshAccountOrdersFromMongo();
    } else if (pageKey === 'logout') {
      updateLogoutPageSummary();
    }
  }

  document.getElementById('accountNavPersonalBtn')?.addEventListener('click', () => switchAccountTab('personal'));
  document.getElementById('accountNavAddressBtn')?.addEventListener('click', () => switchAccountTab('address'));
  document.getElementById('accountNavOrdersBtn')?.addEventListener('click', () => switchAccountTab('orders'));
  document.getElementById('accountNavLogoutBtn')?.addEventListener('click', () => switchAccountTab('logout'));


  // Trigger popup when clicking "Log Out" button on the Logout Page
  const accountLogoutPageActionBtn = document.getElementById('accountLogoutPageActionBtn');
  if (accountLogoutPageActionBtn) {
    accountLogoutPageActionBtn.addEventListener('click', () => {
      window.openLogoutConfirmPopup();
    });
  }

  // Continue Logout button inside the confirmation popup box
  const accountContinueLogoutBtn = document.getElementById('accountContinueLogoutBtn');
  if (accountContinueLogoutBtn) {
    accountContinueLogoutBtn.addEventListener('click', async () => {
      accountContinueLogoutBtn.disabled = true;
      try {
        await window.streetCoPerformLogout();
      } finally {
        accountContinueLogoutBtn.disabled = false;
      }
    });
  }

  const accountCancelAddressFormBtn = document.getElementById('accountCancelAddressFormBtn');
  if (accountCancelAddressFormBtn) {
    accountCancelAddressFormBtn.addEventListener('click', () => {
      closeAccountAddressEntryForm();
    });
  }

  const accountAddrPhoneEl = document.getElementById('accountAddrPhone');
  if (accountAddrPhoneEl) {
    accountAddrPhoneEl.addEventListener('input', (e) => {
      e.target.value = String(e.target.value || '').replace(/\D/g, '').slice(0, 10);
    });
  }
  const accountAddrPinEl = document.getElementById('accountAddrPincode');
  if (accountAddrPinEl) {
    accountAddrPinEl.addEventListener('input', (e) => {
      e.target.value = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
    });
  }
  const accountAddrStateEl = document.getElementById('accountAddrState');
  if (accountAddrStateEl) {
    accountAddrStateEl.addEventListener('change', () => {
      accountAddrStateEl.classList.toggle('is-placeholder', !accountAddrStateEl.value);
    });
  }

  const accountNewAddressForm = document.getElementById('accountNewAddressForm');
  if (accountNewAddressForm) {
    accountNewAddressForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = document.getElementById('accountAddrName')?.value.trim() || '';
      const phoneVal = document.getElementById('accountAddrPhone')?.value.replace(/\D/g, '').slice(-10) || '';
      const emailVal = document.getElementById('accountAddrEmail')?.value.trim() || '';
      const addr1Val = document.getElementById('accountAddrLine1')?.value.trim() || '';
      const addr2Val = document.getElementById('accountAddrLine2')?.value.trim() || '';
      const landmarkVal = document.getElementById('accountAddrLandmark')?.value.trim() || '';
      const cityVal = document.getElementById('accountAddrCity')?.value.trim() || '';
      const stateVal = document.getElementById('accountAddrState')?.value.trim() || '';
      const pinVal = document.getElementById('accountAddrPincode')?.value.replace(/\D/g, '').slice(0, 6) || '';
      const setDefaultChecked = Boolean(document.getElementById('accountSetDefaultAddress')?.checked);

      if (!nameVal) {
        showFlowFeedback('accountAddressFormFeedback', 'Please enter recipient Full Name.', true);
        document.getElementById('accountAddrName')?.focus();
        return;
      }
      if (phoneVal.length !== 10) {
        showFlowFeedback('accountAddressFormFeedback', 'Please enter a valid 10-digit Mobile Number.', true);
        document.getElementById('accountAddrPhone')?.focus();
        return;
      }
      if (!addr1Val) {
        showFlowFeedback('accountAddressFormFeedback', 'Please enter House Address / Flat No. / Building.', true);
        document.getElementById('accountAddrLine1')?.focus();
        return;
      }
      if (!addr2Val) {
        showFlowFeedback('accountAddressFormFeedback', 'Please enter Street / Road / Area.', true);
        document.getElementById('accountAddrLine2')?.focus();
        return;
      }
      if (!cityVal) {
        showFlowFeedback('accountAddressFormFeedback', 'Please enter Town / City.', true);
        document.getElementById('accountAddrCity')?.focus();
        return;
      }
      if (!stateVal) {
        showFlowFeedback('accountAddressFormFeedback', 'Please select your State.', true);
        document.getElementById('accountAddrState')?.focus();
        return;
      }
      if (pinVal.length !== 6) {
        showFlowFeedback('accountAddressFormFeedback', 'Please enter a valid 6-digit PIN / ZIP Code.', true);
        document.getElementById('accountAddrPincode')?.focus();
        return;
      }

      const saveBtn = document.getElementById('accountSaveNewAddressBtn');
      if (saveBtn) saveBtn.disabled = true;

      const savedAddr = await addAddressToUserAccount({
        name: nameVal,
        phone: phoneVal,
        email: emailVal,
        address1: addr1Val,
        address2: addr2Val,
        landmark: landmarkVal,
        city: cityVal,
        state: stateVal,
        pincode: pinVal,
        type: 'Home'
      }, setDefaultChecked);

      if (saveBtn) saveBtn.disabled = false;

      if (savedAddr) {
        closeAccountAddressEntryForm();
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Address Saved', `${savedAddr.name || 'Delivery address'} saved to your account${savedAddr.isDefault ? ' as Default' : ''}.`, 'general');
        }
      }
    });
  }

  function getInitials(firstName, lastName) {
    const f = String(firstName || '').trim().charAt(0).toUpperCase();
    const l = String(lastName || '').trim().charAt(0).toUpperCase();
    return (f + l) || 'SC';
  }

  function showFlowFeedback(elId, message, isError = false) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      return;
    }
    el.style.display = 'block';
    el.style.background = isError ? '#fef2f2' : '#dcfce7';
    el.style.color = isError ? '#991b1b' : '#166534';
    el.style.border = isError ? '1px solid #fecaca' : '1px solid #bbf7d0';
    el.textContent = message;
  }

  function showAccountFeedback(message, isError = false) {
    showFlowFeedback('accountSaveFeedbackBox', message, isError);
  }

  function updateEmailBadgeUI() {
    const emailInput = document.getElementById('accountEmailInput');
    const badge = document.getElementById('accountEmailStatusBadge');
    const sendBtn = document.getElementById('accountSendOtpBtn');
    const changeEmailBtn = document.getElementById('accountChangeEmailBtn');
    const hint = document.getElementById('accountEmailHintText');
    if (!emailInput || !badge) return;

    const currentTypedEmail = String(emailInput.value || '').trim().toLowerCase();
    const isCurrentVerified = Boolean(
      currentTypedEmail &&
      accountState.emailVerified &&
      accountState.email &&
      currentTypedEmail === String(accountState.email).trim().toLowerCase()
    );

    if (isCurrentVerified) {
      badge.textContent = '✓ EMAIL VERIFIED & SAVED';
      badge.className = 'account-status-badge account-status-badge--verified';
      if (sendBtn) sendBtn.style.display = 'none';
      if (changeEmailBtn) changeEmailBtn.style.display = 'inline-block';
      emailInput.readOnly = true;
      emailInput.classList.add('account-input--readonly-curved');
      if (hint) {
        hint.textContent = `Your email (${currentTypedEmail}) is verified and saved. Click "Change Email" to update it.`;
        hint.style.color = '#166534';
      }
    } else {
      badge.textContent = 'OTP VERIFICATION REQUIRED';
      badge.className = 'account-status-badge account-status-badge--unverified';
      if (sendBtn) {
        sendBtn.style.display = 'inline-block';
        sendBtn.textContent = 'Verify Email via OTP';
      }
      if (changeEmailBtn) changeEmailBtn.style.display = 'none';
      emailInput.readOnly = false;
      emailInput.classList.remove('account-input--readonly-curved');
      if (hint) {
        hint.textContent = 'Click "Verify Email via OTP" to receive a 6-digit OTP in your email and verify it in the OTP popup.';
        hint.style.color = '#71717a';
      }
    }
  }

  function renderAccountPageUI() {
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    const firstNameInput = document.getElementById('accountFirstName');
    const lastNameInput = document.getElementById('accountLastName');
    const loggedPhoneInput = document.getElementById('accountLoggedPhoneInput');
    const emailInput = document.getElementById('accountEmailInput');
    const headerName = document.getElementById('accountHeaderFullNameDisplay');
    const headerPhone = document.getElementById('accountHeaderPhoneDisplay');
    const avatar = document.getElementById('accountAvatarInitials');

    if (firstNameInput) firstNameInput.value = accountState.firstName || '';
    if (lastNameInput) lastNameInput.value = accountState.lastName || '';
    if (loggedPhoneInput) loggedPhoneInput.value = cleanPhone;
    if (emailInput && !emailInput.dataset.userEditing) {
      emailInput.value = accountState.email || '';
    }

    const fullName = [accountState.firstName, accountState.lastName].filter(Boolean).join(' ').trim();
    if (headerName) headerName.textContent = fullName || 'Complete Your Profile';
    if (headerPhone) headerPhone.textContent = `Mobile: ${cleanPhone}`;
    if (avatar) avatar.textContent = getInitials(accountState.firstName, accountState.lastName);

    updateEmailBadgeUI();
    renderAccountAddressesUI();
    renderCheckoutAddressesUI();
    renderAccountOrdersUI();
    updateLogoutPageSummary();
  }

  async function fetchFirebaseAccountByPhone(phone) {
    const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) return;

    // 1. Load from MongoDB Atlas backend (/api/account/profile)
    try {
      const res = await fetch(`/api/account/profile?phone=${encodeURIComponent(cleanPhone)}`);
      const data = await res.json();
      if (data && data.success && data.account) {
        const mongoAddresses = Array.isArray(data.account.addresses) && data.account.addresses.length > 0
          ? data.account.addresses
          : accountState.addresses;
        const mongoDefaultId = data.account.defaultAddressId || accountState.defaultAddressId || '';
        const mongoOrders = Array.isArray(data.orders) && data.orders.length > 0
          ? data.orders
          : (Array.isArray(data.account.orders) ? data.account.orders : (accountState.orders || []));

        saveLocalAccount({
          firstName: data.account.firstName || accountState.firstName || '',
          lastName: data.account.lastName || accountState.lastName || '',
          phone: cleanPhone,
          phoneVerified: true,
          email: data.account.email || accountState.email || '',
          emailVerified: Boolean(data.account.emailVerified),
          addresses: mongoAddresses,
          defaultAddressId: mongoDefaultId,
          orders: mongoOrders
        });

        // If user had local addresses that weren't in MongoDB yet, sync them up
        if ((!Array.isArray(data.account.addresses) || data.account.addresses.length === 0) && accountState.addresses.length > 0) {
          syncAddressesToMongo(accountState.addresses, accountState.defaultAddressId);
        }

        renderAccountPageUI();
      }
    } catch (_) {}

    // 2. Also check Firebase Auth user record if available
    if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.loadUserAuthDetails === 'function') {
      try {
        const fbAccount = await window.streetCoFirebaseAuth.loadUserAuthDetails(cleanPhone);
        if (fbAccount) {
          saveLocalAccount({
            firstName: fbAccount.firstName || accountState.firstName || '',
            lastName: fbAccount.lastName || accountState.lastName || '',
            phone: cleanPhone,
            phoneVerified: true,
            email: fbAccount.email || accountState.email || '',
            emailVerified: Boolean(fbAccount.emailVerified)
          });
          renderAccountPageUI();
        }
      } catch (_) {}
    }
  }

  window.addEventListener('streetco:firebase-auth-ready', () => {
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length === 10 && accountState.phoneVerified) {
      fetchFirebaseAccountByPhone(cleanPhone);
    }
  });

  // Initial render of checkout addresses on startup
  renderCheckoutAddressesUI();
  if (accountState.phone && accountState.phoneVerified) {
    fetchFirebaseAccountByPhone(accountState.phone);
  }

  // ── Checkout Auth Gate Popup Notification & Return-to-Previous-Page Restoration ──
  function restorePreviousContextAfterAuth(ctx) {
    if (!ctx) return;

    if (ctx.type === 'cart') {
      // Restore underlying page (Collections or Shop) and reopen the Cart / Bag drawer as it was earlier
      const collecPage = document.getElementById('collectionsPage');
      if (ctx.wasCollectionsOpen && collecPage) {
        collecPage.classList.add('open');
        collecPage.setAttribute('aria-hidden', 'false');
        collecPage.scrollTop = ctx.collecScrollTop || 0;
      }
      if (typeof window.streetCoOpenCart === 'function') {
        window.streetCoOpenCart('bag');
      } else {
        const cartDrw = document.getElementById('cartDrawer');
        if (cartDrw) {
          cartDrw.classList.add('open');
          cartDrw.setAttribute('aria-hidden', 'false');
        }
      }
      return;
    }

    if (ctx.type === 'product') {
      const pdpModal = document.getElementById('relicGalleryModal');
      const collecPage = document.getElementById('collectionsPage');
      if (ctx.wasPdpOpen && pdpModal) {
        pdpModal.classList.add('open');
        pdpModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('bag-open');
        document.documentElement.classList.add('bag-open');
      } else if (ctx.wasCollectionsOpen && collecPage) {
        collecPage.classList.add('open');
        collecPage.setAttribute('aria-hidden', 'false');
        collecPage.scrollTop = ctx.collecScrollTop || 0;
      } else if (typeof ctx.scrollY === 'number' && ctx.scrollY > 0) {
        window.scrollTo({ top: ctx.scrollY, behavior: 'instant' });
      }
    }
  }

  window.openCheckoutAuthGate = function(context = {}) {
    pendingAuthReturnContext = {
      type: context.type === 'cart' ? 'cart' : 'product',
      wasPdpOpen: Boolean(context.wasPdpOpen),
      pdpItem: context.pdpItem || null,
      pdpSource: context.pdpSource || 'shop',
      pdpQty: context.pdpQty || 1,
      pdpSize: context.pdpSize || 'M',
      pdpFinish: context.pdpFinish || 'Obsidian Shadow',
      wasCollectionsOpen: Boolean(context.wasCollectionsOpen),
      scrollY: Number(context.scrollY) || 0,
      collecScrollTop: Number(context.collecScrollTop) || 0
    };

    const gateModal = document.getElementById('checkoutAuthGateModal');
    const msgEl = document.getElementById('checkoutAuthGateMessage');
    if (msgEl) {
      if (pendingAuthReturnContext.type === 'cart') {
        msgEl.textContent = 'You must be logged in or signed up before continuing to the checkout page. Click the button below to log in or sign up in a popup, and you will be returned directly to your cart page as it was earlier.';
      } else {
        msgEl.textContent = 'You must be logged in or signed up before continuing to the checkout page. Click the button below to log in or sign up in a popup, and you will be returned directly to your product page as it was earlier.';
      }
    }
    if (gateModal) {
      gateModal.classList.add('open');
      gateModal.setAttribute('aria-hidden', 'false');
    }
  };

  window.closeCheckoutAuthGate = function(clearReturnContext = false) {
    const gateModal = document.getElementById('checkoutAuthGateModal');
    if (gateModal) {
      gateModal.classList.remove('open');
      gateModal.setAttribute('aria-hidden', 'true');
    }
    if (clearReturnContext && pendingAuthReturnContext) {
      const ctx = pendingAuthReturnContext;
      pendingAuthReturnContext = null;
      restorePreviousContextAfterAuth(ctx);
    }
  };

  const checkoutAuthGateContinueBtn = document.getElementById('checkoutAuthGateContinueBtn');
  if (checkoutAuthGateContinueBtn) {
    checkoutAuthGateContinueBtn.addEventListener('click', () => {
      window.closeCheckoutAuthGate(false);
      window.openPhoneLoginPopup({ preserveReturnContext: true });
    });
  }

  // ── Modal Open / Close Controllers ──
  window.openPhoneLoginPopup = function(options = {}) {
    if (!options || !options.preserveReturnContext) {
      pendingAuthReturnContext = null;
    }

    const loginModal = document.getElementById('phoneLoginPopupModal');
    const otpModal = document.getElementById('unifiedOtpModal');
    const accountModal = document.getElementById('accountPageModal');

    if (otpModal) {
      otpModal.classList.remove('open');
      otpModal.setAttribute('aria-hidden', 'true');
    }
    if (accountModal) {
      accountModal.classList.remove('open');
      accountModal.setAttribute('aria-hidden', 'true');
    }
    if (!loginModal) return;

    showFlowFeedback('phoneLoginFeedbackMsg', '');
    loginModal.classList.add('open');
    loginModal.setAttribute('aria-hidden', 'false');

    const phoneInput = document.getElementById('accountLoginPhoneInput');
    if (phoneInput) {
      phoneInput.value = accountState.phone || '';
      setTimeout(() => phoneInput.focus(), 60);
    }
  };

  window.closePhoneLoginPopup = function() {
    const loginModal = document.getElementById('phoneLoginPopupModal');
    if (!loginModal) return;
    loginModal.classList.remove('open');
    loginModal.setAttribute('aria-hidden', 'true');
    if (window.location.hash === '#account') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if (pendingAuthReturnContext) {
      const ctx = pendingAuthReturnContext;
      pendingAuthReturnContext = null;
      restorePreviousContextAfterAuth(ctx);
    }
  };

  const otpBoxes = [
    document.getElementById('unifiedOtpDigit1'),
    document.getElementById('unifiedOtpDigit2'),
    document.getElementById('unifiedOtpDigit3'),
    document.getElementById('unifiedOtpDigit4'),
    document.getElementById('unifiedOtpDigit5'),
    document.getElementById('unifiedOtpDigit6')
  ].filter(Boolean);

  function clearOtpBoxes() {
    otpBoxes.forEach(box => { box.value = ''; });
    if (otpBoxes[0]) {
      setTimeout(() => otpBoxes[0].focus(), 60);
    }
  }

  window.openUnifiedOtpModal = function(options = {}) {
    const otpModal = document.getElementById('unifiedOtpModal');
    if (!otpModal) return;

    activeOtpContext = {
      mode: options.mode || 'phone',
      targetPhone: options.phone || '',
      targetEmail: options.email || '',
      newPhone: options.newPhone || '',
      newEmail: options.newEmail || '',
      firstName: options.firstName || '',
      lastName: options.lastName || '',
      subTitle: options.subTitle || '',
      instantOtpCode: options.instantOtpCode || null
    };

    const kickerEl = document.getElementById('unifiedOtpKicker');
    const titleEl = document.getElementById('unifiedOtpTitle');
    const subEl = document.getElementById('unifiedOtpSub');
    const bannerEl = document.getElementById('unifiedOtpInstantBanner');

    if (activeOtpContext.mode === 'change_phone') {
      if (kickerEl) kickerEl.textContent = 'SECURITY AUTHORIZATION';
      if (titleEl) titleEl.textContent = 'Authorize Phone Change';
      if (subEl) subEl.textContent = options.subTitle || `Enter the 6-digit authorization OTP sent to your current phone and email.`;
    } else if (activeOtpContext.mode === 'change_email') {
      if (kickerEl) kickerEl.textContent = 'SECURITY AUTHORIZATION';
      if (titleEl) titleEl.textContent = 'Authorize Email Change';
      if (subEl) subEl.textContent = options.subTitle || `Enter the 6-digit authorization OTP sent to your current phone and email.`;
    } else if (activeOtpContext.mode === 'phone') {
      if (kickerEl) kickerEl.textContent = 'MOBILE OTP VERIFICATION';
      if (titleEl) titleEl.textContent = 'Verify Mobile OTP';
      if (subEl) subEl.textContent = `Enter the 6-digit OTP sent to mobile number ${activeOtpContext.targetPhone}`;
    } else {
      if (kickerEl) kickerEl.textContent = 'EMAIL OTP VERIFICATION';
      if (titleEl) titleEl.textContent = 'Verify Email OTP';
      if (subEl) subEl.textContent = `Enter the 6-digit OTP sent to ${activeOtpContext.targetEmail}`;
    }

    if (bannerEl) {
      if (options.instantOtpCode) {
        bannerEl.style.display = 'block';
        bannerEl.innerHTML = `Your 6-Digit Verification OTP: <strong>${options.instantOtpCode}</strong>`;
      } else {
        bannerEl.style.display = 'none';
        bannerEl.innerHTML = '';
      }
    }

    showFlowFeedback('unifiedOtpStatusMsg', '');
    clearOtpBoxes();

    otpModal.classList.add('open');
    otpModal.setAttribute('aria-hidden', 'false');
  };

  window.closeUnifiedOtpModal = function() {
    const otpModal = document.getElementById('unifiedOtpModal');
    if (!otpModal) return;
    otpModal.classList.remove('open');
    otpModal.setAttribute('aria-hidden', 'true');
  };

  window.handleUnifiedOtpBack = function() {
    window.closeUnifiedOtpModal();
    if (activeOtpContext.mode === 'phone') {
      window.openPhoneLoginPopup({ preserveReturnContext: Boolean(pendingAuthReturnContext) });
    } else if (activeOtpContext.mode === 'change_phone') {
      window.openChangeCredentialModal('phone');
    } else if (activeOtpContext.mode === 'change_email') {
      window.openChangeCredentialModal('email');
    }
  };

  window.openAccountPage = function() {
    accountState = loadLocalAccount();
    const cleanPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    const isLoggedIn = cleanPhone.length === 10 && Boolean(accountState.phoneVerified);

    // If user is not logged in with a verified phone number yet, open Phone Login Popup (Web & Mobile)
    if (!isLoggedIn) {
      window.openPhoneLoginPopup({ preserveReturnContext: false });
      return;
    }

    const modal = document.getElementById('accountPageModal');
    if (!modal) return;
    showAccountFeedback('');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    renderAccountPageUI();
    fetchFirebaseAccountByPhone(cleanPhone);
  };

  window.closeAccountPage = function() {
    const modal = document.getElementById('accountPageModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (window.location.hash === '#account') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Strip non-digits in the curved mobile number input (without +91)
  const loginPhoneInputEl = document.getElementById('accountLoginPhoneInput');
  if (loginPhoneInputEl) {
    loginPhoneInputEl.addEventListener('input', (e) => {
      e.target.value = String(e.target.value || '').replace(/\D/g, '').slice(0, 10);
    });
  }

  // ── 1. Phone Login Form Submit ("Continue" button) -> Sends 6-Digit Phone OTP & Opens 6-Digit OTP Popup/Page ──
  async function sendPhoneOtpRequest(phoneDigits) {
    const submitBtn = document.getElementById('accountPhoneLoginSubmitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending OTP...';
    }
    showFlowFeedback('phoneLoginFeedbackMsg', '');

    try {
      const res = await fetch('/api/account/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneDigits })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to send OTP.');
      }

      // Close Phone Login Popup/Page and open the 6-Digit Curved Square OTP Popup/Page
      const loginModal = document.getElementById('phoneLoginPopupModal');
      if (loginModal) {
        loginModal.classList.remove('open');
        loginModal.setAttribute('aria-hidden', 'true');
      }

      window.openUnifiedOtpModal({
        mode: 'phone',
        phone: phoneDigits,
        instantOtpCode: !data.smsDispatched ? data.otpCode : null
      });
    } catch (err) {
      showFlowFeedback('phoneLoginFeedbackMsg', err.message || 'Could not send OTP. Please try again.', true);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Continue';
      }
    }
  }

  const phoneLoginForm = document.getElementById('accountPhoneLoginForm');
  if (phoneLoginForm) {
    phoneLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('accountLoginPhoneInput');
      const digits = String(input ? input.value : '').replace(/\D/g, '').slice(0, 10);
      if (digits.length !== 10) {
        showFlowFeedback('phoneLoginFeedbackMsg', 'Please enter a valid 10-digit mobile number.', true);
        if (input) input.focus();
        return;
      }
      await sendPhoneOtpRequest(digits);
    });
  }

  // ── 2. 6-Digit Curved Square OTP Boxes Auto-Advance, Backspace & Paste ──
  otpBoxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const digit = String(e.target.value || '').replace(/\D/g, '').slice(-1);
      e.target.value = digit;
      if (digit && idx < otpBoxes.length - 1) {
        otpBoxes[idx + 1].focus();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        otpBoxes[idx - 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        e.preventDefault();
        pasted.split('').forEach((ch, i) => {
          if (otpBoxes[i]) otpBoxes[i].value = ch;
        });
        const nextIdx = Math.min(pasted.length, otpBoxes.length - 1);
        if (otpBoxes[nextIdx]) otpBoxes[nextIdx].focus();
      }
    });
  });

  // ── 3. Unified 6-Digit OTP Form Submit ("Proceed" button) for BOTH Phone OTP & Email OTP ──
  const unifiedOtpForm = document.getElementById('unifiedOtpForm');
  if (unifiedOtpForm) {
    unifiedOtpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otpCode = otpBoxes.map(b => String(b.value || '').trim()).join('');
      if (otpCode.length !== 6) {
        showFlowFeedback('unifiedOtpStatusMsg', 'Please enter all 6 digits of the OTP in the boxes above.', true);
        return;
      }

      const proceedBtn = document.getElementById('unifiedOtpProceedBtn');
      if (proceedBtn) {
        proceedBtn.disabled = true;
        proceedBtn.textContent = 'Verifying...';
      }
      showFlowFeedback('unifiedOtpStatusMsg', '');

      try {
        if (activeOtpContext.mode === 'change_phone') {
          const res = await fetch('/api/account/change-phone/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPhone: activeOtpContext.targetPhone,
              otp: otpCode
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Invalid 6-digit authorization code.');
          }

          const newPhone = activeOtpContext.newPhone;
          saveLocalAccount({
            phone: newPhone,
            phoneVerified: true
          });
          try {
            localStorage.setItem('the_street_co_user_phone', newPhone);
          } catch (_) {}

          if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.saveUserAuthDetails === 'function') {
            try {
              await window.streetCoFirebaseAuth.saveUserAuthDetails({
                phone: newPhone,
                phoneVerified: true,
                firstName: accountState.firstName || '',
                lastName: accountState.lastName || '',
                email: accountState.email || '',
                emailVerified: Boolean(accountState.emailVerified)
              });
            } catch (_) {}
          }

          window.closeUnifiedOtpModal();
          renderAccountPageUI();
          refreshAccountOrdersFromMongo(false);
          showAccountFeedback(`✓ Mobile number successfully changed to +91 ${newPhone}!`, false);
          if (window.streetCoShowToast) {
            window.streetCoShowToast(`✓ Mobile number changed to +91 ${newPhone}`);
          }
        } else if (activeOtpContext.mode === 'change_email') {
          const res = await fetch('/api/account/change-email/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPhone: activeOtpContext.targetPhone,
              otp: otpCode
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Invalid 6-digit authorization code.');
          }

          const newEmail = activeOtpContext.newEmail;
          saveLocalAccount({
            email: newEmail,
            emailVerified: true
          });
          try {
            localStorage.setItem('the_street_co_user_email', newEmail);
          } catch (_) {}

          if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.saveUserAuthDetails === 'function') {
            try {
              await window.streetCoFirebaseAuth.saveUserAuthDetails({
                phone: accountState.phone,
                phoneVerified: true,
                firstName: accountState.firstName || '',
                lastName: accountState.lastName || '',
                email: newEmail,
                emailVerified: true
              });
            } catch (_) {}
          }

          window.closeUnifiedOtpModal();
          renderAccountPageUI();
          showAccountFeedback(`✓ Email address successfully changed to ${newEmail}!`, false);
          if (data && data.streetCashBonusAwarded && window.notifyStreetCashReceived) {
            window.notifyStreetCashReceived(data.streetCashBonusAwarded.points, data.streetCashBonusAwarded.reason, data.streetCashBonusAwarded.newBalance);
          }
          if (window.syncStreetCashFromBackend) {
            window.syncStreetCashFromBackend();
          }
          if (window.streetCoShowToast) {
            window.streetCoShowToast(`✓ Email address changed to ${newEmail}`);
          }
        } else if (activeOtpContext.mode === 'phone') {
          const res = await fetch('/api/account/verify-phone-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: activeOtpContext.targetPhone,
              otp: otpCode
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Invalid 6-digit OTP.');
          }

          let fbSaved = null;
          if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.saveUserAuthDetails === 'function') {
            try {
              fbSaved = await window.streetCoFirebaseAuth.saveUserAuthDetails({
                phone: activeOtpContext.targetPhone,
                phoneVerified: true,
                firstName: accountState.firstName || '',
                lastName: accountState.lastName || '',
                email: accountState.email || '',
                emailVerified: Boolean(accountState.emailVerified),
                lastLoginAt: new Date().toISOString()
              });
            } catch (_) {}
          }

          const serverAccount = data.account || {};
          saveLocalAccount({
            phone: activeOtpContext.targetPhone,
            phoneVerified: true,
            firstName: serverAccount.firstName || (fbSaved && fbSaved.firstName) || accountState.firstName || '',
            lastName: serverAccount.lastName || (fbSaved && fbSaved.lastName) || accountState.lastName || '',
            email: serverAccount.email || (fbSaved && fbSaved.email) || accountState.email || '',
            emailVerified: Boolean(serverAccount.emailVerified || (fbSaved && fbSaved.emailVerified) || accountState.emailVerified),
            addresses: Array.isArray(serverAccount.addresses) && serverAccount.addresses.length > 0
              ? serverAccount.addresses
              : accountState.addresses,
            defaultAddressId: serverAccount.defaultAddressId || accountState.defaultAddressId || ''
          });

          if (data.streetCashBonusAwarded && window.notifyStreetCashReceived) {
            window.notifyStreetCashReceived(
              data.streetCashBonusAwarded.points,
              data.streetCashBonusAwarded.reason,
              data.streetCashBonusAwarded.newBalance
            );
          }
          if (window.syncStreetCashFromBackend) {
            window.syncStreetCashFromBackend(activeOtpContext.targetPhone);
          }

          window.closeUnifiedOtpModal();
          fetchFirebaseAccountByPhone(activeOtpContext.targetPhone);

          if (pendingAuthReturnContext) {
            const ctxToRestore = pendingAuthReturnContext;
            pendingAuthReturnContext = null;
            restorePreviousContextAfterAuth(ctxToRestore);
            if (window.streetCoShowToast) {
              const targetLabel = ctxToRestore.type === 'cart' ? 'Cart' : 'Product page';
              window.streetCoShowToast(`Logged in with +91 ${activeOtpContext.targetPhone} · Returned to your ${targetLabel}`);
            }
          } else {
            window.openAccountPage();
            if (window.streetCoShowToast) {
              window.streetCoShowToast(`Logged in with +91 ${activeOtpContext.targetPhone}`);
            }
          }
        } else {
          // Email OTP verification using the exact same 6-digit OTP Popup/Page
          const res = await fetch('/api/account/verify-email-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: activeOtpContext.targetEmail,
              otp: otpCode,
              firstName: activeOtpContext.firstName,
              lastName: activeOtpContext.lastName,
              phone: accountState.phone
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Invalid 6-digit Email OTP.');
          }

          const emailInput = document.getElementById('accountEmailInput');
          if (emailInput) delete emailInput.dataset.userEditing;

          const nextFirstName = activeOtpContext.firstName || accountState.firstName;
          const nextLastName = activeOtpContext.lastName || accountState.lastName;

          if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.saveUserAuthDetails === 'function') {
            try {
              await window.streetCoFirebaseAuth.saveUserAuthDetails({
                phone: accountState.phone,
                phoneVerified: true,
                firstName: nextFirstName,
                lastName: nextLastName,
                email: activeOtpContext.targetEmail,
                emailVerified: true
              });
            } catch (_) {}
          }

          saveLocalAccount({
            firstName: nextFirstName,
            lastName: nextLastName,
            email: activeOtpContext.targetEmail,
            emailVerified: true
          });

          window.closeUnifiedOtpModal();
          renderAccountPageUI();
          showAccountFeedback(`✓ Email (${activeOtpContext.targetEmail}) verified with 6-digit OTP and saved to your account!`, false);
          if (window.streetCoShowToast) {
            window.streetCoShowToast(`Email verified & saved: ${activeOtpContext.targetEmail}`);
          }
        }
      } catch (err) {
        showFlowFeedback('unifiedOtpStatusMsg', err.message || 'OTP verification failed. Please try again.', true);
      } finally {
        if (proceedBtn) {
          proceedBtn.disabled = false;
          proceedBtn.textContent = 'Proceed';
        }
      }
    });
  }

  // ── 4. Resend OTP Button inside Unified 6-Digit OTP Popup/Page ──
  const unifiedResendBtn = document.getElementById('unifiedOtpResendBtn');
  if (unifiedResendBtn) {
    unifiedResendBtn.addEventListener('click', async () => {
      unifiedResendBtn.disabled = true;
      showFlowFeedback('unifiedOtpStatusMsg', 'Sending a new 6-digit OTP...', false);
      try {
        if (activeOtpContext.mode === 'change_phone') {
          const res = await fetch('/api/account/change-phone/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPhone: activeOtpContext.targetPhone,
              newPhone: activeOtpContext.newPhone
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to resend authorization code.');
          const bannerEl = document.getElementById('unifiedOtpInstantBanner');
          if (bannerEl && !data.smsDispatched && !data.emailDispatched && data.otpCode) {
            bannerEl.style.display = 'block';
            bannerEl.innerHTML = `Your 6-Digit Authorization OTP: <strong>${data.otpCode}</strong>`;
          }
          clearOtpBoxes();
          showFlowFeedback('unifiedOtpStatusMsg', data.message || `New authorization code dispatched.`, false);
        } else if (activeOtpContext.mode === 'change_email') {
          const res = await fetch('/api/account/change-email/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              currentPhone: activeOtpContext.targetPhone,
              newEmail: activeOtpContext.newEmail
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to resend authorization code.');
          const bannerEl = document.getElementById('unifiedOtpInstantBanner');
          if (bannerEl && !data.smsDispatched && !data.emailDispatched && data.otpCode) {
            bannerEl.style.display = 'block';
            bannerEl.innerHTML = `Your 6-Digit Authorization OTP: <strong>${data.otpCode}</strong>`;
          }
          clearOtpBoxes();
          showFlowFeedback('unifiedOtpStatusMsg', data.message || `New authorization code dispatched.`, false);
        } else if (activeOtpContext.mode === 'phone') {
          const res = await fetch('/api/account/send-phone-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: activeOtpContext.targetPhone })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to resend OTP.');
          const bannerEl = document.getElementById('unifiedOtpInstantBanner');
          if (bannerEl && !data.smsDispatched && data.otpCode) {
            bannerEl.style.display = 'block';
            bannerEl.innerHTML = `Your 6-Digit Verification OTP: <strong>${data.otpCode}</strong>`;
          }
          clearOtpBoxes();
          showFlowFeedback('unifiedOtpStatusMsg', `New 6-digit OTP sent to ${activeOtpContext.targetPhone}.`, false);
        } else {
          const res = await fetch('/api/account/send-email-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: activeOtpContext.targetEmail,
              firstName: activeOtpContext.firstName,
              lastName: activeOtpContext.lastName,
              phone: accountState.phone
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Failed to resend Email OTP.');
          clearOtpBoxes();
          showFlowFeedback('unifiedOtpStatusMsg', `New 6-digit OTP sent to ${activeOtpContext.targetEmail}.`, false);
        }
      } catch (err) {
        showFlowFeedback('unifiedOtpStatusMsg', err.message || 'Could not resend OTP.', true);
      } finally {
        unifiedResendBtn.disabled = false;
      }
    });
  }

  // ── 4B. Change Credential Modal Logic & Event Listeners ──
  let activeChangeCredentialType = 'phone';

  window.openChangeCredentialModal = function(type = 'phone') {
    activeChangeCredentialType = type;
    const modal = document.getElementById('changeCredentialModal');
    if (!modal) return;

    const kickerEl = document.getElementById('changeCredentialKicker');
    const titleEl = document.getElementById('changeCredentialTitle');
    const subEl = document.getElementById('changeCredentialSub');
    const phoneWrap = document.getElementById('changeCredentialPhoneWrap');
    const emailWrap = document.getElementById('changeCredentialEmailWrap');
    const phoneInput = document.getElementById('changeCredentialPhoneInput');
    const emailInput = document.getElementById('changeCredentialEmailInput');
    const submitBtn = document.getElementById('changeCredentialSubmitBtn');

    accountState = loadLocalAccount();
    const currentPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
    const currentEmail = String(accountState.email || '').trim().toLowerCase();
    const hasEmail = Boolean(accountState.emailVerified && currentEmail && currentEmail.includes('@'));
    const maskedPhone = `+91 ******${currentPhone.slice(-4)}`;
    const maskedEmail = hasEmail ? currentEmail.replace(/^([^@]{2})[^@]+(@.*)$/, '$1***$2') : '';

    showFlowFeedback('changeCredentialFeedbackMsg', '');

    if (type === 'phone') {
      if (kickerEl) kickerEl.textContent = 'SECURITY AUTHORIZATION';
      if (titleEl) titleEl.textContent = 'Change Mobile Number';
      if (subEl) {
        subEl.textContent = hasEmail
          ? `Enter your new 10-digit mobile number below. A 6-digit authorization OTP will be sent to your current phone (${maskedPhone}) and email (${maskedEmail}).`
          : `Enter your new 10-digit mobile number below. A 6-digit authorization OTP will be sent to your current phone (${maskedPhone}).`;
      }
      if (phoneWrap) phoneWrap.style.display = 'flex';
      if (emailWrap) emailWrap.style.display = 'none';
      if (phoneInput) {
        phoneInput.value = '';
        setTimeout(() => phoneInput.focus(), 60);
      }
      if (submitBtn) submitBtn.textContent = 'Send Authorization OTP';
    } else {
      if (kickerEl) kickerEl.textContent = 'SECURITY AUTHORIZATION';
      if (titleEl) titleEl.textContent = 'Change Email Address';
      if (subEl) {
        subEl.textContent = `Enter your new email address below. A 6-digit authorization OTP will be sent to your current phone (${maskedPhone}) and current email (${maskedEmail || 'registered email'}).`;
      }
      if (phoneWrap) phoneWrap.style.display = 'none';
      if (emailWrap) emailWrap.style.display = 'flex';
      if (emailInput) {
        emailInput.value = '';
        setTimeout(() => emailInput.focus(), 60);
      }
      if (submitBtn) submitBtn.textContent = 'Send Authorization OTP';
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  };

  window.closeChangeCredentialModal = function() {
    const modal = document.getElementById('changeCredentialModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  };

  const changePhoneBtn = document.getElementById('accountChangePhoneBtn');
  if (changePhoneBtn) {
    changePhoneBtn.addEventListener('click', () => {
      window.openChangeCredentialModal('phone');
    });
  }

  const changeEmailBtn = document.getElementById('accountChangeEmailBtn');
  if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', () => {
      window.openChangeCredentialModal('email');
    });
  }

  const changeCredForm = document.getElementById('changeCredentialForm');
  if (changeCredForm) {
    changeCredForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      accountState = loadLocalAccount();
      const currentPhone = String(accountState.phone || '').replace(/\D/g, '').slice(-10);
      if (currentPhone.length !== 10) {
        showFlowFeedback('changeCredentialFeedbackMsg', 'Session error. Please log in again.', true);
        return;
      }

      const submitBtn = document.getElementById('changeCredentialSubmitBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending OTP...';
      }
      showFlowFeedback('changeCredentialFeedbackMsg', '');

      try {
        if (activeChangeCredentialType === 'phone') {
          const phoneInput = document.getElementById('changeCredentialPhoneInput');
          const newPhone = String(phoneInput ? phoneInput.value : '').replace(/\D/g, '').slice(-10);
          if (newPhone.length !== 10) {
            throw new Error('Please enter a valid 10-digit new mobile number.');
          }
          if (newPhone === currentPhone) {
            throw new Error('The new mobile number must be different from your current number.');
          }

          const res = await fetch('/api/account/change-phone/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPhone, newPhone })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to send authorization code.');
          }

          window.closeChangeCredentialModal();
          window.openUnifiedOtpModal({
            mode: 'change_phone',
            phone: currentPhone,
            newPhone,
            subTitle: data.message,
            instantOtpCode: (!data.smsDispatched && !data.emailDispatched) ? data.otpCode : null
          });
        } else {
          const emailInput = document.getElementById('changeCredentialEmailInput');
          const newEmail = String(emailInput ? emailInput.value : '').trim().toLowerCase();
          if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            throw new Error('Please enter a valid new email address.');
          }
          if (accountState.email && newEmail === String(accountState.email).trim().toLowerCase()) {
            throw new Error('The new email must be different from your current email.');
          }

          const res = await fetch('/api/account/change-email/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPhone, newEmail })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to send authorization code.');
          }

          window.closeChangeCredentialModal();
          window.openUnifiedOtpModal({
            mode: 'change_email',
            phone: currentPhone,
            newEmail,
            subTitle: data.message,
            instantOtpCode: (!data.smsDispatched && !data.emailDispatched) ? data.otpCode : null
          });
        }
      } catch (err) {
        showFlowFeedback('changeCredentialFeedbackMsg', err.message || 'Operation failed. Please try again.', true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Authorization OTP';
        }
      }
    });
  }

  // ── 5. Change / Logout Mobile Number Button on Account Page ──
  const switchPhoneBtn = document.getElementById('accountSwitchPhoneBtn');
  if (switchPhoneBtn) {
    switchPhoneBtn.addEventListener('click', async () => {
      const emailInput = document.getElementById('accountEmailInput');
      if (emailInput) delete emailInput.dataset.userEditing;
      if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.signOutUserAuth === 'function') {
        await window.streetCoFirebaseAuth.signOutUserAuth();
      }
      saveLocalAccount({
        phone: '',
        phoneVerified: false
      });
      window.openPhoneLoginPopup();
    });
  }

  // ── 6. Live Name Header Update on Account Page ──
  const firstNameEl = document.getElementById('accountFirstName');
  const lastNameEl = document.getElementById('accountLastName');
  function handleNameTyping() {
    const f = firstNameEl ? firstNameEl.value.trim() : '';
    const l = lastNameEl ? lastNameEl.value.trim() : '';
    const headerName = document.getElementById('accountHeaderFullNameDisplay');
    const avatar = document.getElementById('accountAvatarInitials');
    const combined = [f, l].filter(Boolean).join(' ');
    if (headerName) headerName.textContent = combined || 'Complete Your Profile';
    if (avatar) avatar.textContent = getInitials(f, l);
  }
  if (firstNameEl) firstNameEl.addEventListener('input', handleNameTyping);
  if (lastNameEl) lastNameEl.addEventListener('input', handleNameTyping);

  // Email Input Change Tracking
  const emailInputEl = document.getElementById('accountEmailInput');
  if (emailInputEl) {
    emailInputEl.addEventListener('input', () => {
      emailInputEl.dataset.userEditing = 'true';
      updateEmailBadgeUI();
    });
  }

  // ── 7. Send 6-Digit Email OTP & Open the Same 6-Digit OTP Popup (Web) / Page (Mobile) ──
  async function requestEmailOtpPopup() {
    const emailInput = document.getElementById('accountEmailInput');
    const sendBtn = document.getElementById('accountSendOtpBtn');
    const cleanEmail = String(emailInput ? emailInput.value : '').trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showAccountFeedback('Please enter a valid email address first.', true);
      if (emailInput) emailInput.focus();
      return;
    }

    const fName = firstNameEl ? firstNameEl.value.trim() : accountState.firstName;
    const lName = lastNameEl ? lastNameEl.value.trim() : accountState.lastName;

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending OTP...';
    }
    showAccountFeedback('');

    try {
      const res = await fetch('/api/account/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          firstName: fName,
          lastName: lName,
          phone: accountState.phone
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Could not send verification email.');
      }

      // Open the exact same 6-Digit Curved Square OTP Popup (Web) / Page (Mobile)
      window.openUnifiedOtpModal({
        mode: 'email',
        email: cleanEmail,
        firstName: fName,
        lastName: lName
      });
    } catch (err) {
      showAccountFeedback(err.message || 'Failed to send verification email.', true);
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        updateEmailBadgeUI();
      }
    }
  }

  const sendOtpBtn = document.getElementById('accountSendOtpBtn');
  if (sendOtpBtn) {
    sendOtpBtn.addEventListener('click', requestEmailOtpPopup);
  }

  // ── 8. Save Account Profile Form Submit (Saves User Details to Firebase Auth & MongoDB Atlas) ──
  const mainForm = document.getElementById('accountProfileMainForm');
  if (mainForm) {
    mainForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fName = firstNameEl ? firstNameEl.value.trim() : '';
      const lName = lastNameEl ? lastNameEl.value.trim() : '';
      const emailInput = document.getElementById('accountEmailInput');
      const typedEmail = String(emailInput ? emailInput.value : '').trim().toLowerCase();

      if (!fName) {
        showAccountFeedback('Please enter your First Name.', true);
        if (firstNameEl) firstNameEl.focus();
        return;
      }
      if (!lName) {
        showAccountFeedback('Please enter your Last Name.', true);
        if (lastNameEl) lastNameEl.focus();
        return;
      }

      const isEmailVerifiedMatch = Boolean(
        typedEmail &&
        accountState.emailVerified &&
        accountState.email &&
        typedEmail === String(accountState.email).trim().toLowerCase()
      );

      // If user typed an unverified email, automatically launch the 6-Digit Email OTP Popup/Page
      if (typedEmail && !isEmailVerifiedMatch) {
        await requestEmailOtpPopup();
        return;
      }

      const saveBtn = document.getElementById('accountSaveProfileBtn');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving Profile...';
      }

      try {
        const verifiedEmailToSave = isEmailVerifiedMatch
          ? typedEmail
          : (accountState.emailVerified ? accountState.email : '');
        const isVerifiedBool = isEmailVerifiedMatch || Boolean(accountState.emailVerified);

        let firebaseUid = '';
        if (window.streetCoFirebaseAuth && typeof window.streetCoFirebaseAuth.saveUserAuthDetails === 'function') {
          try {
            const fbSaved = await window.streetCoFirebaseAuth.saveUserAuthDetails({
              phone: accountState.phone,
              phoneVerified: true,
              firstName: fName,
              lastName: lName,
              email: verifiedEmailToSave,
              emailVerified: isVerifiedBool
            });
            if (fbSaved && fbSaved.firebaseUid) firebaseUid = fbSaved.firebaseUid;
          } catch (_) {}
        }

        // Save user account profile + addresses to MongoDB Atlas
        const profRes = await fetch('/api/account/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: accountState.phone,
            firstName: fName,
            lastName: lName,
            email: verifiedEmailToSave,
            emailVerified: isVerifiedBool,
            firebaseUid,
            addresses: accountState.addresses || [],
            defaultAddressId: accountState.defaultAddressId || ''
          })
        }).catch(() => null);

        if (profRes && profRes.ok) {
          const profData = await profRes.json().catch(() => ({}));
          if (profData && Array.isArray(profData.newlyAwardedBonuses) && profData.newlyAwardedBonuses.length > 0) {
            profData.newlyAwardedBonuses.forEach(b => {
              if (window.notifyStreetCashReceived) {
                window.notifyStreetCashReceived(b.points, b.reason || b.label, b.newBalance);
              }
            });
            if (window.syncStreetCashFromBackend) {
              window.syncStreetCashFromBackend(accountState.phone);
            }
          }
        }

        saveLocalAccount({
          firstName: fName,
          lastName: lName,
          email: verifiedEmailToSave,
          emailVerified: isVerifiedBool
        });
        renderAccountPageUI();
        showAccountFeedback('✓ Your Account Profile has been saved to your account.', false);
        if (window.streetCoShowToast) {
          window.streetCoShowToast('Account profile saved!');
        }
      } catch (err) {
        showAccountFeedback(err.message || 'Failed to save account profile.', true);
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save Account Profile';
        }
      }
    });
  }

  // Open Account / Login flow if URL hash is #account
  if (window.location.hash === '#account') {
    window.openAccountPage();
  }
  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#account') {
      window.openAccountPage();
    }
  });
})();

