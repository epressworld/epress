import * as yup from "yup"

/**
 * ePress Configuration Validation Schema
 * Uses yup for environment variable validation, type conversion, and default value setting
 */

/**
 * Infrastructure-level configuration schema
 * These settings are required for the server to start and connect to the database
 */
export const EPRESS_INFRASTRUCTURE_SCHEMA = yup.object({
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
  EPRESS_DATABASE_CONNECTION: yup.string().default("./data/epress.sqlite"),

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
 * Application-level configuration schema (stored in database after installation)
 * These settings are optional during pre-install state
 */
export const EPRESS_APPLICATION_SCHEMA = yup.object({
  // ===========================================
  // Client Configuration (will be stored in database)
  // ===========================================
  EPRESS_CLIENT_DEFAULT_LANGUAGE: yup
    .string()
    .oneOf(["en", "zh"], "Language must be en or zh")
    .optional(),

  EPRESS_CLIENT_DEFAULT_THEME: yup
    .string()
    .oneOf(["light", "dark", "system"], "Theme must be light, dark, or system")
    .optional(),

  EPRESS_WALLETCONNECT_PROJECTID: yup.string().optional(),

  // ===========================================
  // Authentication Configuration (will be stored in database)
  // ===========================================
  EPRESS_AUTH_JWT_SECRET: yup
    .string()
    .min(32, "JWT secret must be at least 32 characters")
    .optional(),

  EPRESS_AUTH_JWT_EXPIRES_IN: yup.string().optional(),

  // ===========================================
  // Node Configuration (will be stored in database)
  // ===========================================
  EPRESS_NODE_ADDRESS: yup
    .string()
    .matches(/^0x[a-fA-F0-9]{40}$/, "Must be a valid Ethereum address format")
    .optional(),

  EPRESS_NODE_URL: yup
    .string()
    .matches(/^https?:\/\/.+/, "Must be a valid HTTP or HTTPS URL")
    .optional(),

  EPRESS_NODE_TITLE: yup.string().optional(),

  EPRESS_NODE_DESCRIPTION: yup.string().optional(),

  // ===========================================
  // Email Configuration (will be stored in database)
  // ===========================================
  EPRESS_MAIL_TRANSPORT: yup.string().optional(),

  EPRESS_MAIL_FROM: yup.string().optional(),
})

/**
 * Full configuration schema (for backward compatibility)
 * Combines infrastructure and application schemas
 */
export const EPRESS_CONFIG_SCHEMA = EPRESS_INFRASTRUCTURE_SCHEMA.concat(
  EPRESS_APPLICATION_SCHEMA,
)

/**
 * Validate infrastructure configuration (required for server startup)
 * @param {Object} env - Environment variable object
 * @returns {Object} Validated configuration object
 */
export function validateInfrastructureConfig(env = process.env) {
  try {
    return EPRESS_INFRASTRUCTURE_SCHEMA.validateSync(env, {
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

/**
 * Validate full configuration (for backward compatibility and after installation)
 * @param {Object} env - Environment variable object
 * @param {boolean} strict - If true, require all application settings
 * @returns {Object} Validated configuration object
 */
export function validateConfig(env = process.env, strict = false) {
  try {
    if (strict) {
      return EPRESS_CONFIG_SCHEMA.validateSync(env, {
        abortEarly: false,
        stripUnknown: true,
      })
    } else {
      // In non-strict mode, only validate infrastructure settings
      return validateInfrastructureConfig(env)
    }
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      console.error("❌ Configuration validation failed:")
      error.errors.forEach((err) => {
        console.error(`  - ${err}`)
      })
      console.error("\nPlease check the configuration items in .env file.")
      process.exit(1)
    }
    throw error
  }
}

/**
 * Get configuration item descriptions
 * @returns {Object} Configuration item descriptions
 */
export function getConfigDescription() {
  return {
    // Client Configuration
    EPRESS_CLIENT_DEFAULT_LANGUAGE: "Default language for client (en|zh)",
    EPRESS_CLIENT_DEFAULT_THEME: "Default theme for client (light|dark|system)",
    EPRESS_WALLETCONNECT_PROJECTID: "WalletConnect Project ID",

    // Server Configuration
    EPRESS_SERVER_HOST: "Server listening address",
    EPRESS_SERVER_PORT: "Server port number",
    EPRESS_CLIENT_PORT: "Client port number",

    // Database Configuration
    EPRESS_DATABASE_CONNECTION: "SQLite database file path",

    // Authentication Configuration
    EPRESS_AUTH_JWT_SECRET:
      "JWT signing secret (must be changed in production)",
    EPRESS_AUTH_JWT_EXPIRES_IN: "JWT expiration time",

    // Node Configuration
    EPRESS_NODE_ADDRESS: "Node address",
    EPRESS_NODE_URL: "Node public URL",
    EPRESS_NODE_TITLE: "Node title",
    EPRESS_NODE_DESCRIPTION: "Node description",

    // Email Configuration
    EPRESS_MAIL_TRANSPORT: "Email transport configuration",
    EPRESS_MAIL_FROM: "Sender information",

    // Frontend Proxy Configuration
    EPRESS_API_URL: "API service address (for frontend proxy)",

    // Development Configuration
    EPRESS_DEV_DEBUG: "Enable debug mode (true|false)",
    EPRESS_DEV_LOG_LEVEL: "Log level (error|warn|info|debug)",
  }
}
