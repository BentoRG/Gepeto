(function () {
  const root = document.getElementById('busca-resumos');
  if (!root) return;

  const input = document.getElementById('busca-input');
  const btn = document.getElementById('busca-btn');
  const status = document.getElementById('busca-status');
  const resultsBox = document.getElementById('busca-resultados');
  const resultsBody = document.getElementById('busca-resultados-body');

  const contentCache = new Map();

  function normalizeText(text) {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function parseTerms(query) {
    return query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(normalizeText);
  }

  function matchesQuery(text, terms) {
    if (!terms.length) return false;
    const normalized = normalizeText(text);
    return terms.every((term) => normalized.includes(term));
  }

  function resolveHref(href) {
    if (!href) return null;
    if (href.startsWith('http') || href.startsWith('/')) return href;
    return href.includes('.html') ? href : `${href}.html`;
  }

  function collectEntries() {
    const entries = [];
    document.querySelectorAll('.section table tbody tr').forEach((tr) => {
      const cells = tr.querySelectorAll('td');
      if (cells.length < 4) return;

      const link = cells[2].querySelector('a');
      const href = resolveHref(link?.getAttribute('href'));
      if (!link || !href) return;

      const section = tr.closest('.section');
      const subject = section?.querySelector('h2')?.textContent?.replace(/:$/, '').trim() ?? '';

      entries.push({
        year: cells[0].textContent.trim(),
        school: cells[1].textContent.trim(),
        title: link.textContent.trim(),
        href,
        author: cells[3].textContent.trim(),
        subject,
      });
    });
    return entries;
  }

  function htmlToText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const container = doc.querySelector('.container') ?? doc.body;
    return container.textContent.replace(/\s+/g, ' ').trim();
  }

  async function loadContent(href) {
    if (contentCache.has(href)) return contentCache.get(href);

    const res = await fetch(href);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const text = htmlToText(html);
    contentCache.set(href, text);
    return text;
  }

  function buildSnippet(text, terms) {
    const normalized = normalizeText(text);
    let index = -1;

    for (const term of terms) {
      const pos = normalized.indexOf(term);
      if (pos === -1) return '';
      if (index === -1 || pos < index) index = pos;
    }

    const start = Math.max(0, index - 60);
    const end = Math.min(text.length, index + 100);
    let snippet = text.slice(start, end).trim();
    if (start > 0) snippet = '… ' + snippet;
    if (end < text.length) snippet += ' …';
    return snippet;
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function renderResults(rows) {
    resultsBody.innerHTML = '';

    if (!rows.length) {
      resultsBox.hidden = true;
      return;
    }

    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${row.school}</td>
        <td>${row.subject}</td>
        <td><a href="${row.href}">${row.title}</a><br><small>${row.snippet}</small></td>
        <td>${row.author}</td>
      `;
      resultsBody.appendChild(tr);
    }

    resultsBox.hidden = false;
  }

  async function runSearch() {
    const query = input.value;
    const terms = parseTerms(query);

    if (!terms.length) {
      setStatus('Digite o que você quer encontrar nos resumos.');
      resultsBox.hidden = true;
      return;
    }

    const entries = collectEntries();
    if (!entries.length) {
      setStatus('Não há resumos cadastrados nesta página ainda.');
      resultsBox.hidden = true;
      return;
    }

    btn.disabled = true;
    setStatus('Buscando nos resumos…');
    resultsBox.hidden = true;

    const matches = [];

    try {
      for (const entry of entries) {
        try {
          const content = await loadContent(entry.href);
          const searchable = `${entry.title} ${entry.subject} ${entry.author} ${content}`;
          if (matchesQuery(searchable, terms)) {
            matches.push({
              ...entry,
              snippet: buildSnippet(content, terms),
            });
          }
        } catch {
          /* ignora resumo inacessível */
        }
      }

      if (!matches.length) {
        setStatus(`Nenhum resumo encontrado para “${query}”.`);
        renderResults([]);
        return;
      }

      const label = matches.length === 1 ? 'resumo encontrado' : 'resumos encontrados';
      setStatus(`${matches.length} ${label} para “${query}”.`);
      renderResults(matches);
    } finally {
      btn.disabled = false;
    }
  }

  btn.addEventListener('click', runSearch);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });
})();
