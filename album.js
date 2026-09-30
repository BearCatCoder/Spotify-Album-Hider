(() => {
  const STORE = 'spotifyAlbumHiderStatus';
  let running = false;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const rows = () => [...document.querySelectorAll('[data-testid="tracklist-row"]')];

  async function waitFor(predicate, timeout = 5000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const value = predicate();
      if (value) return value;
      await sleep(150);
    }
    return null;
  }

  function trackInfo(row) {
    const link = row.querySelector('a[href*="/track/"]');
    const id = link?.getAttribute('href')?.match(/\/track\/([A-Za-z0-9]{22})/)?.[1];
    return id ? { id, name: link.textContent.trim() || id } : null;
  }

  function menuButton(row) {
    return row.querySelector('[data-testid="more-button"], button[aria-label*="More options"], button[aria-label*="More Options"]');
  }

  function menuItems() {
    return [...document.querySelectorAll('[role="menuitem"]')].filter(el => el.getClientRects().length);
  }

  async function openMenu(row) {
    const button = menuButton(row);
    if (!button) return false;
    button.click();
    return !!(await waitFor(() => menuItems().length > 0 ? menuItems() : null, 2500));
  }

  function closeMenu() {
    if (menuItems().length) {
      document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.body.click();
    }
  }

  async function applyAction(row, desired, already) {
    if (!(await openMenu(row))) return 'menu unavailable';
    try {
      const items = menuItems();
      const label = element => element.textContent.replace(/\s+/g, ' ').trim();
      if (items.some(item => already.test(label(item)))) return 'already applied';
      const action = items.find(item => desired.test(label(item)));
      if (!action) return 'option unavailable';
      action.click();
      await sleep(350);
      return 'applied';
    } finally {
      closeMenu();
      await sleep(150);
    }
  }

  async function processRow(row) {
    const info = trackInfo(row);
    if (!info) return null;
    row.scrollIntoView({ block: 'center' });
    await sleep(120);
    let hide;
    try { hide = await applyAction(row, /^Hide in this album$/i, /^(Show|Unhide) in this album$/i); }
    catch (error) { hide = `error: ${error.message}`; closeMenu(); }
    // Spotify may replace the row when the first action updates its state.
    const currentRow = rows().find(candidate => trackInfo(candidate)?.id === info.id);
    let taste = 'row unavailable after hide';
    if (currentRow) {
      try {
        taste = await applyAction(currentRow, /^Exclude (track )?from your taste profile$/i,
          /^Include (track )?(in|to) your taste profile$/i);
      } catch (error) { taste = `error: ${error.message}`; closeMenu(); }
    }
    return { ...info, hide, taste };
  }

  async function publish(status) {
    await chrome.storage.local.set({ [STORE]: status });
  }

  async function run(url) {
    const status = { running: true, message: 'Waiting for album tracks…', tracks: [] };
    try {
      const albumId = new URL(url).pathname.split('/')[2];
      const loaded = await waitFor(() => location.pathname.startsWith(`/album/${albumId}`) && rows().length, 30000);
      if (!loaded) throw new Error('Album tracks did not load. Sign in to Spotify, reload the album, then try again.');
      const seen = new Set();
      const scroll = document.querySelector('.main-view-container__scroll-node') || document.scrollingElement;
      let stalled = 0;
      while (stalled < 3) {
        if (!location.pathname.startsWith(`/album/${albumId}`)) throw new Error('Album page changed; stopped.');
        let added = 0;
        for (const row of rows()) {
          const info = trackInfo(row);
          if (!info || seen.has(info.id)) continue;
          seen.add(info.id);
          added++;
          let result;
          try {
            const currentRow = rows().find(candidate => trackInfo(candidate)?.id === info.id);
            result = currentRow ? await processRow(currentRow) : { ...info, hide: 'row unavailable', taste: 'row unavailable' };
          }
          catch (error) { result = { ...info, hide: 'error', taste: `error: ${error.message}` }; closeMenu(); }
          status.tracks.push(result);
          status.message = `Checked ${status.tracks.length} tracks…`;
          await publish(status);
        }
        const previous = scroll.scrollTop;
        scroll.scrollTop += Math.max(300, scroll.clientHeight * 0.7);
        await sleep(600);
        stalled = added === 0 && scroll.scrollTop === previous ? stalled + 1 : 0;
      }
      if (!status.tracks.length) throw new Error('No track links were found on this album.');
      status.message = `Finished: ${status.tracks.length} tracks checked. Review any unavailable actions below.`;
    } catch (error) {
      status.message = `Stopped: ${error.message}`;
    } finally {
      status.running = false;
      await publish(status);
      running = false;
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, respond) => {
    if (message.type !== 'START_ALBUM') return;
    if (running) { respond({ error: 'An album is already being processed in this tab.' }); return; }
    running = true;
    respond({ started: true });
    run(message.url);
  });
})();
