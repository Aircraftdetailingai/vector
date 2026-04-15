(function() {
  'use strict';

  function init() {
    var cfg = window.ShinyJetsWidget || window.VectorWidget || {};
    var detailerId = cfg.detailerId || '';
    if (!detailerId) return;

    var color = cfg.color || '#007CB1';
    var pos = cfg.position || 'right';
    var title = cfg.title || 'Get a Quote';
    var base = cfg.apiBase || 'https://crm.shinyjets.com';
    var isRight = pos === 'right' || pos === 'bottom-right';

    // Prevent double init
    if (document.getElementById('sj-widget-btn')) return;

    // Create floating button
    var btn = document.createElement('div');
    btn.id = 'sj-widget-btn';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', title);
    btn.innerHTML = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:20px;fill:#fff;flex-shrink:0"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/></svg><span style="color:#fff;font-size:15px;font-weight:500">' + title + '</span>';
    btn.style.cssText = 'position:fixed;' + (isRight ? 'right:20px;' : 'left:20px;') + 'bottom:20px;padding:14px 24px;border-radius:50px;background:' + color + ';border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);display:flex;align-items:center;gap:8px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;transition:transform 0.2s;';
    btn.onmouseenter = function() { btn.style.transform = 'scale(1.04)'; };
    btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };

    // Create overlay
    var overlay = document.createElement('div');
    overlay.id = 'sj-widget-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:none;justify-content:center;align-items:center;';

    // Create iframe container
    var iframeWrap = document.createElement('div');
    var isMobile = window.innerWidth < 640;
    iframeWrap.style.cssText = isMobile
      ? 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:100000;background:#fff;'
      : 'position:relative;width:480px;max-width:calc(100vw - 40px);height:640px;max-height:calc(100vh - 40px);border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);background:#fff;';

    // Close button
    var closeBtn = document.createElement('div');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:20px;line-height:1;z-index:100001;font-family:sans-serif;';
    closeBtn.onmouseenter = function() { closeBtn.style.background = 'rgba(0,0,0,0.8)'; };
    closeBtn.onmouseleave = function() { closeBtn.style.background = 'rgba(0,0,0,0.6)'; };

    // Iframe
    var iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:100%;height:100%;border:none;';
    iframe.setAttribute('allow', 'camera;microphone');
    iframe.title = 'Get a Quote';

    iframeWrap.appendChild(closeBtn);
    iframeWrap.appendChild(iframe);
    overlay.appendChild(iframeWrap);

    function openWidget() {
      iframe.src = base + '/request/' + detailerId;
      overlay.style.display = 'flex';
      btn.style.display = 'none';
      document.body.style.overflow = 'hidden';
    }

    function closeWidget() {
      overlay.style.display = 'none';
      btn.style.display = 'flex';
      document.body.style.overflow = '';
      iframe.src = 'about:blank';
    }

    btn.onclick = openWidget;
    btn.onkeydown = function(e) { if (e.key === 'Enter') openWidget(); };
    closeBtn.onclick = closeWidget;
    overlay.onclick = function(e) { if (e.target === overlay) closeWidget(); };

    // ESC key closes
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.style.display === 'flex') closeWidget();
    });

    document.body.appendChild(btn);
    document.body.appendChild(overlay);
  }

  // Run when DOM is ready — handles async script loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
