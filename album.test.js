const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const script = fs.readFileSync(path.join(__dirname, 'album.js'), 'utf8');
const id = '4aawyAB9vmqN3uQ7FjRGTy';

async function runScenario(hideOffered) {
  let listener;
  let menuOpen = false;
  let hidden = false;
  let excluded = false;
  let status;
  const scroll = { clientHeight: 600, get scrollTop() { return 0; }, set scrollTop(_value) {} };
  const menu = label => ({
    textContent: label,
    getClientRects: () => [1],
    click() {
      if (/Hide in/.test(label)) hidden = true;
      if (/Exclude/.test(label)) excluded = true;
      menuOpen = false;
    }
  });
  const row = {
    querySelector(selector) {
      if (selector.startsWith('a[')) return { getAttribute: () => `/track/${id}`, textContent: 'Test song' };
      if (selector.includes('more-button')) return { click: () => { menuOpen = true; } };
      return null;
    },
    scrollIntoView() {}
  };
  const document = {
    querySelectorAll(selector) {
      if (selector === '[data-testid="tracklist-row"]') return [row];
      if (selector === '[role="menuitem"]' && menuOpen) {
        return [
          ...(hideOffered ? [menu(hidden ? 'Show in this album' : 'Hide in this album')] : []),
          menu(excluded ? 'Include track in your taste profile' : 'Exclude track from your taste profile')
        ];
      }
      return [];
    },
    querySelector: () => scroll,
    activeElement: { dispatchEvent() {} },
    body: { click() { menuOpen = false; } }
  };
  vm.runInNewContext(script, {
    document,
    location: { pathname: `/album/${id}` },
    URL,
    KeyboardEvent: class {},
    setTimeout: callback => setImmediate(callback),
    chrome: {
      runtime: { onMessage: { addListener(fn) { listener = fn; } } },
      storage: { local: { async set(value) { status = value.spotifyAlbumHiderStatus; } } }
    }
  });
  const start = () => new Promise(resolve => {
    listener({ type: 'START_ALBUM', url: `https://open.spotify.com/album/${id}` }, null, resolve);
  });
  assert.equal((await start()).started, true);
  for (let attempt = 0; attempt < 1000 && status?.running !== false; attempt++) {
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.equal(status?.running, false, 'album processing should finish');
  return { status, hidden, excluded, start };
}

test('applies both actions when Spotify offers them', async () => {
  const result = await runScenario(true);
  assert.equal(result.hidden, true);
  assert.equal(result.excluded, true);
  assert.equal(result.status.tracks.length, 1);
  assert.equal(result.status.tracks[0].hide, 'applied');
  assert.equal(result.status.tracks[0].taste, 'applied');
});

test('reports unavailable album hiding while still excluding taste', async () => {
  const result = await runScenario(false);
  assert.equal(result.hidden, false);
  assert.equal(result.excluded, true);
  assert.equal(result.status.tracks[0].hide, 'option unavailable');
  assert.equal(result.status.tracks[0].taste, 'applied');
});
