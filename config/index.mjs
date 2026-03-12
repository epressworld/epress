import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"
import { validateConfig } from "./validation.mjs"

/**
 * ePress Configuration Management
 *
 * Features:
 * 1. Load corresponding environment variable files based on NODE_ENV
 * 2. Use yup to validate configuration items
 * 3. Provide type-safe configuration access
 * 4. Provide clear error messages when configuration errors occur
 * 5. Support pre-install mode with minimal configuration requirements
 */

// Get the project root directory (parent of config directory)
const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, "..")

// Load different configuration files based on environment
// Priority: .env.${NODE_ENV} > .env.local > .env
// Use absolute paths to ensure correct loading from any working directory
config({
  path: [
    resolve(projectRoot, `.env.${process.env.NODE_ENV || "development"}`),
    resolve(projectRoot, ".env.local"),
    resolve(projectRoot, ".env"),
  ],
})

// Validate infrastructure configuration only (allows pre-install mode)
// Application-level settings will be loaded from database after installation
export const appConfig = validateConfig()

// Export configuration descriptions (for documentation generation)
// Export validation functions (for testing)
export { validateConfig } from "./validation.mjs"
