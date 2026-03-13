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
      slug
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
      slug
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
      created_at
      updated_at
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
      defaultLanguage
      defaultTheme
      walletConnectProjectId
      enableRSS
      allowFollow
      allowComment
    }
  }
`

// Push Notification mutations
export const SUBSCRIBE_NOTIFICATION = gql`
  mutation SubscribeNotification($subscription: PushSubscriptionInput!) {
    subscribeNotification(subscription: $subscription) {
      success
      message
    }
  }
`
export const UNSUBSCRIBE_NOTIFICATION = gql`
  mutation UnsubscribeNotification($endpoint: String!) {
    unsubscribeNotification(endpoint: $endpoint) {
      success
      message
    }
  }
`

// Comment mutations
export const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      body
      author_name
      author_address
      created_at
      publication {
        id
        slug
      }
    }
  }
`
export const DESTROY_COMMENT = gql`
  mutation DestroyComment($id: ID!, $signature: String) {
    destroyComment(id: $id, signature: $signature) {
      id
      body
      author_name
      created_at
    }
  }
`

// Token generation mutation
export const GENERATE_INTEGRATION_TOKEN = gql`
  mutation GenerateIntegrationToken($scope: [String!]!, $expiresIn: String) {
    generateIntegrationToken(scope: $scope, expiresIn: $expiresIn)
  }
`
