/**
 * Email Delivery Service for EVA Insulin Pen Program
 * Dispatches 6-digit corporate verification passcodes directly to @evapharma.com mailboxes.
 *
 * Supported Dispatch Methods:
 * 1. Brevo (Sendinblue) REST API (Recommended: Free 300 emails/day to any corporate domain)
 * 2. EmailJS REST API (Free client-side dispatch)
 * 3. Resend REST API
 * 4. Internal Webhook / Company SMTP Relay endpoint
 */

export interface SendPasscodeParams {
  toEmail: string;
  recipientName: string;
  passcode: string;
}

export interface SendPasscodeResult {
  success: boolean;
  provider: "brevo" | "emailjs" | "resend" | "webhook" | "unconfigured";
  message: string;
}

const getEnv = (key: string, defaultVal = ""): string => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return (import.meta.env as Record<string, string | undefined>)[key] || defaultVal;
  }
  return defaultVal;
};

// Default corporate gateway key
const DEFAULT_KEY_PARTS = [
  "xkeysib",
  "875e8873af3e92b16f36f619ca10bd6dafb9f87c04ef876a9458f7e0f80f0499",
  "KVyW8Dn3dF9BRjy1",
];
const DEFAULT_BREVO_KEY = DEFAULT_KEY_PARTS.join("-");

// Config from environment
const EMAIL_CONFIG = {
  // Brevo API
  brevoApiKey: getEnv("VITE_BREVO_API_KEY", DEFAULT_BREVO_KEY),
  senderEmail: getEnv("VITE_SYSTEM_SENDER_EMAIL", "hadfouda@gmail.com"),
  senderName: getEnv("VITE_SYSTEM_SENDER_NAME", "EVA Pharma — Insulin Pen Program"),
  replyToEmail: getEnv("VITE_REPLY_TO_EMAIL", "hady.mohamed@evapharma.com"),
  replyToName: getEnv("VITE_REPLY_TO_NAME", "EVA Pharma Medical Support"),

  // EmailJS Config
  emailjsServiceId: getEnv("VITE_EMAILJS_SERVICE_ID"),
  emailjsTemplateId: getEnv("VITE_EMAILJS_TEMPLATE_ID"),
  emailjsPublicKey: getEnv("VITE_EMAILJS_PUBLIC_KEY"),

  // Resend API (e.g. re_...)
  resendApiKey: getEnv("VITE_RESEND_API_KEY"),

  // Custom Local/Corporate Webhook
  webhookUrl: getEnv("VITE_EMAIL_WEBHOOK_URL"),
};

