import "../config/index.mjs"
import { existsSync } from "node:fs"
import { mkdir, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
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

export async function runSeeds() {
  console.log("🌱 Starting to run seed data...")

  // Ensure database connection is established
  if (!Model.knex()) {
    throw new Error(
      "Database connection not established. Please check your database configuration.",
    )
  }

  const knex = Model.knex()
  const seedsDir = path.join(process.cwd(), "/deploy/seeds")

  // Check if seeds directory exists
  if (!existsSync(seedsDir)) {
    throw new Error(`Seeds directory not found: ${seedsDir}`)
  }

  try {
    // Get all seed files
    const files = await readdir(seedsDir)
    const seedFiles = files.filter((file) => file.endsWith(".js")).sort() // Execute in filename order

    if (seedFiles.length === 0) {
      console.log("⚠️  No seed files found in seeds directory")
      return
    }

    console.log(`Found ${seedFiles.length} seed file(s):`)
    seedFiles.forEach((file) => {
      console.log(`  - ${file}`)
    })

    // Execute each seed file in sequence
    for (const file of seedFiles) {
      console.log(`\n🔄 Running seed file: ${file}`)
      const seedPath = path.join(seedsDir, file)
      const seedModule = await import(path.resolve(seedPath))

      if (typeof seedModule.seed !== "function") {
        throw new Error(`Seed file ${file} must export a 'seed' function`)
      }

      await seedModule.seed(knex)
      console.log(`✅ ${file} executed successfully`)
    }

    console.log(`\n🎉 All seed data execution completed!`)
  } catch (error) {
    console.error(`❌ Seeds execution failed:`, error.message)
    throw error
  }
}

export async function makeSeed(name) {
  if (!name) {
    throw new Error("Seed name is required")
  }

  const seedsDir = path.join(process.cwd(), "seeds")

  // Ensure seeds directory exists
  if (!existsSync(seedsDir)) {
    await mkdir(seedsDir, { recursive: true })
    console.log(`Created seeds directory: ${seedsDir}`)
  }

  // Generate timestamp prefix
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14)
  const fileName = `${timestamp}_${name}.js`
  const filePath = path.join(seedsDir, fileName)

  // Generate seed file template
  const template = `/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function seed(knex) {
  // Delete existing data (optional)
  // await knex('table_name').del();

  // Insert seed data
  // await knex('table_name').insert([
  //   { id: 1, name: 'example1' },
  //   { id: 2, name: 'example2' }
  // ]);
}
`
  await writeFile(filePath, template)
  console.log(`✅ Created seed file: ${fileName}`)
  return filePath
}

export class MigrateCommand extends Command {
  arguments = {
    action: {
      optional: true,
      multiple: false,
      choices: ["create", "drop", "recreate", "seed"],
      description:
        "Migration action: create tables, drop tables, recreate (drop + create), or seed data",
      default: "create",
    },
    subaction: {
      optional: true,
      multiple: false,
      choices: ["run", "make"],
      description: "Seed subaction: run existing seeds or make new seed file",
      default: "run",
    },
    name: {
      optional: true,
      multiple: false,
      description: "Name for new seed file (only used with 'seed make')",
    },
  }

  async action(action, subaction, name) {
    console.log(`🚀 Starting migration command: ${action}`)

    switch (action) {
      case "create":
        await migrateDatabase({ drop: false })
        break
      case "drop":
        await migrateDatabase({ drop: true })
        break
      case "recreate":
        console.log("Dropping existing tables...")
        await migrateDatabase({ drop: true })
        console.log("Creating new tables...")
        await migrateDatabase({ drop: false })
        break
      case "seed":
        switch (subaction) {
          case "run":
            await runSeeds()
            break
          case "make":
            if (!name) {
              throw new Error(
                "Seed name is required when using 'seed make'. Use: node commands/migrate.mjs seed make <name>",
              )
            }
            await makeSeed(name)
            break
          default:
            throw new Error(`Unknown seed subaction: ${subaction}`)
        }
        break
      default:
        throw new Error(`Unknown migration action: ${action}`)
    }

    console.log(`🎉 Migration command '${action}' completed successfully!`)
    Model.knex().destroy()
  }
}

if (isMainModule(import.meta)) {
  new MigrateCommand().execute(process.argv)
}
