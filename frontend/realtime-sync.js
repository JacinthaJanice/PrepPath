// realtime-sync.js — Supabase Real-Time Sync for PrepPath
// Handles authentication, real-time subscriptions, and cross-device sync

const SYNC = (() => {
    const cfg = window.PP_CONFIG || {};
    const SUPABASE_URL = cfg.SUPABASE_URL;
    const SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;

    let supabaseClient = null;
    let currentUser = null;
    let subscriptions = [];
    let syncStatus = 'disconnected'; // 'connected', 'syncing', 'error'
    let syncListeners = [];

    // ── Initialize Supabase Client ──────────────────
    async function init() {
        if (supabaseClient) return supabaseClient;

        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('✗ Supabase credentials missing in config.js');
            return null;
        }

        // Dynamically load Supabase module (uses CDN)
        if (!window.supabase) {
            await loadSupabaseFromCDN();
        }

        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        setSyncStatus('connected');
        return supabaseClient;
    }

    async function loadSupabaseFromCDN() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/module/index.js';
            script.type = 'module';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ── Auth: Sign up / Log in with Magic Link ──────
    async function signUpWithEmail(email) {
        const client = await init();
        if (!client) throw new Error('Supabase not initialized');

        const { data, error } = await client.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/frontend/index.html`
            }
        });

        if (error) throw error;
        return { email, message: 'Check your email for the magic link!' };
    }

    async function verifyMagicLink() {
        const client = await init();
        if (!client) throw new Error('Supabase not initialized');

        // Auto-verify if hash is present (Supabase redirect)
        const { data, error } = await client.auth.getSession();
        if (data?.session) {
            currentUser = data.session.user;
            setSyncStatus('connected');
            return currentUser;
        }
        return null;
    }

    async function logOut() {
        const client = await init();
        if (!client) return;

        await client.auth.signOut();
        currentUser = null;
        unsubscribeAll();
        setSyncStatus('disconnected');
    }

    // ── Get current user ────────────────────────────
    function getCurrentUser() {
        return currentUser;
    }

    // ── Real-Time Subscriptions ─────────────────────
    async function subscribeToProgress(userId, callback) {
        const client = await init();
        if (!client) return null;

        const subscription = client
            .channel(`progress:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'progress',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setSyncStatus('syncing');
                    callback(payload);
                    setTimeout(() => setSyncStatus('connected'), 500);
                }
            )
            .subscribe((status) => {
                console.log(`📡 Progress subscription: ${status}`);
            });

        subscriptions.push(subscription);
        return subscription;
    }

    async function subscribeToTasks(userId, callback) {
        const client = await init();
        if (!client) return null;

        const subscription = client
            .channel(`tasks:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setSyncStatus('syncing');
                    callback(payload);
                    setTimeout(() => setSyncStatus('connected'), 500);
                }
            )
            .subscribe((status) => {
                console.log(`📡 Tasks subscription: ${status}`);
            });

        subscriptions.push(subscription);
        return subscription;
    }

    async function subscribeToJournal(userId, callback) {
        const client = await init();
        if (!client) return null;

        const subscription = client
            .channel(`journal:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'journal',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    setSyncStatus('syncing');
                    callback(payload);
                    setTimeout(() => setSyncStatus('connected'), 500);
                }
            )
            .subscribe((status) => {
                console.log(`📡 Journal subscription: ${status}`);
            });

        subscriptions.push(subscription);
        return subscription;
    }

    // ── Unsubscribe ─────────────────────────────────
    function unsubscribeAll() {
        subscriptions.forEach(sub => {
            if (sub) sub.unsubscribe();
        });
        subscriptions = [];
    }

    // ── Sync Status ─────────────────────────────────
    function setSyncStatus(status) {
        syncStatus = status;
        notifyListeners();
    }

    function getSyncStatus() {
        return syncStatus;
    }

    function onSyncStatusChange(callback) {
        syncListeners.push(callback);
        callback(syncStatus); // Immediate call
    }

    function notifyListeners() {
        syncListeners.forEach(cb => cb(syncStatus));
    }

    // ── Data Methods: Read/Write with Supabase ──────
    async function getData(table, userId) {
        const client = await init();
        if (!client) return [];

        const { data, error } = await client
            .from(table)
            .select('*')
            .eq('user_id', userId);

        if (error) {
            console.error(`Error fetching ${table}:`, error);
            return [];
        }
        return data || [];
    }

    async function insertData(table, userId, record) {
        const client = await init();
        if (!client) return null;

        const { data, error } = await client
            .from(table)
            .insert([{ user_id: userId, ...record }])
            .select()
            .single();

        if (error) {
            console.error(`Error inserting into ${table}:`, error);
            return null;
        }
        return data;
    }

    async function updateData(table, recordId, updates) {
        const client = await init();
        if (!client) return null;

        const { data, error } = await client
            .from(table)
            .update(updates)
            .eq('id', recordId)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${table}:`, error);
            return null;
        }
        return data;
    }

    async function deleteData(table, recordId) {
        const client = await init();
        if (!client) return false;

        const { error } = await client
            .from(table)
            .delete()
            .eq('id', recordId);

        if (error) {
            console.error(`Error deleting from ${table}:`, error);
            return false;
        }
        return true;
    }

    // ── Public API ──────────────────────────────────
    return {
        // Auth
        init,
        signUpWithEmail,
        verifyMagicLink,
        logOut,
        getCurrentUser,

        // Subscriptions
        subscribeToProgress,
        subscribeToTasks,
        subscribeToJournal,
        unsubscribeAll,

        // Sync Status
        getSyncStatus,
        onSyncStatusChange,

        // Data
        getData,
        insertData,
        updateData,
        deleteData
    };
})();

// Auto-init on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SYNC.init());
} else {
    SYNC.init();
}
