"use client"

import { Box, HStack, Text, VStack } from "@chakra-ui/react"
import { Link } from "@/components/ui"
import { NodeAvatar } from "./avatar"

/**
 * AuthorInfo - 作者/节点信息展示组件
 *
 * 用于展示作者或节点的信息,包括头像、名称、地址和描述
 * 这是一个高频复用的 UI 组件,用于统一作者信息的展示样式
 *
 * @param {Object} props
 * @param {Object} props.node - 节点/作者对象
 * @param {string} [props.node.url] - 节点 URL
 * @param {string} [props.node.title] - 节点标题/作者名称
 * @param {string} [props.node.address] - 节点地址
 * @param {string} [props.node.description] - 节点描述
 * @param {string} [props.size="md"] - 整体大小: "sm" | "md" | "lg"
 * @param {string} [props.avatarSize] - 头像大小,默认根据 size 自动设置
 * @param {boolean} [props.showAddress=true] - 是否显示地址
 * @param {boolean} [props.showDescription=false] - 是否显示描述
 * @param {boolean} [props.linkable=true] - 标题是否可点击跳转
 * @param {string} [props.layout="horizontal"] - 布局方式: "horizontal" | "vertical"
 * @param {Function} [props.onClick] - 点击事件(优先级高于 linkable)
 * @param {React.ReactNode} [props.actions] - 右侧操作按钮区域
 * @param {string} [props.className] - 额外的 CSS 类名
 *
 * @example
 * // 基本使用 - 水平布局
 * <AuthorInfo node={author} />
 *
 * @example
 * // 显示描述
 * <AuthorInfo node={author} showDescription />
 *
 * @example
 * // 垂直布局,带操作按钮
 * <AuthorInfo
 *   node={author}
 *   layout="vertical"
 *   actions={<FollowButton />}
 * />
 *
 * @example
 * // 小尺寸,不显示地址
 * <AuthorInfo
 *   node={author}
 *   size="sm"
 *   showAddress={false}
 * />
 */
export function AuthorInfo({
  node,
  size = "md",
  avatarSize,
  showAddress = true,
  showDescription = false,
  linkable = true,
  layout = "horizontal",
  onClick,
  actions,
  className,
  isOnline,
  ...props
}) {
  // 安全地获取节点信息
  const nodeUrl = node?.url
  const nodeTitle = node?.title || node?.address || "Unknown Node"
  const nodeAddress = node?.address
  const nodeDescription = node?.description

  // 根据 size 自动设置各部分大小
  const sizeConfig = {
    sm: {
      avatar: avatarSize || "sm",
      titleSize: "sm",
      addressSize: "xs",
      descriptionSize: "xs",
      gap: 2,
    },
    md: {
      avatar: avatarSize || "md",
      titleSize: "sm",
      addressSize: "xs",
      descriptionSize: "xs",
      gap: 3,
    },
    lg: {
      avatar: avatarSize || "lg",
      titleSize: "md",
      addressSize: "sm",
      descriptionSize: "sm",
      gap: 4,
    },
  }

  const config = sizeConfig[size] || sizeConfig.md

  // 渲染标题
  const renderTitle = () => {
    const titleElement = (
      <Text
        fontSize={config.titleSize}
        fontWeight="medium"
        noOfLines={1}
        color={linkable && nodeUrl ? "orange.500" : "inherit"}
        _hover={
          linkable && nodeUrl
            ? { color: "orange.600", textDecoration: "underline" }
            : {}
        }
      >
        {nodeTitle}
      </Text>
    )

    if (onClick) {
      return (
        <Box onClick={onClick} cursor="pointer">
          {titleElement}
        </Box>
      )
    }

    if (linkable && nodeUrl) {
      return (
        <Link href={nodeUrl} target="_blank" rel="noopener noreferrer">
          {titleElement}
        </Link>
      )
    }

    return titleElement
  }

  // 渲染节点信息
  const renderInfo = () => (
    <VStack gap={0} align="start" flex={1} minW={0}>
      <HStack align="start" gap={1} justify="space-between" w="full">
        {renderTitle()}
        {actions && actions}
      </HStack>
      {showAddress && nodeAddress && (
        <Text
          fontSize={config.addressSize}
          color="gray.500"
          _dark={{ color: "gray.400" }}
          fontFamily="mono"
          noOfLines={1}
          mt={0.5}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          maxW="100%"
        >
          {nodeAddress}
        </Text>
      )}
      {showDescription && nodeDescription && (
        <Text
          fontSize={config.descriptionSize}
          color="gray.500"
          _dark={{ color: "gray.400" }}
          noOfLines={2}
          mt={1}
        >
          {nodeDescription}
        </Text>
      )}
    </VStack>
  )

  // 水平布局
  if (layout === "horizontal") {
    return (
      <HStack
        gap={config.gap}
        align="start"
        w="full"
        className={className}
        {...props}
      >
        <NodeAvatar node={node} size={config.avatar} isOnline={isOnline} />
        {renderInfo()}
      </HStack>
    )
  }

  // 垂直布局
  return (
    <VStack gap={config.gap} align="center" className={className} {...props}>
      <NodeAvatar node={node} size={config.avatar} isOnline={isOnline} />
      <VStack gap={0} align="center" w="full">
        {renderTitle()}
        {showAddress && nodeAddress && (
          <Text
            fontSize={config.addressSize}
            color="gray.500"
            _dark={{ color: "gray.400" }}
            fontFamily="mono"
            noOfLines={1}
            textAlign="center"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            maxW="100%"
          >
            {nodeAddress}
          </Text>
        )}
        {showDescription && nodeDescription && (
          <Text
            fontSize={config.descriptionSize}
            color="gray.500"
            _dark={{ color: "gray.400" }}
            noOfLines={2}
            textAlign="center"
            mt={1}
          >
            {nodeDescription}
          </Text>
        )}
      </VStack>
      {actions && <Box w="full">{actions}</Box>}
    </VStack>
  )
}
