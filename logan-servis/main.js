// Live open/closed status (Moscow time) and the sticky call dock.
(function () {
  var DAYS = ['в воскресенье', 'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу'];

  function moscowNow() {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Moscow', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    var get = function (t) { return parts.filter(function (p) { return p.type === t; })[0].value; };
    var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day: wd, min: (+get('hour') % 24) * 60 + +get('minute') };
  }
  var toMin = function (s) { var p = s.split(':'); return +p[0] * 60 + +p[1]; };
  var label = function (s) { return s.replace(/^0/, ''); };

  function compute(hours) {
    var now = moscowNow();
    // 24/7: open "00:00", close "24:00" on all days.
    var today = hours.filter(function (h) { return (h.weekdays || []).indexOf(now.day) > -1; })[0];
    if (today && now.min >= toMin(today.open) && now.min < toMin(today.close)) {
      return { open: true, text: today.close === '24:00' && today.open === '00:00' ? 'Открыто круглосуточно' : 'Открыто до ' + label(today.close) };
    }
    for (var i = 0; i < 8; i++) {
      var d = (now.day + i) % 7;
      var h = hours.filter(function (x) { return (x.weekdays || []).indexOf(d) > -1; })[0];
      if (!h) continue;
      if (i === 0 && now.min >= toMin(h.open)) continue;
      var when = i === 0 ? 'сегодня' : i === 1 ? 'завтра' : DAYS[d];
      return { open: false, text: 'Закрыто. Откроемся ' + when.replace(' ', ' ') + ' в ' + label(h.open) };
    }
    return null;
  }

  document.querySelectorAll('[data-hours]').forEach(function (el) {
    try {
      var s = compute(JSON.parse(el.getAttribute('data-hours')));
      if (!s) return;
      el.classList.add(s.open ? 'is-open' : 'is-closed');
      el.querySelector('.status__text').textContent = s.text;
    } catch (e) { /* keep static hours */ }
  });

  // Dock appears once the hero call button leaves the screen, hides near the closing call.
  var dock = document.querySelector('[data-dock]');
  var calls = document.querySelectorAll('[data-call]');
  if (dock && calls.length && 'IntersectionObserver' in window) {
    dock.hidden = false;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.isIntersecting ? visible.add(e.target) : visible.delete(e.target); });
      dock.classList.toggle('is-shown', visible.size === 0);
    });
    calls.forEach(function (c) { io.observe(c); });
  }

  // Spotlight: one rAF per move writes the pointer position into two CSS variables; touch is skipped.
  document.querySelectorAll('[data-spotlight]').forEach(function (el) {
    var frame = 0;
    el.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var x = e.clientX, y = e.clientY;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(function () {
        var b = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', (x - b.left) + 'px');
        el.style.setProperty('--spot-y', (y - b.top) + 'px');
      });
    });
  });

  // Scroll reveal: below-the-fold blocks rise in once; siblings in one group get a short stagger.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    var targets = document.querySelectorAll('.sec .stamp, .reviews__lead, .price, .works__group, .master__photo, .master__text, .feat, .step, .gallery .pocket, .review, .pocket--faq, .faq__ask, .close__copy, .close__act, .facts');
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        reveal.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--i', Math.min(i, 6));
      reveal.observe(el);
    });
    document.documentElement.classList.add('reveal-on');
  }
})();
