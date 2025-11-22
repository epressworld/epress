import { constants } from "node:fs"
import { access, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { Router } from "solidify.js"
import { getAddress, verifyTypedData } from "viem"
import { Model, Node } from "../../models/index.mjs"

const router = new Router()

// 步骤常量，用于错误跟踪
const INSTALL_STEPS = ["preCheck", "initialSchema", "initialData"]

const INSTALL_LOCK_FILE = path.resolve(process.cwd(), "./data/.INSTALL_LOCK")

/**
 * 检查安装锁文件是否存在
 * @returns {Promise<boolean>}
 */
async function checkInstallLock() {
  try {
    await access(INSTALL_LOCK_FILE, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * 写入安装锁文件
 * @throws {Error} 如果写入失败
 */
async function writeInstallLock() {
  try {
    const lockData = {
      installedAt: new Date().toISOString(),
    }
    await writeFile(
      INSTALL_LOCK_FILE,
      JSON.stringify(lockData, null, 2),
      "utf8",
    )
    console.log("INSTALL_LOCK file written successfully:", lockData)
  } catch (error) {
    console.error("Error writing INSTALL_LOCK file:", error)
    throw new Error(`Failed to write install lock file: ${error.message}`)
  }
}

/**
 * 读取安装锁文件内容
 * @returns {Promise<object|null>}
 */
async function getInstallLock() {
  try {
    const content = await readFile(INSTALL_LOCK_FILE, "utf8")
    return JSON.parse(content)
  } catch (error) {
    if (error.code === "ENOENT") {
      return null
    }
    console.error("Error reading INSTALL_LOCK file:", error)
    return null
  }
}

/**
 * 自定义安装错误类
 * 这将跟踪安装失败的步骤，并能生成一个结果数组。
 */
class InstallError extends Error {
  constructor(message, step) {
    super(message)
    this.name = "InstallError"
    // 确保步骤是已知的步骤之一
    this.step = INSTALL_STEPS.includes(step) ? step : "preCheck"
  }

  /**
   * 生成一个结果数组，显示哪个步骤成功/失败。
   * @returns {Array<object>}
   */
  toResult() {
    const failedIndex = INSTALL_STEPS.indexOf(this.step)
    return INSTALL_STEPS.map((step, index) => ({
      step,
      success: index < failedIndex, // 所有在失败步骤之前的步骤都标记为成功
      error: this.step === step ? this.message : null,
    }))
  }
}

/**
 * 辅助函数：验证安装请求 (Step: preCheck)
 * 包含所有签名、数据和时间戳的验证。
 * @param {object} body - The request.body
 * @param {object} log - The logger (request.log)
 * @returns {Promise<object>} - 返回 { installData, typedData, signature }
 * @throws {InstallError} - 如果任何验证失败
 */
async function validateInstallRequest(body, log) {
  const { typedData, signature } = body

  // 1. 验证基本结构
  if (
    !typedData ||
    !signature ||
    typeof typedData !== "object" ||
    typeof signature !== "string" ||
    !typedData.domain ||
    !typedData.types ||
    !typedData.primaryType ||
    !typedData.message
  ) {
    log.warn("Invalid payload structure in POST /api/install")
    throw new InstallError(
      "Request must contain valid 'typedData' and 'signature'",
      "preCheck",
    )
  }

  const { node, settings, timestamp } = typedData.message
  const { address, url, title, avatar } = node || {}

  // 2. 验证必填字段
  if (!address || !url || !title) {
    throw new InstallError(
      "Node address, URL, and title are required",
      "preCheck",
    )
  }

  // 3. 验证URL格式
  if (!/^https?:\/\/.+/.test(url)) {
    throw new InstallError("Invalid node URL format", "preCheck")
  }

  // 4. 验证Avatar格式
  if (avatar && !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(avatar)) {
    throw new InstallError(
      "Invalid avatar format. Must be a data URL with image type.",
      "preCheck",
    )
  }

  // 5. 验证签名
  try {
    const result = await verifyTypedData({
      address: getAddress(address), // 预期签名者是节点地址
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
      signature: signature,
    })
    if (!result) {
      log.warn("Invalid signature verification in POST /api/install")
      throw new InstallError(
        "Signature verification failed. Ensure you are signing with the correct wallet.",
        "preCheck",
      )
    }
  } catch (cryptoError) {
    log.warn(
      "Signature verification failed in POST /api/install:",
      cryptoError.message,
    )
    throw new InstallError(
      `Signature verification failed: ${cryptoError.message}`,
      "preCheck",
    )
  }

  // 6. 验证时间戳 (1小时内有效)
  const currentTime = Math.floor(Date.now() / 1000)
  const oneHour = 3600
  if (
    !timestamp ||
    timestamp < currentTime - oneHour ||
    timestamp > currentTime + oneHour
  ) {
    log.warn("Invalid timestamp in POST /api/install")
    throw new InstallError(
      "Request timestamp is invalid, too old, or in the future",
      "preCheck",
    )
  }

  // 验证通过，返回组合后的安装数据
  return {
    installData: { ...node, ...settings },
    typedData,
    signature,
  }
}

/**
 * 辅助函数：运行数据库迁移和填充 (Steps: initialSchema, initialData)
 * @param {object} knex - The Knex.js instance
 * @param {object} data - The validated installData from validateInstallRequest
 * @param {object} log - The logger
 * @returns {Promise<Array<object>>} - 返回 { result } 数组
 * @throws {InstallError} - 如果数据库操作失败
 */
async function runDatabaseInstall(knex, data, log) {
  // 初始结果集，preCheck 已通过
  const result = [{ step: "preCheck", success: true, error: null }]

  // 步骤 1: 运行迁移 (initialSchema)
  try {
    await knex.migrate.latest()
    result.push({
      step: "initialSchema",
      success: true,
      error: null,
    })
    log.info("Database schema created successfully using Knex migrations")
  } catch (error) {
    log.error("Failed to run database migrations:", error)
    // 抛出 InstallError，以便主处理程序可以捕获它
    throw new InstallError(error.message, "initialSchema")
  }

  // 步骤 2: 运行数据填充 (initialData)
  try {
    // 这种使用 process.env 的方式是原始代码将数据传递给种子文件的方式。
    // 种子文件必须被编写为从 process.env 读取这些值。
    process.env.INITIAL_DATA_NODE_AVATAR = data.avatar
    process.env.INITIAL_DATA_NODE_ADDRESS = data.address
    process.env.INITIAL_DATA_NODE_URL = data.url
    process.env.INITIAL_DATA_NODE_TITLE = data.title
    process.env.INITIAL_DATA_NODE_DESCRIPTION = data.description
    process.env.INITIAL_DATA_DEFAULT_LANGUAGE = data.defaultLanguage
    process.env.INITIAL_DATA_DEFAULT_THEME = data.defaultTheme
    process.env.INITIAL_DATA_WALLETCONNECT_PROJECT_ID =
      data.walletConnectProjectId
    process.env.INITIAL_DATA_MAIL_TRANSPORT = data.mailTransport
    process.env.INITIAL_DATA_MAIL_FROM = data.mailFrom

    await knex.seed.run()

    result.push({
      step: "initialData",
      success: true,
      error: null,
    })
  } catch (error) {
    log.error("Failed to run database seeds:", error)
    // 抛出 InstallError，以便主处理程序可以捕获它
    throw new InstallError(error.message, "initialData")
  }

  return { result }
}

/**
 * GET /api/install
 * 检查系统是否已安装
 */
router.get("/install", async (request, reply) => {
  try {
    const isInstalled = await checkInstallLock()

    if (isInstalled) {
      const lockData = await getInstallLock()
      return reply.code(200).send({
        installed: true,
        installedAt: lockData?.installedAt || null,
      })
    }

    return reply.code(200).send({
      installed: false,
      installedAt: null,
    })
  } catch (error) {
    request.log.error("Error checking install status:", error)
    return reply.code(500).send({
      error: "Failed to check installation status",
    })
  }
})

/**
 * POST /api/install
 * 主路由：执行安装
 */
router.post("/install", async (request, reply) => {
  try {
    // --- 步骤 1: 检查是否已安装 (preCheck) ---
    const isInstalled = await checkInstallLock()
    if (isInstalled) {
      throw new InstallError(
        "Installation attempted but system is already installed",
        "preCheck",
      )
    }

    // --- 步骤 2: 验证请求 (preCheck) ---
    // 这个函数会抛出 InstallError 如果验证失败
    const { installData } = await validateInstallRequest(
      request.body,
      request.log,
    )

    request.log.info(
      {
        address: installData.address,
        url: installData.url,
        title: installData.title,
      },
      "Pre-check passed. Starting installation process",
    )

    // --- 步骤 3: 运行数据库迁移和填充 (initialSchema & initialData) ---
    // 这个函数会抛出 InstallError 如果数据库操作失败
    const { result } = await runDatabaseInstall(
      Model.knex(),
      installData,
      request.log,
    )

    // --- 步骤 4: 写入安装锁文件 ---
    try {
      await writeInstallLock()
    } catch (lockError) {
      // 如果写入锁文件失败，记录警告但不回滚（数据库已成功初始化）
      request.log.warn(
        "Installation completed but failed to write lock file:",
        lockError.message,
      )
    }

    // --- 步骤 5: 成功 ---
    request.log.info("Installation completed successfully")
    const _node = await Node.query().findOne({ is_self: true })

    reply.send({ result, node: _node })
  } catch (error) {
    // 统一的错误处理
    if (error instanceof InstallError) {
      // 捕获我们已知的安装错误 (preCheck, initialSchema, initialData 失败)
      request.log.error(
        {
          error: error.message,
          stack: error.stack,
          step: error.step,
        },
        "Installation failed",
      )
      reply.code(500).send({ result: error.toResult() })
    } else {
      // 捕获意外的服务器错误
      request.log.error(
        {
          error: error.message,
          stack: error.stack,
        },
        "An unexpected error occurred during installation",
      )
      // 返回一个通用的错误，标记为 preCheck 失败
      const unexpectedError = new InstallError(error.message, "preCheck")
      reply.code(500).send({ result: unexpectedError.toResult() })
    }
  }
})

export default router.plugin()
