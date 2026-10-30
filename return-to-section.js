(function () {
  const link = document.querySelector('#go_back a');
  if (!link) return;

  link.addEventListener('click', (event) => {
    const fallback = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
    const fallbackFile = decodeURIComponent(fallback.split('/').pop() || '');
    if (!fallbackFile) return;

    let refFile = '';
    try {
      const ref = new URL(document.referrer);
      if (ref.origin !== location.origin) return;
      refFile = decodeURIComponent(ref.pathname.split('/').pop() || '');
    } catch {
      return;
    }

    if (refFile !== fallbackFile || history.length <= 1) return;
    event.preventDefault();
    history.back();
  });
})();
