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
    table.integer("profile_version").notNullable().defaultTo(0)
    table.timestamp("created_at").defaultTo(knex.fn.now())
    table.timestamp("updated_at").defaultTo(knex.fn.now())
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
  })

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
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // 按照依赖关系的相反顺序删除表
  await knex.schema.dropTableIfExists("comments")
  await knex.schema.dropTableIfExists("connections")
  await knex.schema.dropTableIfExists("publications")
  await knex.schema.dropTableIfExists("contents")
  await knex.schema.dropTableIfExists("settings")
  await knex.schema.dropTableIfExists("nodes")
}
