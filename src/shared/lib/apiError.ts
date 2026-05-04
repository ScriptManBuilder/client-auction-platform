import axios from 'axios'

interface ApiErrorPayload {
  message?: string
  Message?: string
  detail?: string
  title?: string
  errors?: Record<string, string[]> | string[]
}

function flattenValidationErrors(errors: ApiErrorPayload['errors']) {
  if (!errors) {
    return null
  }

  if (Array.isArray(errors)) {
    return errors.join(', ')
  }

  return Object.values(errors)
    .flat()
    .join(', ')
}

export function getApiErrorStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.status
  }

  return undefined
}

// Reads backend error payloads and returns a user-friendly message for the UI.
export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallbackMessage
  }

  const payload = error.response?.data
  const validationText = flattenValidationErrors(payload?.errors)

  if (validationText) {
    return validationText
  }

  if (payload?.Message) {
    return payload.Message
  }

  if (payload?.message) {
    return payload.message
  }

  if (payload?.detail) {
    return payload.detail
  }

  if (payload?.title) {
    return payload.title
  }

  if (error.response?.status === 403) {
    return 'Access denied. You do not have permission for this action.'
  }

  if (error.response?.status === 401) {
    return 'Session expired. Please sign in again.'
  }

  return fallbackMessage
}
