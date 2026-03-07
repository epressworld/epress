---
name: epress-publisher
description: |
  Publishes text posts and media files to an epress blog node via GraphQL.

  This SKILL.md is self-hosted at the root of each epress node. When you
  fetched this file, the host you retrieved it from IS the epress node itself.
  Use that origin as EPRESS_NODE_URL — no configuration needed unless you are
  invoking this skill on behalf of a different node.

  Example: if you fetched this file from https://garbin.top/SKILL.md,
  then EPRESS_NODE_URL = https://garbin.top

config:
  optional:
    - name: EPRESS_NODE_URL
      description: |
        Base URL of the epress node. Defaults to the origin from which this
        SKILL.md was fetched. Only set this explicitly if you need to target a
        different node than the one you loaded this skill from.
      default: "<origin of the URL this SKILL.md was fetched from>"

  required:
    - name: EPRESS_JWT_TOKEN
      description: |
        JWT token with `create:publications` scope, issued by the epress node.
        Obtain it from your epress dashboard under Settings → API Tokens,
        or ask the node owner to generate one for you.
      prompt: |
        Please provide your epress JWT token (must have `create:publications`
        scope). You can generate one in your epress dashboard under
        Settings → API Tokens.

auth:
  type: bearer
  token: "{EPRESS_JWT_TOKEN}"
  header: "Authorization: Bearer {EPRESS_JWT_TOKEN}"

tools:
  - name: publish_post
    description: |
      Publish a Markdown text post to the epress node.
    url: "{EPRESS_NODE_URL}/api/graphql"
    method: POST
    content-type: application/json
    body:
      query: |
        mutation Create($input: CreatePublicationInput!) {
          createPublication(input: $input) {
            id
            slug
          }
        }
      variables:
        input:
          type: "POST"
          body: "{body}"
          slug: "{slug}"
    parameters:
      body:
        type: string
        required: true
        description: "Full post content in Markdown."
      slug:
        type: string
        required: true
        description: |
          URL-friendly identifier (lowercase letters, numbers, hyphens only).
          If the user has explicitly provided a slug, use it as-is (after
          validating format). If no slug was provided, auto-generate one from
          the post content. Never leave this empty. Follow the SLUG GENERATION
          rules in the notes section below.

  - name: publish_file
    description: |
      Upload and publish a media file (image, video, document, etc.)
      to the epress node. Uses multipart/form-data.
    url: "{EPRESS_NODE_URL}/api/graphql"
    method: POST
    content-type: multipart/form-data
    body:
      operations:
        query: |
          mutation Create($input: CreatePublicationInput!) {
            createPublication(input: $input) {
              id
              slug
            }
          }
        variables:
          input:
            type: "FILE"
            file: null
            description: "{description}"
            slug: "{slug}"
      map:
        "0": ["variables.input.file"]
      "0": "{file}"
    parameters:
      file:
        type: file
        required: true
        description: "The media file to upload."
      description:
        type: string
        required: true
        description: |
          Caption or description for the media file. REQUIRED — the server
          enforces this at runtime even though the GraphQL schema marks it
          optional. The request will fail with VALIDATION_FAILED if omitted.
          Rules: plain text only, no newlines, no unescaped quotes or special
          characters, max ~200 characters. If the user has not provided a
          description, ask before proceeding.
      slug:
        type: string
        required: true
        description: |
          URL-friendly identifier (lowercase letters, numbers, hyphens only).
          If the user has explicitly provided a slug, use it as-is (after
          validating format). If no slug was provided, auto-generate one from
          the file name or description. Never leave this empty. Follow the
          SLUG GENERATION rules in the notes section below.

notes:
  - |
    NODE URL INFERENCE: This SKILL.md is served from the epress node's own
    root path. The URL you used to fetch this file tells you the node's base
    URL. Parse the scheme + host (e.g. https://garbin.top) and use that as
    EPRESS_NODE_URL. Do NOT ask the user for this unless you cannot determine
    it from context.
  - |
    AUTHENTICATION: Always check that EPRESS_JWT_TOKEN is available before
    making any API call. If missing, ask the user to provide it. Never
    proceed without a valid token.
  - |
    POST vs FILE: Use `publish_post` for text/Markdown content. Use
    `publish_file` for binary media (images, PDFs, videos, etc.).
  - |
    SLUG GENERATION: A slug MUST always be provided when calling any tool —
    never omit it or let the server auto-generate one. Determine the slug
    using the following priority order:

    0. USER-PROVIDED SLUG (highest priority)
       - If the user has explicitly specified a slug, use it directly.
       - Still run it through VALIDATION (step 4) and correct only if it
         fails the format check, informing the user of any change made.
       - Skip steps 1–3 entirely.

    1. SOURCE FOR AUTO-GENERATION (when user provides no slug)
       - Read and understand the full content (post body, file description,
         or any context the user provided).
       - Summarize the core topic or intent into 3–5 meaningful English
         keywords, regardless of the original language. Always produce English
         — never use pinyin, romanization, or transliteration of non-Latin
         scripts. For example, a post titled "如何学习编程" should yield
         something like `how-to-learn-programming`, not `ru-he-xue-xi-bian-cheng`.
       - Prefer semantically descriptive words over generic ones
         (e.g. `deploy-docker-on-raspberry-pi` is better than `tech-post-guide`).

    2. TRANSFORMATION STEPS
       a. Write the chosen keywords in lowercase English.
       b. Join them with hyphens (-); remove all other punctuation.
       c. Remove any characters that are not [a-z0-9-].
       d. Collapse consecutive hyphens into one.
       e. Strip leading and trailing hyphens.
       f. Truncate to 60 characters maximum, cutting only at a hyphen boundary
          so words are not split mid-word.

    3. UNIQUENESS HINT: If the content contains a date or version number,
       append it (e.g. `my-post-2025-06-01`) to reduce collision risk.

    4. VALIDATION: The final slug MUST match /^[a-z0-9]+(-[a-z0-9]+)*$/.
       If it does not, revise until it does before calling the tool.

    5. TRANSPARENCY: Show the user the slug before publishing
       (e.g. "Publishing with slug: `my-slug`") so they can correct it if
       needed. Do not block on confirmation — proceed immediately unless
       the user objects.
  - |
    SUCCESS RESPONSE: On success the API returns `{ id, slug }`.
    Construct the public URL as follows:
    - If `slug` is present and non-empty: {EPRESS_NODE_URL}/publications/{slug}
    - Otherwise fall back to:            {EPRESS_NODE_URL}/publications/{id}
    Share this link with the user after a successful publish.
  - |
    ERROR HANDLING: If the API returns HTTP 401, the token is invalid or
    expired — prompt the user to regenerate it. If HTTP 403, the token lacks
    the required `create:publications` scope.
---