export default async function run(page, ui) {
  const out = { findings: [] };

  // 1. HOME PAGE header: every clickable element and its raw href
  await page.goto('https://havenlease.in'.replace('havenlease', 'heavenlease') + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  const headerMap = await page.evaluate(function () {
    var header = document.querySelector('header');
    if (!header) return 'no header';
    var els = header.querySelectorAll('a,div,button');
    var arr = [];
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var txt = (el.innerText || '').trim().slice(0, 30);
      var onclick = el.getAttribute('onclick');
      if (!txt && !onclick) continue;
      arr.push({
        tag: el.tagName,
        text: txt,
        rawHref: el.getAttribute('href'),
        resolvedHref: el.tagName === 'A' ? el.href : null,
        onclick: onclick,
        cls: String(el.className).slice(0, 60)
      });
    }
    return arr;
  });
  out.findings.push({ where: 'home-header-elements', headerMap });

  // 2. Follow the LOGO link
  await page.goto('https://heavenlease.in/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.click('a.logo').catch(function (e) { out.findings.push({ logoClickError: String(e).split('\n')[0] }); });
  await page.waitForTimeout(2500);
  out.findings.push({
    where: 'after-clicking-logo',
    landedUrl: page.url(),
    landedTitle: await page.title(),
    redirectedToLogin: page.url().indexOf('/login') !== -1
  });

  // 3. Scan every public page for ANY profile/account/avatar/user control
  var pages = ['/', '/how-it-works', '/contact', '/careers', '/about', '/signup', '/login', '/list-property', '/properties'];
  var profileScan = [];
  for (var i = 0; i < pages.length; i++) {
    var p = pages[i];
    await page.goto('https://heavenlease.in' + p, { waitUntil: 'domcontentloaded' }).catch(function () {});
    await page.waitForTimeout(600);
    var found = await page.evaluate(function () {
      var hits = [];
      var els = document.querySelectorAll('a,button,div[onclick],[role=button]');
      var re = new RegExp('profile|account|avatar|dashboard|user-menu|account-menu');
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        var parts = [el.innerText || '', String(el.className || ''), el.getAttribute('aria-label') || '', el.getAttribute('title') || '', el.getAttribute('href') || '', el.getAttribute('onclick') || ''];
        var blob = parts.join(' ').toLowerCase();
        if (re.test(blob)) {
          hits.push({
            tag: el.tagName,
            text: (el.innerText || '').trim().slice(0, 30),
            href: el.getAttribute('href'),
            onclick: (el.getAttribute('onclick') || '').slice(0, 70),
            cls: String(el.className).slice(0, 50)
          });
        }
      }
      return hits;
    });
    profileScan.push({ page: p, profileControls: found });
  }
  out.findings.push({ where: 'profile-control-scan', profileScan });

  return out;
}
