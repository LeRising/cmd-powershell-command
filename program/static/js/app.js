(function() {
    'use strict';

    const COMMANDS = window.COMMAND_DATA || [];
    let fuseIndex = null;
    let currentSource = 'all';
    const selectedCategories = new Set();

    // Initialize Fuse.js index
    function initFuse() {
        fuseIndex = new Fuse(COMMANDS, {
            keys: [
                { name: 'name', weight: 0.4 },
                { name: 'tags', weight: 0.35 },
                { name: 'description', weight: 0.15 },
                { name: 'categoryLabel', weight: 0.1 }
            ],
            threshold: 0.4,
            includeScore: true,
            includeMatches: true,
            minMatchCharLength: 1,
            ignoreLocation: true,
            useExtendedSearch: true
        });
    }

    // Initialize category checkboxes
    function initCategories() {
        const cats = window.CATEGORIES || [];
        cats.forEach(c => selectedCategories.add(c.key));
        document.querySelectorAll('.category-check').forEach(cb => {
            cb.addEventListener('change', updateFilters);
        });
        updateCategoryCount();
    }

    // Debounce utility
    function debounce(fn, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // Search handler
    function doSearch(query) {
        let results;
        const q = query.trim();

        if (q.length < 2) {
            results = COMMANDS.map((cmd, i) => ({ item: cmd, score: 0, matches: [], refIndex: i }));
        } else {
            results = fuseIndex.search(q);
            // Fallback: substring match if Fuse returns nothing
            if (results.length === 0) {
                const lowerQ = q.toLowerCase();
                results = COMMANDS
                    .map((cmd, i) => {
                        const inName = cmd.name.toLowerCase().includes(lowerQ);
                        const inDesc = cmd.description.toLowerCase().includes(lowerQ);
                        const inTags = cmd.tags.some(t => t.toLowerCase().includes(lowerQ));
                        if (inName || inDesc || inTags) {
                            return { item: cmd, score: inName ? 0.1 : 0.3, matches: [], refIndex: i };
                        }
                        return null;
                    })
                    .filter(Boolean);
            }
        }

        // Apply source filter
        if (currentSource !== 'all') {
            results = results.filter(r => r.item.source === currentSource);
        }

        // Apply category filter
        if (selectedCategories.size > 0) {
            results = results.filter(r => selectedCategories.has(r.item.category));
        }

        renderResults(results, q);
        updateClearButton(q);
    }

    const handleSearch = debounce(function() {
        const query = document.getElementById('searchInput').value;
        doSearch(query);
    }, 150);

    function updateFilters() {
        selectedCategories.clear();
        document.querySelectorAll('.category-check:checked').forEach(cb => {
            selectedCategories.add(cb.value);
        });
        updateCategoryCount();
        doSearch(document.getElementById('searchInput').value);
    }

    function updateCategoryCount() {
        const total = document.querySelectorAll('.category-check').length;
        const selected = selectedCategories.size;
        document.getElementById('selectedCount').textContent =
            `已选 ${selected}/${total} 个分类`;
    }

    // Clear button visibility
    function updateClearButton(query) {
        const btn = document.getElementById('searchClear');
        if (btn) {
            btn.classList.toggle('visible', query.length > 0);
        }
    }

    // Render results
    function renderResults(results, query) {
        const grid = document.getElementById('resultsGrid');
        const empty = document.getElementById('emptyState');
        const header = document.getElementById('resultsCount');

        if (results.length === 0) {
            grid.innerHTML = '';
            empty.style.display = '';
            header.innerHTML = query
                ? `搜索 "<em>${escapeHtml(query)}</em>" — 找到 0 条结果`
                : `找到 0 条结果`;
            // Show suggestions in empty state
            updateEmptySuggestions(query);
            return;
        }

        empty.style.display = 'none';
        header.innerHTML = query
            ? `搜索 "<em>${escapeHtml(query)}</em>" — 找到 <em>${results.length}</em> 条结果`
            : `显示全部 <em>${results.length}</em> 条命令`;

        grid.innerHTML = results.map(r => buildCard(r.item, r.matches || [])).join('');

        // Highlight code blocks
        if (typeof hljs !== 'undefined') {
            document.querySelectorAll('.cmd-card pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        }

        attachCopyButtons();
    }

    function updateEmptySuggestions(query) {
        const container = document.getElementById('emptySuggestions');
        if (!container) return;

        const suggestions = ['ipconfig', 'Get-Process', 'regedit', 'ping', 'dir', 'netstat', 'taskmgr', 'robocopy'];
        const filtered = query
            ? suggestions.filter(s => !s.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
            : suggestions.slice(0, 6);

        container.innerHTML = filtered.map(s =>
            `<span class="suggestion-chip" data-query="${escapeHtml(s)}">${escapeHtml(s)}</span>`
        ).join('');

        container.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                const q = this.getAttribute('data-query');
                document.getElementById('searchInput').value = q;
                doSearch(q);
                document.getElementById('searchInput').focus();
            });
        });
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Build a single command card
    function buildCard(cmd, matches) {
        const sourceClass = cmd.source === 'cmd' ? 'cmd' : cmd.source === 'powershell' ? 'ps' : 'run';
        const sourceLabel = cmd.source === 'cmd' ? 'CMD' : cmd.source === 'powershell' ? 'PS' : '运行';
        const cardSourceClass = `source-${sourceClass}`;

        let descHtml = escapeHtml(cmd.description);
        if (matches.length > 0) {
            descHtml = highlightText(cmd.description, matches);
        }

        // Build parameters table
        let paramsHtml = '';
        if (cmd.parameters && cmd.parameters.length > 0) {
            const rows = cmd.parameters.map(p => {
                const reqClass = p.required ? 'required' : 'optional';
                const reqLabel = p.required ? '必需' : '可选';
                return `<tr>
                    <td>${escapeHtml(p.name)}</td>
                    <td>${escapeHtml(p.description)}</td>
                    <td><span class="required-badge ${reqClass}">${reqLabel}</span></td>
                </tr>`;
            }).join('');
            paramsHtml = `
                <button class="params-toggle" onclick="this.classList.toggle('open');this.nextElementSibling.hidden=!this.nextElementSibling.hidden">
                    <span class="arrow">▶</span> 参数列表 (${cmd.parameters.length})
                </button>
                <div hidden>
                    <table class="params-table">
                        <thead><tr><th>参数</th><th>说明</th><th></th></tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>`;
        }

        // Build examples
        let examplesHtml = '';
        if (cmd.examples && cmd.examples.length > 0) {
            const langClass = cmd.source === 'cmd' ? 'language-bash' : cmd.source === 'powershell' ? 'language-powershell' : 'language-bash';
            const items = cmd.examples.map(ex =>
                `<div class="example-item">
                    <div class="example-desc">${escapeHtml(ex.description)}</div>
                    <pre><code class="${langClass}">${escapeHtml(ex.command)}</code></pre>
                    <button class="copy-btn" data-code="${escapeHtml(ex.command)}">复制</button>
                </div>`
            ).join('');
            examplesHtml = `
                <div class="examples-block">
                    <div class="examples-label">示例</div>
                    ${items}
                </div>`;
        }

        // Build tags
        let tagsHtml = '';
        if (cmd.tags && cmd.tags.length > 0) {
            tagsHtml = `<div class="tags-row">${cmd.tags.map(t =>
                `<span class="tag-pill">${escapeHtml(t)}</span>`
            ).join('')}</div>`;
        }

        const langClass = cmd.source === 'cmd' ? 'language-bash' : cmd.source === 'powershell' ? 'language-powershell' : 'language-bash';

        return `
        <div class="cmd-card ${cardSourceClass}">
            <div class="card-header">
                <span class="cmd-name">${escapeHtml(cmd.name)}</span>
                <span class="source-badge ${sourceClass}">${sourceLabel}</span>
                <span class="cat-badge">${escapeHtml(cmd.categoryLabel)}</span>
            </div>
            <div class="cmd-desc">${descHtml}</div>
            <div class="syntax-block">
                <pre><code class="${langClass}">${escapeHtml(cmd.syntax)}</code></pre>
                <button class="copy-btn" data-code="${escapeHtml(cmd.syntax)}">复制</button>
            </div>
            ${paramsHtml}
            ${examplesHtml}
            ${tagsHtml}
        </div>`;
    }

    function highlightText(text, matches) {
        if (!matches || matches.length === 0) return escapeHtml(text);
        const indices = [];
        matches.forEach(m => {
            if (m.indices) indices.push(...m.indices);
        });
        if (indices.length === 0) return escapeHtml(text);

        indices.sort((a, b) => a[0] - b[0]);
        const merged = [indices[0]];
        for (let i = 1; i < indices.length; i++) {
            const last = merged[merged.length - 1];
            if (indices[i][0] <= last[1] + 1) {
                last[1] = Math.max(last[1], indices[i][1]);
            } else {
                merged.push(indices[i]);
            }
        }

        let result = '';
        let pos = 0;
        merged.forEach(([start, end]) => {
            if (start > pos) result += escapeHtml(text.slice(pos, start));
            result += '<mark>' + escapeHtml(text.slice(start, end + 1)) + '</mark>';
            pos = end + 1;
        });
        if (pos < text.length) result += escapeHtml(text.slice(pos));
        return result;
    }

    // Copy button handler
    function attachCopyButtons() {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const code = this.getAttribute('data-code');
                navigator.clipboard.writeText(code).then(() => {
                    this.textContent = '已复制!';
                    this.classList.add('copied');
                    setTimeout(() => {
                        this.textContent = '复制';
                        this.classList.remove('copied');
                    }, 1500);
                }).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = code;
                    ta.style.position = 'fixed'; ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    this.textContent = '已复制!';
                    this.classList.add('copied');
                    setTimeout(() => {
                        this.textContent = '复制';
                        this.classList.remove('copied');
                    }, 1500);
                });
            });
        });
    }

    // Source toggle handler
    document.querySelectorAll('input[name="source"]').forEach(radio => {
        radio.addEventListener('change', function() {
            currentSource = this.value;
            doSearch(document.getElementById('searchInput').value);
        });
    });

    // Select all / Clear all
    document.getElementById('selectAll').addEventListener('click', function() {
        document.querySelectorAll('.category-check').forEach(cb => { cb.checked = true; });
        updateFilters();
    });
    document.getElementById('clearAll').addEventListener('click', function() {
        document.querySelectorAll('.category-check').forEach(cb => { cb.checked = false; });
        updateFilters();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        const input = document.getElementById('searchInput');
        // / to focus search
        if (e.key === '/' && document.activeElement !== input &&
            document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            input.focus();
            input.select();
        }
        // Escape to clear
        if (e.key === 'Escape') {
            input.value = '';
            input.focus();
            doSearch('');
        }
    });

    // Clear search button
    var clearBtn = document.getElementById('searchClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            var input = document.getElementById('searchInput');
            input.value = '';
            input.focus();
            doSearch('');
        });
    }

    // Back to top button
    var backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        var mainContent = document.getElementById('mainContent');
        window.addEventListener('scroll', function() {
            var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            backToTopBtn.classList.toggle('visible', scrollTop > 300);
        }, { passive: true });

        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Mobile menu toggle
    var menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-btn';
    menuBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    menuBtn.addEventListener('click', function() {
        document.getElementById('sidebar').classList.toggle('open');
    });
    document.querySelector('.top-bar-inner').insertBefore(menuBtn, document.querySelector('.search-wrapper'));

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', function(e) {
        var sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !e.target.closest('.mobile-menu-btn')) {
            sidebar.classList.remove('open');
        }
    });

    // Initialize
    function init() {
        initFuse();
        initCategories();
        doSearch('');
        document.getElementById('searchInput').addEventListener('input', handleSearch);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
