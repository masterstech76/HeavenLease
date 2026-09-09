/* ============================================================
 * HeavenLease — Conversation / Messages page module
 * Real inbox: loads the signed-in user's conversations, renders
 * threads + messages, sends via POST /api/messages and listens on
 * the /ws WebSocket for live incoming messages.
 * Requires js/api.js (connectWebSocket/sendWebSocketMessage) first.
 * ============================================================ */
(function () {
    'use strict';

    /* ===== Auth guard (conversation is not auto-protected) ===== */
    if (!window.api || typeof api.isAuthenticated !== 'function' || !api.isAuthenticated()) {
        window.location.replace('login?redirect=conversation');
        return;
    }

    const me = api.getUser() || {};
    const myId = me.id;
    const input = document.getElementById('messageInput');
    const conversationEl = document.getElementById('conversation');
    const composer = document.getElementById('composer');
    const threadList = document.getElementById('threadList');
    const toast = document.getElementById('toast');

    let threads = [];
    let activeConversation = null;
    let activeName = '';

    function notify(text) {
        if (typeof showToast === 'function') { showToast(text, 'info'); return; }
        if (toast) {
            toast.textContent = text;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 2200);
        }
    }

    function fmtTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        if (isNaN(d.getTime())) return String(ts);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const y = new Date(today); y.setDate(today.getDate() - 1);
        if (d.toDateString() === y.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    function fmtMsgTime(ts) {
        if (!ts) return '';
        const d = new Date(ts);
        return isNaN(d.getTime()) ? String(ts) : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }

    /* ===== Header ===== */
    const headerName = document.querySelector('.user strong');
    const headerSmall = document.querySelector('.user small');
    const headerAvatar = document.querySelector('.user .avatar');
    if (me.name && headerName) headerName.textContent = me.name;
    if (me.email && headerSmall) headerSmall.textContent = me.email;
    if (headerAvatar && me.avatarUrl) headerAvatar.src = me.avatarUrl;

    /* ===== Thread list ===== */
    function renderThreads(q, activeFilter) {
        if (!threadList) return;
        q = (q || '').toLowerCase().trim();
        activeFilter = activeFilter || 'all';
        const filtered = threads.filter((t) => {
            const matchesText = !q || (t.name || '').toLowerCase().includes(q)
                || (t.property || '').toLowerCase().includes(q);
            const matchesFilter = activeFilter === 'all'
                || (activeFilter === 'unread' && Number(t.unread || 0) > 0)
                || (activeFilter === 'owner' && (t.type === 'owner' || !t.type));
            return matchesText && matchesFilter;
        });
        if (!filtered.length) {
            threadList.innerHTML = '<div class="empty">No conversations found.</div>';
            return;
        }
        threadList.innerHTML = filtered.map((t) =>
            '<div class="thread' + (String(t.id) === String(activeConversation) ? ' selected' : '') + '"'
            + ' data-conv-id="' + esc(t.id) + '" data-name="' + esc(t.name) + '" data-type="' + esc(t.type || 'owner') + '"'
            + ' data-unread="' + (Number(t.unread || 0) > 0 ? '1' : '0') + '" tabindex="0" role="button" aria-label="Conversation with ' + esc(t.name) + '">'
            + '<img class="thread-avatar" src="' + esc(t.avatar || 'https://i.pravatar.cc/100?img=5') + '" alt="">'
            + '<div class="thread-info">'
            + '<div class="thread-row"><span class="thread-name">' + esc(t.name || 'User') + '</span><span class="thread-time">' + esc(fmtTime(t.lastAt)) + '</span></div>'
            + (t.property ? '<div class="thread-property">' + esc(t.property) + '</div>' : '')
            + '<div class="thread-preview">' + esc(t.preview || '') + (Number(t.unread || 0) > 0 ? ' <span class="badge">' + t.unread + '</span>' : '') + '</div>'
            + '</div></div>').join('');
        threadList.querySelectorAll('.thread').forEach((el) => {
            const select = () => selectThread(el.dataset.convId, el.dataset.name);
            el.addEventListener('click', select);
            el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
        });
    }
/* ===== Messages pane ===== */
    function renderMessages(list) {
        if (!conversationEl) return;
        const msgs = Array.isArray(list) ? list : [];
        if (!msgs.length) {
            conversationEl.innerHTML = '<div class="date"><span>Today</span></div>'
                + '<div class="empty">No messages yet. Say hello to start the conversation.</div>';
            return;
        }
        conversationEl.innerHTML = '<div class="date"><span>Conversation</span></div>'
            + msgs.map((m) => {
                const isMe = String(m.senderId) === String(myId);
                const text = m.content || m.text || '';
                const time = fmtMsgTime(m.timestamp || m.createdAt);
                return '<div class="message ' + (isMe ? 'outgoing' : 'incoming') + '">'
                    + '<div><div class="bubble">' + esc(text) + '</div>'
                    + '<div class="meta">' + esc(time) + (isMe ? ' · Sent' : '') + '</div></div></div>';
            }).join('');
        conversationEl.scrollTop = conversationEl.scrollHeight;
    }

    async function selectThread(id, name) {
        if (id === undefined || id === null || id === '') return;
        activeConversation = String(id);
        activeName = name || '';
        renderThreads((document.getElementById('search') || {}).value || '', 'all');
        const contactName = document.querySelector('.contact-name');
        if (contactName) contactName.textContent = activeName || 'Conversation';
        try {
            const data = await api.getConversation(activeConversation);
            const msgs = data && Array.isArray(data.messages) ? data.messages : (Array.isArray(data) ? data : []);
            renderMessages(msgs);
            // mark read locally
            const t = threads.find((x) => String(x.id) === activeConversation);
            if (t) { t.unread = 0; }
        } catch (e) {
            if (conversationEl) conversationEl.innerHTML = '<div class="empty">Could not load this conversation.</div>';
        }
    }

    /* ===== Load conversations ===== */
    async function loadThreads() {
        try {
            const list = await api.getMyConversations();
            threads = (Array.isArray(list) ? list : []).map((c) => ({
                id: String(c.conversationId || c.id || c.otherUserId),
                otherUserId: c.otherUserId || c.userId || c.senderId,
                name: c.otherName || c.name || 'User',
                property: c.propertyTitle || c.property || '',
                preview: c.lastMessage || c.preview || '',
                lastAt: c.updatedAt || c.lastAt || c.lastMessageAt,
                unread: c.unreadCount || c.unread || 0,
                type: c.role === 'TENANT' ? 'tenant' : 'owner',
                avatar: c.avatarUrl || 'https://i.pravatar.cc/100?img=5'
            }));
        } catch (e) {
            threads = [];
        }
        renderThreads((document.getElementById('search') || {}).value || '', 'all');
        if (threads.length) {
            await selectThread(threads[0].id, threads[0].name);
        } else {
            if (conversationEl) conversationEl.innerHTML = '<div class="empty">No conversations yet. Browse properties and message an owner to get started.</div>';
        }
    }
/* ===== Composer ===== */
    if (composer) {
        composer.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = (input ? input.value : '').trim();
            if (!text || !activeConversation) return;
            const t = threads.find((x) => String(x.id) === activeConversation);
            const receiverId = t && t.otherUserId ? t.otherUserId : (t ? t.id : 0);
            // optimistic bubble
            const bubble = document.createElement('div');
            bubble.className = 'message outgoing';
            bubble.innerHTML = '<div><div class="bubble"></div><div class="meta">' + fmtMsgTime(new Date().toISOString()) + ' · Sending…</div></div>';
            bubble.querySelector('.bubble').textContent = text;
            if (conversationEl) { conversationEl.appendChild(bubble); conversationEl.scrollTop = conversationEl.scrollHeight; }
            if (input) input.value = '';
            try {
                const sent = await api.sendMessage({ receiverId: Number(receiverId) || 0, content: text });
                bubble.querySelector('.meta').textContent = fmtMsgTime(new Date().toISOString()) + ' · Sent';
                if (typeof sendWebSocketMessage === 'function') {
                    try {
                        sendWebSocketMessage({
                            conversationId: Number(activeConversation),
                            senderId: myId,
                            senderName: (me && (me.name || me.fullName)) || 'You',
                            content: text,
                            timestamp: new Date().toISOString()
                        });
                    } catch (_) { /* non-fatal */ }
                }
                const preview = (t && t.name ? t.name : '') || '';
                notify(preview ? 'Message sent to ' + preview.split(' ')[0] : 'Message sent');
            } catch (err) {
                bubble.querySelector('.meta').textContent = 'Failed · tap to retry';
                notify(err.message || 'Could not send message.');
            }
        });
    }

    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (composer) composer.requestSubmit();
            }
        });
    }

    /* ===== New conversation ===== */
    const newConversationBtn = document.getElementById('newConversation');
    if (newConversationBtn) {
        newConversationBtn.addEventListener('click', () => {
            if (input) input.focus();
            notify('Pick a thread from the list, or send your first message here.');
        });
    }

    /* ===== Search + filters ===== */
    const search = document.getElementById('search');
    if (search) {
        search.addEventListener('input', () => {
            const f = document.querySelector('.filter.active');
            renderThreads(search.value, f ? f.dataset.filter : 'all');
        });
    }
    document.querySelectorAll('.filter').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            renderThreads((document.getElementById('search') || {}).value || '', btn.dataset.filter);
        });
    });

    /* ===== Live WebSocket updates ===== */
    if (typeof connectWebSocket === 'function') {
        try {
            connectWebSocket((msg) => {
                if (!msg || !msg.conversationId) return;
                const cid = String(msg.conversationId);
                const t = threads.find((x) => String(x.id) === cid);
                const isActive = cid === String(activeConversation);
                const isMine = msg.senderId && String(msg.senderId) === String(myId);
                if (isActive && !isMine && conversationEl) {
                    const incoming = document.createElement('div');
                    incoming.className = 'message incoming';
                    incoming.innerHTML = '<div><div class="bubble"></div><div class="meta">'
                        + fmtMsgTime(msg.timestamp || new Date().toISOString()) + '</div></div>';
                    incoming.querySelector('.bubble').textContent = msg.content || msg.text || '';
                    conversationEl.appendChild(incoming);
                    conversationEl.scrollTop = conversationEl.scrollHeight;
                }
                if (t) {
                    t.preview = msg.content || msg.text || t.preview;
                    t.lastAt = msg.timestamp || new Date().toISOString();
                    if (!isActive) t.unread = Number(t.unread || 0) + 1;
                    renderThreads((document.getElementById('search') || {}).value || '',
                        (document.querySelector('.filter.active') || { dataset: { filter: 'all' } }).dataset.filter);
                }
            });
        } catch (_) { /* WS optional */ }
    }

    /* ===== Boot ===== */
    loadThreads();
})();