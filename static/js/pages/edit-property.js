/* ============================================================
 * HeavenLease — Edit Property page module
 * Load a property by ID, edit fields, save changes.
 * Extracted from edit-property.html.
 * Requires js/api.js + js/core.js loaded first.
 * ============================================================ */
(function () {
    'use strict';

    const form = document.getElementById('propForm');
    const editFields = document.getElementById('editFields');
    if (!form || !editFields) return;
    let currentId = null;

    function fill(p) {
        currentId = p.id;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v == null ? '' : String(v); };
        set('pId', p.id);
        set('fTitle', p.title);
        set('fRent', p.rentAmount);
        set('fDeposit', p.deposit);
        set('fBhk', p.bhk);
        set('fType', p.propertyType);
        set('fLocality', p.locality);
        set('fCity', p.city);
        set('fQuiet', p.quietness);
        set('fSun', p.sunlight);
        set('fCommute', p.commute);
        const pet = document.getElementById('fPet'); if (pet) pet.checked = !!p.petFriendly;
        const furn = document.getElementById('fFurn'); if (furn) furn.checked = !!p.furnished;
        set('fStatus', (p.status || 'active').toLowerCase());
        editFields.style.display = 'block';
        editFields.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.loadProp = async function () {
        const id = Number(document.getElementById('pId').value || 0);
        if (!id) { showToast('Enter a property ID first.', 'error'); return; }
        try {
            const p = await api.getProperty(id);
            if (!p || !p.id) { showToast('Property not found.', 'error'); return; }
            fill(p);
            showToast('Listing loaded.', 'success');
        } catch (e) { showToast(e.message || 'Could not load property.', 'error'); }
    };

    form.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        if (!currentId) { showToast('Load a property first.', 'error'); return; }
        const btn = form.querySelector('button[type=submit]');
        const idle = '<i class="fas fa-floppy-disk"></i> Save Changes';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
        try {
            const payload = {
                title: document.getElementById('fTitle').value.trim(),
                rentAmount: Number(document.getElementById('fRent').value) || 0,
                deposit: Number(document.getElementById('fDeposit').value) || 0,
                bhk: Number(document.getElementById('fBhk').value) || 0,
                propertyType: document.getElementById('fType').value.trim(),
                locality: document.getElementById('fLocality').value.trim(),
                city: document.getElementById('fCity').value.trim(),
                quietness: Number(document.getElementById('fQuiet').value) || 0,
                sunlight: Number(document.getElementById('fSun').value) || 0,
                commute: Number(document.getElementById('fCommute').value) || 0,
                petFriendly: document.getElementById('fPet').checked,
                furnished: document.getElementById('fFurn').checked,
                status: document.getElementById('fStatus').value
            };
            await api.updateProperty(currentId, payload);
            showToast('Property updated successfully!', 'success');
        } catch (e) { showToast(e.message || 'Save failed.', 'error'); }
        finally { btn.disabled = false; btn.innerHTML = idle; }
    });

    const q = new URLSearchParams(window.location.search), id = q.get('id');
    if (id) { document.getElementById('pId').value = id; window.loadProp(); }
})();