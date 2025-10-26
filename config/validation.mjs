import * as yup from "yup"

/**
 * ePress Configuration Validation Schema
 * Uses yup for environment variable validation, type conversion, and default value setting
 */

/**
 * Infrastructure-level configuration schema
 * These settings are required for the server to start and connect to the database
 */
export const EPRESS_CONFIG_SCHEMA = yup.object({
  // ===========================================
  // Server Configuration
  // ===========================================
  EPRESS_SERVER_HOST: yup.string().default("0.0.0.0"),

  EPRESS_SERVER_PORT: yup
    .number()
    .transform((value) => parseInt(value, 10))
    .default(4000)
    .min(1, "Port number must be greater than 0")
    .max(65535, "Port number must be less than 65536"),

  EPRESS_CLIENT_PORT: yup
    .number()
    .transform((value) => parseInt(value, 10))
    .default(3001)
    .min(1, "Port number must be greater than 0")
    .max(65535, "Port number must be less than 65536"),

  // ===========================================
  // Database Configuration
  // ===========================================
  EPRESS_DATABASE_CONNECTION: yup
    .string()
    .default("./data/database/epress.sqlite"),

  EPRESS_DATABASE_CLIENT: yup.string().default("sqlite3"),

  // ===========================================
  // Frontend Proxy Configuration
  // ===========================================
  EPRESS_API_URL: yup
    .string()
    .matches(/^https?:\/\/.+/, "Must be a valid HTTP or HTTPS URL")
    .required("API URL is required"),

  // ===========================================
  // Development/Testing Configuration
  // ===========================================
  EPRESS_DEV_DEBUG: yup
    .boolean()
    .transform((value) => value === "true")
    .default(false),

  EPRESS_DEV_LOG_LEVEL: yup
    .string()
    .oneOf(
      ["error", "warn", "info", "debug"],
      "Log level must be error, warn, info, or debug",
    )
    .default("info"),

  // ===========================================
  // Logging Configuration
  // ===========================================
  EPRESS_LOG_FILE: yup.string().optional(),
})

/**
 * Validate infrastructure configuration (required for server startup)
 * @param {Object} env - Environment variable object
 * @returns {Object} Validated configuration object
 */
export function validateConfig(env = process.env) {
  try {
    return EPRESS_CONFIG_SCHEMA.validateSync(env, {
      abortEarly: false,
      stripUnknown: true,
    })
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      console.error("❌ Infrastructure configuration validation failed:")
      error.errors.forEach((err) => {
        console.error(`  - ${err}`)
      })
      console.error("\nPlease check the configuration items in .env file.")
      process.exit(1)
    }
    throw error
  }
}
