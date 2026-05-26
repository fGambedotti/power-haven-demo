(function () {
  var header = document.querySelector('.site-header');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var nav = document.getElementById('site-nav');

  function setScrolledHeader() {
    if (!header) return;
    if (window.scrollY > 8) {
      header.classList.add('is-scrolled');
    } else {
      header.classList.remove('is-scrolled');
    }
  }

  setScrolledHeader();
  window.addEventListener('scroll', setScrolledHeader, { passive: true });

  if (menuToggle && nav) {
    menuToggle.addEventListener('click', function () {
      var isOpen = nav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  document.querySelectorAll('[data-stagger-group]').forEach(function (group) {
    var staggerIndex = 0;
    Array.from(group.children).forEach(function (child) {
      if (child.matches('[data-reveal], .card, article, p')) {
        child.style.transitionDelay = String(staggerIndex * 80) + 'ms';
        staggerIndex += 1;
      }
    });
  });

  var revealTargets = document.querySelectorAll('[data-reveal], [data-stagger-group] > *');
  var revealObserver = new IntersectionObserver(
    function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
  );

  revealTargets.forEach(function (target) {
    revealObserver.observe(target);
  });

  var chartWrap = document.querySelector('[data-chart-reveal]');
  if (!chartWrap) return;

  var chartObserver = new IntersectionObserver(
    function (entries, observer) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var chart = chartWrap.querySelector('.hero-chart');
        if (chart) {
          chart.classList.add('chart-drawn');
        }
        observer.disconnect();
      });
    },
    { threshold: 0.25 }
  );

  chartObserver.observe(chartWrap);
})();
