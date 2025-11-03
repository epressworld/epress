/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  // 创建节点表
  await knex.schema.createTable("nodes", (table) => {
    table.string("address").primary().notNullable().unique()
    table.string("url").notNullable().unique()
    table.string("title").notNullable()
    table.string("description")
    table.boolean("is_self").notNullable().defaultTo(false)
    table.timestamp("created_at").defaultTo(knex.fn.now())
    table.timestamp("updated_at").defaultTo(knex.fn.now())

    // 索引：优化 "WHERE is_self = true" 查询
    table.index("is_self")
  })

  // 创建设置表
  await knex.schema.createTable("settings", (table) => {
    table.string("key").primary()
    table.text("value")
  })

  // 创建内容表
  await knex.schema.createTable("contents", (table) => {
    table.string("content_hash").primary()
    table.string("type").notNullable()
    table.text("body").nullable()
    table.string("filename").nullable()
    table.string("mimetype").nullable()
    table.bigInteger("size").nullable()
    table.string("local_path").nullable()
    table.timestamp("created_at").defaultTo(knex.fn.now())

    // 索引：优化按类型查询 (e.g., WHERE type = 'post')
    table.index("type")
  })

  // 创建发布表
  await knex.schema.createTable("publications", (table) => {
    table.increments("id").primary()
    table
      .string("content_hash")
      .notNullable()
      .references("content_hash")
      .inTable("contents")
    table
      .string("author_address")
      .notNullable()
      .references("address")
      .inTable("nodes")
    table.string("signature").nullable()
    table.integer("comment_count").nullable().defaultTo(0)
    table.text("description").nullable()
    table.timestamp("created_at").defaultTo(knex.fn.now())
    table.timestamp("updated_at").defaultTo(knex.fn.now())

    // 索引：外键索引，加速 JOIN 和按作者查询
    table.index("author_address")
    // 索引：外键索引，加速 JOIN
    table.index("content_hash")
    // 索引：优化按时间排序 (ORDER BY created_at DESC)
    table.index("created_at")
  })

  // 创建hashtags表
  await knex.schema.createTable("hashtags", (table) => {
    table.increments("id").primary()
    // unique() 约束会自动创建一个唯一索引，无需额外添加 table.index("hashtag")
    table.string("hashtag").notNullable().unique()
    table.timestamp("created_at").defaultTo(knex.fn.now())
  })

  // 创建publication2hashtag连接表
  await knex.schema.createTable("publication2hashtag", (table) => {
    table.increments("id").primary()
    table
      .integer("publication_id")
      .notNullable()
      .references("id")
      .inTable("publications")
      .onDelete("CASCADE")
    table
      .integer("hashtag_id")
      .notNullable()
      .references("id")
      .inTable("hashtags")
      .onDelete("CASCADE")
    table.timestamp("created_at").defaultTo(knex.fn.now())

    // 确保同一个publication不会重复关联同一个hashtag
    table.unique(["publication_id", "hashtag_id"])

    // 索引：优化 "查询某个publication的所有hashtag"
    table.index("publication_id")
    // 索引：优化 "查询某个hashtag下的所有publication" (非常重要)
    table.index("hashtag_id")
  })

  // --- 原有的独立索引块已合并到上面的 createTable 中 ---
  // (原: await knex.schema.table("publication2hashtag", ...))
  // (原: await knex.schema.table("hashtags", ...)) -> 已移除，因为 unique() 自动创建索引

  // 创建连接表
  await knex.schema.createTable("connections", (table) => {
    table.increments("id").primary()
    table
      .string("follower_address")
      .notNullable()
      .references("address")
      .inTable("nodes")
    table
      .string("followee_address")
      .notNullable()
      .references("address")
      .inTable("nodes")
    table.timestamp("created_at").defaultTo(knex.fn.now())

    // 索引：优化 "查询我关注了谁" (WHERE follower_address = ?)
    // 同时 unique 约束防止重复关注
    table.unique(["follower_address", "followee_address"])
    // 索引：优化 "查询谁关注了我" (WHERE followee_address = ?)
    table.index("followee_address")
  })

  // 创建评论表
  await knex.schema.createTable("comments", (table) => {
    table.increments("id").primary()
    table
      .integer("publication_id")
      .notNullable()
      .references("id")
      .inTable("publications")
    table.text("body").notNullable()
    table.string("status").notNullable()
    table.string("auth_type").notNullable()
    table.string("author_name").notNullable()
    table.string("author_id").notNullable()
    table.text("credential").nullable()
    table.timestamp("created_at").defaultTo(knex.fn.now())
    table.timestamp("updated_at").defaultTo(knex.fn.now())

    // 复合索引：极大优化 "查询某篇publication下的评论并按时间排序"
    // (WHERE publication_id = ? ORDER BY created_at DESC)
    table.index(["publication_id", "created_at"])
    // 索引：优化按状态查询 (e.g., WHERE status = 'approved')
    table.index("status")
    // 索引：优化按作者ID查询
    table.index("author_id")
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // 按照依赖关系的相反顺序删除表
  // down 函数不需要更改，dropTableIfExists 会自动删除表及其所有索引
  await knex.schema.dropTableIfExists("comments")
  await knex.schema.dropTableIfExists("connections")
  await knex.schema.dropTableIfExists("publication2hashtag")
  await knex.schema.dropTableIfExists("hashtags")
  await knex.schema.dropTableIfExists("publications")
  await knex.schema.dropTableIfExists("contents")
  await knex.schema.dropTableIfExists("settings")
  await knex.schema.dropTableIfExists("nodes")
}
