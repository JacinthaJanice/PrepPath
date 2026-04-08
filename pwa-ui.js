// PWA UI Controls: Settings panel with backend URL configuration

const PWA_UI = (() => {
  // Settings stored in localStorage
  const STORAGE_KEY = 'pp3_settings';

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function createSettingsPanel() {
    const panel = document.createElement('div');
    panel.id = 'pp-settings-panel';
    panel.innerHTML = `
      <div style="
        position: fixed; bottom: 20px; right: 20px; z-index: 9999;
        background: var(--surface); border: 1px solid var(--border);
        border-radius: 12px; padding: 20px; max-width: 360px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        font-family: 'Syne', sans-serif; color: var(--text);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="
            font-family: 'Playfair Display', serif; font-size: 1.1rem;
            font-weight: 700; color: var(--gold2); margin: 0;
          ">⚙ Settings</h3>
          <button id="pp-settings-close" style="
            background: none; border: none; color: var(--text2); font-size: 1.5rem;
            cursor: pointer; padding: 0; width: 24px; height: 24px;
            display: flex; align-items: center; justify-content: center;
          ">×</button>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="
            display: block; font-size: 0.8rem; font-weight: 600;
            color: var(--muted); text-transform: uppercase; letter-spacing: 1px;
            margin-bottom: 8px;
          ">Backend URL</label>
          <input
            id="pp-backend-url"
            type="text"
            placeholder="http://localhost:3001"
            style="
              width: 100%; padding: 10px 12px; border-radius: 8px;
              background: var(--surface2); border: 1px solid var(--border2);
              color: var(--text); font-family: 'JetBrains Mono', monospace;
              font-size: 0.8rem; outline: none; transition: border-color 0.2s;
            "
          />
          <div style="
            font-size: 0.7rem; color: var(--muted); margin-top: 6px;
            line-height: 1.4;
          ">
            Change this to deploy/staging URL when needed.
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <label style="
            display: flex; align-items: center; gap: 8px; cursor: pointer;
            font-size: 0.8rem; padding: 8px; border-radius: 6px;
            background: var(--surface2); transition: background 0.2s;
          ">
            <input id="pp-pwa-prompt" type="checkbox" style="accent-color: var(--teal);" />
            <span>Show app install prompt</span>
          </label>
        </div>

        <div style="display: flex; gap: 8px;">
          <button id="pp-settings-apply" style="
            flex: 1; padding: 10px; border-radius: 8px;
            background: var(--gold); color: #1a0a00; border: none;
            font-weight: 700; font-family: 'Syne', sans-serif; cursor: pointer;
            font-size: 0.8rem; transition: background 0.2s;
          ">Save</button>
          <button id="pp-settings-sync" style="
            flex: 1; padding: 10px; border-radius: 8px;
            background: var(--surface2); color: var(--text); border: 1px solid var(--border2);
            font-weight: 700; font-family: 'Syne', sans-serif; cursor: pointer;
            font-size: 0.8rem; transition: all 0.2s;
          ">Sync Now</button>
        </div>

        <div id="pp-settings-status" style="
          font-size: 0.75rem; color: var(--text2); margin-top: 12px;
          padding: 8px; background: var(--surface2); border-radius: 6px;
          display: none;
        "></div>
      </div>
    `;

    document.body.appendChild(panel);

    // Load current settings
    const settings = getSettings();
    const urlInput = document.getElementById('pp-backend-url');
    const promptCheckbox = document.getElementById('pp-pwa-prompt');

    urlInput.value = settings.backendUrl ||
      (window.PP_CONFIG?.BACKEND_URL || 'http://localhost:3001');
    promptCheckbox.checked = settings.showPwaPrompt !== false;

    // Close button
    document.getElementById('pp-settings-close').addEventListener('click', () => {
      panel.style.display = 'none';
    });

    // Save button
    document.getElementById('pp-settings-apply').addEventListener('click', () => {
      const newUrl = urlInput.value.trim();
      const newSettings = {
        backendUrl: newUrl,
        showPwaPrompt: promptCheckbox.checked
      };
      saveSettings(newSettings);

      // Update global config
      if (window.PP_CONFIG) {
        window.PP_CONFIG.BACKEND_URL = newUrl;
      }

      showStatus('✓ Settings saved. Reload to apply new backend URL.');
    });

    // Sync now button
    document.getElementById('pp-settings-sync').addEventListener('click', async () => {
      showStatus('⏳ Syncing...');
      try {
        // Try saving progress to backend
        if (window.API?.saveProgress) {
          const state = JSON.parse(localStorage.getItem('pp3_state') || '{}');
          await window.API.saveProgress(state);
          showStatus('✓ Sync complete!');
        }
      } catch (err) {
        showStatus('✗ Sync failed: ' + err.message);
      }
    });

    function showStatus(msg) {
      const status = document.getElementById('pp-settings-status');
      status.textContent = msg;
      status.style.display = 'block';
      setTimeout(() => { status.style.display = 'none'; }, 3000);
    }

    return panel;
  }

  function createSettingsButton() {
    const btn = document.createElement('button');
    btn.id = 'pp-settings-btn';
    btn.innerHTML = '⚙';
    btn.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 9998;
      width: 48px; height: 48px;
      border-radius: 50%; background: var(--gold); color: #1a0a00;
      border: none; font-size: 1.2rem; cursor: pointer;
      box-shadow: 0 4px 16px rgba(232, 160, 32, 0.3);
      transition: all 0.2s;
      font-weight: 700;
    `;
    btn.addEventListener('click', () => {
      const panel = document.getElementById('pp-settings-panel');
      if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      }
    });
    btn.addEventListener('mouseover', () => { btn.style.transform = 'scale(1.1)'; });
    btn.addEventListener('mouseout', () => { btn.style.transform = 'scale(1)'; });
    return btn;
  }

  function init() {
    // Create settings UI
    createSettingsPanel();
    document.body.appendChild(createSettingsButton());

    // Load backend URL from localStorage if available
    const settings = getSettings();
    if (settings.backendUrl && window.PP_CONFIG) {
      window.PP_CONFIG.BACKEND_URL = settings.backendUrl;
    }
  }

  return { init, getSettings, saveSettings, createSettingsPanel };
})();

// Initialize PWA UI after DOM loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', PWA_UI.init);
} else {
  PWA_UI.init();
}
