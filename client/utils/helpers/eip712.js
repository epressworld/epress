// EIP-712 签名工具函数

// 创建连接的EIP-712数据结构
export const createConnectionTypedData = (
  followeeAddress,
  followeeUrl,
  followerUrl,
  timestamp,
) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "CreateConnection",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      CreateConnection: [
        { name: "followeeAddress", type: "address" },
        { name: "followeeUrl", type: "string" },
        { name: "followerUrl", type: "string" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    message: {
      followeeAddress,
      followeeUrl,
      followerUrl,
      timestamp,
    },
  }
}

// 删除连接的EIP-712数据结构
export const deleteConnectionTypedData = (
  followeeAddress,
  followerAddress,
  timestamp,
) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "DeleteConnection",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      DeleteConnection: [
        { name: "followeeAddress", type: "address" },
        { name: "followerAddress", type: "address" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    message: {
      followeeAddress,
      followerAddress,
      timestamp,
    },
  }
}

// 内容签名的EIP-712数据结构
export const statementOfSourceTypedData = (
  contentHash,
  publisherAddress,
  timestamp,
) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "StatementOfSource",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      StatementOfSource: [
        { name: "contentHash", type: "bytes32" },
        { name: "publisherAddress", type: "address" },
        { name: "timestamp", type: "uint64" },
      ],
    },
    message: {
      contentHash,
      publisherAddress,
      timestamp: timestamp, // 必须传入 publication.created_at 的时间戳
    },
  }
}

// 评论签名的EIP-712数据结构
export const commentSignatureTypedData = (
  nodeEthereumAddress,
  commenterEthereumAddress,
  publicationId,
  commentBodyHash,
  timestamp,
) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "CommentSignature",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      CommentSignature: [
        { name: "nodeAddress", type: "address" },
        { name: "commenterAddress", type: "address" },
        { name: "publicationId", type: "uint256" },
        { name: "commentBodyHash", type: "bytes32" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    message: {
      nodeAddress: nodeEthereumAddress,
      commenterAddress: commenterEthereumAddress,
      publicationId: publicationId,
      commentBodyHash: commentBodyHash,
      timestamp: timestamp,
    },
  }
}

// 删除评论的EIP-712数据结构
export const deleteCommentTypedData = (
  nodeEthereumAddress,
  commentId,
  commenterEthereumAddress,
) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "DeleteComment",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      DeleteComment: [
        { name: "nodeAddress", type: "address" },
        { name: "commentId", type: "uint256" },
        { name: "commenterAddress", type: "address" },
      ],
    },
    message: {
      nodeAddress: nodeEthereumAddress,
      commentId: commentId,
      commenterAddress: commenterEthereumAddress,
    },
  }
}

// 节点Profile更新的EIP-712数据结构
export const nodeProfileUpdateTypedData = (
  publisherAddress,
  url,
  title,
  description,
  timestamp,
) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "NodeProfileUpdate",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      NodeProfileUpdate: [
        { name: "publisherAddress", type: "address" },
        { name: "url", type: "string" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "timestamp", type: "uint256" },
      ],
    },
    message: {
      publisherAddress,
      url,
      title,
      description,
      timestamp,
    },
  }
}

// 安装
export const installTypedData = (node, settings, timestamp) => {
  return {
    domain: {
      name: "epress world",
      version: "1",
      chainId: 1,
    },
    primaryType: "DATA",
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
      ],
      DATA: [
        { name: "node", type: "Node" },
        { name: "settings", type: "Settings" },
        { name: "timestamp", type: "uint256" },
      ],
      Node: [
        { name: "avatar", type: "string" },
        { name: "address", type: "string" },
        { name: "url", type: "string" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
      ],
      Settings: [
        { name: "defaultLanguage", type: "string" },
        { name: "defaultTheme", type: "string" },
        { name: "walletConnectProjectId", type: "string" },
        { name: "mailTransport", type: "string" },
        { name: "mailFrom", type: "string" },
      ],
    },
    message: {
      node,
      settings,
      timestamp,
    },
  }
}

// 使用钱包签名EIP-712数据
export const signTypedData = async (walletClient, account, typedData) => {
  try {
    const signature = await walletClient.signTypedData({
      account,
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: typedData.message,
    })
    return signature
  } catch (error) {
    console.error("签名失败:", error)
    throw error
  }
}
