import crypto from "node:crypto"
import fs from "node:fs/promises"
import path from "node:path"
import readline from "node:readline/promises"
import dotenv from "dotenv"
import { Command, Model } from "swiftify"
import validator from "validator" // Correct import for validator library

// Note: We are NOT importing config or models at the top level anymore.
// They will be dynamically imported after the .env file is created.

class InstallCommand extends Command {
  name = "install"
  description =
    "Initializes the epress node, including interactive configuration, database migration, and data seeding."
  version = "1.0.0"

  options = {
    "non-interactive": {
      flag: "-n",
      help: "Disable interactive prompts for configuration",
      default: false,
    },
    force: {
      flag: "-f",
      help: "Force re-installation even if already installed",
      default: false,
    },
  }

  async action(options) {
    console.log("🚀 Starting epress node installation...")
    try {
      // Step 1: Create the .env file interactively
      await this.#configureEnvironment(options)

      // Step 2: Load the newly created .env file into process.env
      dotenv.config({ override: true })

      // Step 3: NOW, dynamically import config and models.
      console.log("Validating configuration...")
      await import("../config/index.mjs")
      await import("../server/models/index.mjs")
      console.log("Configuration is valid.")

      // Step 4: Proceed with database setup
      await this.#setupDatabase(options)

      console.log("✅ Epress node installation finished successfully!")
    } catch (error) {
      console.error(`❌ Epress node installation failed: ${error.message}`)
      process.exit(1)
    } finally {
      if (Model.knex()) {
        await Model.knex().destroy()
      }
    }
  }

  async #configureEnvironment(options) {
    const envPath = path.resolve(process.cwd(), ".env")
    const envExamplePath = path.resolve(process.cwd(), "env.example")

    if (!options.force) {
      try {
        await fs.access(envPath)
        console.log("Found existing .env file. Skipping configuration.")
        return
      } catch (_e) {
        // .env file doesn't exist, proceed.
      }
    }

    console.log("⚙️  Configuring environment...")
    let envExampleContent
    try {
      envExampleContent = await fs.readFile(envExamplePath, "utf-8")
    } catch (_e) {
      throw new Error(
        "env.example not found. Cannot proceed with configuration.",
      )
    }

    const config = {}
    const lines = envExampleContent.split("\n")
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    for (const line of lines) {
      if (line.startsWith("#") || !line.includes("=")) continue
      const [key, defaultValue] = line.split("=", 2)

      let value = process.env[key] // Prioritize docker --env vars

      if (value) {
        config[key] = value
        continue // Value already provided, skip to next
      }

      // If value is not provided by env, handle interactively or generate
      if (options.nonInteractive) {
        if (key === "EPRESS_AUTH_JWT_SECRET") {
          value = crypto.randomBytes(32).toString("hex")
          console.log(`Generated random JWT secret for ${key}`)
        } else {
          value = defaultValue
        }
        if (!value) {
          throw new Error(
            `Missing required environment variable: ${key}. Cannot proceed in non-interactive mode.`,
          )
        }
      } else {
        if (key === "EPRESS_AUTH_JWT_SECRET") {
          const randomSecret = crypto.randomBytes(32).toString("hex")
          const answer = await rl.question(
            `Enter a JWT secret or press Enter to use a generated one:\n${randomSecret}\n> `,
          )
          value = answer || randomSecret
        } else if (key === "EPRESS_NODE_ADDRESS") {
          let isValid = false
          while (!isValid) {
            const answer = await rl.question(
              `Please enter your Ethereum address (e.g., 0x...): `,
            )
            const finalValue = answer || defaultValue
            if (/^0x[a-fA-F0-9]{40}$/.test(finalValue)) {
              isValid = true
              value = finalValue
            } else {
              console.log(
                "❌ Invalid Ethereum address format. Please try again.",
              )
            }
          }
        } else if (key === "EPRESS_NODE_URL") {
          let isValid = false
          while (!isValid) {
            const answer = await rl.question(
              `Please enter your node's public URL (e.g., https://yournode.blog): `,
            )
            const finalValue = answer || defaultValue
            // Use validator.isURL for robust URL validation
            if (
              validator.isURL(finalValue, {
                require_protocol: true,
                require_tld: false,
              })
            ) {
              isValid = true
              value = finalValue
            } else {
              console.log(
                "❌ Invalid URL format. Please ensure it includes a protocol (http:// or https://).",
              )
            }
          }
        } else if (key === "EPRESS_WALLETCONNECT_PROJECTID") {
          let isValid = false
          while (!isValid) {
            const answer = await rl.question(
              `Please enter your WalletConnect Project ID (get it for free at https://cloud.walletconnect.com/sign-in): `,
            )
            const finalValue = answer || defaultValue
            if (finalValue && finalValue.trim() !== "") {
              isValid = true
              value = finalValue
            } else {
              console.log(
                "❌ WalletConnect Project ID cannot be empty. Please provide a valid ID.",
              )
            }
          }
        } else if (key === "EPRESS_MAIL_TRANSPORT") {
          let confirmedEmpty = false
          while (!confirmedEmpty) {
            const answer = await rl.question(
              `Please provide your email transport configuration (e.g., smtp://user:pass@smtp.example.com:587).: `,
            )
            value = answer || defaultValue // Allow empty

            if (!value || value.trim() === "") {
              const confirmProceed = await rl.question(
                "⚠️ Warning: Email sending functionality will be unavailable if EPRESS_MAIL_TRANSPORT is not configured. Are you sure you want to proceed without it? (yes/no): ",
              )
              if (confirmProceed.toLowerCase() === "yes") {
                confirmedEmpty = true
              } else {
                // User said 'no', so re-prompt for the value
                console.log("Please provide the email transport configuration.")
                // Loop will continue to re-prompt
              }
            } else {
              confirmedEmpty = true // Value is not empty, so proceed
            }
          }
        } else {
          const answer = await rl.question(
            `Please provide a value for ${key} (default: ${defaultValue}): `,
          )
          value = answer || defaultValue
        }
      }
      config[key] = value
    }
    rl.close()

    const newEnvContent = Object.entries(config)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n")
    await fs.writeFile(envPath, newEnvContent)
    console.log("Successfully created .env file.")
  }

  async #setupDatabase(options) {
    console.log("🗄️  Setting up database...")

    const { migrateDatabase, runSeeds } = await import("./migrate.mjs")

    const isAlreadyInstalled = await this.checkIfInstalled()
    if (isAlreadyInstalled && !options.force) {
      console.log("Database is already initialized. Skipping database setup.")
      return
    }

    if (options.force) {
      console.log("--force flag provided. Forcing database setup.")
    }

    console.log("Running database migrations and seeding...")
    await migrateDatabase()
    await runSeeds()
    console.log("Database setup complete.")
  }

  async checkIfInstalled() {
    try {
      if (!Model.knex()) {
        throw new Error(
          "Database connection not established. Please check your database configuration.",
        )
      }
      const knex = Model.knex()
      const hasNodesTable = await knex.schema.hasTable("nodes")
      if (!hasNodesTable) return false

      const selfNodeCount = await knex("nodes")
        .where("is_self", true)
        .count("* as count")
        .first()

      return selfNodeCount.count > 0
    } catch (error) {
      console.warn(
        `Database check failed: ${error.message}. Assuming not installed.`,
      )
      return false
    }
  }
}

const installCommand = new InstallCommand()
installCommand.execute(process.argv)
