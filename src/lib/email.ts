import type { EmailAdapter, SendEmailOptions } from 'payload';

/**
 * Per-project Resend email adapter.
 *
 * WHY THIS EXISTS
 * `payload.config.ts` has shipped with no `email:` key, which means
 * `payload.sendEmail()` is a no-op and Payload's own transactional mail —
 * admin password reset, user verification — has never worked. That is the
 * root of the June 2026 support cycle where Terri's admin login had to be
 * reset by hand twice and a submitted membership application produced no
 * notification. It is a v1 defect, not part of the Events scope.
 *
 * WHY NOT @payloadcms/email-resend
 * It would work, but the Resend REST surface we need is a single POST. Writing
 * it here keeps the Worker bundle free of another transitive tree, keeps this
 * adapter readable, and — practically — avoids adding a dependency to a repo
 * whose lockfile is pnpm on a machine without pnpm.
 *
 * WHY PER-PROJECT
 * Each project gets its own Resend API key, its own verified sending domain,
 * and its own from-address. A shared sender means one project's bounce rate
 * drags down every other project's deliverability, and a leaked key exposes
 * all of them. HIV Connect in particular should send as itself: recipients are
 * being told about HIV services, and mail from an unfamiliar agency domain is
 * both confusing and a privacy smell.
 *
 * SETUP
 *   1. Add hivconnectcentralnj.com as a domain in Resend, verify SPF + DKIM.
 *   2. wrangler secret put RESEND_API_KEY
 *   3. Set EMAIL_FROM_ADDRESS / EMAIL_FROM_NAME as vars in wrangler.jsonc.
 *   4. In payload.config.ts:  email: resendAdapter,
 *
 * Workers-safe: fetch only, no node:*.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function toArray(value: SendEmailOptions['to']): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'string' ? v : (v as any).address)).filter(Boolean);
  }
  if (typeof value === 'string') return [value];
  return [(value as any).address].filter(Boolean);
}

export const resendAdapter: EmailAdapter<{ id?: string; skipped?: boolean }> = ({ payload }) => {
  const defaultFromAddress = process.env.EMAIL_FROM_ADDRESS || 'no-reply@hivconnectcentralnj.com';
  const defaultFromName = process.env.EMAIL_FROM_NAME || 'HIV Connect Central NJ';

  return {
    name: 'resend',
    defaultFromAddress,
    defaultFromName,

    async sendEmail(message: SendEmailOptions) {
      const apiKey = process.env.RESEND_API_KEY;

      // Absent key must not throw. A dev environment without mail configured
      // should still be able to create users and submit forms — losing the
      // email is annoying, losing the record is data loss.
      if (!apiKey) {
        payload.logger.warn('[email] RESEND_API_KEY unset — email not sent');
        return { skipped: true };
      }

      const from =
        typeof message.from === 'string' && message.from
          ? message.from
          : `${defaultFromName} <${defaultFromAddress}>`;

      const body: Record<string, unknown> = {
        from,
        to: toArray(message.to),
        subject: message.subject,
      };

      if (message.html) body.html = message.html;
      if (message.text) body.text = message.text;
      if (message.cc) body.cc = toArray(message.cc as any);
      if (message.bcc) body.bcc = toArray(message.bcc as any);
      if (message.replyTo) body.reply_to = toArray(message.replyTo as any);

      const res = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        // Recipients are PII. Log the status and Resend's message, never the
        // address list. (SHU-1017 build contract.)
        payload.logger.error(`[email] Resend rejected send (${res.status}): ${detail.slice(0, 300)}`);
        throw new Error(`Resend send failed with status ${res.status}`);
      }

      const data = (await res.json()) as { id?: string };
      return { id: data.id };
    },
  };
};
