const twilio = require('twilio');
const nodemailer = require('nodemailer');
const webpush = require('web-push');

// --- WEB PUSH CONFIGURATION ---
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        `mailto:${process.env.EMAIL_USER || 'admin@lendi.edu.in'}`,
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    );
} else {
    console.warn('[VAPID] Keys missing. Push notifications disabled.');
}

const sendPush = async (subscription, title, body) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body }));
        console.log('[PUSH SUCCESS]');
        return { success: true };
    } catch (error) {
        console.error('[PUSH ERROR]', error.message);
        return { success: false, error: error.message };
    }
};

// --- TWILIO (Paid) ---
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_FROM_PHONE;

let client;
if (accountSid && accountSid.startsWith('AC') && authToken) {
    client = twilio(accountSid, authToken);
}

// --- NODEMAILER (Free) ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text) => {
    try {
        await transporter.sendMail({
            from: `"Lendi Attendance Hub" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text
        });
        console.log(`[EMAIL SUCCESS] Sent to: ${to}`);
        return { success: true };
    } catch (error) {
        console.error(`[EMAIL ERROR]`, error.message);
        return { success: false, error: error.message };
    }
};

const sendSMS = async (to, message) => {
    if (!client) {
        console.log(`[SIMULATED SMS to ${to}]: ${message}`);
        return { success: false, mode: 'simulated' };
    }

    try {
        const response = await client.messages.create({
            body: message,
            from: fromPhone,
            to: to.startsWith('+') ? to : `+91${to}`
        });
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error(`[TWILIO ERROR]`, error.message);
        return { success: false, error: error.message };
    }
};

const sendWhatsApp = async (to, message) => {
    if (!client) {
        console.log(`[SIMULATED WHATSAPP to ${to}]: ${message}`);
        return { success: false, mode: 'simulated' };
    }

    try {
        const response = await client.messages.create({
            body: message,
            from: fromPhone.includes('whatsapp') ? fromPhone : `whatsapp:${fromPhone}`,
            to: to.includes('whatsapp') ? to : `whatsapp:${to.startsWith('+') ? to : '+91' + to}`
        });
        return { success: true, sid: response.sid };
    } catch (error) {
        console.error(`[TWILIO WHATSAPP ERROR]`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { sendSMS, sendWhatsApp, sendEmail, sendPush };
