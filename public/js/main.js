// MathStudy.in - Main JS

// Mobile nav
(function() {
  var burger = document.getElementById('navBurger');
  var drawer = document.getElementById('navDrawer');
  var closeBtn = document.getElementById('navDrawerClose');
  if (burger && drawer) {
    burger.addEventListener('click', function() { drawer.classList.add('open'); });
    if (closeBtn) closeBtn.addEventListener('click', function() { drawer.classList.remove('open'); });
    document.addEventListener('click', function(e) {
      if (!drawer.contains(e.target) && !burger.contains(e.target)) {
        drawer.classList.remove('open');
      }
    });
  }
})();

// Add to cart - btn is passed as 'this' from onclick="addToCart(id, this)"
function addToCart(productId, btn) {
  var originalText = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Adding...';
  }

  fetch('/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'product_id=' + encodeURIComponent(productId)
  })
  .then(function(r) {
    return r.json();
  })
  .then(function(data) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || 'Add to Cart';
    }
    if (data.ok) {
      updateCartCount(data.count);
      if (data.already) {
        showToast('Already in cart! Go to cart to checkout.', 'info');
      } else {
        showToast('Added to cart!', 'success');
      }
    } else {
      showToast(data.error || 'Could not add to cart.', 'error');
    }
  })
  .catch(function(err) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText || 'Add to Cart';
    }
    console.error('addToCart error:', err);
    showToast('Network error - please try again.', 'error');
  });
}

function removeFromCart(productId) {
  fetch('/cart/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'product_id=' + encodeURIComponent(productId)
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.ok) {
      updateCartCount(data.count);
      var item = document.querySelector('[data-cart-item="' + productId + '"]');
      if (item) item.remove();
      if (data.empty) {
        window.location.reload();
        return;
      }
      var totalEl = document.getElementById('cartTotal');
      if (totalEl && data.total !== undefined) {
        totalEl.textContent = 'Rs.' + Math.round(data.total);
      }
      var checkoutBtn = document.querySelector('.btn-checkout-total');
      if (checkoutBtn && data.total !== undefined) {
        checkoutBtn.textContent = 'Proceed to Payment - Rs.' + Math.round(data.total);
      }
    }
  })
  .catch(function() { showToast('Could not remove item.', 'error'); });
}

function updateCartCount(count) {
  var badges = document.querySelectorAll('.nav-cart-badge');
  for (var i = 0; i < badges.length; i++) {
    badges[i].textContent = count;
    badges[i].style.display = count > 0 ? 'flex' : 'none';
  }
}

function showToast(message, type) {
  var existing = document.querySelector('.ms-toast');
  if (existing) existing.remove();
  var toast = document.createElement('div');
  toast.className = 'ms-toast ms-toast-' + (type || 'info');
  toast.textContent = message;
  var bg = '#1e3a8a';
  if (type === 'success') bg = '#065f46';
  if (type === 'error') bg = '#991b1b';
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:10px;font-size:0.88rem;font-weight:600;color:#fff;background:' + bg + ';box-shadow:0 8px 24px rgba(0,0,0,0.15);transition:opacity 0.3s;';
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 300);
  }, 2500);
}
