import { config } from "dotenv"
import { validateInfrastructureConfig } from "./validation.mjs"

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

// Load different configuration files based on environment
// Priority: .env.${NODE_ENV} > .env.local > .env
config({
  path: [`.env.${process.env.NODE_ENV || "development"}`, ".env.local", ".env"],
})

// Validate infrastructure configuration only (allows pre-install mode)
// Application-level settings will be loaded from database after installation
export const appConfig = validateInfrastructureConfig()

// Export configuration descriptions (for documentation generation)
// Export validation functions (for testing)
export {
  getConfigDescription,
  validateConfig,
  validateInfrastructureConfig,
} from "./validation.mjs"
