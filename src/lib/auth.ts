import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { Pool } from "pg";
import { Resend } from "resend";

// Lazy-initialize Resend client to avoid errors during build
let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  plugins: [
    nextCookies(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      async sendVerificationOTP({ email, otp, type }) {
        const resend = getResend();
        await resend.emails.send({
          from: "2048 <noreply@auth.the2048league.com>",
          to: email,
          subject: type === "sign-in"
            ? `Your 2048 login code: ${otp}`
            : `Your verification code: ${otp}`,
          html: `
            <h2>Your verification code</h2>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
            <p>This code expires in 5 minutes.</p>
          `,
        });
      },
    }),
  ],
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
      },
    },
  },
});

// Export type for use in components
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
