// auth-ui.js — AuthUI for PrepPath with Supabase + Real-Time Sync
// Handles login, logout, and sync status display

const AuthUI = (() => {
  let isLoggedIn = false;

  function render() {
    const user = SYNC.getCurrentUser();
    const isAuth = !!user;

    return `
      <div id="auth-container" style="
        padding: 12px 16px;
        background: var(--surface, #1e1409);
        border-bottom: 1px solid var(--border, #3d2a14);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
      ">
        <!-- Sync Status Indicator -->
        <div id="sync-status" style="
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text2, #c4a97a);
        ">
          <span id="sync-dot" style="
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #666;
            transition: all 200ms;
          "></span>
          <span id="sync-text">Disconnected</span>
        </div>

        <!-- User Info & Auth -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
          ${isAuth ? `
            <span style="font-size: 13px; color: var(--text2, #c4a97a);">
              ${user.email}
            </span>
            <button onclick="AuthUI.logout()" style="
              padding: 6px 12px;
              background: var(--rose, #fb7185);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              transition: opacity 200ms;
            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
              Logout
            </button>
          ` : `
            <form onsubmit="AuthUI.handleSignup(event)" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end; margin:0;">
              <input
                id="auth-email"
                type="email"
                placeholder="academic.email@domain.com"
                required
                style="
                  min-width: 220px;
                  padding: 8px 10px;
                  background: var(--surface2, #271a0d);
                  border: 1px solid var(--border, #3d2a14);
                  border-radius: 6px;
                  color: var(--text, #f5e8cc);
                  font-size: 12px;
                "
              />
              <button type="submit" style="
                padding: 8px 12px;
                background: var(--gold, #e8a020);
                color: var(--bg, #0e0a06);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: opacity 200ms;
              " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
                Send Sign-In Link
              </button>
            </form>
            <span id="auth-message" style="font-size:12px; color:var(--text2, #c4a97a);"></span>
          `}
        </div>
      </div>
    `;
  }

  function mount(parentSelector) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return console.error(`AuthUI: ${parentSelector} not found`);

    parent.innerHTML = render();

    // Listen to sync status changes
    SYNC.onSyncStatusChange(updateSyncStatus);
  }

  function updateSyncStatus(status) {
    const dot = document.getElementById('sync-dot');
    const text = document.getElementById('sync-text');

    if (!dot || !text) return;

    const colors = {
      connected: { bg: '#86efac', text: '🟢 Synced' },
      syncing: { bg: '#fcd34d', text: '🟡 Syncing...' },
      error: { bg: '#fb7185', text: '🔴 Sync Error' },
      disconnected: { bg: '#666', text: '⚪ Offline' }
    };

    const config = colors[status] || colors.disconnected;
    dot.style.background = config.bg;
    text.textContent = config.text;
  }

  async function handleSignup(event) {
    event.preventDefault();
    const emailInput = document.getElementById('auth-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const msg = document.getElementById('auth-message');
    if (!email || !msg) return;

    msg.textContent = '⏳ Sending secure sign-in link...';

    try {
      await SYNC.signUpWithEmail(email);
      msg.style.color = 'var(--sage, #86efac)';
      msg.textContent = '✓ Check your email for the sign-in link.';
      if (emailInput) emailInput.value = '';
    } catch (error) {
      msg.style.color = 'var(--rose, #fb7185)';
      const reason = (error && error.message ? error.message : '').toLowerCase();
      if (reason.includes('invalid api key')) {
        msg.textContent = '✗ Sign-in setup incomplete. Update SUPABASE_ANON_KEY in config.js.';
      } else {
        msg.textContent = `✗ ${error.message}`;
      }
    }
  }

  async function logout() {
    if (!confirm('Log out and stop syncing?')) return;
    await SYNC.logOut();
    location.reload();
  }

  return {
    render,
    mount,
    handleSignup,
    logout,
    updateSyncStatus
  };
})();
