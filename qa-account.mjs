export default async function run(page, ui) {
  const out = { steps: [] };

  // Go to a page that actually has the Account (profile) button
  await page.goto('https://heavenlease.in/how-it-works', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);

  // Locate the Account trigger precisely
  const before = await page.evaluate(function () {
    var btn = document.querySelector('.user-menu-trigger');
    if (!btn) return 'NO .user-menu-trigger FOUND';
    var menu = btn.parentElement ? btn.parentElement.querySelector('.user-menu,.menu,.dropdown,[class*=menu]') : null;
    return {
      triggerTag: btn.tagName,
      triggerText: (btn.innerText || '').trim(),
      triggerClass: btn.className,
      parentHTML: btn.parentElement ? btn.parentElement.outerHTML.slice(0, 900) : null
    };
  });
  out.steps.push({ at: 'before-click', info: before });

  // Click the Account trigger
  const clicked = await page.click('.user-menu-trigger').then(function () { return 'ok'; }).catch(function (e) { return String(e).split('\n')[0]; });
  out.steps.push({ at: 'click-account', result: clicked });
  await page.waitForTimeout(700);

  // What changed? Is the dropdown now visible, and what links does it contain?
  const after = await page.evaluate(function () {
    var btn = document.querySelector('.user-menu-trigger');
    var scope = btn && btn.parentElement ? btn.parentElement : document;
    var links = [];
    var anchors = scope.querySelectorAll('a');
    for (var i = 0; i < anchors.length; i++) {
      var vis = anchors[i].offsetParent !== null;
      links.push({ text: (anchors[i].innerText || '').trim().slice(0, 40), href: anchors[i].getAttribute('href'), visible: vis });
    }
    // also detect any now-visible dropdown/menu container
    var menus = [];
    var cand = document.querySelectorAll('[class*=dropdown],[class*=user-menu],[class*=profile-menu],[class*=popover]');
    for (var k = 0; k < cand.length; k++) {
      menus.push({ cls: cand[k].className, visible: cand[k].offsetParent !== null, text: (cand[k].innerText || '').trim().slice(0, 80) });
    }
    return { scopeLinks: links, menus: menus };
  });
  out.steps.push({ at: 'after-click', info: after });

  return out;
}
