"use client"

import {
  useLocale,
  useFormatter as useNextIntlFormatter,
  useNow,
  useTranslations,
} from "next-intl"

/**
 * Unified i18n hook for epress
 * Combines translations and formatting in one hook
 *
 * Usage:
 * const { t, formatDate, formatRelativeTime, locale } = useIntl()
 *
 * // Translation with namespace - preserves all next-intl functionality
 * t('common')('confirm')
 * t('navigation')('home')
 * t('common')('searchResultsCount', { count: 5, keyword: 'test' })
 *
 * @returns {object} - Translation and formatting functions
 */
export function useIntl() {
  const format = useNextIntlFormatter()
  const locale = useLocale()
  const t = useTranslations()
  const now = useNow()

  /**
   * Translation function with namespace support
   * Returns the next-intl translation function for the specified namespace
   * This preserves all next-intl functionality including rich text, plurals, etc.
   */

  return {
    // Translation function
    t,

    // Current locale
    locale,

    // Date formatting functions
    formatDate: (date, options = {}) => {
      const dateObj = date instanceof Date ? date : new Date(date)
      return format.dateTime(dateObj, {
        year: "numeric",
        month: "long",
        day: "numeric",
        ...options,
      })
    },

    formatDateTime: (date, options = {}) => {
      const dateObj = date instanceof Date ? date : new Date(date)
      return format.dateTime(dateObj, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        ...options,
      })
    },

    formatRelativeTime: (date, _now) => {
      // Handle different date formats
      let dateObj
      if (date instanceof Date) {
        dateObj = date
      } else if (typeof date === "number") {
        // Unix timestamp (seconds or milliseconds)
        dateObj = date < 10000000000 ? new Date(date * 1000) : new Date(date)
      } else if (typeof date === "string") {
        // ISO string or other string format
        dateObj = new Date(date)
      } else {
        dateObj = new Date(date)
      }

      // format.relativeTime(date, now) returns "X ago" for past dates
      // e.g. if date is 45 seconds ago, it returns "45 seconds ago"
      return format.relativeTime(dateObj, _now || now)
    },

    // Number formatting
    formatNumber: (number, options = {}) => {
      return format.number(number, options)
    },

    // Timestamp formatting (for backward compatibility)
    formatTimestamp: (timestamp) => {
      const date = new Date(timestamp * 1000)
      return format.dateTime(date, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    },

    formatDateOnly: (date) => {
      const dateObj = date instanceof Date ? date : new Date(date)
      return format.dateTime(dateObj, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    },

    formatTimeOnly: (date) => {
      const dateObj = date instanceof Date ? date : new Date(date)
      return format.dateTime(dateObj, {
        hour: "2-digit",
        minute: "2-digit",
      })
    },
  }
}
