import "./config/index.mjs"

export default {
  client: process.env.EPRESS_DATABASE_CLIENT || "sqlite3",
  useNullAsDefault: true,
  connection: process.env.EPRESS_DATABASE_CONNECTION,
  migrations: {
    directory: "./deploy/migrations",
    loadExtensions: [".mjs", ".js"],
  },
  seeds: {
    directory: "./deploy/seeds",
    loadExtensions: [".mjs", ".js"],
  },
}
