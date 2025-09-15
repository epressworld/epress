import crypto from "node:crypto"
import { Readable } from "node:stream"
import { Keccak, SHA3 } from "sha3"

export const aes = {
  encrypt(key, text) {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(hash.md5(key)),
      iv,
    )
    let encrypted = cipher.update(text)

    encrypted = Buffer.concat([encrypted, cipher.final()])

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`
  },
  decrypt(key, text) {
    const textParts = text.split(":")
    const iv = Buffer.from(textParts.shift(), "hex")
    const encryptedText = Buffer.from(textParts.join(":"), "hex")
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      Buffer.from(hash.md5(key)),
      iv,
    )
    let decrypted = decipher.update(encryptedText)

    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString()
  },
}

export const hash = {
  md5(text) {
    return crypto.createHash("md5").update(text).digest("hex")
  },
  sha1(text) {
    return crypto.createHash("sha1").update(text).digest("hex")
  },
  sha3(text, hexPrefix = true, type = 256) {
    const hash = new SHA3(type)
    return `${hexPrefix ? "0x" : ""}${hash.update(text).digest("hex")}`
  },
  keccak256(text) {
    const hash = new Keccak(256)
    return `0x${hash.update(text).digest("hex")}`
  },
  sha256(content) {
    // 验证输入是否为 null 或 undefined
    if (content == null) {
      throw new Error("Input cannot be null or undefined")
    }

    // 处理字符串或 Buffer 输入
    if (typeof content === "string" || content instanceof Buffer) {
      return crypto.createHash("sha256").update(content).digest("hex")
    }

    // 检查是否为 Readable 流
    if (!(content instanceof Readable)) {
      throw new Error("Input must be a string, Buffer, or Readable stream")
    }

    // 处理流输入
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256")
      content.on("data", (chunk) => hash.update(chunk))
      content.on("end", () => resolve(hash.digest("hex")))
      content.on("error", (err) => reject(err))
    })
  },
  rmd160(text) {
    return crypto.createHash("rmd160").update(text).digest()
  },
  hmac(text, secret, algo = "SHA256", digest = "base64") {
    return crypto.createHmac(algo, secret).update(text).digest(digest)
  },
}

export * as base64 from "js-base64"
