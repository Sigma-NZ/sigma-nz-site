/* Sigma NZ: invitation dialog and form, lead-source capture, scroll reveals. No cookies, no third-party trackers. */
(function () {
  'use strict';

  // Web3Forms access key. It is designed to be public; it only lets the form deliver to our inbox.
  var ACCESS_KEY = '21e7ee45-4180-4620-8a63-5c793c8844e2';
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var CONTACT = 'john@sigma-nz.com';

  // Lead source: ?ref=acme-engineering on links we send, plus standard UTM tags.
  var SOURCE_KEYS = ['ref', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
  var STORE_KEY = 'sigma-source';

  function readSource() {
    var found = {};
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
    if (params) {
      SOURCE_KEYS.forEach(function (k) {
        var v = params.get(k);
        if (v) found[k] = v.trim().slice(0, 120);
      });
    }
    if (Object.keys(found).length) {
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(found)); } catch (e) { /* storage blocked */ }
      return found;
    }
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch (e) {
      return {};
    }
  }

  function keyIsSet() {
    return ACCESS_KEY && ACCESS_KEY !== 'WEB3FORMS_ACCESS_KEY';
  }

  function fieldValue(form, name) {
    var el = form.elements[name];
    return el && el.value ? String(el.value).trim() : '';
  }

  function mailtoFallback(form) {
    var lines = [
      'Name: ' + fieldValue(form, 'name'),
      'Company: ' + fieldValue(form, 'company'),
      'Email: ' + fieldValue(form, 'email'),
      'Phone: ' + fieldValue(form, 'phone'),
      'Team size: ' + fieldValue(form, 'team_size'),
      '',
      fieldValue(form, 'message')
    ];
    var ref = fieldValue(form, 'ref');
    if (ref) lines.push('', 'Ref: ' + ref);
    var subject = 'Invitation request: ' + (fieldValue(form, 'company') || 'Sigma NZ');
    window.location.href = 'mailto:' + CONTACT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lines.join('\n'));
  }

  // ---- Invitation dialog: every a[href$="#invite"] on this page opens it; so does loading the page with #invite.
  function initDialog() {
    var dialog = document.getElementById('invite');
    if (!dialog || dialog.tagName !== 'DIALOG') return;
    var root = document.documentElement;
    var canModal = typeof dialog.showModal === 'function';

    function open() {
      if (!canModal) { window.location.href = 'mailto:' + CONTACT; return; }
      if (dialog.open) return;
      dialog.showModal();
      root.classList.add('dialog-open');
    }

    dialog.addEventListener('close', function () {
      root.classList.remove('dialog-open');
      if (window.location.hash === '#invite' && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });
    // Click on the dimmed backdrop (the dialog element itself, outside its content) closes it.
    dialog.addEventListener('mousedown', function (e) {
      if (e.target === dialog) dialog.close();
    });
    dialog.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { dialog.close(); });
    });

    document.querySelectorAll('a[href="#invite"], a[href="/#invite"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        open();
      });
    });
    window.addEventListener('hashchange', function () {
      if (window.location.hash === '#invite') open();
    });
    if (window.location.hash === '#invite') open();
  }

  // ---- Scroll reveal and step line. Content is visible by default; classes are only added here.
  function initReveal() {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) return;

    var steps = document.querySelector('.steps');
    var items = document.querySelectorAll('.section-head, .card, .trust-head, .trust-item');
    var stepItems = steps ? steps.querySelectorAll('.step') : [];

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        if (el.classList.contains('step')) { el.classList.add('drawn'); return; }
        el.classList.add('in');
        var done = function (ev) {
          if (ev.target !== el || ev.propertyName !== 'opacity') return;
          el.removeEventListener('transitionend', done);
          el.classList.remove('reveal', 'in');
        };
        el.addEventListener('transitionend', done);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

    items.forEach(function (el) { el.classList.add('reveal'); io.observe(el); });

    if (!steps || !stepItems.length) return;
    steps.classList.add('js-steps');

    // Pinned mode: section sticks while scroll steps through the four steps (and back). Only if it all fits on screen.
    var how = document.getElementById('how');
    var head = how.querySelector('.section-head');
    var pinned = null;
    var ticking = false;

    function fits() {
      return head.offsetHeight + 40 + steps.offsetHeight + 96 + 32 <= window.innerHeight;
    }
    function update() {
      ticking = false;
      if (!pinned) return;
      var total = how.offsetHeight - window.innerHeight;
      var p = total > 0 ? Math.min(1, Math.max(0, -how.getBoundingClientRect().top / total)) : 0;
      stepItems.forEach(function (el, i) {
        el.classList.toggle('drawn', p >= i * 0.22);
      });
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    function layout() {
      var want = fits();
      if (want) how.style.setProperty('--pin-h', Math.round(window.innerHeight * 2.8) + 'px');
      if (want === pinned) { if (pinned) update(); return; }
      if (pinned === null && !want) { pinned = false; stepItems.forEach(function (el) { io.observe(el); }); return; }
      pinned = want;
      how.classList.toggle('pin', pinned);
      stepItems.forEach(function (el, i) {
        el.style.setProperty('--d', pinned ? '0s' : (i * 0.32) + 's');
        if (pinned) io.unobserve(el); else { el.classList.remove('drawn'); io.observe(el); }
      });
      if (pinned) update();
    }
    stepItems.forEach(function (el, i) { el.style.setProperty('--d', (i * 0.32) + 's'); });
    window.addEventListener('scroll', onScroll, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
    window.addEventListener('load', layout);
    layout();
  }

  function init() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

    initDialog();
    initReveal();

    var form = document.getElementById('invite-form');
    if (!form) return;
    var status = document.getElementById('form-status');
    var done = document.getElementById('form-done');
    var button = form.querySelector('button[type="submit"]');

    var source = readSource();
    SOURCE_KEYS.forEach(function (k) {
      if (source[k] && form.elements[k]) form.elements[k].value = source[k];
    });

    function setStatus(text, isError) {
      status.textContent = text;
      status.classList.toggle('is-error', !!isError);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      setStatus('', false);

      if (!form.checkValidity()) {
        var firstInvalid = form.querySelector(':invalid');
        setStatus('Please fill in your name, company, work email and team size.', true);
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      if (form.elements.botcheck && form.elements.botcheck.checked) return;

      if (!keyIsSet()) {
        mailtoFallback(form);
        setStatus('Your email app should open with your details filled in. Just press send.', false);
        return;
      }

      var data = new FormData(form);
      data.set('access_key', ACCESS_KEY);
      data.set('subject', 'Invitation request: ' + (fieldValue(form, 'company') || 'Sigma NZ'));
      data.set('from_name', 'Sigma NZ website');
      data.set('page', window.location.pathname);

      button.disabled = true;
      button.textContent = 'Sending…';

      fetch(ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            return res.ok && json && json.success;
          });
        })
        .then(function (ok) {
          if (ok) {
            form.hidden = true;
            done.hidden = false;
            done.focus();
            try { sessionStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
          } else {
            setStatus('That didn’t send. Please email ' + CONTACT + ' instead.', true);
          }
        })
        .catch(function () {
          setStatus('That didn’t send. Please email ' + CONTACT + ' instead.', true);
        })
        .then(function () {
          button.disabled = false;
          button.textContent = 'Request an invitation';
        });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
