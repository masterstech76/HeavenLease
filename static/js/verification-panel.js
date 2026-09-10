/* ============================================================
   HeavenLease — Real Document Verification Panel
   ============================================================
   Wires #verificationPanel to the real backend workflow:
     1. Upload a real file (PDF/JPG/PNG) + type + note →
        POST /api/documents/upload (server validates type/size,
        masks Aadhaar/PAN, stores, notifies reviewer) → PENDING.
     2. "My submissions" → GET /api/documents/page/:pageKey
        (server scopes to the signed-in user only) with real
        status badges + review notes.
     3. Owner/Verified-Owner/Admin review queue →
        GET /api/documents/received filtered to this page.
        VERIFY or REJECT via PUT /api/documents/:id/status
        (server authorizes role, records reviewer, notifies).
   ============================================================ */
(function () {
    'use strict';
    var root = document.getElementById('verificationPanel');
    if (!root || typeof api === 'undefined') return;

    var PAGE_KEY = root.getAttribute('data-page-key') || 'general';
    var TITLE = root.getAttribute('data-title') || 'Document Verification';
    var HINT = root.getAttribute('data-hint') || '';
    var DOC_TYPES = (root.getAttribute('data-doc-types') || '').split('|').filter(Boolean);

    var user = api.getUser() || {};
    var role = String(user.role || '').toUpperCase();
    var canReview = (role === 'OWNER' || role === 'VERIFIED_OWNER' || role === 'ADMIN');
    var canUpload = !!api.isAuthenticated();

    var badgeMap = {
        PENDING: ['pending', 'PENDING'],
        VERIFIED: ['verified', 'VERIFIED'],
        REJECTED: ['rejected', 'REJECTED']
    };

    function esc(v) {
        return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function fmtDate(s) {
        if (!s) return '—';
        var d = new Date(s);
        return isNaN(d) ? s : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    function badge(s) {
        var m = badgeMap[String(s || '').toUpperCase()] || ['pending', s || 'PENDING'];
        return '<span class="vp-badge ' + m[0] + '">' + esc(m[1]) + '</span>';
    }

    function render() {
        if (!canUpload) {
            root.innerHTML =
                '<div class="vp-header"><h3><i class="fas fa-file-shield"></i> ' + esc(TITLE) + '</h3></div>' +
                '<div class="vp-login-cta">Log in to submit and track your documents for real-time verification.<br>' +
                '<a href="login" style="display:inline-block;margin-top:10px;" class="btn btn-primary btn-sm"><i class="fas fa-sign-in-alt"></i> Log in</a></div>';
            return;
        }

        var sel = DOC_TYPES.map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + '</option>'; }).join('');

        root.innerHTML =
            '<div class="vp-header"><h3><i class="fas fa-file-shield"></i> ' + esc(TITLE) + '</h3>' +
            (canReview ? '<span class="vp-badge verified"><i class="fas fa-user-shield"></i> Reviewer access</span>' : '') +
            '</div>' +
            '<div class="vp-body">' +
            '<p class="vp-hint">' + esc(HINT || 'Upload a clear, readable copy. PDF or image files up to 5 MB are accepted. ' +
                'Your document is reviewed by a verified owner or admin and a notification is sent when it is verified or rejected. ' +
                'Sensitive numbers you enter (e.g. Aadhaar, PAN) are masked before storage.') + '</p>' +

            '<div class="vp-upload">' +
            '<div class="vp-upload-row">' +
            '<input type="file" id="vpFile" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" aria-label="Choose document">' +
            (sel ? '<select id="vpDocType" aria-label="Document type">' + sel + '</select>' : '<input type="text" id="vpDocType" placeholder="Document type">') +
            '<input type="text" id="vpMeta" placeholder="Ref no. / notes (optional)">' +
            '</div>' +
            '<button class="btn btn-primary btn-sm" type="button" id="vpUploadBtn" onclick="verificationPanel.upload()"><i class="fas fa-cloud-arrow-up"></i> Upload</button>' +
            '</div>' +

            '<div class="vp-section-title"><i class="fas fa-inbox"></i> My submissions</div>' +
            '<div class="vp-list" id="vpMine"><div class="vp-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>' +

            (canReview ?
                '<div class="vp-section-title"><i class="fas fa-clipboard-check"></i> Review queue</div>' +
                '<div class="vp-list" id="vpReview"><div class="vp-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>'
                : '') +
            '</div>';

        var fileEl = document.getElementById('vpFile');
        if (fileEl) {
            fileEl.addEventListener('change', function () {
                var f = this.files && this.files[0];
                if (f && f.size > 5 * 1024 * 1024) {
                    if (typeof showToast === 'function') showToast('File must be under 5 MB.', 'error');
                    this.value = '';
                }
            });
        }
        loadMine();
        if (canReview) loadReview();
    }
async function loadMine() {
        var wrap = document.getElementById('vpMine');
        if (!wrap) return;
        try {
            var list = await api.getDocumentsByPage(PAGE_KEY);
            if (!Array.isArray(list)) list = [];
            if (list.length === 0) {
                wrap.innerHTML = '<div class="vp-empty"><i class="fas fa-folder-open"></i> No submissions yet.</div>';
                return;
            }
            wrap.innerHTML = list.map(function (d) {
                var metaDisp = '';
                if (d.maskedValues && d.maskedValues.trim()) {
                    metaDisp = '<small>Ref: ' + esc(d.maskedValues) + '</small>';
                }
                return '<div class="vp-item">' +
                    '<div class="vp-file">' +
                    '<strong><i class="fas fa-file-alt" style="color:' + (d.status === 'VERIFIED' ? '#059669' : '#9aa3b2') + ';margin-right:6px;"></i>' + esc(d.fileName || d.docType || ('Document #' + d.id)) + '</strong>' +
                    '<small>' + esc(d.docType || 'document') + ' · ' + fmtDate(d.createdAt) + '</small>' + metaDisp +
                    (d.reviewNote ? '<div class="vp-note">' + esc(d.reviewNote) + '</div>' : '') +
                    '</div>' +
                    '<div class="vp-actions">' + badge(d.status) +
                    (d.id ? '<button class="btn btn-sm btn-secondary" type="button" onclick="verificationPanel.view(' + d.id + ')"><i class="fas fa-eye"></i> View</button>' : '') +
                    '<button class="btn btn-sm btn-danger" type="button" onclick="verificationPanel.remove(' + d.id + ')"><i class="fas fa-trash"></i></button>' +
                    '</div></div>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="vp-empty"><i class="fas fa-triangle-exclamation"></i> ' + esc(e.message || 'Could not load documents.') + '</div>';
        }
    }

    async function loadReview() {
        var wrap = document.getElementById('vpReview');
        if (!wrap) return;
        try {
            var list = await api.getReceivedDocuments();
            if (!Array.isArray(list)) list = [];
            list = list.filter(function (d) { return d.pageKey === PAGE_KEY; });
            if (list.length === 0) {
                wrap.innerHTML = '<div class="vp-empty"><i class="fas fa-check-double"></i> Nothing waiting for review here.</div>';
                return;
            }
            wrap.innerHTML = list.map(function (d) {
                var actions = d.status === 'PENDING'
                    ? '<button class="btn btn-sm btn-primary" type="button" onclick="verificationPanel.review(' + d.id + ',\'VERIFIED\')"><i class="fas fa-check"></i> Verify</button>' +
                      '<button class="btn btn-sm btn-outline" type="button" onclick="verificationPanel.review(' + d.id + ',\'REJECTED\')"><i class="fas fa-xmark"></i> Reject</button>'
                    : badge(d.status);
                return '<div class="vp-item">' +
                    '<div class="vp-file">' +
                    '<strong><i class="fas fa-file-alt" style="color:#4445c5;margin-right:6px;"></i>' + esc(d.fileName || d.docType || ('Document #' + d.id)) + '</strong>' +
                    '<small>' + esc(d.docType || 'document') + ' · ' + esc(d.pageKey) + ' · ' + fmtDate(d.createdAt) + '</small>' +
                    (d.maskedValues ? '<small>Ref: ' + esc(d.maskedValues) + '</small>' : '') +
                    (d.reviewNote ? '<div class="vp-note">' + esc(d.reviewNote) + '</div>' : '') +
                    '</div>' +
                    '<div class="vp-actions">' + actions +
                    (d.id ? '<button class="btn btn-sm btn-secondary" type="button" onclick="verificationPanel.view(' + d.id + ')"><i class="fas fa-eye"></i> View</button>' : '') +
                    '</div></div>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="vp-empty"><i class="fas fa-triangle-exclamation"></i> ' + esc(e.message || 'Could not load review queue.') + '</div>';
        }
    }
window.verificationPanel = {
        async upload() {
            var fileEl = document.getElementById('vpFile');
            var file = fileEl && fileEl.files && fileEl.files[0];
            if (!file) { if (typeof showToast === 'function') showToast('Choose a file to upload.', 'error'); return; }
            var docType = document.getElementById('vpDocType').value || 'document';
            var meta = document.getElementById('vpMeta').value || '';
            var btn = document.getElementById('vpUploadBtn');
            try {
                if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…'; }
                var res = await api.uploadDocument(PAGE_KEY, file, docType, meta);
                if (typeof showToast === 'function') showToast((res && res.message) || 'Document uploaded — pending review.', 'success');
                if (fileEl) fileEl.value = '';
                var metaEl = document.getElementById('vpMeta'); if (metaEl) metaEl.value = '';
                loadMine();
                if (canReview) loadReview();
            } catch (e) {
                if (typeof showToast === 'function') showToast(e.message || 'Upload failed.', 'error');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> Upload'; }
            }
        },
        async view(id) {
            try {
                var blob = await api.downloadDocument(id);
                var url = URL.createObjectURL(blob);
                window.open(url, '_blank', 'noopener');
                setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
            } catch (e) {
                if (typeof showToast === 'function') showToast(e.message || 'Could not open document.', 'error');
            }
        },
        async review(id, status) {
            var note = '';
            if (status === 'REJECTED') {
                note = window.prompt('Why is this document being rejected? (optional)') || '';
            }
            try {
                await api.updateDocumentStatus(id, status, note);
                if (typeof showToast === 'function') showToast('Document ' + status.toLowerCase() + '. The uploader was notified.', 'success');
                loadReview();
                loadMine();
            } catch (e) {
                if (typeof showToast === 'function') showToast(e.message || 'Review action failed.', 'error');
            }
        },
        async remove(id) {
            if (!window.confirm('Delete this document permanently?')) return;
            try {
                await api.deleteDocument(id);
                if (typeof showToast === 'function') showToast('Document deleted.', 'success');
                loadMine();
                if (canReview) loadReview();
            } catch (e) {
                if (typeof showToast === 'function') showToast(e.message || 'Delete failed.', 'error');
            }
        }
    };

    render();
})();