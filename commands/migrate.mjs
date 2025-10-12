import "../config/index.mjs"
import { existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { execa } from "execa"
import { Command, knexMigration, Model } from "swiftify"
import * as modelsMap from "../server/models/index.mjs"

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
}

export async function migrateDatabase(options = {}) {
  const { drop = false } = options

  // Ensure data directory exists
  const dataDir = path.dirname(
    process.env.DATABASE_PATH || "./data/icopilot.db",
  )
  if (!existsSync(dataDir)) {
    console.log(`Creating data directory: ${dataDir}`)
    await mkdir(dataDir, { recursive: true })
  }

  // Ensure database connection is established
  if (!Model.knex()) {
    throw new Error(
      "Database connection not established. Please check your database configuration.",
    )
  }

  // All models list
  const models = Object.values(modelsMap)

  console.log(`Starting database migration...`)
  console.log(`Models to migrate: ${models.map((m) => m.tableName).join(", ")}`)

  if (drop) {
    console.log(`Dropping existing tables...`)
  }

  try {
    await knexMigration(models, { drop })
    console.log(`✅ Database migration completed successfully!`)

    if (!drop) {
      console.log(`Created tables:`)
      models.forEach((model) => {
        console.log(`  - ${model.tableName}`)
      })
    } else {
      console.log(`Dropped tables:`)
      models.forEach((model) => {
        console.log(`  - ${model.tableName}`)
      })
    }
  } catch (error) {
    console.error(`❌ Database migration failed:`, error.message)
    throw error
  }
}

export class MigrateCommand extends Command {
  arguments = {
    action: {
      optional: true,
      multiple: false,
      choices: ["uninstall", "upgrade"],
      description:
        "Migration action: create tables, drop tables, recreate (drop + create), or seed data and upgrade database",
      default: "create",
    },
  }

  async action(action) {
    console.log(`🚀 Starting migration command: ${action}`)

    switch (action) {
      case "uninstall":
        await migrateDatabase({ drop: true })
        break
      case "upgrade":
        await execa({
          stdout: "inherit",
          stderr: "inherit",
        })`npx knex migrate:latest`
        break
      default:
        throw new Error(`Unknown migration action: ${action}`)
    }

    console.log(`🎉 Migration command '${action}' completed successfully!`)
    Model.knex()?.destroy()
  }
}

if (isMainModule(import.meta)) {
  new MigrateCommand().execute(process.argv)
}
