// realtime-sync.js — Supabase Real-Time Sync for PrepPath
// Handles authentication, real-time subscriptions, and cross-device sync

const SYNC = (() => {
    const cfg = window.PP_CONFIG || {};

    let supabaseClient = null;
    let currentUser = null;
    let subscriptions = [];
    let syncStatus = 'disconnected'; // 'connected', 'syncing', 'error'
    let syncListeners = [];
    let authMessage = '';

    function setAuthMessage(message) {
        authMessage = message || '';
    }

    function getAuthMessage() {
        return authMessage;
    }

    function clearUrlHash() {
        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    // ── Initialize Supabase Client ──────────────────
    async function init() {
        if (supabaseClient) return supabaseClient;

        // Prefer credentials saved in app settings, then fall back to config.js
        let supabaseUrl = '';
        let supabaseAnonKey = '';
        try {
            supabaseUrl = (localStorage.getItem('sb_url') || '').trim();
            supabaseAnonKey = (localStorage.getItem('sb_key') || '').trim();
        } catch (e) {
            // Ignore storage access issues and continue with config fallback.
        }
        if (!supabaseUrl) supabaseUrl = (cfg.SUPABASE_URL || '').trim();
        if (!supabaseAnonKey) supabaseAnonKey = (cfg.SUPABASE_ANON_KEY || '').trim();

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('✗ Supabase credentials missing in config.js');
            return null;
        }

        // Dynamically load Supabase module (uses CDN)
        if (!window.supabase) {
            await loadSupabaseFromCDN();
        }

        supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
        setSyncStatus('connected');
        return supabaseClient;
    }

    async function loadSupabaseFromCDN() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.1/dist/umd/supabase.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // ── Auth: Sign up / Log in with Magic Link ──────
    async function signUpWithEmail(email) {
        const client = await init();
        if (!client) throw new Error('Supabase not initialized');

        const callbackUrl = window.location.origin + window.location.pathname;
        // Only set emailRedirectTo for valid HTTP/HTTPS URLs (not file://)
        const redirectOptions = callbackUrl.startsWith('http')
            ? { emailRedirectTo: callbackUrl }
            : {};
        const { data, error } = await client.auth.signInWithOtp({
            email,
            options: redirectOptions
        });

        if (error) throw error;
        return { email, message: 'Check your email for the secure sign-in link.' };
    }

    async function verifyMagicLink() {
        const client = await init();
        if (!client) throw new Error('Supabase not initialized');

        setAuthMessage('');

        const hash = (window.location.hash || '').replace(/^#/, '');
        const hashParams = new URLSearchParams(hash);
        const callbackError = hashParams.get('error_code') || hashParams.get('error');
        const callbackDescription = hashParams.get('error_description');

        if (callbackError) {
            if (callbackError === 'otp_expired') {
                setAuthMessage('Sign-in link expired. Request a new sign-in link.');
            } else if (callbackDescription) {
                setAuthMessage(callbackDescription.replace(/\+/g, ' '));
            } else {
                setAuthMessage('Sign-in failed. Request a new sign-in link.');
            }
            setSyncStatus('error');
            clearUrlHash();
            return null;
        }

        // Auto-verify if hash is present (Supabase redirect)
        const { data, error } = await client.auth.getSession();
        if (error) {
            setAuthMessage(error.message || 'Unable to verify sign-in link.');
            setSyncStatus('error');
            return null;
        }

        if (data?.session) {
            currentUser = data.session.user;
            setSyncStatus('connected');
            clearUrlHash();
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
                    table: 'custom_tasks',
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
        getAuthMessage,

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
