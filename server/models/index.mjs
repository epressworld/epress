import "../../config/index.mjs"
import { Model } from "swiftify"
import knexfile from "../../knexfile.mjs"
import { Comment } from "./comment.mjs"
import { Connection } from "./connection.mjs"
import { Content } from "./content.mjs"
import { Node } from "./node.mjs"
import { Publication } from "./publication.mjs"
import { Setting } from "./setting.mjs"

// ---- Centralized database connection setup ----
if (!Model.knex()) {
  Model.connect(knexfile)
}

export { Setting, Node, Connection, Content, Publication, Comment, Model }
