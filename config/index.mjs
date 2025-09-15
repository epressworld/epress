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
 */

// Load different configuration files based on environment
// Priority: .env.${NODE_ENV} > .env.local > .env
config({
  path: [`.env.${process.env.NODE_ENV || "development"}`, ".env.local", ".env"],
})

// Validate and export configuration
export const appConfig = validateConfig()

// Export configuration descriptions (for documentation generation)
// Export validation function (for testing)
export { getConfigDescription, validateConfig } from "./validation.mjs"
