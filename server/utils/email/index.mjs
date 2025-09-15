import path from "node:path"
import { dirname } from "dirname-filename-esm"
import ejs from "ejs"
import fs from "fs-extra"
import mjml2html from "mjml"
import nodemailer from "nodemailer"

let transporter = null
export function getTransporter(config) {
  if (!transporter) {
    transporter = nodemailer.createTransport(
      config || process.env.EPRESS_MAIL_TRANSPORT,
    )
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
  const transporter = getTransporter()
  const mailOptions = {
    from: process.env.EPRESS_MAIL_FROM || "no-reply@epress.com",
    to: toEmail,
    subject,
    html,
  }
  return await transporter.sendMail(mailOptions)
}
