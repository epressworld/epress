import { gql } from "@apollo/client"

const segments = {
  profile: `
    address
    url
    title
    description
    profile_version
  `,
  node: `
    address
    url
    title
    description
    is_self
    created_at
    updated_at
  `,
  content: `
    content_hash
    type
    body
    filename
    mimetype
    size
  `,
  publication: `
    id
    description
    author {
      address
      url
      title
      description
      is_self
      created_at
      updated_at
    }
    content {
      content_hash
      type
      body
      filename
      mimetype
      size
    }
    signature
    comment_count
    created_at
    updated_at
  `,
  comment: `
    id
    publication {
      content_hash
    }
    body
    status
    auth_type
    commenter_username
    commenter_address
    commenter {
      url
      title
      description
    }
    created_at
  `,
  connection: `
    id
    follower {
      address
      url
      title
      description
    }
    followee {
      address
      url
      title
      description
    }
    created_at
    updated_at
    signature
  `,
}

// 搜索查询
export const SEARCH_PUBLICATIONS = gql`
  query SearchPublications($filterBy: JSON, $orderBy: String, $first: Int, $after: String) {
    search(
      type: PUBLICATION
      filterBy: $filterBy
      orderBy: $orderBy
      first: $first
      after: $after
    ) {
      total
      edges {
        cursor
        node {
          ... on Publication {
            ${segments.publication}
          }
        }
      }
      pageInfo {
        hasNextPage

        startCursor
        endCursor
      }
    }
  }
`

export const SEARCH_COMMENTS = gql`
  query SearchComments($filterBy: JSON, $orderBy: String, $first: Int, $after: String) {
    search(
      type: COMMENT
      filterBy: $filterBy
      orderBy: $orderBy
      first: $first
      after: $after
    ) {
      total
      edges {
        cursor
        node {
          ... on Comment {
            ${segments.comment}
          }
        }
      }
      pageInfo {
        hasNextPage

        startCursor
        endCursor
      }
    }
  }
`

export const SEARCH_NODES = gql`
  query SearchNodes($filterBy: JSON, $orderBy: String, $first: Int, $after: String) {
    search(
      type: NODE
      filterBy: $filterBy
      orderBy: $orderBy
      first: $first
      after: $after
    ) {
      total
      edges {
        cursor
        node {
          ... on Node {
            ${segments.node}
          }
        }
      }
      pageInfo {
        hasNextPage

        startCursor
        endCursor
      }
    }
  }
`

// 单独的查询 - 现在分别在服务器端和客户端使用
export const IS_FOLLOWER = gql`
  query IsFollower($address: String!) {
    isFollower(address: $address)
  }
`

export const PROFILE = gql`
  query Profile {
    profile {
      address
      url
      title
      description
      profile_version
      created_at
    }
  }
`

export const GET_SIWE_MESSAGE = gql`
  query GetSiweMessage($address: String!) {
    getSiweMessage(address: $address)
  }
`

export const SETTINGS = gql`
  query Settings {
    settings {
      enableRSS
      allowFollow
      allowComment
    }
  }
`

export const NODE_STATUS = gql`
  query NodeStatus {
    nodeStatus {
      version
      startedAt
    }
  }
`

export const FETCH = gql`
  query Fetch($type: FetchType!, $id: ID!) {
    fetch(type: $type, id: $id) {
      ... on Node {
        ${segments.node}
      }
      ... on Publication {
        ${segments.publication}
      }
      ... on Comment {
        ${segments.comment}
      }
    }
  }
`

export const PAGE_DATA = gql`
  query PageData {
    settings {
      enableRSS
      allowFollow
      allowComment
    }
    profile {
      address
      url
      title
      description
      profile_version
      created_at
    }
    nodeStatus {
      version
      startedAt
    }
  }`
