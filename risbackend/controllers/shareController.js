const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { pool } = require('../config/postgres');

// Twilio Config
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; // For SMS
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox default

// SMTP Config
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || '"RIS System" <ris@hospital.com>';

/**
 * Ensures temporary file storage exists
 */
const TEMP_DIR = path.join(__dirname, '../uploads/temp_shares');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

/**
 * Handles sharing report via Email/SMS/WhatsApp
 */
exports.shareReport = async (req, res) => {
    try {
        if (!req.files || !req.files.pdf) {
            return res.status(400).json({ success: false, message: "No PDF file uploaded" });
        }

        const { type, recipient } = req.body; // type: 'email' | 'sms' | 'whatsapp'
        const pdfFile = req.files.pdf;
        const metadata = req.body.metadata ? JSON.parse(req.body.metadata) : {};
        const filename = `Report_${Date.now()}.pdf`;
        const filePath = path.join(TEMP_DIR, filename);

        console.log(`[SHARE] Processing ${type} to ${recipient}`);

        // 1. Save File Temporarily (for attachment)
        await pdfFile.mv(filePath);

        // Immediate Response for UX
        res.json({
            success: true,
            message: `Request received. Sending ${type} to ${recipient} in background...`
        });

        // 2. Dispatch based on type (Background Process)
        (async () => {
            try {
                if (type === 'email') {
                    await sendEmail(recipient, filePath, metadata);
                    console.log(`[SHARE SUCCESS] Email sent to ${recipient}`);
                } else if (type === 'sms' || type === 'whatsapp') {
                    const msg = metadata.patientName
                        ? `Hello ${metadata.patientName}, your medical report (Acc: ${metadata.accessionNumber}) from ${metadata.hospitalName || 'the hospital'} is ready.`
                        : "Your medical report is ready. Please contact the hospital to collect it.";

                    if (type === 'sms') await sendSMS(recipient, msg);
                    else await sendWhatsApp(recipient, msg);

                    fs.unlinkSync(filePath);
                    console.log(`[SHARE SUCCESS] ${type} sent to ${recipient}`);
                }

                // Cleanup
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

            } catch (bgError) {
                console.error(`[SHARE BACKGROUND ERROR] Failed to send ${type} to ${recipient}:`, bgError.message);
                // Ideally log to DB here
            }
        })();

    } catch (error) {
        console.error("[SHARE ERROR]", error);
        res.status(500).json({ success: false, message: `Failed to share: ${error.message}` });
    }
};

async function sendEmail(to, attachmentPath, meta = {}) {
    if (!SMTP_USER || !SMTP_PASS) {
        throw new Error("SMTP Credentials not configured in .env");
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
        },
    });

    // Standard Professional Format
    const subject = meta.patientName
        ? `Medical Report: ${meta.patientName} - ${meta.accessionNumber} - ${meta.hospitalName || 'Result'}`
        : "Medical Report - Result Notification";

    const text = meta.patientName
        ? `Dear Patient,\n\nPlease find attached the medical report for:\n\nPatient Name: ${meta.patientName}\nAccession: ${meta.accessionNumber}\nDate: ${meta.studyDate}\n\nRegards,\n${meta.hospitalName || 'Radiology Department'}`
        : "Please find your medical report attached.";

    await transporter.sendMail({
        from: EMAIL_FROM,
        to: to,
        subject: subject,
        text: text,
        attachments: [
            {
                filename: 'Medical_Report.pdf',
                path: attachmentPath
            }
        ]
    });
}

async function sendSMS(to, body) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_ACCOUNT_SID.startsWith('AC')) {
        throw new Error("Twilio Credentials not configured (SID must start with 'AC'). Check .env file.");
    }
    const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body: body,
        from: TWILIO_PHONE_NUMBER,
        to: to
    });
}

async function sendWhatsApp(to, body) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_ACCOUNT_SID.startsWith('AC')) {
        throw new Error("Twilio Credentials not configured (SID must start with 'AC'). Check .env file.");
    }
    const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await client.messages.create({
        body: body,
        from: TWILIO_WHATSAPP_NUMBER,
        to: `whatsapp:${to}`
    });
}
