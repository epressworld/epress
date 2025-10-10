import "../../config/index.mjs"
import { Model } from "swiftify"
import { Comment } from "./comment.mjs"
import { Connection } from "./connection.mjs"
import { Content } from "./content.mjs"
import { Node } from "./node.mjs"
import { Publication } from "./publication.mjs"
import { Setting } from "./setting.mjs"

// ---- Model exports ----
// ---- Centralized database connection setup ----
if (!Model.knex()) {
  Model.connect({
    client: "sqlite3",
    connection: process.env.EPRESS_DATABASE_CONNECTION,
    useNullAsDefault: true,
    migrations: {
      directory: "./deploy/migrations",
      tableName: "knex_migrations",
      extension: "mjs",
      loadExtensions: ["mjs", "js"],
    },
  })
}

export { Setting, Node, Connection, Content, Publication, Comment }
