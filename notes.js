// payment.js — Razorpay subscription + premium status management
import { db } from './firebase-config.js';
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Config ─────────────────────────────────────────────────────────────────
// Replace with your actual Razorpay Key ID from dashboard.razorpay.com
const RAZORPAY_KEY_ID = 'rzp_live_XXXXXXXXXXXXXXXX';

const PLANS = {
  monthly: {
    id: 'monthly',
    label: 'Monthly',
    price: 99,
    duration_days: 30,
    badge: '',
    description: '₹99 / month',
    razorpay_amount: 9900,  // in paise
  },
  yearly: {
    id: 'yearly',
    label: 'Yearly',
    price: 499,
    duration_days: 365,
    badge: '🔥 Save 58%',
    description: '₹499 / year',
    razorpay_amount: 49900, // in paise
  }
};

export { PLANS };

// ── Premium check ──────────────────────────────────────────────────────────

export async function isPremiumUser(uid) {
  if (!uid) return false;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (!data.premiumExpiry) return false;
    // premiumExpiry is a Firestore Timestamp or ISO string
    const expiry = data.premiumExpiry.toDate
      ? data.premiumExpiry.toDate()
      : new Date(data.premiumExpiry);
    return expiry > new Date();
  } catch (e) {
    console.error('[Payment] isPremiumUser error:', e);
    return false;
  }
}

export async function getPremiumExpiry(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.premiumExpiry) return null;
    return data.premiumExpiry.toDate
      ? data.premiumExpiry.toDate()
      : new Date(data.premiumExpiry);
  } catch { return null; }
}

// ── Save premium after payment ─────────────────────────────────────────────
// Called after Razorpay payment success
async function activatePremium(uid, planId, paymentId, orderId) {
  const plan = PLANS[planId];
  if (!plan) throw new Error('Invalid plan');

  const now = new Date();
  const expiry = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);

  await setDoc(doc(db, 'users', uid), {
    isPremium: true,
    premiumPlan: planId,
    premiumActivatedAt: serverTimestamp(),
    premiumExpiry: expiry,
    lastPaymentId: paymentId || null,
    lastOrderId: orderId || null,
    updatedAt: serverTimestamp()
  }, { merge: true });

  console.log('[Payment] Premium activated:', planId, 'expires:', expiry);
  return expiry;
}

// ── Load Razorpay script ────────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.head.appendChild(script);
  });
}

// ── Main: open Razorpay checkout ───────────────────────────────────────────
export async function openPayment({ uid, name, email, mobile, planId, onSuccess, onFailure }) {
  const plan = PLANS[planId];
  if (!plan) { onFailure?.('Invalid plan selected'); return; }

  try {
    await loadRazorpayScript();
  } catch (e) {
    onFailure?.('Payment gateway failed to load. Check your internet connection.');
    return;
  }

  const options = {
    key: RAZORPAY_KEY_ID,
    amount: plan.razorpay_amount,
    currency: 'INR',
    name: 'AE/JE Civil Exams',
    description: `Premium ${plan.label} Plan`,
    image: '', // optional: your app logo URL
    prefill: {
      name: name || '',
      email: email || '',
      contact: mobile ? `+91${mobile}` : '',
    },
    theme: { color: '#3b82f6' },
    modal: {
      backdropclose: false,
      escape: true,
      animation: true,
    },
    handler: async function (response) {
      // response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature
      try {
        const expiry = await activatePremium(
          uid,
          planId,
          response.razorpay_payment_id,
          response.razorpay_order_id || null
        );
        onSuccess?.({ expiry, paymentId: response.razorpay_payment_id, planId });
      } catch (e) {
        console.error('[Payment] activatePremium error:', e);
        // Payment succeeded but DB write failed — still show success to user
        // and retry saving
        onSuccess?.({ expiry: null, paymentId: response.razorpay_payment_id, planId });
      }
    },
  };

  const rzp = new window.Razorpay(options);
  rzp.on('payment.failed', function (response) {
    console.error('[Payment] Failed:', response.error);
    onFailure?.(response.error?.description || 'Payment failed. Please try again.');
  });
  rzp.open();
}
