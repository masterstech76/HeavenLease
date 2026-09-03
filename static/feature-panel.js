/* ============================================================
   HeavenLease — Feature Panel (shared by the feature pages)
   Tenant: upload documents + submit feedback + track status
   Owner:  review received documents (verify/reject) + upload
   Admin:  full view
   ============================================================ */
(function() {
    'use strict';

    // Map each feature page to its backend feature key + labels.
    const FEATURE_PAGES = {
        'background-check': {
            pageKey: 'background_check',
            title: 'Background Verification',
            docTypes: ['Police Verification Slip', 'Address Proof'],
            tenantHint: 'Upload your police verification slip. The owner reviews it and your profile gets a "Background Verified" badge.',
            ownerHint: 'Review tenant police verification slips — verify or reject them.'
        },
        'comfort-over-everything': {
            pageKey: 'comfort_feedback',
            title: 'Comfort Feedback',
            docTypes: ['Comfort Feedback Form'],
            tenantHint: 'Rate your home\'s comfort — quietness, sunlight and commute.',
            ownerHint: 'Owners see these ratings on the property profile.'
        },
        'community-focused': {
            pageKey: 'community',
            title: 'Community & Society',
            docTypes: ['Society NOC', 'Society Facilities Form'],
            tenantHint: 'Rate your society\'s facilities — security and cleanliness.',
            ownerHint: 'Upload the society NOC so tenants can see it.'
        },
"credit-score-check" : {
            pageKey: 'credit_report',
            title: 'Credit Score Check',
            docTypes: ['PAN Card', 'Bank Statement'],
            tenantHint: 'Give consent and upload your PAN / bank statement for a soft credit check.',
            ownerHint: 'You receive the tenant\'s credit report via API integration.'
        },
"employment-verification" : {
            pageKey: 'employment',
            title: 'Employment Verification',
            docTypes: ['Salary Slip', 'HR / Offer Letter'],
            tenantHint: 'Upload salary slips and your HR letter to confirm income.',
            ownerHint: 'Review income documents — mark "Employment Verified" so your tenant passes screening.'
        },
"fair-for-everyone" : {
            pageKey: 'rent_fairness',
            title: 'Fair Rent Feedback',
            docTypes: ['Rent Receipt'],
            tenantHint: 'Tell us if the rent feels Fair, High or Low for this home.',
            ownerHint: 'Generate transparent rent receipts and upload them for tenants.'
        },
"identity-verification" : {
            pageKey: 'identity',
            title: 'Identity Verification',
            docTypes: ['Aadhaar (masked)', 'Passport', 'Driving Licence'],
            tenantHint: 'Upload a government ID. Aadhaar is masked automatically for privacy.',
            ownerHint: 'Validate the tenant\'s ID via e-KYC API and verify the record.'
        },
        "tenant-screening" : {
            pageKey: 'tenant_screening',
            title: 'Tenant Screening',
            docTypes: ['Identity Document', 'Employment Proof', 'Credit Report', 'Previous Landlord Reference'],
            tenantHint: 'Submit your identity, employment and credit documents so owners can screen you quickly.',
            ownerHint: 'Review tenant documents — verify identity, employment and credit before approving.'
        }
    };
// Remaining feature pages (mapped to the same shape).
    const FEATURE_PAGES_FULL = {
"lease-templates" : {
            pageKey: 'lease_templates',
            title: 'Lease Templates',
            docTypes: ['Signed Lease Template'],
            tenantHint: 'Review and digitally sign the lease template.',
            ownerHint: 'Upload / download standardized lease documents.'
        },
"maintenance-management" : {
            pageKey: 'maintenance',
            title: 'Maintenance Management',
            docTypes: ['Maintenance Request', 'Clearance Bill'],
            tenantHint: 'Submit feedback on maintenance quality and track requests.',
            ownerHint: 'Upload society maintenance clearance bills.'
        },
"no-brokers-ever" : {
            pageKey: 'no_broker',
            title: 'No Brokers — Direct KYC',
            docTypes: ['KYC Document'],
            tenantHint: 'Upload your KYC directly. No brokers involved.',
            ownerHint: 'Upload your property ownership proof (sale deed, tax receipt).'
        },
"owner-guides" : {
            pageKey: 'owner_guides',
            title: 'Owner Guides',
            docTypes: ['Compliance Checklist'],
            tenantHint: 'Read the guide on required documents.',
            ownerHint: 'Access the compliance upload checklist.'
        },
"owner-support" : {
            pageKey: 'owner_support',
            title: 'Owner Support',
            docTypes: ['Support Attachment'],
            tenantHint: 'Raise a ticket if an upload fails.',
            ownerHint: 'Raise a ticket for tenant verification issues.',
            showTicket: true
        },
"rent-pricing-guide" : {
            pageKey: 'rent_pricing',
            title: 'Rent Pricing Feedback',
            docTypes: ['Rent Receipt'],
            tenantHint: 'Give feedback if the rent feels Fair, High or Low.',
            ownerHint: 'Upload rent receipts and compare with market data.'
        },
"rental-history" : {
            pageKey: 'rental_history',
            title: 'Rental History',
            docTypes: ['Past Rent Agreement', 'Past Receipt'],
            tenantHint: 'Upload past rent agreements + receipts.',
            ownerHint: 'Review rental history and add a reliability rating.'
        },
"speed-and-simplicity" : {
            pageKey: 'speed_kyc',
            title: 'Instant E-KYC',
            docTypes: ['Aadhaar (e-KYC)'],
            tenantHint: 'Use instant Aadhaar e-KYC upload.',
            ownerHint: 'See real-time verification status on your dashboard.'
        },
"tax-and-accounting" : {
            pageKey: 'tax',
            title: 'Tax & Accounting',
            docTypes: ['Property Tax Record', 'PAN for TDS'],
            tenantHint: 'Download rent receipts for your HRA claim.',
            ownerHint: 'Upload property tax records and validate PAN for TDS.'
        },
"trust-and-safety-first" : {
            pageKey: 'trust_safety',
            title: 'Trust & Safety',
            docTypes: ['Emergency Contact', 'Police Acknowledgment'],
            tenantHint: 'Upload your emergency contact details.',
            ownerHint: 'Upload the police verification acknowledgment slip.'
        },
"possession" : {
            pageKey: 'possession',
            title: 'Possession & Handover',
            docTypes: ['Handover Checklist', 'Possession Letter', 'Inspection Report'],
            tenantHint: 'Upload your side of the handover checklist and possession letter.',
            ownerHint: 'Upload the possession letter and inspection report for a smooth handover.'
        },
"lease-signing" : {
            pageKey: 'lease_signing',
            title: 'Lease & Signing',
            docTypes: ['Signed Lease Agreement', 'ID Copy'],
            tenantHint: 'Review and digitally sign the lease agreement here.',
            ownerHint: 'Upload the finalized lease agreement for the tenant to sign.'
        },
"owner-resources" : {
            pageKey: 'owner_resources',
            title: 'Owner Resources',
            docTypes: ['Compliance Checklist', 'Rental Guide'],
            tenantHint: 'Browse the owner resource guides.',
            ownerHint: 'Access checklists, templates and compliance uploads.'
        },
"buy-sell" : {
            pageKey: 'buy_sell',
            title: 'Buy / Sell Documents',
            docTypes: ['Sale Deed', 'Tax Receipt', 'Ownership Proof'],
            tenantHint: 'Upload ownership / sale documents for review.',
            ownerHint: 'Submit sale deed and tax receipts for property transfers.'
        }
    };

    Object.assign(FEATURE_PAGES, FEATURE_PAGES_FULL);
// Detect which feature page we are on.
    function currentPageName() {
        return window.location.pathname.split('/').pop() || '';
    }

    function getConfig() {
        return FEATURE_PAGES[currentPageName()] || null;
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDate(value) {
        if (!value) return '';
        try {
            return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) { return ''; }
    }

    // Build the panel DOM shell.
    function renderShell(cfg, role) {
        const badge = role === 'ADMIN' ? 'admin' : (role === 'TENANT' ? 'tenant' : 'owner');
        return `
            <div class="fp-header">
                <h3><i class="fas fa-folder-open"></i> ${escapeHtml(cfg.title)}</h3>
                <span class="fp-badge ${badge}">${role}</span>
            </div>
            <div class="fp-tabs">
                <button class="fp-tab active" data-tab="upload"><i class="fas fa-cloud-arrow-up"></i> Documents</button>
                <button class="fp-tab" data-tab="status"><i class="fas fa-list-check"></i> My Status</button>
                <button class="fp-tab" data-tab="feedback"><i class="fas fa-star"></i> Feedback</button>
                ${cfg.showTicket ? '<button class="fp-tab" data-tab="ticket">' + '<i class="fas fa-headset"></i> Ticket</button>' : ''}
            </div>
            <div class="fp-body"></div>
        `;
    }
// Render the upload form (tenant + owner both can upload).
    function renderUpload(cfg, role) {
        const docOptions = (cfg.docTypes || ['Document'])
            .map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
        return `
            <div class="fp-hint">${role === 'TENANT' ? escapeHtml(cfg.tenantHint) : escapeHtml(cfg.ownerHint)}</div>
            <div class="fp-drop" id="fpDrop">
                <i class="fas fa-cloud-arrow-up"></i>
                <p><strong>Drag &amp; drop</strong> your file here or click to browse</p>
                <div class="fp-sub">PDF, JPG or PNG · max 5 MB</div>
                <div class="fp-file-note" id="fpFileName" style="display:none;"></div>
            </div>
            <input type="file" id="fpFileInput" accept=".pdf,.jpg,.jpeg,.png" style="display:none;" />
            <div class="fp-fields">
                <div>
                    <label for="fpDocType">Document type</label>
                    <select id="fpDocType">${docOptions}</select>
                </div>
                <div>
                    <label for="fpMeta">Aadhaar / PAN number <small>(optional — masked automatically)</small></label>
                    <input type="text" id="fpMeta" placeholder="e.g. 1234 5678 9012 or ABCDE1234F" maxlength="30" />
                </div>
            </div>
            <button class="fp-primary" id="fpUploadBtn"><i class="fas fa-upload"></i> Upload Document</button>
        `;
    }

    function statusPill(status) {
        const s = (status || 'PENDING').toUpperCase();
        return `<span class="status-pill ${s}">${s}</span>`;
    }

    function docItemHtml(d, isOwner) {
        const actions = [];
        if (isOwner) {
            actions.push(`<button class="fp-mini download" data-download="${escapeHtml(d.fileUrl)}"><i class="fas fa-download"></i> View</button>`);
            if (d.status !== 'VERIFIED') actions.push(`<button class="fp-mini verify" data-verify="${d.id}"><i class="fas fa-check"></i> Verify</button>`);
            if (d.status !== 'REJECTED') actions.push(`<button class="fp-mini reject" data-reject="${d.id}"><i class="fas fa-xmark"></i> Reject</button>`);
        } else {
            actions.push(`<button class="fp-mini download" data-download="${escapeHtml(d.fileUrl)}"><i class="fas fa-download"></i> View</button>`);
            actions.push(`<button class="fp-mini delete" data-delete="${d.id}"><i class="fas fa-trash"></i> Delete</button>`);
        }
        return `
            <div class="fp-item">
                <span class="fp-icon" style="background:${d.status === 'VERIFIED' ? '#10b981' : (d.status === 'REJECTED' ? '#ef4444' : '#f59e0b')};"><i class="fas fa-file"></i></span>
                <div class="fp-meta">
                    <strong>${escapeHtml(d.docType || d.fileName || 'Document')}</strong>
                    <small>${escapeHtml(d.fileName || '')}${d.maskedValues ? ' · masked: ' + escapeHtml(d.maskedValues) : ''} · ${formatDate(d.createdAt)}</small>
                    ${d.reviewNote ? '<small style="display:block;color:#64748b;">Note: ' + escapeHtml(d.reviewNote) + '</small>' : ''}
                </div>
                ${statusPill(d.status)}
                <div class="fp-actions">${actions.join('')}</div>
            </div>
        `;
    }
// Render the status panel: my documents (tenant) or received documents (owner).
    function renderStatus(cfg, role) {
        const isOwner = role === 'OWNER' || role === 'VERIFIED_OWNER' || role === 'ADMIN';
        const title = isOwner ? 'Documents awaiting your review' : 'My uploaded documents';
        const empty = isOwner
            ? 'No documents have been submitted to you yet.'
            : 'You haven\'t uploaded anything yet. Upload a document to see its status here.';
        return `
            <div class="fp-hint">${escapeHtml(title)}</div>
            <div class="fp-list" id="fpDocList"><div class="fp-empty"><i class="fas fa-spinner fa-spin"></i> Loading…</div></div>
        `;
    }

    // Render feedback form + aggregate.
    function renderFeedback() {
        return `
            <div class="fp-hint">Share your experience for this page. Ratings help the community.</div>
            <label style="font-size:13px;font-weight:600;color:#0f172a;">Your rating</label>
            <div class="fp-stars" id="fpStars">
                <i class="fas fa-star" data-star="1"></i>
                <i class="fas fa-star" data-star="2"></i>
                <i class="fas fa-star" data-star="3"></i>
                <i class="fas fa-star" data-star="4"></i>
                <i class="fas fa-star" data-star="5"></i>
            </div>
            <div class="fp-fields">
                <div>
                    <label for="fpComment">Your comments <small>(optional)</small></label>
                    <textarea id="fpComment" rows="3" maxlength="1000" placeholder="Tell us more…"></textarea>
                </div>
            </div>
            <button class="fp-primary" id="fpFeedbackBtn"><i class="fas fa-paper-plane"></i> Submit Feedback</button>
            <div class="fp-hint" id="fpFeedbackAggregate" style="margin-top:16px;display:none;"></div>
        `;
    }

    // Render support ticket form (only for pages with showTicket).
    function renderTicket() {
        return `
            <div class="fp-hint">Facing an issue on this page? Raise a ticket and our team will help.</div>
            <div class="fp-fields">
                <div>
                    <label for="fpSubject">Subject</label>
                    <input type="text" id="fpSubject" maxlength="200" placeholder="Short summary of the issue" />
                </div>
                <div>
                    <label for="fpMessage">Describe the problem</label>
                    <textarea id="fpMessage" rows="4" maxlength="2000" placeholder="What happened? What were you trying to do?"></textarea>
                </div>
            </div>
            <button class="fp-primary" id="fpTicketBtn"><i class="fas fa-headset"></i> Raise Ticket</button>
        `;
    }
// Load + render the document list for the current tab.
    async function loadDocuments(cfg, role) {
        const listEl = document.getElementById('fpDocList');
        if (!listEl) return;
        const isOwner = role === 'OWNER' || role === 'VERIFIED_OWNER' || role === 'ADMIN';
        try {
            let docs = [];
            if (isOwner && role !== 'TENANT') {
                docs = await api.getReceivedDocuments();
            } else {
                docs = await api.getMyDocuments();
            }
            // For the current page only.
            docs = (docs || []).filter(d => String(d.pageKey) === cfg.pageKey);
            if (!docs.length) {
                listEl.innerHTML = `<div class="fp-empty"><i class="fas fa-inbox"></i> ${isOwner ? 'No documents have been submitted to you yet.' : 'No uploads yet. Upload a document above.'}</div>`;
                return;
            }
            listEl.innerHTML = docs.map(d => docItemHtml(d, isOwner)).join('');
            document.querySelectorAll('#fpDocList [data-download]').forEach(b => {
                b.addEventListener('click', () => { window.open(b.dataset.download, '_blank'); });
            });
            document.querySelectorAll('#fpDocList [data-verify]').forEach(b => {
                b.addEventListener('click', async () => { await setDocStatus(b.dataset.verify, 'VERIFIED', cfg, role); });
            });
            document.querySelectorAll('#fpDocList [data-reject]').forEach(b => {
                b.addEventListener('click', async () => { await setDocStatus(b.dataset.reject, 'REJECTED', cfg, role); });
            });
            document.querySelectorAll('#fpDocList [data-delete]').forEach(b => {
                b.addEventListener('click', async () => {
                    if (!confirm('Delete this document?')) return;
                    try { await api.deleteDocument(b.dataset.delete); showToast('Document deleted.', 'success'); loadDocuments(cfg, role); } catch (e) { showToast(e.message || 'Delete failed', 'error'); }
                });
            });
        } catch (e) {
            listEl.innerHTML = `<div class="fp-empty">Could not load documents: ${escapeHtml(e.message || 'error')}</div>`;
        }
    }

    async function setDocStatus(id, status, cfg, role) {
        try {
            const note = status === 'REJECTED' ? (prompt('Reason for rejection (optional):') || '') : '';
            await api.updateDocumentStatus(id, status, note);
            showToast(status === 'VERIFIED' ? 'Document verified.' : 'Document rejected.', 'success');
            loadDocuments(cfg, role);
        } catch (e) {
            showToast(e.message || 'Could not update status', 'error');
        }
    }

    // Load + render feedback aggregate.
    async function loadFeedback(cfg) {
        const el = document.getElementById('fpFeedbackAggregate');
        if (!el) return;
        try {
            const data = await api.getFeedback(cfg.pageKey);
            if (data && data.count > 0) {
                el.style.display = 'block';
                const stars = Array.from({ length: 5 }, (_, i) =>
                    `<i class="fas fa-star" style="color:${i < Math.round(data.average) ? '#f59e0b' : '#cbd5e1'};font-size:14px;"></i>`).join('');
                el.innerHTML = `<strong>${data.average} / 5</strong> · ${data.count} ${data.count === 1 ? 'rating' : 'ratings'} ${stars}`;
            }
        } catch (e) { /* ignore */ }
    }
// Tab switching + events.
    function switchTab(panel, tab, cfg, role) {
        panel.querySelectorAll('.fp-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        const body = panel.querySelector('.fp-body');
        if (tab === 'upload') {
            body.innerHTML = renderUpload(cfg, role);
            wireUpload(body, cfg, role);
        } else if (tab === 'status') {
            body.innerHTML = renderStatus(cfg, role);
            loadDocuments(cfg, role);
        } else if (tab === 'feedback') {
            body.innerHTML = renderFeedback();
            wireFeedback(body, cfg);
        } else if (tab === 'ticket') {
            body.innerHTML = renderTicket();
            wireTicket(body, cfg);
        }
    }

    // Upload form wiring.
    function wireUpload(body, cfg, role) {
        const drop = body.querySelector('#fpDrop');
        const fileInput = body.querySelector('#fpFileInput');
        const fileName = body.querySelector('#fpFileName');
        let selectedFile = null;

        drop.addEventListener('click', () => fileInput.click());
        drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('dragover'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
        drop.addEventListener('drop', (e) => {
            e.preventDefault();
            drop.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                selectedFile = e.dataTransfer.files[0];
                fileName.textContent = 'Selected: ' + selectedFile.name;
                fileName.style.display = 'block';
            }
        });
        fileInput.addEventListener('change', () => {
            selectedFile = fileInput.files[0] || null;
            if (selectedFile) {
                fileName.textContent = 'Selected: ' + selectedFile.name;
                fileName.style.display = 'block';
            }
        });

        body.querySelector('#fpUploadBtn').addEventListener('click', async function() {
            if (!selectedFile) { showToast('Please choose a file first.', 'error'); return; }
            const docType = body.querySelector('#fpDocType').value;
            const meta = body.querySelector('#fpMeta').value.trim();
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading…';
            try {
                const res = await api.uploadDocument(cfg.pageKey, selectedFile, docType, meta);
                showToast(res.message || 'Document uploaded.', 'success');
                selectedFile = null;
                fileName.style.display = 'none';
                if (fileInput) fileInput.value = '';
                switchTab(panelRef(), 'status', cfg, role);
            } catch (e) {
                showToast(e.message || 'Upload failed', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-upload"></i> Upload Document';
            }
        });
    }
    // Late-bound reference for the panel element (set in initPanel).
    let panelRef = () => null;

    // Feedback form wiring.
    function wireFeedback(body, cfg) {
        let stars = 0;
        const starEls = body.querySelectorAll('#fpStars i');
        starEls.forEach(el => {
            el.addEventListener('click', () => {
                stars = Number(el.dataset.star);
                starEls.forEach(s => s.classList.toggle('selected', Number(s.dataset.star) <= stars));
            });
        });
        loadFeedback(cfg);
        body.querySelector('#fpFeedbackBtn').addEventListener('click', async function() {
            if (!stars) { showToast('Please pick a star rating.', 'error'); return; }
            const comment = body.querySelector('#fpComment').value.trim();
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';
            try {
                await api.submitFeedback(cfg.pageKey, stars, comment);
                showToast('Thank you for your feedback!', 'success');
                stars = 0;
                starEls.forEach(s => s.classList.remove('selected'));
                body.querySelector('#fpComment').value = '';
                loadFeedback(cfg);
            } catch (e) {
                showToast(e.message || 'Could not submit feedback', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
            }
        });
    }

    // Ticket form wiring.
    function wireTicket(body, cfg) {
        body.querySelector('#fpTicketBtn').addEventListener('click', async function() {
            const subject = body.querySelector('#fpSubject').value.trim();
            const message = body.querySelector('#fpMessage').value.trim();
            if (!message) { showToast('Please describe the problem.', 'error'); return; }
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Raising…';
            try {
                await api.createTicket(cfg.pageKey, subject, message);
                showToast('Ticket raised. Our team will get back to you.', 'success');
                body.querySelector('#fpSubject').value = '';
                body.querySelector('#fpMessage').value = '';
            } catch (e) {
                showToast(e.message || 'Could not raise ticket', 'error');
            } finally {
                this.disabled = false;
                this.innerHTML = '<i class="fas fa-headset"></i> Raise Ticket';
            }
        });
    }
// Boot the panel on this page (expects a #featurePanel mount + panelRef mounted).
    function initPanel() {
        const cfg = getConfig();
        if (!cfg) return;
        const host = document.getElementById('featurePanel');
        if (!host) return;
        const user = (window.api && api.getUser) ? api.getUser() : {};
        const role = (user.role || 'TENANT').toUpperCase();
        host.innerHTML = renderShell(cfg, role);
        const panel = host;
        panelRef = () => panel;
        switchTab(panel, 'upload', cfg, role);
        panel.querySelectorAll('.fp-tab').forEach(tab => {
            tab.addEventListener('click', () => switchTab(panel, tab.dataset.tab, cfg, role));
        });
    }

    // Expose for pages that want to (re)init after DOM is ready.
    window.initFeaturePanel = initPanel;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPanel);
    } else {
        initPanel();
    }
})();