const STORE = 'spotifyAlbumHiderStatus';

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.type !== 'OPEN_ALBUM') return;
  (async () => {
    try {
      const tab = await chrome.tabs.create({ url: message.url, active: true });
      await chrome.storage.local.set({ [STORE]: { running: true, message: 'Loading album…', tracks: [] } });
      // Wait for navigation and the content script. Popup closure does not stop this worker.
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        try {
          const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_ALBUM', url: message.url });
          if (response?.started) { respond({ started: true }); return; }
          if (response?.error) throw new Error(response.error);
        } catch (error) {
          if (attempt === 39 || !/Receiving end does not exist|Could not establish connection/i.test(error.message)) throw error;
        }
      }
      throw new Error('Could not connect to the Spotify album tab. Reload it and try again.');
    } catch (error) {
      await chrome.storage.local.set({ [STORE]: { running: false, message: error.message, tracks: [] } });
      respond({ error: error.message });
    }
  })();
  return true;
});
