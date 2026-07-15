import axios from './axios';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function subscribeAndRegister() {
    const registration = await navigator.serviceWorker.register('/sw.js');
    const { data } = await axios.get('/push/vapid-public-key');
    if (!data?.publicKey) throw new Error('Push is not configured on the server');

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
    }
    await axios.post('/push/subscribe', { subscription });
}

// Call on app mount — refreshes an already-granted subscription's tokenExp
// without ever prompting. Browsers suppress or downgrade permission prompts
// that aren't triggered by a direct user gesture, so this path must never
// call Notification.requestPermission().
export async function refreshPushSubscriptionIfGranted() {
    if (!isPushSupported() || Notification.permission !== 'granted') return;
    await subscribeAndRegister();
}

// Call only from a click handler — the one path allowed to prompt the user.
export async function requestPushPermission() {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';

    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission === 'granted') await subscribeAndRegister();
    return permission;
}
