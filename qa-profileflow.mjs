export default async function run(page, ui) {
  const out = { steps: [] };

  async function drive(pageName, url, menuText) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // open the profile dropdown
    const opened = await page.click('.user-menu-trigger').then(function () { return 'opened'; }).catch(function (e) { return String(e).split('\n')[0]; });
    await page.waitForTimeout(500);

    // click the chosen item inside the dropdown
    var linkSel = '#profileDropdown a';
    var clicked = null;
    var items = await page.evaluate(function () {
      var drop = document.querySelector('#profileDropdown');
      if (!drop) return [];
      return Array.prototype.slice.call(drop.querySelectorAll('a')).map(function (a) {
        return { text: (a.innerText || '').trim(), href: a.getAttribute('href') };
      });
    });
    var target = null;
    for (var i = 0; i < items.length; i++) { if (items[i].text.indexOf(menuText) !== -1) target = items[i]; }

    if (target) {
      clicked = await page.click('#profileDropdown a:has-text("' + menuText + '")').then(function () { return 'clicked'; }).catch(function (e) { return String(e).split('\n')[0]; });
      await page.waitForTimeout(2500);
    }

    out.steps.push({
      onPage: pageName,
      opened: opened,
      dropdownItemsCount: items.length,
      targetItem: target,
      clicked: clicked,
      landedUrl: page.url(),
      landedTitle: await page.title(),
      redirectedToLogin: page.url().indexOf('/login') !== -1
    });
  }

  await drive('how-it-works -> My Profile & Settings', 'https://heavenlease.in/how-it-works', 'My Profile');
  await drive('how-it-works -> Main Home', 'https://heavenlease.in/how-it-works', 'Main Home');
  await drive('contact -> My Profile & Settings', 'https://heavenlease.in/contact', 'My Profile');

  return out;
}
