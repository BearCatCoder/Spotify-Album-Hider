# Spotify-Album-Hider

A Chrome/Chromium/Edge browser extension for Ubuntu, Windows 11, and macOS. Paste a Spotify album link into the extension popup to apply **Hide in this album** and **Exclude track from your taste profile** to each track **when those options are offered by Spotify's web player**. The popup shows the result for each action and each track; unavailable options are never reported as successful.

## Install

1. Open `chrome://extensions` in Chrome/Chromium, or `edge://extensions` in Edge.
2. Turn on **Developer mode**, click **Load unpacked**, and select this `Spotify-Album-Hider` directory.
3. Sign in at [open.spotify.com](https://open.spotify.com/) in the same browser, and set Spotify's interface language to English (the extension matches English menu labels).
4. Click the extension icon, paste a link such as `https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy`, and click **Apply to album**. Keep the album tab open. Reopen the popup to view progress and individual results.

The extension processes the album page one track at a time, including rows loaded as you scroll. Rerunning it checks the menus again and treats already-applied actions as complete. To interrupt a run, close the album tab.

## Spotify limitations

Spotify's [public Web API](https://developer.spotify.com/documentation/web-api/reference) has no hide-in-album or taste-profile exclusion endpoint. This extension uses visible web-player menus; it cannot add menu options that Spotify doesn't offer. Spotify's [hide-song instructions](https://support.spotify.com/us/article/hide-unhide-songs/) currently document hiding in playlists, not albums. If **Hide in this album** is missing in the web player, the result will say `option unavailable`; an album-wide hide cannot be guaranteed. Spotify [supports excluding individual tracks](https://support.spotify.com/us/article/exclude-playlists-or-tracks-from-your-taste-profile/), but the option may vary by account or interface. Changes to Spotify's web-player layout may require updating the extension selectors.

No Spotify password, token, or private API is used; the extension only acts in your signed-in browser tab. The results are stored locally in your browser until the next run.

## Check the code

With Node.js installed, run `node --test album.test.js` from this directory to exercise the menu-action logic with a simulated album page. Live Spotify behavior requires a signed-in browser and depends on the menu options Spotify exposes to your account.
