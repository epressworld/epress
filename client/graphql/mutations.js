import { gql } from "@apollo/client"

// Publication mutations
export const SIGN_PUBLICATION = gql`
  mutation SignPublication($id: ID!, $signature: String!) {
    signPublication(id: $id, signature: $signature) {
      id
      signature
      content {
        content_hash
      }
    }
  }
`

export const DESTROY_PUBLICATION = gql`
  mutation DestroyPublication($id: ID!) {
    destroyPublication(id: $id) {
      id
      content {
        content_hash
      }
    }
  }
`

export const CREATE_PUBLICATION = gql`
  mutation CreatePublication($input: CreatePublicationInput!) {
    createPublication(input: $input) {
      id
      signature
      created_at
      description
      comment_count
      updated_at
      author {
        address
        url
        description
        title
        is_self
        created_at
        updated_at
      }
      content {
        content_hash
        filename
        type
        body
        mimetype
        size
      }
    }
  }
`

export const UPDATE_PUBLICATION = gql`
  mutation UpdatePublication($input: UpdatePublicationInput!) {
    updatePublication(input: $input) {
      id
      signature
      created_at
      updated_at
      description
      content {
        content_hash
        type
        body
        mimetype
        size
      }
    }
  }
`

// Connection mutations
export const CREATE_CONNECTION = gql`
  mutation CreateConnection($typedData: JSON!, $signature: String!) {
    createConnection(typedData: $typedData, signature: $signature) {
      address
      title
      description
    }
  }
`

export const DESTROY_CONNECTION = gql`
  mutation DestroyConnection($typedData: JSON!, $signature: String!) {
    destroyConnection(typedData: $typedData, signature: $signature) {
      address
      title
      description
    }
  }
`

// Authentication mutations
export const SIGN_IN_WITH_ETHEREUM = gql`
  mutation SignInWithEthereum($message: String!, $signature: String!) {
    signInWithEthereum(message: $message, signature: $signature)
  }
`

// Profile mutations
export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      address
      url
      title
      description
      profile_version
    }
  }
`

export const BROADCAST_PROFILE_UPDATE = gql`
  mutation BroadcastProfileUpdate($typedData: JSON!, $signature: String!) {
    broadcastProfileUpdate(typedData: $typedData, signature: $signature)
  }
`

// Settings mutations
export const UPDATE_SETTINGS = gql`
  mutation UpdateSettings($input: UpdateSettingsInput!) {
    updateSettings(input: $input) {
      enableRSS
      allowFollow
      allowComment
    }
  }
`

// Comment mutations
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      body
      status
      auth_type
      commenter_username
      commenter_address
      created_at
    }
  }
`

export const DESTROY_COMMENT = gql`
  mutation DestroyComment($id: ID!, $signature: String, $email: String) {
    destroyComment(id: $id, signature: $signature, email: $email) {
      id
      body
      status
      auth_type
      commenter_username
      created_at
    }
  }
`

export const CONFIRM_COMMENT = gql`
  mutation ConfirmComment($id: ID, $tokenOrSignature: String!) {
    confirmComment(id: $id, tokenOrSignature: $tokenOrSignature) {
      id
      body
      status
      auth_type
      commenter_username
      created_at
      publication {
        id
      }
    }
  }
`

export const CONFIRM_COMMENT_DELETION = gql`
  mutation ConfirmCommentDeletion($token: String!) {
    confirmCommentDeletion(token: $token) {
      id
      body
      status
      auth_type
      commenter_username
      created_at
      publication {
        id
      }
    }
  }
`

// Token generation mutation
export const GENERATE_INTEGRATION_TOKEN = gql`
  mutation GenerateIntegrationToken($scope: [String!]!, $expiresIn: String) {
    generateIntegrationToken(scope: $scope, expiresIn: $expiresIn)
  }
`
