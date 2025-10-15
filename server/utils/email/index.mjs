import path from "node:path"
import { dirname } from "dirname-filename-esm"
import ejs from "ejs"
import fs from "fs-extra"
import mjml2html from "mjml"
import nodemailer from "nodemailer"
import { Setting } from "../../models/index.mjs"

let transporter = null

/**
 * Get email transporter
 * @param {string} config - Optional SMTP configuration string
 * @returns {Promise<nodemailer.Transporter|null>} Transporter instance or null if not configured
 * @throws {Error} If mail transport is not configured in production
 */
export async function getTransporter(config) {
  if (!transporter) {
    const mailTransport = config || (await Setting.get("mail_transport"))

    // Check if mail transport is configured
    if (!mailTransport) {
      throw new Error(
        "Mail transport is not configured. Please configure mail settings in the admin panel.",
      )
    }

    transporter = nodemailer.createTransport(mailTransport)
  }
  return transporter
}

export async function renderEmail(template, variables) {
  const content = await fs.readFile(
    path.resolve(dirname(import.meta), `./templates/${template}.mjml`),
  )
  return mjml2html(ejs.render(content.toString(), variables)).html
}

/**
 * Send email
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @returns {Promise<object>} Send result
 * @throws {Error} If mail transport or mail from is not configured
 */
export async function sendEmail(toEmail, subject, html) {
  // Check if mail transport is configured
  const mailTransport = await Setting.get("mail_transport")
  if (!mailTransport && process.env.NODE_ENV !== "test") {
    throw new Error(
      "Mail transport is not configured. Please configure mail settings in the admin panel.",
    )
  }

  // Get mail from address from database
  const mailFrom = await Setting.get("mail_from", "no-reply@epress.world")
  const transporter = await getTransporter()

  const mailOptions = {
    from: mailFrom,
    to: toEmail,
    subject,
    html,
  }
  return await transporter.sendMail(mailOptions)
}
