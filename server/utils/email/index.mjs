import path from "node:path"
import { dirname } from "dirname-filename-esm"
import ejs from "ejs"
import fs from "fs-extra"
import mjml2html from "mjml"
import nodemailer from "nodemailer"
import { Setting } from "../../models/index.mjs"

let transporter = null
const testAccount = await nodemailer.createTestAccount()
export async function getTransporter(config) {
  if (!transporter) {
    let mailTransport = config
    if (!mailTransport && process.env.NODE_ENV !== "test") {
      mailTransport = await Setting.get("mail_transport")
    } else {
      mailTransport = `smtp://${testAccount.user}:${testAccount.pass}@smtp.ethereal.email:587`
    }
    if (mailTransport) {
      transporter = nodemailer.createTransport(mailTransport)
    }
  }
  return transporter
}

export async function renderEmail(template, variables) {
  const content = await fs.readFile(
    path.resolve(dirname(import.meta), `./templates/${template}.mjml`),
  )
  return mjml2html(ejs.render(content.toString(), variables)).html
}

export async function sendEmail(toEmail, subject, html) {
  const transporter = await getTransporter()

  // Get mail from address from database
  const { Setting } = await import("../../models/setting.mjs")
  const mailFrom = await Setting.get("mail_from", "no-reply@epress.com")

  const mailOptions = {
    from: mailFrom,
    to: toEmail,
    subject,
    html,
  }
  return await transporter.sendMail(mailOptions)
}
