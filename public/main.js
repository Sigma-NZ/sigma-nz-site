/* Sigma NZ: invitation form and lead-source capture. No cookies, no third-party trackers. */
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

  function init() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });

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
