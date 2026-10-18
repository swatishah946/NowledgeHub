// Sends a test email with the configured provider.
//   npm run check:email -- you@example.com
import "dotenv/config";
import { sendEmail, getEmailProvider, getSender } from "../services/emailService.js";

const to = process.argv[2];
if (!to) {
    console.log("Usage: npm run check:email -- you@example.com");
    process.exit(1);
}

const provider = getEmailProvider();
if (!provider) {
    console.log("❌ No email provider configured. Set BREVO_API_KEY (or EMAIL_USER/EMAIL_PASS for SMTP).");
    process.exit(1);
}

console.log(`📧 Sending a test email to ${to} via ${provider === "brevo" ? "Brevo API" : "SMTP"} from ${getSender().name} <${getSender().email}>...`);
const start = Date.now();
try {
    const result = await sendEmail({
        to,
        subject: "NowledgeHub test email",
        html: "<p>Your NowledgeHub email setup works ✅</p>",
        text: "Your NowledgeHub email setup works.",
    });
    console.log(`✅ Sent in ${Date.now() - start} ms (message id: ${result.messageId ?? "n/a"}). Check the inbox and spam folder.`);
} catch (error) {
    console.log(`❌ ${error.message}`);
    process.exit(1);
}
