import "../../config/index.mjs"
import { Model } from "solidify.js"
import knexfile from "../../knexfile.mjs"

// ---- Centralized database connection setup ----
if (!Model.knex()) {
  Model.connect(knexfile)
}

export { Model }
export * from "./comment.mjs"
export * from "./connection.mjs"
export * from "./content.mjs"
export * from "./hashtag.mjs"
export * from "./node.mjs"
export * from "./publication.mjs"
export * from "./setting.mjs"
