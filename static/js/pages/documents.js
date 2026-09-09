/* ============================================================
 * HeavenLease — Documents (my documents) page module
 * Lists the user's uploaded documents, upload + delete.
 * Extracted from documents.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const wrap = document.getElementById('docWrap');
    if (!wrap) return;

    const userMenu = document.getElementById('userMenu');
    const profileBtn = document.getElementById('profileBtn');
    if (profileBtn && userMenu) {
        profileBtn.addEventListener('click', (e) => { e.stopPropagation(); userMenu.classList.toggle('open'); });
        document.addEventListener('click', (e) => { if (!userMenu.contains(e.target)) userMenu.classList.remove('open'); });
    }

    function badge(s) {
        const m = { PENDING: ['status-pending', 'Pending'], VERIFIED: ['status-completed', 'Verified'], REJECTED: ['status-inactive', 'Rejected'] };
        const x = m[(s || '').toUpperCase()] || ['status-pending', s || '—'];
        return '<span class="status ' + x[0] + '">' + api.escapeHtml(x[1]) + '</span>';
    }
    function fmt(s) {
        if (!s) return '—';
        const d = new Date(s);
        return isNaN(d.getTime()) ? String(s) : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    async function loadDocs() {
        try {
            let list = (await api.getMyDocuments().catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];
            if (!list.length) {
                wrap.innerHTML = '<div class="empty-state"><i class="fas fa-folder-open"></i><h3>No documents yet</h3><p>Upload a document above to organise it here.</p></div>';
                return;
            }
            wrap.innerHTML = '<div class="documents-list">' + list.map((d) => {
                const url = d.fileUrl ? api.resolveMedia(d.fileUrl) : '';
                return '<div class="document-card">'
                    + '<div class="doc-left"><div class="doc-icon"><i class="fas fa-file-lines"></i></div><div><div class="doc-name">' + api.escapeHtml(d.fileName || d.docType || ('Doc #' + d.id)) + ' ' + badge(d.status) + '</div><div class="doc-meta">' + api.escapeHtml(d.docType || 'Document') + ' · ' + api.escapeHtml(d.pageKey || 'General') + ' · ' + fmt(d.createdAt) + '</div></div></div>'
                    + '<div class="doc-actions">' + (url ? '<a class="btn btn-view" href="' + api.escapeHtml(url) + '" target="_blank" rel="noopener"><i class="fas fa-eye"></i>View</a>' : '')
                    + '<button class="btn btn-delete" onclick="delDoc(' + d.id + ')" aria-label="Delete document"><i class="fas fa-trash"></i></button></div></div>';
            }).join('') + '</div>';
        } catch (e) {
            wrap.innerHTML = '<div class="empty-state"><i class="fas fa-circle-exclamation"></i><h3>Could not load documents</h3><p>' + api.escapeHtml(e.message || 'Please try again.') + '</p></div>';
        }
    }

    window.uploadDoc = async function () {
        const fileInput = document.getElementById('docFile');
        const file = fileInput && fileInput.files && fileInput.files[0];
        if (!file) { showToast('Choose a file first.', 'error'); return; }
        const docType = document.getElementById('docType').value.trim() || 'Document';
        try {
            await api.uploadDocument('general', file, docType);
            showToast('Document uploaded.', 'success');
            document.getElementById('docFile').value = '';
            document.getElementById('docType').value = '';
            loadDocs();
        } catch (e) { showToast(e.message || 'Upload failed.', 'error'); }
    };

    window.delDoc = async function (id) {
        if (!confirm('Delete this document?')) return;
        try { await api.deleteDocument(id); showToast('Document deleted.', 'success'); loadDocs(); }
        catch (e) { showToast(e.message || 'Delete failed.', 'error'); }
    };

    loadDocs();
})();