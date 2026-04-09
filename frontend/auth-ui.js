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
        <div style="display: flex; gap: 8px; align-items: center;">
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
            <button onclick="AuthUI.openLoginModal()" style="
              padding: 6px 12px;
              background: var(--gold, #e8a020);
              color: var(--bg, #0e0a06);
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-size: 12px;
              font-weight: 600;
              transition: opacity 200ms;
            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
              Login for Sync
            </button>
          `}
        </div>
      </div>

      <!-- Login Modal -->
      <div id="auth-modal" style="
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 9999;
        justify-content: center;
        align-items: center;
      ">
        <div style="
          background: var(--surface, #1e1409);
          border: 1px solid var(--border2, #4f371c);
          border-radius: 12px;
          padding: 24px;
          max-width: 380px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        ">
          <h2 style="
            color: var(--text, #f5e8cc);
            font-size: 20px;
            margin: 0 0 16px 0;
            font-family: Playfair Display, serif;
          ">🔑 Sync Across Devices</h2>

          <p style="
            color: var(--text2, #c4a97a);
            font-size: 13px;
            line-height: 1.6;
            margin: 0 0 20px 0;
          ">
            Enter your email to enable real-time sync. Check your inbox for a magic link to log in.
          </p>

          <form onsubmit="AuthUI.handleSignup(event)" style="display: flex; flex-direction: column; gap: 12px;">
            <input
              id="auth-email"
              type="email"
              placeholder="your@email.com"
              required
              style="
                padding: 10px 12px;
                background: var(--surface2, #271a0d);
                border: 1px solid var(--border, #3d2a14);
                border-radius: 6px;
                color: var(--text, #f5e8cc);
                font-size: 13px;
                transition: border-color 200ms;
              "
              onfocus="this.style.borderColor='var(--gold, #e8a020)'"
              onblur="this.style.borderColor='var(--border, #3d2a14)'"
            />

            <div id="auth-message" style="
              font-size: 12px;
              color: var(--gold, #e8a020);
              min-height: 20px;
            "></div>

            <button type="submit" style="
              padding: 10px 16px;
              background: var(--gold, #e8a020);
              color: var(--bg, #0e0a06);
              border: none;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 13px;
              transition: opacity 200ms;
            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
              Send Magic Link
            </button>

            <button type="button" onclick="AuthUI.closeLoginModal()" style="
              padding: 10px 16px;
              background: var(--surface2, #271a0d);
              color: var(--text2, #c4a97a);
              border: 1px solid var(--border, #3d2a14);
              border-radius: 6px;
              cursor: pointer;
              font-size: 13px;
              transition: opacity 200ms;
            " onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
              Cancel
            </button>
          </form>

          <hr style="
            border: none;
            border-top: 1px solid var(--border, #3d2a14);
            margin: 16px 0;
          " />

          <p style="
            color: var(--muted, #7a6040);
            font-size: 12px;
            margin: 0;
            line-height: 1.5;
          ">
            💡 Offline sync: Your data is saved locally. Once you log in, it'll automatically sync to the cloud.
          </p>
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
        const email = document.getElementById('auth-email').value;
        const msg = document.getElementById('auth-message');

        msg.textContent = '⏳ Sending magic link...';

        try {
            await SYNC.signUpWithEmail(email);
            msg.style.color = 'var(--sage, #86efac)';
            msg.textContent = '✓ Check your email!';
            setTimeout(() => AuthUI.closeLoginModal(), 2000);
        } catch (error) {
            msg.style.color = 'var(--rose, #fb7185)';
            msg.textContent = `✗ ${error.message}`;
        }
    }

    function openLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'flex';
    }

    function closeLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'none';
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-message').textContent = '';
    }

    async function logout() {
        if (!confirm('Log out and stop syncing?')) return;
        await SYNC.logOut();
        location.reload();
    }

    return {
        render,
        mount,
        openLoginModal,
        closeLoginModal,
        handleSignup,
        logout,
        updateSyncStatus
    };
})();
