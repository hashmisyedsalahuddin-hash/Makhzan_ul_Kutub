(function() {
    'use strict';

    const DATA_BASE = './data/mishkat';
    const STORAGE_KEYS = {
        FAVS: 'makhzan_mishkat_favs_v1',
        NOTES: 'makhzan_mishkat_notes_v1',
        RESUME: 'makhzan_mishkat_resume_v1',
        MODE: 'makhzan_mishkat_mode_v1'
    };

    const ROW_THEMES = [
        'mk-row-purple', 'mk-row-rose', 'mk-row-slate',
        'mk-row-olive', 'mk-row-violet', 'mk-row-magenta'
    ];

    function svgIcon(name, extraClass) {
        const cls = 'svg-ic' + (extraClass ? ' ' + extraClass : '');
        const paths = {
            book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>',
            layers: '<polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline>',
            doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
            chevronLeft: '<polyline points="15 18 9 12 15 6"></polyline>',
            chevronDown: '<polyline points="6 9 12 15 18 9"></polyline>',
            arrowRight: '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>',
            heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
            search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
            bookmark: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>',
            note: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>',
            trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>'
        };
        return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || '') + '</svg>';
    }

    function escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function formatMultilineParas(txt, cls) {
        const paras = String(txt || '').split(/\n+/).map(p => p.trim()).filter(Boolean);
        if (!paras.length) return '';
        return paras.map(p => '<p class="' + cls + '">' + escapeHtml(p) + '</p>').join('');
    }

    function readJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
    }

    function writeJson(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }

    const state = {
        index: null,
        booksCache: {},
        muqaddima: null,
        mode: localStorage.getItem(STORAGE_KEYS.MODE) || 'mazameen',
        currentBookId: null,
        currentBaabId: null,
        allSharhExpanded: false,
        favs: readJson(STORAGE_KEYS.FAVS, []),
        notes: readJson(STORAGE_KEYS.NOTES, {}),
        resume: readJson(STORAGE_KEYS.RESUME, null)
    };

    const el = {
        indexView: document.getElementById('mishkatIndexView'),
        readerView: document.getElementById('mishkatReaderView'),
        tabMazameen: document.getElementById('mkTabMazameen'),
        tabJild: document.getElementById('mkTabJild'),
        muqaddimaBtn: document.getElementById('mkMuqaddimaBtn'),
        listContainer: document.getElementById('mkListContainer'),
        backToIndexBtn: document.getElementById('mkBackToIndexBtn'),
        readerKitabTitle: document.getElementById('mkReaderKitabTitle'),
        readerBaabTitle: document.getElementById('mkReaderBaabTitle'),
        toggleAllSharhBtn: document.getElementById('mkToggleAllSharhBtn'),
        hadithList: document.getElementById('mkHadithList'),
        prevBaabBtn: document.getElementById('mkPrevBaabBtn'),
        nextBaabBtn: document.getElementById('mkNextBaabBtn'),
        btnFavorite: document.getElementById('mkBtnFavorite'),
        btnSearch: document.getElementById('mkBtnSearch'),
        btnResume: document.getElementById('mkBtnResume'),
        btnNotes: document.getElementById('mkBtnNotes'),
        modal: document.getElementById('mishkatToolModal'),
        modalTitle: document.getElementById('mkModalTitle'),
        modalBody: document.getElementById('mkModalBody'),
        modalCloseBtn: document.getElementById('mkModalCloseBtn')
    };

    function hydrateStaticIcons() {
        const setHtml = (id, html) => { const n = document.getElementById(id); if (n) n.innerHTML = html; };
        setHtml('mkIconMazameen', svgIcon('book', 'svg-ic-sm'));
        setHtml('mkIconJild', svgIcon('layers', 'svg-ic-sm'));
        setHtml('mkIconMuqaddima', svgIcon('doc', 'svg-ic-lg'));
        setHtml('mkArrowMuqaddima', svgIcon('chevronLeft', 'svg-ic'));
        setHtml('mkBackIcon', svgIcon('arrowRight', 'svg-ic-sm'));
        setHtml('mkTileIcoFav', svgIcon('heart', 'svg-ic'));
        setHtml('mkTileIcoSearch', svgIcon('search', 'svg-ic'));
        setHtml('mkTileIcoResume', svgIcon('bookmark', 'svg-ic'));
        setHtml('mkTileIcoNotes', svgIcon('note', 'svg-ic'));
    }

    async function fetchIndex() {
        if (state.index) return state.index;
        const res = await fetch(DATA_BASE + '/index.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load index.json');
        state.index = await res.json();
        return state.index;
    }

    async function fetchBook(bookId) {
        const id = Number(bookId);
        if (state.booksCache[id]) return state.booksCache[id];
        const idx = await fetchIndex();
        const meta = (idx.books || []).find(b => Number(b.id) === id);
        if (!meta) throw new Error('Book not found: ' + id);
        const res = await fetch(DATA_BASE + '/' + meta.file, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load ' + meta.file);
        const bookData = await res.json();
        state.booksCache[id] = bookData;
        return bookData;
    }

    async function fetchMuqaddima() {
        if (state.muqaddima) return state.muqaddima;
        const res = await fetch(DATA_BASE + '/muqaddima.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load muqaddima.json');
        state.muqaddima = await res.json();
        return state.muqaddima;
    }

    function renderBaabRow(book, baab, themeIdx) {
        const themeClass = ROW_THEMES[themeIdx % ROW_THEMES.length];
        const rangeText = (baab.firstNum && baab.lastNum)
            ? 'حدیث ' + escapeHtml(baab.firstNum) + ' تا ' + escapeHtml(baab.lastNum) + ' (' + baab.count + ')'
            : baab.count + ' احادیث';
        return (
            '<button type="button" class="mishkat-baab-row ' + themeClass + '" data-book-id="' + book.id + '" data-baab-id="' + baab.id + '">' +
                '<span class="mk-row-doc-ico">' + svgIcon('doc', 'svg-ic') + '</span>' +
                '<span class="mk-row-titles">' +
                    '<span class="mk-row-ur">' + escapeHtml(baab.titleUr) + '</span>' +
                    '<span class="mk-row-meta">' + rangeText + '</span>' +
                '</span>' +
                '<span class="mk-row-arrow">' + svgIcon('chevronLeft', 'svg-ic-sm') + '</span>' +
            '</button>'
        );
    }

    function renderKitabCard(book, startThemeOffset) {
        let idx = startThemeOffset || 0;
        const rowsHtml = (book.abwaab || []).map(b => renderBaabRow(book, b, idx++)).join('');
        return (
            '<div class="mishkat-kitab-card">' +
                '<div class="mishkat-kitab-header">' +
                    '<div>' +
                        '<div class="mishkat-kitab-title">' + escapeHtml(book.titleUr) + '</div>' +
                        (book.titleAr ? '<div class="mishkat-kitab-ar">' + escapeHtml(book.titleAr) + '</div>' : '') +
                    '</div>' +
                    '<div class="mishkat-abwaab-badge">' + (book.abwaab ? book.abwaab.length : 0) + ' ابواب</div>' +
                '</div>' +
                '<div class="mishkat-kitab-pointer"></div>' +
                '<div class="mishkat-baab-list">' + rowsHtml + '</div>' +
            '</div>'
        );
    }

    async function renderIndexList() {
        if (!el.listContainer) return;
        try {
            const idx = await fetchIndex();
            const books = idx.books || [];
            if (state.mode === 'jild') {
                const jilds = idx.jilds || [{ id: 1, titleUr: 'جلد اول' }];
                let html = '';
                let themeCursor = 0;
                for (const j of jilds) {
                    const jBooks = books.filter(b => Number(b.jild || 1) === Number(j.id));
                    if (!jBooks.length) continue;
                    html += '<div class="mishkat-jild-heading"><span>' + escapeHtml(j.titleUr) + '</span><span class="mishkat-jild-meta">' + jBooks.length + ' کتب</span></div>';
                    for (const bk of jBooks) {
                        html += renderKitabCard(bk, themeCursor);
                        themeCursor += (bk.abwaab ? bk.abwaab.length : 0);
                    }
                }
                el.listContainer.innerHTML = html;
            } else {
                let html = '';
                let themeCursor = 0;
                for (const bk of books) {
                    html += renderKitabCard(bk, themeCursor);
                    themeCursor += (bk.abwaab ? bk.abwaab.length : 0);
                }
                el.listContainer.innerHTML = html;
            }
            bindBaabRowClicks();
        } catch (err) {
            el.listContainer.innerHTML = '<div class="mishkat-loading">ڈیٹا لوڈ کرنے میں دشواری پیش آئی۔</div>';
        }
    }

    function bindBaabRowClicks() {
        if (!el.listContainer) return;
        el.listContainer.querySelectorAll('.mishkat-baab-row').forEach(btn => {
            btn.addEventListener('click', () => {
                openBaab(Number(btn.getAttribute('data-book-id')), Number(btn.getAttribute('data-baab-id')));
            });
        });
    }

    function setMode(mode) {
        state.mode = mode === 'jild' ? 'jild' : 'mazameen';
        try { localStorage.setItem(STORAGE_KEYS.MODE, state.mode); } catch (e) {}
        if (el.tabMazameen) el.tabMazameen.classList.toggle('active', state.mode === 'mazameen');
        if (el.tabJild) el.tabJild.classList.toggle('active', state.mode === 'jild');
        renderIndexList();
    }

    function showIndexView(scrollToTop) {
        if (el.readerView) el.readerView.classList.remove('active');
        if (el.indexView) el.indexView.classList.add('active');
        if (scrollToTop !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showReaderView() {
        if (el.indexView) el.indexView.classList.remove('active');
        if (el.readerView) el.readerView.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    function getHadithUid(bookId, baabId, hadithNum) {
        return 'mk_' + bookId + '_' + baabId + '_' + hadithNum;
    }

    function isFavorited(uid) {
        return state.favs.some(f => f.uid === uid);
    }

    function toggleFavorite(item) {
        const idx = state.favs.findIndex(f => f.uid === item.uid);
        if (idx >= 0) state.favs.splice(idx, 1);
        else state.favs.unshift(item);
        writeJson(STORAGE_KEYS.FAVS, state.favs);
    }

    function saveResume(bookId, baabId, kitabTitle, baabTitle, hadithNum) {
        state.resume = { bookId, baabId, kitabTitle, baabTitle, hadithNum: hadithNum || '', updatedAt: Date.now() };
        writeJson(STORAGE_KEYS.RESUME, state.resume);
    }

    async function openBaab(bookId, baabId, targetHadithNum) {
        showReaderView();
        if (el.hadithList) el.hadithList.innerHTML = '<div class="mishkat-loading">احادیث لوڈ ہو رہی ہیں...</div>';

        try {
            const book = await fetchBook(bookId);
            const abwaab = book.abwaab || [];
            let bIdx = abwaab.findIndex(b => Number(b.id) === Number(baabId));
            if (bIdx < 0) bIdx = 0;
            const baab = abwaab[bIdx];
            if (!baab) return;

            state.currentBookId = Number(book.id);
            state.currentBaabId = Number(baab.id);
            state.allSharhExpanded = false;
            if (el.toggleAllSharhBtn) el.toggleAllSharhBtn.classList.remove('active');

            if (el.readerKitabTitle) el.readerKitabTitle.textContent = book.titleUr;
            if (el.readerBaabTitle) el.readerBaabTitle.textContent = baab.titleUr;

            saveResume(state.currentBookId, state.currentBaabId, book.titleUr, baab.titleUr, targetHadithNum || '');

            let lastFasl = '';
            let cardsHtml = '';
            for (const h of (baab.hadiths || [])) {
                if (h.fasl && h.fasl !== lastFasl) {
                    lastFasl = h.fasl;
                    cardsHtml += '<div class="mishkat-fasl-banner">' + escapeHtml(h.fasl) + '</div>';
                }
                const uid = getHadithUid(state.currentBookId, state.currentBaabId, h.num);
                const favActive = isFavorited(uid);
                const noteText = state.notes[uid] || '';

                cardsHtml += (
                    '<article class="mishkat-hadith-card" id="hadith-' + escapeHtml(h.num) + '" data-uid="' + uid + '" data-num="' + escapeHtml(h.num) + '">' +
                        '<div class="mishkat-hadith-meta">' +
                            '<span class="mishkat-hadith-num">حدیث نمبر: ' + escapeHtml(h.num) + '</span>' +
                            (h.ref ? '<span class="mishkat-hadith-grade">' + escapeHtml(h.ref) + '</span>' : '') +
                        '</div>' +
                        (h.ar ? '<div class="mishkat-ar-text">' + escapeHtml(h.ar) + '</div>' : '') +
                        (h.ur ? '<div class="mishkat-ur-text"><strong class="mk-sec-lbl">ترجمہ:</strong> ' + escapeHtml(h.ur) + '</div>' : '') +
                        (h.sharh ? (
                            '<div class="mishkat-sharh-wrap" id="sharh-wrap-' + uid + '">' +
                                '<button type="button" class="mishkat-sharh-toggle" data-target="sharh-wrap-' + uid + '">' +
                                    '<span>تشریح (مرآۃ المناجیح)</span>' +
                                    '<span class="mk-sharh-arrow">' + svgIcon('chevronDown', 'svg-ic-sm') + '</span>' +
                                '</button>' +
                                '<div class="mishkat-sharh-body">' + formatMultilineParas(h.sharh, 'mk-sharh-para') + '</div>' +
                            '</div>'
                        ) : '') +
                        (noteText ? '<div class="mishkat-saved-note-box"><strong>Note:</strong> ' + escapeHtml(noteText) + '</div>' : '') +
                        '<div class="mishkat-hadith-actions" dir="ltr">' +
                            '<button type="button" class="mishkat-act-btn mk-act-fav ' + (favActive ? 'active' : '') + '" data-uid="' + uid + '" data-num="' + escapeHtml(h.num) + '">' +
                                svgIcon('heart', 'svg-ic-sm') + '<span>' + (favActive ? 'Favorited' : 'Favorite') + '</span>' +
                            '</button>' +
                            '<button type="button" class="mishkat-act-btn mk-act-note ' + (noteText ? 'active' : '') + '" data-uid="' + uid + '" data-num="' + escapeHtml(h.num) + '">' +
                                svgIcon('note', 'svg-ic-sm') + '<span>' + (noteText ? 'Edit Note' : 'Note') + '</span>' +
                            '</button>' +
                        '</div>' +
                    '</article>'
                );
            }

            if (el.hadithList) el.hadithList.innerHTML = cardsHtml;

            if (el.prevBaabBtn) {
                el.prevBaabBtn.disabled = (bIdx <= 0);
                el.prevBaabBtn.onclick = () => { if (bIdx > 0) openBaab(state.currentBookId, abwaab[bIdx - 1].id); };
            }
            if (el.nextBaabBtn) {
                el.nextBaabBtn.disabled = (bIdx >= abwaab.length - 1);
                el.nextBaabBtn.onclick = () => { if (bIdx < abwaab.length - 1) openBaab(state.currentBookId, abwaab[bIdx + 1].id); };
            }

            el.hadithList.querySelectorAll('.mishkat-sharh-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const wrap = document.getElementById(btn.getAttribute('data-target'));
                    if (wrap) wrap.classList.toggle('open');
                });
            });

            el.hadithList.querySelectorAll('.mk-act-fav').forEach(btn => {
                btn.addEventListener('click', () => {
                    const hNum = btn.getAttribute('data-num');
                    const uid = btn.getAttribute('data-uid');
                    const hObj = (baab.hadiths || []).find(x => String(x.num) === String(hNum)) || {};
                    toggleFavorite({
                        uid, bookId: state.currentBookId, baabId: state.currentBaabId,
                        num: hNum, kitabTitle: book.titleUr, baabTitle: baab.titleUr,
                        snippet: (hObj.ur || hObj.sharh || hObj.ar || '').slice(0, 110)
                    });
                    const nowFav = isFavorited(uid);
                    btn.classList.toggle('active', nowFav);
                    const lbl = btn.querySelector('span');
                    if (lbl) lbl.textContent = nowFav ? 'Favorited' : 'Favorite';
                });
            });

            el.hadithList.querySelectorAll('.mk-act-note').forEach(btn => {
                btn.addEventListener('click', () => {
                    openNoteEditor(btn.getAttribute('data-uid'), btn.getAttribute('data-num'), book.titleUr, baab.titleUr);
                });
            });

            if (targetHadithNum) {
                const targetEl = document.getElementById('hadith-' + targetHadithNum);
                if (targetEl) setTimeout(() => targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
            }
        } catch (err) {
            if (el.hadithList) el.hadithList.innerHTML = '<div class="mishkat-loading">باب لوڈ نہیں ہو سکا۔</div>';
        }
    }

    function toggleAllSharh() {
        if (!el.hadithList) return;
        state.allSharhExpanded = !state.allSharhExpanded;
        if (el.toggleAllSharhBtn) el.toggleAllSharhBtn.classList.toggle('active', state.allSharhExpanded);
        el.hadithList.querySelectorAll('.mishkat-sharh-wrap').forEach(w => {
            w.classList.toggle('open', state.allSharhExpanded);
        });
    }

    function openModal(titleHtml, bodyHtml) {
        if (!el.modal || !el.modalTitle || !el.modalBody) return;
        el.modalTitle.innerHTML = titleHtml;
        el.modalBody.innerHTML = bodyHtml;
        el.modal.classList.add('show');
    }

    function closeModal() {
        if (el.modal) el.modal.classList.remove('show');
    }

    async function openMuqaddimaModal() {
        openModal(svgIcon('doc', 'svg-ic-sm') + '<span>مقدمہ — مرآۃ المناجیح</span>', '<div class="mishkat-loading">مقدمہ لوڈ ہو رہا ہے...</div>');
        try {
            const muq = await fetchMuqaddima();
            const blocksHtml = (muq.blocks || []).map(b => (
                '<div class="mk-muq-block">' +
                    (b.ar ? '<div class="mishkat-ar-text">' + escapeHtml(b.ar) + '</div>' : '') +
                    (b.ur ? '<div class="mishkat-ur-text">' + escapeHtml(b.ur) + '</div>' : '') +
                    (b.sharh ? '<div class="mk-muq-sharh">' + formatMultilineParas(b.sharh, 'mk-sharh-para') + '</div>' : '') +
                '</div>'
            )).join('');
            el.modalBody.innerHTML = '<div class="mk-muq-modal-sub">' + escapeHtml(muq.authorUr || '') + '</div>' + (blocksHtml || '<div class="bookmark-empty-state">مقدمہ دستیاب نہیں ہے۔</div>');
        } catch (e) {
            el.modalBody.innerHTML = '<div class="bookmark-empty-state">مقدمہ لوڈ نہیں ہو سکا۔</div>';
        }
    }

    function openFavoritesModal() {
        const listHtml = state.favs.length
            ? state.favs.map(f => (
                '<div class="bookmark-item-card">' +
                    '<div class="bookmark-item-main" data-book="' + f.bookId + '" data-baab="' + f.baabId + '" data-num="' + escapeHtml(f.num) + '">' +
                        '<div class="bookmark-item-title">حدیث ' + escapeHtml(f.num) + ' — ' + escapeHtml(f.baabTitle) + '</div>' +
                        '<div class="bookmark-item-snippet">' + escapeHtml(f.snippet || f.kitabTitle) + '</div>' +
                    '</div>' +
                    '<button type="button" class="bookmark-delete-btn" data-uid="' + escapeHtml(f.uid) + '" title="Remove">' + svgIcon('trash', 'svg-ic-sm') + '</button>' +
                '</div>'
            )).join('')
            : '<div class="bookmark-empty-state">Abhi koi Favorite Hadith save nahi hai.</div>';

        openModal(svgIcon('heart', 'svg-ic-sm') + '<span>Favorite Ahadees</span>', listHtml);

        el.modalBody.querySelectorAll('.bookmark-item-main').forEach(row => {
            row.addEventListener('click', () => {
                closeModal();
                openBaab(Number(row.getAttribute('data-book')), Number(row.getAttribute('data-baab')), row.getAttribute('data-num'));
            });
        });

        el.modalBody.querySelectorAll('.bookmark-delete-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const uid = btn.getAttribute('data-uid');
                state.favs = state.favs.filter(x => x.uid !== uid);
                writeJson(STORAGE_KEYS.FAVS, state.favs);
                openFavoritesModal();
            });
        });
    }

    function openNoteEditor(uid, hNum, kitabTitle, baabTitle) {
        const existing = state.notes[uid] || '';
        openModal(
            svgIcon('note', 'svg-ic-sm') + '<span>Hadith #' + escapeHtml(hNum) + ' Note</span>',
            '<div class="mk-note-editor-head">' + escapeHtml(baabTitle || kitabTitle || '') + '</div>' +
            '<textarea id="mkNoteTextarea" rows="5" class="mk-note-textarea" placeholder="Apna note ya faida yahan likhein...">' + escapeHtml(existing) + '</textarea>' +
            '<div class="mk-note-editor-actions">' +
                '<button type="button" id="mkSaveNoteBtn" class="mk-btn-primary">Save Note</button>' +
                (existing ? '<button type="button" id="mkDeleteNoteBtn" class="mk-btn-danger">Delete</button>' : '') +
            '</div>'
        );

        document.getElementById('mkSaveNoteBtn').addEventListener('click', () => {
            const val = (document.getElementById('mkNoteTextarea').value || '').trim();
            if (val) state.notes[uid] = val;
            else delete state.notes[uid];
            writeJson(STORAGE_KEYS.NOTES, state.notes);
            closeModal();
            if (state.currentBookId && state.currentBaabId) openBaab(state.currentBookId, state.currentBaabId, hNum);
        });

        const delBtn = document.getElementById('mkDeleteNoteBtn');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                delete state.notes[uid];
                writeJson(STORAGE_KEYS.NOTES, state.notes);
                closeModal();
                if (state.currentBookId && state.currentBaabId) openBaab(state.currentBookId, state.currentBaabId, hNum);
            });
        }
    }

    function openNotesListModal() {
        const entries = Object.entries(state.notes);
        const html = entries.length
            ? entries.map(([uid, text]) => {
                const parts = uid.split('_');
                const bId = Number(parts[1] || 1);
                const baId = Number(parts[2] || 1);
                const hNum = parts.slice(3).join('_');
                return (
                    '<div class="bookmark-item-card">' +
                        '<div class="bookmark-item-main" data-book="' + bId + '" data-baab="' + baId + '" data-num="' + escapeHtml(hNum) + '">' +
                            '<div class="bookmark-item-title">Hadith #' + escapeHtml(hNum) + '</div>' +
                            '<div class="bookmark-item-snippet">' + escapeHtml(text) + '</div>' +
                        '</div>' +
                    '</div>'
                );
            }).join('')
            : '<div class="bookmark-empty-state">Kisi Hadees par abhi koi Note save nahi hai.</div>';

        openModal(svgIcon('note', 'svg-ic-sm') + '<span>Saved Notes</span>', html);
        el.modalBody.querySelectorAll('.bookmark-item-main').forEach(row => {
            row.addEventListener('click', () => {
                closeModal();
                openBaab(Number(row.getAttribute('data-book')), Number(row.getAttribute('data-baab')), row.getAttribute('data-num'));
            });
        });
    }

    function handleResumeClick() {
        if (!state.resume || !state.resume.bookId || !state.resume.baabId) {
            openModal(svgIcon('bookmark', 'svg-ic-sm') + '<span>Resume Reading</span>', '<div class="bookmark-empty-state">Abhi koi last-read position save nahi hai. Kisi bhi Baab ko open karein.</div>');
            return;
        }
        openBaab(state.resume.bookId, state.resume.baabId, state.resume.hadithNum || '');
    }

    function openSearchModal() {
        openModal(
            svgIcon('search', 'svg-ic-sm') + '<span>Search Mirat-ul-Manajih</span>',
            '<div class="search-input-wrap">' +
                svgIcon('search', 'svg-ic-sm') +
                '<input type="search" id="mkSearchInput" class="search-input-field" placeholder="Hadith number ya Urdu/Arabic lafz likhein..." autocomplete="off"/>' +
            '</div>' +
            '<div class="mk-search-hint">Kitab, Baab, Hadith number, ya matn/sharh mein search karein.</div>' +
            '<div id="mkSearchResults"><div class="bookmark-empty-state">Search karne ke liye kam az kam 2 harf ya number likhein.</div></div>'
        );

        const input = document.getElementById('mkSearchInput');
        const resultsBox = document.getElementById('mkSearchResults');
        setTimeout(() => { if (input) input.focus(); }, 80);

        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
                const q = (input.value || '').trim();
                if (!q) {
                    resultsBox.innerHTML = '<div class="bookmark-empty-state">Search karne ke liye kam az kam 2 harf ya number likhein.</div>';
                    return;
                }
                const qLower = q.toLowerCase();
                resultsBox.innerHTML = '<div class="mishkat-loading">تلاش جاری ہے...</div>';
                try {
                    const idx = await fetchIndex();
                    const matches = [];
                    for (const bkMeta of (idx.books || [])) {
                        const bk = await fetchBook(bkMeta.id);
                        for (const baab of (bk.abwaab || [])) {
                            if (baab.titleUr.toLowerCase().includes(qLower) && matches.length < 25) {
                                matches.push({ bookId: bk.id, baabId: baab.id, num: '', tag: 'Baab', title: bk.titleUr + ' — ' + baab.titleUr, snippet: baab.count + ' احادیث' });
                            }
                            for (const h of (baab.hadiths || [])) {
                                const numMatch = String(h.num || '') === q;
                                const textMatch = q.length >= 2 && ((h.ur || '').toLowerCase().includes(qLower) || (h.sharh || '').toLowerCase().includes(qLower) || (h.ar || '').includes(q));
                                if (numMatch || textMatch) {
                                    matches.push({ bookId: bk.id, baabId: baab.id, num: h.num, tag: 'Hadith #' + h.num, title: baab.titleUr, snippet: (h.ur || h.sharh || h.ar || '').slice(0, 120) });
                                    if (matches.length >= 30) break;
                                }
                            }
                            if (matches.length >= 30) break;
                        }
                        if (matches.length >= 30) break;
                    }

                    if (!matches.length) {
                        resultsBox.innerHTML = '<div class="bookmark-empty-state">Koi nateeja nahi mila.</div>';
                        return;
                    }

                    resultsBox.innerHTML = matches.map(m => (
                        '<button type="button" class="search-result-item" data-book="' + m.bookId + '" data-baab="' + m.baabId + '" data-num="' + escapeHtml(m.num) + '">' +
                            '<div class="search-result-head"><span class="search-result-title">' + escapeHtml(m.title) + '</span><span class="search-result-tag">' + escapeHtml(m.tag) + '</span></div>' +
                            '<div class="search-result-ur">' + escapeHtml(m.snippet) + '</div>' +
                        '</button>'
                    )).join('');

                    resultsBox.querySelectorAll('.search-result-item').forEach(itemBtn => {
                        itemBtn.addEventListener('click', () => {
                            closeModal();
                            openBaab(Number(itemBtn.getAttribute('data-book')), Number(itemBtn.getAttribute('data-baab')), itemBtn.getAttribute('data-num'));
                        });
                    });
                } catch (err) {
                    resultsBox.innerHTML = '<div class="bookmark-empty-state">Search mein masla aaya.</div>';
                }
            }, 180);
        });
    }

    function init() {
        if (!el.listContainer) return;
        hydrateStaticIcons();
        if (el.tabMazameen) el.tabMazameen.classList.toggle('active', state.mode === 'mazameen');
        if (el.tabJild) el.tabJild.classList.toggle('active', state.mode === 'jild');
        if (el.tabMazameen) el.tabMazameen.addEventListener('click', () => setMode('mazameen'));
        if (el.tabJild) el.tabJild.addEventListener('click', () => setMode('jild'));
        if (el.muqaddimaBtn) el.muqaddimaBtn.addEventListener('click', openMuqaddimaModal);
        if (el.backToIndexBtn) el.backToIndexBtn.addEventListener('click', () => showIndexView(true));
        if (el.toggleAllSharhBtn) el.toggleAllSharhBtn.addEventListener('click', toggleAllSharh);
        if (el.btnFavorite) el.btnFavorite.addEventListener('click', openFavoritesModal);
        if (el.btnSearch) el.btnSearch.addEventListener('click', openSearchModal);
        if (el.btnResume) el.btnResume.addEventListener('click', handleResumeClick);
        if (el.btnNotes) el.btnNotes.addEventListener('click', openNotesListModal);
        if (el.modalCloseBtn) el.modalCloseBtn.addEventListener('click', closeModal);
        if (el.modal) {
            el.modal.addEventListener('click', e => { if (e.target === el.modal) closeModal(); });
        }
        renderIndexList();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
