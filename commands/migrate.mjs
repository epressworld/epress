import "../config/index.mjs"
import { fileURLToPath } from "node:url"
import { Command } from "solidify.js"
import { Model } from "../server/models/index.mjs"

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
}

export class MigrateCommand extends Command {
  arguments = {
    action: {
      optional: true,
      multiple: false,
      choices: ["upgrade", "rollback"],
      description: "Migration action: rollback or upgrade database",
      default: "upgrade",
    },
  }

  async action(action) {
    console.log(`🚀 Starting migration command: ${action}`)
    console.log(`📅 Timestamp: ${new Date().toISOString()}`)

    try {
      let result
      switch (action) {
        case "rollback":
          console.log("🔄 Initiating database rollback...")
          result = await Model.knex().migrate.rollback()
          console.log("📋 Rollback Results:")
          this.logMigrationResult(result)
          break

        case "upgrade":
          console.log("⬆️ Initiating database upgrade...")
          result = await Model.knex().migrate.latest()
          console.log("📋 Upgrade Results:")
          this.logMigrationResult(result)
          break

        default:
          throw new Error(`Unknown migration action: ${action}`)
      }

      console.log(`🎉 Migration command '${action}' completed successfully!`)
    } catch (error) {
      console.error(`❌ Migration command '${action}' failed!`)
      console.error(`Error details: ${error.message}`)
      throw error // Re-throw to maintain error handling
    } finally {
      console.log("🧹 Cleaning up database connection...")
      await Model.knex()?.destroy()
      console.log("🔌 Database connection closed.")
    }
  }

  logMigrationResult(result) {
    if (!result || !Array.isArray(result)) {
      console.log("  No migrations were executed.")
      return
    }

    const [batchNo, migrations] = result

    if (migrations.length === 0) {
      console.log("  No migrations were executed, database is up to date.")
      return
    }

    console.log(`  Batch Number: ${batchNo}`)
    console.log(`  Total Migrations: ${migrations.length}`)
    console.log("  Executed Migrations:")

    migrations.forEach((migration, index) => {
      console.log(`    ${index + 1}. ${migration}`)
    })
  }
}

if (isMainModule(import.meta)) {
  new MigrateCommand().execute(process.argv)
}
