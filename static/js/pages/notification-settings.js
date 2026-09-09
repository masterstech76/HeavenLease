/* ============================================================
 * HeavenLease — Notification Settings module
 * Preference toggles (browser-stored) + recent notifications.
 * Extracted from notification-settings.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const prefs = [
        ['Payments & Access Pass', true, 'Important payment and access updates', 'credit-card'],
        ['Messages & chats', true, 'New conversations and messages', 'comments'],
        ['Tours & bookings', true, 'Tour and booking activity', 'calendar-check'],
        ['Leases & renewals', true, 'Lease milestones and renewal updates', 'file-signature'],
        ['Maintenance updates', true, 'Updates about maintenance activity', 'screwdriver-wrench'],
        ['New listings & deals', false, 'New property opportunities and deals', 'building']
    ];

    const KEY = 'heavenlease_notify_prefs';
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch (e) { /* keep defaults */ }

    function slugify(s) { return s.replace(/[^a-z0-9]+/gi, '-').toLowerCase(); }

    function renderPrefs() {
        const wrap = document.getElementById('prefWrap');
        if (!wrap) return;
        wrap.innerHTML = prefs.map(function (p) {
            const on = saved[p[0]] !== undefined ? saved[p[0]] : p[1];
            return '<label class="pref-row" for="notify-' + api.escapeHtml(slugify(p[0])) + '">'
                + '<span class="pref-copy">'
                + '<span class="pref-icon" aria-hidden="true"><i class="fas fa-' + p[3] + '"></i></span>'
                + '<span><strong>' + api.escapeHtml(p[0]) + '</strong><small>' + api.escapeHtml(p[2]) + '</small></span>'
                + '</span>'
                + '<span class="pref-switch">'
                + '<input id="notify-' + api.escapeHtml(slugify(p[0])) + '" type="checkbox" data-name="' + api.escapeHtml(p[0]) + '" ' + (on ? 'checked' : '') + ' aria-label="' + api.escapeHtml(p[0]) + '">'
                + '<span class="switch-track" aria-hidden="true"></span>'
                + '</span>'
                + '</label>';
        }).join('')
            + '<div class="settings-actions">'
            + '<span class="settings-hint"><i class="fas fa-lock" aria-hidden="true"></i> Preferences are stored in this browser.</span>'
            + '<button type="button" class="btn btn-primary" onclick="savePrefs()"><i class="fas fa-floppy-disk"></i> Save Preferences</button>'
            + '</div>';

        wrap.querySelectorAll('input[type=checkbox]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                saved[this.dataset.name] = this.checked;
            });
        });
    }

    window.savePrefs = function () {
        localStorage.setItem(KEY, JSON.stringify(saved));
        showToast('Notification preferences saved.', 'success');
    };

    async function loadNotifications() {
        const wrap = document.getElementById('notifyWrap');
        if (!wrap) return;
        try {
            let list = (await api.getNotifications().catch(() => [])) || [];
            if (!Array.isArray(list)) list = [];
            if (list.length === 0) {
                wrap.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash" aria-hidden="true"></i>No notifications yet. <a href="notifications">Open notifications</a></div>';
                return;
            }
            wrap.innerHTML = list.slice(0, 5).map(function (n) {
                return '<div class="notification-item">'
                    + '<span class="notification-icon" aria-hidden="true"><i class="fas fa-bell"></i></span>'
                    + '<div class="notification-content">'
                    + '<strong>' + api.escapeHtml(n.title || 'Update') + '</strong>'
                    + (n.message ? '<div>' + api.escapeHtml(n.message) + '</div>' : '')
                    + '</div></div>';
            }).join('');
        } catch (e) {
            wrap.innerHTML = '<div class="empty-state"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i>'
                + api.escapeHtml(e.message || 'Could not load notifications.') + '</div>';
        }
    }

    renderPrefs();
    loadNotifications();
})();