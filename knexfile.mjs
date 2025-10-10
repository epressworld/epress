import "./config/index.mjs"
export default {
  development: {
    client: "sqlite3",
    connection: process.env.EPRESS_DATABASE_CONNECTION || {
      filename: "./data/epress.sqlite",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./deploy/migrations",
      tableName: "knex_migrations",
    },
  },
  production: {
    client: "sqlite3",
    connection: process.env.EPRESS_DATABASE_CONNECTION || {
      filename: "./data/epress.sqlite",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./deploy/migrations",
      tableName: "knex_migrations",
    },
  },
}
