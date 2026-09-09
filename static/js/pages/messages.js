/* ============================================================
 * HeavenLease — Messages (inbox) page module
 * Real backend conversations + WebSocket live updates, with
 * Access-Pass gate. Extracted from messages.html.
 * Requires js/api.js (connectWebSocket/sendWebSocketMessage) + js/core.js.
 * ============================================================ */
(function () {
    'use strict';

    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50 && navbar) navbar.classList.add('scrolled');
        else if (navbar) navbar.classList.remove('scrolled');
    });
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
        document.querySelectorAll('.nav-link').forEach((link) => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    /* ===== Chat state ===== */
    let currentUser = { name: 'You', id: 'me' };
    try {
        const stored = JSON.parse(localStorage.getItem('heavenlease_user') || '{}');
        currentUser = Object.assign({}, currentUser, stored, { id: stored.email || 'me' });
    } catch (e) { /* keep defaults */ }

    const STORAGE_KEY = 'HeavenLease_messages';

    function loadConversations() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch (e) { return []; }
    }

    const owners = {};
    let conversations = [];
    let activeConversation = null;
    let currentUserId = null;
    let isPaid = false;
    const meUser = (function () { try { return JSON.parse(localStorage.getItem('heavenlease_user') || '{}'); } catch (e) { return {}; } })();
    if (meUser && meUser.id) currentUserId = Number(meUser.id);

    function saveConversations() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    }

    function formatTime(ts) {
        if (!ts) return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        try {
            const d = new Date(ts);
            return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } catch (e) { return ''; }
    }

    /* ===== Render conversation list ===== */
    function renderConversations(filter) {
        filter = filter || '';
        const items = document.getElementById('conversationItems');
        if (!items) return;
        const filtered = conversations.filter((c) =>
            (c.ownerName || '').toLowerCase().includes(filter.toLowerCase()) ||
            (c.property || '').toLowerCase().includes(filter.toLowerCase())
        );
        if (filtered.length === 0) {
            items.innerHTML = '<div style="text-align:center; padding:40px 20px; color: var(--gray-400);"><i class="fas fa-comments" style="font-size: 36px; margin-bottom: 12px; display:block;"></i><p>No conversations found.</p><a href="properties" style="color: var(--primary); font-weight: 500; display:inline-block; margin-top:12px;">Browse properties →</a></div>';
            return;
        }
        items.innerHTML = filtered.map((c) => {
            const last = c.messages && c.messages.length ? c.messages[c.messages.length - 1] : null;
            const preview = last ? last.text : (c.lastMessage || 'Start a conversation');
            const time = last ? last.time : (c.lastTime || '');
            return '<div class="conversation-item ' + (activeConversation === c.id ? 'active' : '') + '" onclick="openConversation(\'' + c.id + '\')">'
                + '<div class="conversation-avatar"><i class="fas fa-user"></i></div>'
                + '<div class="conversation-info">'
                + '<div class="name">' + escapeHtml(c.ownerName) + '<span class="time">' + escapeHtml(time) + '</span></div>'
                + '<span class="property-tag"><i class="fas fa-home"></i> ' + escapeHtml(c.property || 'Messages') + '</span>'
                + '<div class="preview">' + escapeHtml(preview) + '</div>'
                + '</div>'
                + (c.unread > 0 ? '<span class="unread-badge">' + c.unread + '</span>' : '')
                + '</div>';
        }).join('');
    }

    window.filterConversations = function (value) { renderConversations(value); };

    function renderMessages(convId) {
        const conv = conversations.find((c) => c.id === convId);
        if (!conv) return;
        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return;
        const grouped = {};
        (conv.messages || []).forEach((m) => {
            const day = m.time && m.time.includes('Yesterday') ? 'Yesterday' : 'Today';
            if (!grouped[day]) grouped[day] = [];
            grouped[day].push(m);
        });
        messagesDiv.innerHTML = Object.keys(grouped).map((day) =>
            '<div class="chat-date-divider">' + escapeHtml(day) + '</div>'
            + grouped[day].map((m) =>
                '<div class="chat-message ' + (m.from === 'me' ? 'sent' : 'received') + '">'
                + escapeHtml(m.text) + '<span class="msg-time">' + escapeHtml(m.time) + '</span>'
                + '</div>').join('')
        ).join('');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
window.openConversation = function (convId) {
        if (!isPaid) {
            window.location.href = 'payment?redirect=messages';
            return;
        }
        activeConversation = convId;
        const conv = conversations.find((c) => c.id === convId);
        if (!conv) return;

        document.getElementById('emptyChat').style.display = 'none';
        document.getElementById('chatHeader').style.display = 'flex';
        document.getElementById('chatInputArea').style.display = 'flex';
        document.getElementById('chatAvatar').innerHTML = '<i class="fas fa-user"></i>';
        document.getElementById('chatOwnerName').textContent = conv.ownerName;
        document.getElementById('chatOwnerStatus').textContent = 'Verified Owner';
        document.getElementById('chatOwnerStatus').className = '';

        if (currentUserId) {
            api.getConversation(Number(convId)).then((msgs) => {
                conv.messages = (Array.isArray(msgs) ? msgs : []).map((m) => ({
                    from: (m.senderId && String(m.senderId) === String(currentUserId)) ? 'me' : 'them',
                    text: m.content || '',
                    time: formatTime(m.timestamp)
                }));
                conv.unread = 0;
                saveConversations();
                renderMessages(conv.id);
            }).catch(() => {
                conv.messages = conv.messages || [];
                renderMessages(conv.id);
            });
        } else {
            conv.messages = conv.messages || [];
            renderMessages(conv.id);
        }

        if (window.innerWidth <= 768) {
            document.getElementById('conversationsList').classList.remove('mobile-show');
            document.getElementById('chatWindow').classList.remove('mobile-hide');
        }
    };

    window.sendMessage = function () {
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text || !activeConversation) return;
        const conv = conversations.find((c) => c.id === activeConversation);
        if (!conv) return;
        if (!currentUserId) { showToast('Please sign in to send messages.', 'error'); return; }

        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        if (!conv.messages) conv.messages = [];
        conv.messages.push({ from: 'me', text: text, time: timeStr });
        saveConversations();
        input.value = '';
        renderMessages(activeConversation);
        renderConversations();

        api.sendMessage({
            conversationId: Number(activeConversation),
            senderId: currentUserId,
            receiverId: conv.otherUserId || 0,
            content: text
        }).then(() => {
            if (typeof sendWebSocketMessage === 'function') {
                try {
                    sendWebSocketMessage({
                        conversationId: Number(activeConversation),
                        senderId: currentUserId,
                        senderName: meUser.name || 'You',
                        content: text,
                        timestamp: new Date().toISOString()
                    });
                } catch (_) { /* non-fatal */ }
            }
        }).catch((err) => {
            showToast((err && err.message) || 'Failed to send message.', 'error');
        });
    };

    function appendIncoming(msg) {
        const conv = conversations.find((c) => c.id === String(msg.conversationId));
        if (!conv) return;
        if (!conv.messages) conv.messages = [];
        const from = (msg.senderId && String(msg.senderId) === String(currentUserId)) ? 'me' : 'them';
        conv.messages.push({ from: from, text: msg.content || msg.text || '', time: formatTime(msg.timestamp) });
        saveConversations();
        if (activeConversation && String(activeConversation) === String(msg.conversationId)) {
            renderMessages(activeConversation);
        }
        renderConversations();
    }

    async function loadInitial() {
        if (!currentUserId) { renderConversations(); return; }
        try {
            const list = await api.getMyConversations();
            conversations = (Array.isArray(list) ? list : []).map((c) => ({
                id: String(c.conversationId),
                ownerName: c.otherName || 'User',
                property: c.propertyTitle || '',
                unread: c.unread || 0,
                otherUserId: c.otherUserId,
                lastMessage: c.lastMessage || '',
                lastTime: c.lastTime ? formatTime(c.lastTime) : '',
                messages: []
            }));
        } catch (e) {
            conversations = [];
        }
        renderConversations();

        if (typeof connectWebSocket === 'function') {
            try {
                connectWebSocket((msg) => {
                    if (msg && msg.conversationId && activeConversation && String(msg.conversationId) === String(activeConversation)) {
                        appendIncoming(msg);
                    }
                });
            } catch (_) { /* WS optional */ }
        }
    }

    /* ===== Access-Pass gate (server truth) ===== */
    (async () => {
        try {
            const sub = await api.getSubscription();
            isPaid = !!(sub && sub.active);
        } catch (e) { isPaid = false; }
        loadInitial();
    })();

    /* ===== URL ?property= auto-open ===== */
    const urlParams = new URLSearchParams(window.location.search);
    const propertyParam = urlParams.get('property');
    if (propertyParam && isPaid) {
        setTimeout(() => {
            const matching = conversations.find((c) => (c.property || '').toLowerCase().includes(propertyParam.toLowerCase()));
            if (matching) openConversation(matching.id);
        }, 800);
    }
})();
    }