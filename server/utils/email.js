const nodemailer = require('nodemailer')

let transporter

function getMailerConfig() {
  const host = String(process.env.SMTP_HOST || '').trim()
  const port = Number(process.env.SMTP_PORT || 0)
  const user = String(process.env.SMTP_USER || '').trim()
  const pass = String(process.env.SMTP_PASS || '').trim()

  if (!host || !port || !user || !pass) {
    throw new Error('SMTP configuration is incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in server/.env')
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: {
      user,
      pass,
    },
  }
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport(getMailerConfig())
  }

  return transporter
}

function getFromAddress() {
  const fromName = String(process.env.SMTP_FROM_NAME || 'Chai Hisaab').trim()
  const fromEmail = String(process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim()

  if (!fromEmail) {
    throw new Error('SMTP_FROM_EMAIL or SMTP_USER must be set in server/.env')
  }

  return `"${fromName}" <${fromEmail}>`
}

async function sendPasswordResetEmail({ email, name, resetLink }) {
  const safeName = String(name || 'there').trim() || 'there'

  const info = await getTransporter().sendMail({
    from: getFromAddress(),
    to: email,
    subject: 'Reset your Chai Hisaab password',
    text: [
      `Hi ${safeName},`,
      '',
      'We received a request to reset your Chai Hisaab password.',
      `Use this link to set a new password: ${resetLink}`,
      '',
      'This link will expire in 1 hour.',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:Segoe UI,Arial,sans-serif;line-height:1.6;color:#2f241d;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 12px;color:#8b5e3c;">Reset your password</h2>
        <p style="margin:0 0 12px;">Hi ${safeName},</p>
        <p style="margin:0 0 20px;">We received a request to reset your Chai Hisaab password. Click the button below to set a new password.</p>
        <p style="margin:0 0 20px;">
          <a href="${resetLink}" style="display:inline-block;background:#f59e0b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;">Set new password</a>
        </p>
        <p style="margin:0 0 12px;">If the button does not open, copy and paste this link into your browser:</p>
        <p style="margin:0 0 20px;word-break:break-all;">${resetLink}</p>
        <p style="margin:0 0 8px;">This link will expire in 1 hour.</p>
        <p style="margin:0;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  })

  return {
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  }
}

module.exports = {
  sendPasswordResetEmail,
}