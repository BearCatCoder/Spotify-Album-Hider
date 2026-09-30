const albumInput = document.getElementById('album');
const startButton = document.getElementById('start');
const message = document.getElementById('message');
const results = document.getElementById('results');
const summary = document.getElementById('summary');
const details = document.getElementById('details');
const STORE = 'spotifyAlbumHiderStatus';

function albumUrl(value) {
  let url;
  try { url = new URL(value.trim()); } catch { throw new Error('Enter a Spotify album link.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com' ||
      !/^\/album\/[A-Za-z0-9]{22}\/?$/.test(url.pathname)) {
    throw new Error('Enter a link like https://open.spotify.com/album/<album-id>.');
  }
  return `https://open.spotify.com${url.pathname.replace(/\/$/, '')}`;
}

function render(status) {
  if (!status) return;
  // Allow retry after the album tab is closed or the browser is restarted.
  startButton.disabled = false;
  message.textContent = status.message || '';
  results.hidden = !status.tracks?.length;
  summary.textContent = `${status.tracks?.length || 0} tracks checked`;
  details.replaceChildren();
  for (const track of status.tracks || []) {
    const item = document.createElement('li');
    item.textContent = `${track.name}: hide — ${track.hide}; taste — ${track.taste}`;
    details.append(item);
  }
}

async function refresh() {
  const data = await chrome.storage.local.get(STORE);
  render(data[STORE]);
}

startButton.addEventListener('click', async () => {
  let url;
  try { url = albumUrl(albumInput.value); } catch (error) { message.textContent = error.message; return; }
  startButton.disabled = true;
  message.textContent = 'Opening album…';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'OPEN_ALBUM', url });
    if (response?.error) throw new Error(response.error);
  } catch (error) {
    await chrome.storage.local.set({ [STORE]: { running: false, message: error.message, tracks: [] } });
    await refresh();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORE]) render(changes[STORE].newValue);
});
refresh();
