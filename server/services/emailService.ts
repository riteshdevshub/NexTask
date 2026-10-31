// In-memory cache for dev mode OTP inspection so the user can easily test OTP verification
export interface DevOtpEntry {
  email: string;
  code: string;
  type: 'verification' | 'passwordless' | 'reset';
  timestamp: string;
  expiresAt: number;
}

export const devOtpStore: DevOtpEntry[] = [];

export async function sendOtpEmail(email: string, code: string, type: 'verification' | 'passwordless' | 'reset'): Promise<boolean> {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  // Store in dev cache for developer assistance banner/modal
  const existingIdx = devOtpStore.findIndex((e) => e.email.toLowerCase() === email.toLowerCase());
  const entry: DevOtpEntry = {
    email,
    code,
    type,
    timestamp: new Date().toISOString(),
    expiresAt,
  };

  if (existingIdx >= 0) {
    devOtpStore[existingIdx] = entry;
  } else {
    devOtpStore.unshift(entry);
  }

  // If Resend API key is provided, attempt live dispatch
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey !== 'MY_RESEND_API_KEY') {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const subject =
        type === 'verification'
          ? `NexTask – Your 6-Digit Verification Code: ${code}`
          : type === 'passwordless'
          ? `NexTask – Sign In with Code: ${code}`
          : `NexTask – Password Reset Code: ${code}`;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email,
          subject,
          html: `
            <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0B0F19; color: #F8FAFC; border-radius: 12px;">
              <div style="margin-bottom: 24px;">
                <span style="font-size: 20px; font-weight: 700; color: #6366F1; letter-spacing: -0.5px;">NexTask</span>
                <span style="font-size: 13px; color: #94A3B8; margin-left: 8px;">Plan Smart. Work Better.</span>
              </div>
              <h2 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #FFFFFF;">
                ${type === 'verification' ? 'Verify your email address' : type === 'passwordless' ? 'Your passwordless sign-in code' : 'Reset your NexTask password'}
              </h2>
              <p style="font-size: 14px; line-height: 1.6; color: #94A3B8; margin-bottom: 24px;">
                Use the 6-digit security code below to complete your authentication. This code expires in 10 minutes.
              </p>
              <div style="background: #111827; border: 1px solid #1F2937; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #6366F1;">
                  ${code}
                </span>
              </div>
              <p style="font-size: 12px; color: #64748B;">
                If you did not request this email, you can safely ignore it. Never share your verification code with anyone.
              </p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn('[Resend] Dispatch returned non-ok status:', res.status, errText);
      } else {
        console.log(`[Resend] Successfully sent OTP code to ${email}`);
        return true;
      }
    } catch (err) {
      console.warn('[Resend] Failed to send email via Resend:', err);
    }
  }

  // In development without active Resend key, the code is stored in devOtpStore
  console.log(`[DEV OTP] Generated ${type} code for ${email}: >>> ${code} <<<`);
  return true;
}
