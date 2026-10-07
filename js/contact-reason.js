// "Motif de votre demande" selector.
// One visible dropdown: main reasons render as bold, non-selectable group
// headings and their sub-issues as the selectable entries beneath them.
// CONTACT_REASONS is the single source of truth for the dropdown and for the
// submitted payload. The visible <select> has no name and is never posted.
(function () {
	'use strict';

	// A heading with sub-issues is an <optgroup> label and cannot be selected.
	// A heading with no sub-issues is itself a selectable option.
	var CONTACT_REASONS = [
		{
			id: 'wholesaler_retailer',
			label: 'Devenir grossiste / revendeur',
			subOptions: [
				{ id: 'wholesaler_opportunities', label: 'Opportunités pour les grossistes' },
				{ id: 'retailer_opportunities', label: 'Opportunités pour les revendeurs' }
			]
		},
		{
			id: 'general_support',
			label: 'Assistance générale',
			subOptions: [
				{ id: 'where_to_buy', label: 'Où acheter Crown Switch ?' },
				{ id: 'device_warranty', label: 'Garantie de l\u2019appareil' },
				{ id: 'other_general_inquiry', label: 'Autre demande générale' }
			]
		},
		{
			id: 'device_support',
			label: 'Assistance appareil',
			subOptions: [
				{ id: 'led_blinking_green', label: 'Voyant LED : vert clignotant' },
				{ id: 'led_blinking_red', label: 'Voyant LED : rouge clignotant' },
				{ id: 'led_3_red_flashes', label: 'Voyant LED : 3 clignotements rouges' },
				{ id: 'led_5_orange_flashes', label: 'Voyant LED : 5 clignotements orange' },
				{ id: 'led_3_orange_flashes', label: 'Voyant LED : 3 clignotements orange' },
				{ id: 'led_5_white_flashes', label: 'Voyant LED : 5 clignotements blancs' },
				{ id: 'other_device_inquiry', label: 'Autre demande concernant l\u2019appare' }
			]
		},
		{ id: 'pods_support', label: 'Assistance Pods', subOptions: [] },
		{ id: 'brand_partnerships', label: 'Partenariats de marque', subOptions: [] },
		{ id: 'website_feedback', label: 'Commentaires sur le site web', subOptions: [] }
	];

	var PLACEHOLDER = '-Select-';
	var KEY_SEPARATOR = '::';

	var els = {};
	var state = { reason: null, subIssue: null };

	function byId(id) { return document.getElementById(id); }

	function reasonById(id) {
		for (var i = 0; i < CONTACT_REASONS.length; i++) {
			if (CONTACT_REASONS[i].id === id) { return CONTACT_REASONS[i]; }
		}
		return null;
	}

	function subIssueById(reason, id) {
		if (!reason) { return null; }
		for (var i = 0; i < reason.subOptions.length; i++) {
			if (reason.subOptions[i].id === id) { return reason.subOptions[i]; }
		}
		return null;
	}

	function showError(show) {
		if (els.error) { els.error.style.display = show ? 'block' : 'none'; }
	}

	/* ---------------------------------------------------------------- render */

	function buildOption(value, text, reasonId, subIssueId) {
		var option = document.createElement('option');
		option.value = value;
		option.textContent = text;
		option.setAttribute('data-reason-id', reasonId);
		if (subIssueId) { option.setAttribute('data-sub-issue-id', subIssueId); }
		return option;
	}

	function renderDropdown() {
		var select = els.select;
		select.innerHTML = '';

		var placeholder = document.createElement('option');
		placeholder.value = PLACEHOLDER;
		placeholder.textContent = '';
		select.add(placeholder);

		CONTACT_REASONS.forEach(function (reason) {
			if (reason.subOptions.length === 0) {
				select.add(buildOption(reason.id, reason.label, reason.id));
				return;
			}

			// <optgroup> renders the heading bold and unselectable.
			var group = document.createElement('optgroup');
			group.label = reason.label;
			group.setAttribute('data-reason-id', reason.id);
			reason.subOptions.forEach(function (sub) {
				group.appendChild(buildOption(
					reason.id + KEY_SEPARATOR + sub.id, sub.label, reason.id, sub.id
				));
			});
			select.appendChild(group);
		});

		select.value = PLACEHOLDER;
	}

	/* ----------------------------------------------------------------- state */

	function parseSelection(value) {
		if (!value || value === PLACEHOLDER) { return { reason: null, subIssue: null }; }

		var parts = value.split(KEY_SEPARATOR);
		var reason = reasonById(parts[0]);
		return { reason: reason, subIssue: parts.length > 1 ? subIssueById(reason, parts[1]) : null };
	}

	// The visible <select> is unnamed and never posted. These hidden inputs are
	// what Zoho receives: the heading in Dropdown, the sub-issue in Dropdown1.
	function syncHiddenFields() {
		els.zohoReason.value = state.reason ? state.reason.label : '';
		els.zohoSubIssue.value = state.subIssue ? state.subIssue.label : '';
	}

	function onChange() {
		var selection = parseSelection(els.select.value);
		state.reason = selection.reason;
		state.subIssue = selection.subIssue;

		syncHiddenFields();
		showError(false);
		els.submit.disabled = !state.reason;
	}

	/* ------------------------------------------------------------ validation */

	function getPayload() {
		return {
			reason: state.reason ? state.reason.label : '',
			subIssue: state.subIssue ? state.subIssue.label : ''
		};
	}

	function validate() {
		var hasSubOptions = !!state.reason && state.reason.subOptions.length > 0;
		var missingSubIssue = hasSubOptions && !state.subIssue;

		if (!state.reason || missingSubIssue) {
			showError(true);
			els.select.focus();
			return false;
		}

		syncHiddenFields();
		return true;
	}

	/* ------------------------------------------------------------------ init */

	function init() {
		els = {
			select: byId('cs-reasonSelect'),
			error: byId('Dropdown_error'),
			zohoReason: byId('Dropdown'),
			zohoSubIssue: byId('Dropdown1'),
			submit: byId('cs-submit')
		};

		if (!els.select || !els.zohoReason || !els.zohoSubIssue || !els.submit) { return; }

		renderDropdown();
		els.select.addEventListener('change', onChange);
		// Browsers restore a select's state on reload/back without firing
		// change, which would leave the posted fields out of sync with the
		// visible choice.
		window.addEventListener('pageshow', onChange);
		onChange();
	}

	window.CrownSwitchContactReason = {
		reasons: CONTACT_REASONS,
		getPayload: getPayload,
		validate: validate
	};

	// Runs Zoho's own field validation first, then the reason rules.
	window.cs_ValidateAndSubmit = function () {
		return zf_ValidateAndSubmit() && validate();
	};

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
