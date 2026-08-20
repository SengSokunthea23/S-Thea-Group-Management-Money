import "server-only";

/**
 * Where a verification code goes on its way to a phone.
 *
 * No SMS provider is configured for this project, so the default sender writes
 * to the server log. That is a deliberate seam, not a stub standing in for
 * missing work: everything around it — code generation, hashing, expiry,
 * attempt limits, rate limiting — is real, and swapping in Twilio or Vonage
 * means implementing `SmsSender` and returning it from `getSmsSender()`.
 */

export type SmsMessage = {
  /** E.164, as normalised by src/lib/phone.ts. */
  to: string;
  body: string;
};

export interface SmsSender {
  send(message: SmsMessage): Promise<void>;
}

/**
 * True only outside production.
 *
 * Gates whether a freshly generated code is echoed back to the browser so the
 * flow can be exercised without a real handset. In production this is false and
 * the code exists solely in the log and the SMS — a code returned to the client
 * would hand every attacker the one secret the flow depends on.
 */
export const CAN_REVEAL_CODES = process.env.NODE_ENV !== "production";

class ConsoleSmsSender implements SmsSender {
  async send({ to, body }: SmsMessage): Promise<void> {
    console.info(`[sms] → ${to}: ${body}`);
  }
}

let sender: SmsSender = new ConsoleSmsSender();

export function getSmsSender(): SmsSender {
  return sender;
}

/** Test seam. Not used by the app itself. */
export function setSmsSender(next: SmsSender): void {
  sender = next;
}
