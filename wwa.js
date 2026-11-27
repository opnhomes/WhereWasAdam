/* Where Was Adam — shared behavior */
(function () {
  'use strict';
  var doc = document;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  /* scroll a horizontal strip so the active item is centered, without moving the page */
  function centerIn(list, el) {
    if (!list || !el) return;
    list.scrollLeft = el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2;
  }

  /* NAV: the menu button toggles itself inline (see nav in each page), so it works even if this file fails to load */
  var navLinks = $('.nav-links');
  doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && navLinks) navLinks.classList.remove('open'); });

  /* READING / SCROLL PROGRESS */
  var bar = $('#progress');
  function onScroll() {
    if (!bar) return;
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* REVEAL ON SCROLL */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add('in'); }); }

  /* TABS */
  $$('[data-tabs]').forEach(function (root) {
    var tabs = $$('.tab', root);
    var panels = $$('[data-panel]', root.parentNode);
    function show(id, push) {
      var found = false;
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-target') === id;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        if (on) { found = true; centerIn(t.parentNode, t); }
      });
      if (!found) return;
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== id; });
      if (push && history.replaceState) history.replaceState(null, '', '#' + id);
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        show(t.getAttribute('data-target'), true);
        var top = root.getBoundingClientRect().top + window.scrollY - 60;
        if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
    $$('[data-next-tab]', root.parentNode).forEach(function (b) {
      b.addEventListener('click', function () {
        show(b.getAttribute('data-next-tab'), true);
        var top = root.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: top, behavior: 'smooth' });
      });
    });
    var start = (location.hash || '').slice(1);
    var ids = tabs.map(function (t) { return t.getAttribute('data-target'); });
    show(ids.indexOf(start) > -1 ? start : ids[0], false);
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').slice(1);
      if (ids.indexOf(h) > -1) show(h, false);
    });
  });

  /* CHIP FILTERS */
  $$('.chips[data-filter]').forEach(function (group) {
    var items = $$(group.getAttribute('data-filter'));
    var chips = $$('.chip', group);
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-value');
        chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        items.forEach(function (it) {
          var cats = (it.getAttribute('data-cat') || '').split('|');
          it.hidden = !(v === 'all' || cats.indexOf(v) > -1);
        });
      });
    });
  });

  /* SERIES: expand + read tracking */
  var entries = $$('.entry[data-id]');
  function refreshProgress() {
    var meter = $('#series-meter'), label = $('#series-count');
    if (!meter) return;
    var live = entries.filter(function (e) { return e.getAttribute('data-live') === '1'; });
    var done = live.filter(function (e) { return e.classList.contains('read'); }).length;
    meter.style.width = (live.length ? (done / live.length) * 100 : 0) + '%';
    if (label) label.textContent = done + ' of ' + live.length + ' read';
  }
  entries.forEach(function (e) {
    var id = e.getAttribute('data-id');
    if (store.get('wwa-read-' + id) === '1') e.classList.add('read');
    var tg = $('[data-toggle]', e);
    if (tg) tg.addEventListener('click', function () {
      var open = e.classList.toggle('open');
      tg.textContent = open ? 'Less' : 'More';
    });
    var rm = $('.readmark', e);
    if (rm) rm.addEventListener('click', function () {
      var on = e.classList.toggle('read');
      if (on) store.set('wwa-read-' + id, '1'); else store.del('wwa-read-' + id);
      refreshProgress();
    });
  });
  refreshProgress();

  /* READER (reflections) */
  var reader = $('.reader');
  if (reader) {
    var steps = $$('.step', reader);
    var navBtns = $$('.stepnav button', reader);
    var prev = $('[data-prev]', reader), next = $('[data-next]', reader), count = $('.count', reader);
    var rid = reader.getAttribute('data-id');
    var cur = 0;
    function go(i, scroll) {
      cur = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function (s, n) { s.hidden = n !== cur; });
      navBtns.forEach(function (b, n) {
        b.setAttribute('aria-selected', n === cur ? 'true' : 'false');
        if (n < cur) b.classList.add('done');
      });
      if (prev) prev.disabled = cur === 0;
      if (next) { next.disabled = cur === steps.length - 1; }
      if (count) count.textContent = (cur + 1) + ' / ' + steps.length;
      if (history.replaceState) history.replaceState(null, '', '#s' + (cur + 1));
      if (cur === steps.length - 1 && rid) store.set('wwa-read-' + rid, '1');
      if (scroll) {
        var top = reader.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
      centerIn($('.stepnav', reader), navBtns[cur]);
    }
    navBtns.forEach(function (b, n) { b.addEventListener('click', function () { go(n, true); }); });
    if (prev) prev.addEventListener('click', function () { go(cur - 1, true); });
    if (next) next.addEventListener('click', function () { go(cur + 1, true); });
    doc.addEventListener('keydown', function (e) {
      if (reader.classList.contains('all')) return;
      var tag = (e.target && e.target.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.key === 'ArrowRight') go(cur + 1, true);
      if (e.key === 'ArrowLeft') go(cur - 1, true);
    });
    var allBtn = $('[data-all]');
    if (allBtn) allBtn.addEventListener('click', function () {
      var on = reader.classList.toggle('all');
      allBtn.textContent = on ? 'Read one step at a time' : 'Read as one page';
      if (on) { steps.forEach(function (s) { s.hidden = false; }); if (rid) store.set('wwa-read-' + rid, '1'); }
      else go(cur, false);
    });
    var m = /^#s(\d+)$/.exec(location.hash || '');
    go(m ? parseInt(m[1], 10) - 1 : 0, false);
  }

  /* EMAIL SIGNUP -> Kit (public API key, safe in the page) */
  $$('form.signup').forEach(function (f) {
    var msg = $('.signup-msg', f), btn = $('button[type=submit]', f), email = $('input[type=email]', f);
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('.hp', f).value) return;                       // bot trap
      var v = (email.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg.textContent = 'Please enter a valid email address.'; email.focus(); return; }
      var label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Signing you up\u2026'; msg.textContent = '';
      fetch('https://api.convertkit.com/v3/forms/' + f.getAttribute('data-kit-form') + '/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ api_key: f.getAttribute('data-kit-key'), email: v })
      }).then(function (r) {
        return r.json().then(function (d) { return { ok: r.ok, d: d }; });
      }).then(function (res) {
        if (res.ok) { window.location.href = 'thank-you.html'; return; }
        throw new Error((res.d && (res.d.message || res.d.error)) || 'Something went wrong');
      }).catch(function () {
        btn.disabled = false; btn.textContent = label;
        msg.textContent = 'Sorry, that didn\u2019t go through. Please try again in a moment.';
      });
    });
  });

  /* DAILY VERSE */
  var verses = [
    ['Where are you?', 'Genesis 3:9'],
    ['God created mankind in his image; in the image of God he created them; male and female he created them.', 'Genesis 1:27'],
    ['As for me and my household, we will serve the LORD.', 'Joshua 24:15'],
    ['Be watchful, stand firm in the faith, act like men, be strong.', '1 Corinthians 16:13'],
    ['Husbands, love your wives, even as Christ loved the church and handed himself over for her.', 'Ephesians 5:25'],
    ['Iron is sharpened by iron; one person sharpens another.', 'Proverbs 27:17'],
    ['With all vigilance guard your heart, for in it are the sources of life.', 'Proverbs 4:23'],
    ['Tend the flock of God in your midst… Do not lord it over those assigned to you, but be examples to the flock.', '1 Peter 5:2–3'],
    ['Let your “Yes” mean “Yes,” and your “No” mean “No.” Anything more is from the evil one.', 'Matthew 5:37'],
    ['Be doers of the word and not hearers only, deluding yourselves.', 'James 1:22'],
    ['Whoever wishes to come after me must deny himself, take up his cross, and follow me.', 'Matthew 16:24'],
    ['Bear one another’s burdens, and so you will fulfill the law of Christ.', 'Galatians 6:2'],
    ['Children, let us love not in word or speech but in deed and truth.', '1 John 3:18'],
    ['God did not give us a spirit of cowardice but rather of power and love and self-control.', '2 Timothy 1:7'],
    ['Be still and know that I am God!', 'Psalm 46:11'],
    ['Then I heard the voice of the Lord saying, “Whom shall I send? Who will go for us?” “Here I am,” I said; “send me!”', 'Isaiah 6:8'],
    ['Has none but this foreigner returned to give thanks to God?', 'Luke 17:18'],
    ['\u2026not my will but yours be done.', 'Luke 22:42']
  ];
  var vt = $('#dv-text');
  if (vt) {
    var now = new Date();
    var doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
    var v = verses[doy % verses.length];
    vt.textContent = '“' + v[0] + '”';
    var vc = $('#dv-cite'); if (vc) vc.textContent = v[1];
    var vd = $('#dv-date');
    if (vd) vd.textContent = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /* RESOURCES: "This Week" follows the calendar */
  var wkData = $('#wk-data');
  if (wkData) {
    try {
      var weeks = JSON.parse(wkData.textContent), now2 = new Date(), cur = weeks[0];
      weeks.forEach(function (w) { if (new Date(w.start + 'T00:00:00') <= now2) cur = w; });
      $('#wk-h2').textContent = cur.h2;
      $('#wk-card').innerHTML = cur.card;
    } catch (err) {}
  }

  /* WEEKLY CHALLENGE */
  var ch = window.WWA_CHALLENGES;
  var ct = $('#wc-title');
  if (ch && ct) {
    var today = new Date(), pick = ch[0];
    ch.forEach(function (c) { if (new Date(c.start + 'T00:00:00') <= today) pick = c; });
    ct.textContent = pick.title;
    $('#wc-kicker').textContent = pick.kicker;
    $('#wc-body').textContent = pick.body;
    $('#wc-link').setAttribute('href', pick.href);
  }
})();
