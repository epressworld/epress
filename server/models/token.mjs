import { randomUUID } from "node:crypto"
import ms from "ms"
import { Model } from "solidify.js"

export class Token extends Model {
  static tableName = "tokens"

  static idColumn = "id"

  static fields = {
    id: {
      type: "string",
      constraints: {
        primary: true,
        notNullable: true,
      },
    },
    token: {
      type: "string",
      constraints: {
        notNullable: true,
      },
    },
    expires_at: {
      type: "timestamp",
      constraints: {
        notNullable: true,
      },
    },
    revoked: {
      type: "boolean",
      constraints: {
        notNullable: true,
        defaultsTo: false,
      },
    },
    created_at: {
      type: "timestamp",
      timestamp: "insert",
    },
  }

  static async issue({ app, sub, aud, iss, scope, expiresIn = "24h" }) {
    const jti = randomUUID()

    const payload = {
      jti,
      aud,
      sub,
      iss,
    }

    if (scope) {
      payload.scope = scope
    }

    const token = await app.jwt.sign(payload, { expiresIn })

    const expiresAt = new Date(Date.now() + ms(expiresIn))

    try {
      await Token.query().insert({
        id: jti,
        token,
        expires_at: expiresAt,
      })
    } catch (insertError) {
      console.error("Failed to save token to database:", insertError)
      throw new Error("Failed to save token to database")
    }

    return token
  }

  static async create({ id, token, expiresAt }) {
    return await Token.query().insert({
      id,
      token,
      expires_at: expiresAt,
    })
  }

  static async revoke(id) {
    return await Token.query().patchAndFetchById(id, { revoked: true })
  }

  static async findById(id) {
    return await Token.query().findById(id)
  }

  static async verify(id) {
    const tokenRecord = await Token.query().findById(id)
    if (!tokenRecord) {
      const error = new Error("Token not found in database")
      error.code = "TOKEN_NOT_FOUND"
      throw error
    }
    if (tokenRecord.revoked) {
      const error = new Error("Token has been revoked")
      error.code = "TOKEN_REVOKED"
      throw error
    }
    if (new Date(tokenRecord.expires_at) < new Date()) {
      const error = new Error("Token has expired")
      error.code = "TOKEN_EXPIRED"
      throw error
    }
    return tokenRecord
  }
}
