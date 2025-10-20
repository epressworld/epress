import { createReadStream, createWriteStream, existsSync } from "node:fs"
import { mkdir } from "node:fs/promises"
import path from "node:path"
import { createInterface } from "node:readline"
import { fileURLToPath } from "node:url"
import { Command } from "swiftify"
import { Model } from "../server/models/index.mjs"

const INSTALL_LOCK_FILE = path.resolve(process.cwd(), "./data/.INSTALL_LOCK")

function isMainModule(meta) {
  return process.argv[1] === fileURLToPath(meta.url)
}

export class MaintenanceCommand extends Command {
  arguments = {
    action: {
      optional: true,
      multiple: false,
      choices: ["backup", "restore"],
      description: "Database maintenance action: backup or restore",
      default: "backup",
    },
    file: {
      optional: true,
      multiple: false,
      description: "Backup file path for restore action",
    },
  }

  async action(action, file) {
    // 确保数据库连接已建立
    if (!Model.knex()) {
      throw new Error(
        "Database connection not established. Please check your database configuration.",
      )
    }

    // 从 Knex 实例中获取真实的方言
    const client = Model.knex().client.dialect
    console.log(
      `🚀 Starting database maintenance: ${action} for ${client} database`,
    )

    // 确保备份目录存在
    const backupDir = "./data/backup"
    if (!existsSync(backupDir)) {
      console.log(`Creating backup directory: ${backupDir}`)
      await mkdir(backupDir, { recursive: true })
    }

    try {
      switch (action) {
        case "backup":
          await this.backup(client, backupDir)
          break
        case "restore":
          if (!file) {
            throw new Error("Backup file path is required for restore action")
          }
          await this.restore(client, file)
          break
        default:
          throw new Error(`Unknown maintenance action: ${action}`)
      }
      console.log(`🎉 Maintenance command '${action}' completed successfully!`)
    } catch (error) {
      console.error(`❌ Maintenance command failed:`, error.message)
      throw error
    } finally {
      // 始终确保关闭连接
      Model.knex()?.destroy()
    }
  }