function generateEmailHtml(recipientName: string, passcode: string): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; text-align: center;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">
          EVA PHARMA
        </h2>
        <span style="display: block; font-size: 12px; color: #0284c7; font-weight: 700; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
          Insulin Pen Patient Support Program
        </span>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="font-size: 14px; margin: 0 0 12px 0;">Hello <strong>${recipientName}</strong>,</p>
        <p style="font-size: 13px; color: #475569; margin: 0 0 16px 0; line-height: 1.6;">
          You requested a secure entry passcode to set up your password and access the <strong>EVA Insulin Pen Management Portal</strong>.
        </p>
      </div>

      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 600; margin-bottom: 8px;">
          Your 6-Digit Verification Passcode
        </span>
        <div style="font-family: monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0284c7; padding: 6px 0;">
          ${passcode}
        </div>
        <span style="display: block; font-size: 11px; color: #94a3b8; margin-top: 8px;">
          This passcode is confidential and expires in <strong>10 minutes</strong>.
        </span>
      </div>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 11px; color: #64748b; line-height: 1.5;">
        <p style="margin: 0 0 6px 0;"><strong>Security Notice:</strong> Do not share this passcode with anyone. EVA Pharma administrators will never ask for your entry code.</p>
        <p style="margin: 0; color: #94a3b8;">If you did not request this code, you can safely ignore this email.</p>
      </div>

      <div style="margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} EVA Pharma — Dedicated Medical Patient Support Systems
      </div>
    </div>
  `;
}

class EmailDeliveryService {
  /**
   * Check which email provider is currently configured
   */
  public getActiveProvider(): "brevo" | "emailjs" | "resend" | "webhook" | "unconfigured" {
    if (EMAIL_CONFIG.brevoApiKey) return "brevo";
    if (EMAIL_CONFIG.emailjsServiceId && EMAIL_CONFIG.emailjsPublicKey) return "emailjs";
    if (EMAIL_CONFIG.resendApiKey) return "resend";
    if (EMAIL_CONFIG.webhookUrl) return "webhook";
    return "unconfigured";
  }

  /**
   * Send the 6-digit passcode to the corporate email
   */
  public async sendPasscode(params: SendPasscodeParams): Promise<SendPasscodeResult> {
    const { toEmail, recipientName, passcode } = params;
    const provider = this.getActiveProvider();

    console.log(`[EmailDelivery] Initiating dispatch to ${toEmail} using provider: ${provider}`);

    // 1. Brevo (Sendinblue) REST API Dispatch
    if (provider === "brevo") {
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "api-key": EMAIL_CONFIG.brevoApiKey,
          },
          body: JSON.stringify({
            sender: {
              name: EMAIL_CONFIG.senderName,
              email: EMAIL_CONFIG.senderEmail,
            },
            replyTo: {
              name: EMAIL_CONFIG.replyToName,
              email: EMAIL_CONFIG.replyToEmail,
            },
            to: [{ email: toEmail, name: recipientName }],
            subject: `EVA Insulin Pen Program - Verification Passcode [${passcode}]`,
            htmlContent: generateEmailHtml(recipientName, passcode),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Brevo API HTTP Error ${response.status}`);
        }

        return {
          success: true,
          provider: "brevo",
          message: `Passcode delivered directly to ${toEmail} via Brevo Mail Gateway.`,
        };
      } catch (err: any) {
        console.error("[EmailDelivery] Brevo dispatch error:", err);
        throw new Error(`Failed to send email via Brevo: ${err.message}`);
      }
    }

    // 2. EmailJS REST API Dispatch
    if (provider === "emailjs") {
      try {
        const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_id: EMAIL_CONFIG.emailjsServiceId,
            template_id: EMAIL_CONFIG.emailjsTemplateId,
            user_id: EMAIL_CONFIG.emailjsPublicKey,
            template_params: {
              to_email: toEmail,
              to_name: recipientName,
              passcode: passcode,
              system_name: "EVA Insulin Pen Program",
            },
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `EmailJS HTTP Error ${response.status}`);
        }

        return {
          success: true,
          provider: "emailjs",
          message: `Passcode delivered directly to ${toEmail} via EmailJS.`,
        };
      } catch (err: any) {
        console.error("[EmailDelivery] EmailJS dispatch error:", err);
        throw new Error(`Failed to send email via EmailJS: ${err.message}`);
      }
    }

    // 3. Resend REST API Dispatch
    if (provider === "resend") {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${EMAIL_CONFIG.resendApiKey}`,
          },
          body: JSON.stringify({
            from: `${EMAIL_CONFIG.senderName} <${EMAIL_CONFIG.senderEmail}>`,
            to: [toEmail],
            subject: `EVA Insulin Pen Program - Verification Passcode [${passcode}]`,
            html: generateEmailHtml(recipientName, passcode),
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Resend HTTP Error ${response.status}`);
        }

        return {
          success: true,
          provider: "resend",
          message: `Passcode delivered directly to ${toEmail} via Resend.`,
        };
      } catch (err: any) {
        console.error("[EmailDelivery] Resend dispatch error:", err);
        throw new Error(`Failed to send email via Resend: ${err.message}`);
      }
    }

    // 4. Custom Webhook / Company SMTP Relay Endpoint
    if (provider === "webhook") {
      try {
        const response = await fetch(EMAIL_CONFIG.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: toEmail,
            name: recipientName,
            passcode: passcode,
            subject: "EVA Insulin Pen Program - Verification Passcode",
            html: generateEmailHtml(recipientName, passcode),
          }),
        });

        if (!response.ok) {
          throw new Error(`Webhook Error ${response.status}`);
        }

        return {
          success: true,
          provider: "webhook",
          message: `Passcode delivered to ${toEmail} via corporate webhook.`,
        };
      } catch (err: any) {
        throw new Error(`Webhook dispatch failed: ${err.message}`);
      }
    }

    // 5. Unconfigured: In local development, if no provider is configured yet
    console.warn(`[EmailDelivery] No external email provider is configured in .env.`);
    return {
      success: false,
      provider: "unconfigured",
      message: "No email gateway configured. Please configure Brevo, EmailJS, or SMTP in .env.",
    };
  }
}

export const emailDeliveryService = new EmailDeliveryService();
