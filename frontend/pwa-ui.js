// PWA UI intentionally disabled.
// The floating settings popup was removed to keep the app from auto-injecting UI on load.

window.PWA_UI = {
  init() { },
  getSettings() {
    return {};
  },
  saveSettings() { },
  createSettingsPanel() {
    return null;
  }
};