  /**
   * 备份数据库
   * @param {string} client - Knex 方言 (e.g., 'sqlite3', 'mysql', 'pg')
   * @param {string} backupDir - 备份目录
   */
  async backup(client, backupDir) {
    const backupPath = path.join(
      backupDir,
      `backup-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`,
    )
    console.log(`Creating backup at: ${backupPath}`)

    const writeStream = createWriteStream(backupPath, { encoding: "utf-8" })
    const BATCH_SIZE = 1000 // 每 1000 行一个 INSERT 语句

    // 方言特定的引用标识符
    const q = (name) => (client === "mysql" ? `\`${name}\`` : `"${name}"`)

    try {
      // 1. 获取表列表 (方言特定)
      let tablesQuery
      if (client === "sqlite3") {
        tablesQuery =
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      } else if (client === "pg") {
        tablesQuery =
          "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      } else {
        // 假设是 mysql/mariadb
        tablesQuery = "SHOW TABLES"
      }
      const tablesResult = await Model.knex().raw(tablesQuery)

      let tables
      if (client === "sqlite3") {
        tables = tablesResult.map((row) => row.name)
      } else if (client === "pg") {
        tables = tablesResult.rows.map((row) => row.tablename)
      } else {
        // mysql
        tables = tablesResult[0].map((row) => Object.values(row)[0])
      }

      // 2. 遍历表
      for (const table of tables) {
        // 2a. 获取表结构 SQL (方言特定)
        let createTableSql
        if (client === "sqlite3") {
          const result = await Model.knex().raw(
            `SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`,
            [table],
          )
          createTableSql = result[0]?.sql
        } else if (client === "mysql") {
          const result = await Model.knex().raw(`SHOW CREATE TABLE ${q(table)}`)
          createTableSql = result[0][0]["Create Table"]
        } else if (client === "pg") {
          console.warn(
            `⚠️ WARNING: Schema backup for PostgreSQL (pg) is not supported. Only data will be backed up. Use 'pg_dump' for a reliable schema backup.`,
          )
        } else {
          console.warn(
            `⚠️ WARNING: Unsupported client ${client} for schema backup. Only data will be backed up.`,
          )
        }

        if (createTableSql) {
          writeStream.write(`${createTableSql};\n\n`)
        }

        // 2b. 流式传输表数据
        const stream = Model.knex().select().from(table).stream()
        let rowCount = 0
        let columns = []
        let valuesBuffer = []

        for await (const row of stream) {
          // 第一次获取列名
          if (rowCount === 0) {
            columns = Object.keys(row)
              .map((col) => q(col))
              .join(", ")
          }

          // 序列化值 (方言特定)
          const values = `(${Object.values(row)
            .map((v) => {
              if (v === null) return "NULL"
              if (typeof v === "number") return v
              if (typeof v === "boolean") {
                return client === "pg" ? v : v ? 1 : 0 // pg: true, others: 1
              }
              if (v instanceof Buffer) {
                // pg: E'\\x...', others: X'...'
                return client === "pg"
                  ? `E'\\\\x${v.toString("hex")}'`
                  : `X'${v.toString("hex")}'`
              }
              if (v instanceof Date) {
                return `'${v.toISOString()}'`
              }
              // 默认: 字符串, 转义单引号
              return `'${String(v).replace(/'/g, "''")}'`
            })
            .join(", ")})`
          valuesBuffer.push(values)
          rowCount++

          // 达到批量大小，写入文件
          if (rowCount % BATCH_SIZE === 0) {
            writeStream.write(
              `INSERT INTO ${q(table)} (${columns}) VALUES\n${valuesBuffer.join(
                ",\n",
              )};\n\n`,
            )
            valuesBuffer = [] // 清空缓冲区
          }
        }

        // 写入剩余的行
        if (valuesBuffer.length > 0) {
          writeStream.write(
            `INSERT INTO ${q(table)} (${columns}) VALUES\n${valuesBuffer.join(
              ",\n",
            )};\n\n`,
          )
        }
        if (rowCount === 0) {
          writeStream.write(`-- Table ${table} is empty --\n\n`)
        }
      }

      writeStream.end()

      // 等待文件写入完成
      await new Promise((resolve, reject) => {
        writeStream.on("finish", resolve)
        writeStream.on("error", reject)
      })

      console.log(`✅ Backup completed successfully at ${backupPath}`)
    } catch (error) {
      console.error(`❌ Backup failed:`, error.message)
      throw error // 重新抛出错误以触发上层 catch
    } finally {
      if (writeStream && !writeStream.closed) {
        writeStream.destroy() // 确保在出错时关闭流
      }
    }
  }

  /**
   * 从 SQL 文件恢复数据库
   * @param {string} client - Knex 方言
   * @param {string} backupFile - 备份文件路径
   */
  async restore(client, backupFile) {
    if (existsSync(INSTALL_LOCK_FILE)) {
      throw new Error(`Cannot restore because INSTALL_LOCK exists`)
    }
    if (!existsSync(backupFile)) {
      throw new Error(`Backup file does not exist: ${backupFile}`)
    }

    console.log(`Restoring database from: ${backupFile}`)

    // ！！针对你提到的 "read-only" 问题的警告 ！！
    if (client === "sqlite3") {
      const dbPath = Model.knex().client.config.connection.filename
      if (dbPath && !existsSync(dbPath)) {
        console.warn(`-----------------------------------------------------`)
        console.warn(`⚠️ WARNING: Database file not found at ${dbPath}.`)
        console.warn(`A new file will be created by the 'sqlite3' driver.`)
        console.warn(
          `This new file will be owned by the current user (${
            process.env.USER || "unknown"
          }).`,
        )
        console.warn(
          `If your web server runs as a different user (e.g., 'www-data'),`,
        )
        console.warn(
          `it may not have write permissions to this new file, causing "read-only" errors.`,
        )
        console.warn(
          `👉 After restore, run 'sudo chown <web_user> ${dbPath}' to fix permissions.`,
        )
        console.warn(`-----------------------------------------------------`)
      }
    }

    try {
      // 1. 删除所有现有表
      const tablesQuery =
        client === "sqlite3"
          ? "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
          : client === "pg"
            ? "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            : "SHOW TABLES"

      const tablesResult = await Model.knex().raw(tablesQuery)
      const tables =
        client === "sqlite3"
          ? tablesResult.map((row) => row.name)
          : client === "pg"
            ? tablesResult.rows.map((row) => row.tablename)
            : tablesResult[0].map((row) => Object.values(row)[0])

      // 在事务中删除，但需要注意外键约束
      // 更安全的方式是先禁用外键（如果支持）
      console.log(`Dropping ${tables.length} existing tables...`)
      for (const table of tables) {
        await Model.knex().schema.dropTableIfExists(table)
      }

      // 2. 逐行读取 SQL 文件并执行
      const fileStream = createReadStream(backupFile)
      const rl = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      })

      let statement = ""
      await Model.knex().transaction(async (trx) => {
        for await (const line of rl) {
          // 忽略 SQL 注释
          if (line.startsWith("--")) continue

          statement += `${line}\n`
          // 我们的备份格式以 `;\n\n` 结束，简单检查 `;\n`
          if (statement.trim().endsWith(";")) {
            try {
              await trx.raw(statement)
            } catch (err) {
              console.error(`Failed to execute statement: ${err.message}`)
              console.error(`Statement: ${statement.substring(0, 200)}...`)
              throw err // 抛出错误以回滚事务
            }
            statement = "" // 重置语句缓冲区
          }
        }
        // 执行缓冲区中剩余的最后一条语句（如果有）
        if (statement.trim()) {
          await trx.raw(statement)
        }
      })

      console.log(`✅ Database restored successfully from ${backupFile}`)
    } catch (error) {
      console.error(`❌ Restore failed:`, error.message)
      throw error
    }
  }
}

if (isMainModule(import.meta)) {
  new MaintenanceCommand().execute(process.argv)
}
