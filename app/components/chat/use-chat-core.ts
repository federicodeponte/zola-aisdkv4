import { useChatDraft } from "@/app/hooks/use-chat-draft"
import { toast } from "@/components/ui/toast"
import { getOrCreateGuestUserId } from "@/lib/api"
import { MESSAGE_MAX_LENGTH, SYSTEM_PROMPT_DEFAULT } from "@/lib/config"
import { Attachment } from "@/lib/file-handling"
import {
  API_ROUTE_CHAT,
  API_ROUTE_PROMPT_QUEUE_CANCEL,
  API_ROUTE_PROMPT_QUEUE_ENQUEUE,
  API_ROUTE_PROMPT_QUEUE_STATUS,
} from "@/lib/routes"
import type { UserProfile } from "@/lib/user/types"
import type { Message } from "@ai-sdk/react"
import { useChat } from "@ai-sdk/react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

type UseChatCoreProps = {
  initialMessages: Message[]
  draftValue: string
  cacheAndAddMessage: (message: Message) => void
  chatId: string | null
  user: UserProfile | null
  files: File[]
  createOptimisticAttachments: (
    files: File[]
  ) => Array<{ name: string; contentType: string; url: string }>
  setFiles: (files: File[]) => void
  checkLimitsAndNotify: (uid: string) => Promise<boolean>
  cleanupOptimisticAttachments: (attachments?: Array<{ url?: string }>) => void
  ensureChatExists: (uid: string, input: string) => Promise<string | null>
  handleFileUploads: (
    uid: string,
    chatId: string
  ) => Promise<Attachment[] | null>
  selectedModel: string
  clearDraft: () => void
  bumpChat: (chatId: string) => void
}

const QUEUE_STATUS_POLL_INTERVAL = 1500
const MAX_QUEUE_POLL_FAILURES = 5

interface QueueStatusResponse {
  success: boolean
  queue: Array<{
    id: string
    status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  }>
  error?: string
}

export interface PendingQueueMessage {
  clientId: string
  queueId?: string
  status: "pending" | "processing"
  content: string
  createdAt: Date
  optimisticAttachments?: ReturnType<UseChatCoreProps["createOptimisticAttachments"]>
}

async function postJson<TResponse>(url: string, body: unknown, init?: RequestInit) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(body),
    ...init,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.error || payload?.message || "Request failed"
    throw new Error(message)
  }

  return (await response.json()) as TResponse
}

export function useChatCore({
  initialMessages,
  draftValue,
  cacheAndAddMessage,
  chatId,
  user,
  files,
  createOptimisticAttachments,
  setFiles,
  checkLimitsAndNotify,
  cleanupOptimisticAttachments,
  ensureChatExists,
  handleFileUploads,
  selectedModel,
  clearDraft,
  bumpChat,
}: UseChatCoreProps) {
  // State management
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const enableSearch = true
  const [pendingQueueJobs, setPendingQueueJobs] = useState<PendingQueueMessage[]>([])
  const pendingQueueJobsRef = useRef<PendingQueueMessage[]>([])
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollFailureCountRef = useRef(0)

  const updatePendingQueueJobs = useCallback(
    (updater: (prev: PendingQueueMessage[]) => PendingQueueMessage[]) => {
      setPendingQueueJobs((prev) => {
        const next = updater(prev)
        pendingQueueJobsRef.current = next
        return next
      })
    },
    [],
  )

  // Refs and derived state
  const hasSentFirstMessageRef = useRef(false)
  const prevChatIdRef = useRef<string | null>(chatId)
  const isAuthenticated = useMemo(() => !!user?.id, [user?.id])
  const systemPrompt = useMemo(
    () => user?.system_prompt || SYSTEM_PROMPT_DEFAULT,
    [user?.system_prompt]
  )

  // Search params handling
  const searchParams = useSearchParams()
  const prompt = searchParams.get("prompt")

  // Handle errors directly in onError callback
  const handleError = useCallback((error: Error) => {
    console.error("Chat error:", error)
    console.error("Error message:", error.message)
    let errorMsg = error.message || "Something went wrong."

    if (errorMsg === "An error occurred" || errorMsg === "fetch failed") {
      errorMsg = "Something went wrong. Please try again."
    }

    toast({
      title: errorMsg,
      status: "error",
    })
  }, [])

  // Initialize useChat
  const {
    messages,
    input,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setMessages,
    setInput,
    append,
  } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages,
    initialInput: draftValue,
    onFinish: cacheAndAddMessage,
    onError: handleError,
  })

  // Handle search params on mount
  useEffect(() => {
    if (prompt && typeof window !== "undefined") {
      requestAnimationFrame(() => setInput(prompt))
    }
  }, [prompt, setInput])

  // Reset messages when navigating from a chat to home
  useEffect(() => {
    if (
      prevChatIdRef.current !== null &&
      chatId === null &&
      messages.length > 0
    ) {
      setMessages([])
    }

    prevChatIdRef.current = chatId
  }, [chatId, messages.length, setMessages])

  const clearPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    pollFailureCountRef.current = 0
  }

  useEffect(() => {
    if (!pendingQueueJobs.length) {
      clearPolling()
    }
  }, [pendingQueueJobs.length])

  // Submit action
  const submit = useCallback(async () => {
    setIsSubmitting(true)

    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      setIsSubmitting(false)
      return
    }

    const optimisticId = `optimistic-${Date.now().toString()}`
    const optimisticAttachments = files.length > 0 ? createOptimisticAttachments(files) : []

    const optimisticMessage: Message = {
      id: optimisticId,
      content: input,
      role: "user",
      createdAt: new Date(),
      experimental_attachments:
        optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
    }

    setMessages((prev) => [...prev, optimisticMessage])
    const queueMessage: PendingQueueMessage = {
      clientId: optimisticId,
      status: "pending",
      content: input,
      createdAt: new Date(),
      optimisticAttachments,
    }
    updatePendingQueueJobs((prev) => [...prev, queueMessage])
    setInput("")

    const submittedFiles = [...files]
    setFiles([])

    try {
      const allowed = await checkLimitsAndNotify(uid)
      if (!allowed) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        updatePendingQueueJobs((prev) => prev.filter((item) => item.clientId !== optimisticId))
        return
      }

      const currentChatId = await ensureChatExists(uid, input)
      if (!currentChatId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        updatePendingQueueJobs((prev) => prev.filter((item) => item.clientId !== optimisticId))
        return
      }

      if (input.length > MESSAGE_MAX_LENGTH) {
        toast({
          title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
          status: "error",
        })
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      updatePendingQueueJobs((prev) => prev.filter((item) => item.clientId !== optimisticId))
        return
      }

      let attachments: Attachment[] | null = []
      if (submittedFiles.length > 0) {
        attachments = await handleFileUploads(uid, currentChatId)
        if (attachments === null) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
          cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
          updatePendingQueueJobs((prev) => prev.filter((item) => item.clientId !== optimisticId))
          return
        }
      }

      const enqueueResponse = await postJson<{
        success: boolean
        queue?: { id: string; status: string }
        error?: string
      }>(API_ROUTE_PROMPT_QUEUE_ENQUEUE, {
        userId: uid,
        chatId: currentChatId,
        model: selectedModel,
        isAuthenticated,
        systemPrompt,
        enableSearch,
        messages: messages.concat({
          id: optimisticId,
          role: "user",
          content: input,
        }),
        attachments,
      })

      if (!enqueueResponse.success || !enqueueResponse.queue?.id) {
        throw new Error(enqueueResponse.error || "Failed to enqueue prompt")
      }

      updatePendingQueueJobs((prev) =>
        prev.map((item) =>
          item.clientId === optimisticId
            ? {
                ...item,
                queueId: enqueueResponse.queue!.id,
                status: enqueueResponse.queue!.status === "processing" ? "processing" : "pending",
              }
            : item
        )
      )

      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          try {
            const activeJobs = pendingQueueJobsRef.current
            if (!activeJobs.length) {
              clearPolling()
              return
            }

            const queueIds = activeJobs
              .map((job) => job.queueId)
              .filter((id): id is string => typeof id === "string" && id.length > 0)

            if (!queueIds.length) {
              return
            }

            const statusResponse = await postJson<QueueStatusResponse>(API_ROUTE_PROMPT_QUEUE_STATUS, {
              userId: uid,
              isAuthenticated,
              queueIds,
            })

            if (!statusResponse.success) {
              throw new Error(statusResponse.error || "Failed to fetch queue status")
            }

            const completed = statusResponse.queue.filter((job) => job.status === "completed")
            const failed = statusResponse.queue.filter((job) => job.status === "failed" || job.status === "cancelled")

            if (completed.length || failed.length) {
              const completedIds = new Set(completed.map((job) => job.id))
              const failedIds = new Set(failed.map((job) => job.id))

              updatePendingQueueJobs((prev) =>
                prev.filter((job) => {
                  if (!job.queueId) return true
                  if (failedIds.has(job.queueId)) {
                    toast({ title: "Queued message failed", status: "error" })
                    return false
                  }
                  if (completedIds.has(job.queueId)) {
                    return false
                  }
                  return true
                })
              )

              if (completed.length) {
                reload({
                  body: {
                    chatId: currentChatId,
                    userId: uid,
                    model: selectedModel,
                    isAuthenticated,
                    systemPrompt,
                  },
                })
              }
            }
          } catch (error) {
            pollFailureCountRef.current += 1
            console.error("Failed to poll queue status", error)
            if (pollFailureCountRef.current >= MAX_QUEUE_POLL_FAILURES) {
              clearPolling()
              toast({
                title: "Queue updates paused",
                description: "Stopped polling after repeated failures.",
                status: "warning",
              })
            }
          }
        }, QUEUE_STATUS_POLL_INTERVAL)
      }

      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      cacheAndAddMessage(optimisticMessage)
      clearDraft()

      if (messages.length > 0) {
        bumpChat(currentChatId)
      }
    } catch (error) {
      console.error("Failed to process queued submit", error)
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      updatePendingQueueJobs((prev) => prev.filter((item) => item.clientId !== optimisticId))
      toast({ title: "Failed to queue message", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    user,
    files,
    createOptimisticAttachments,
    input,
    setMessages,
    setInput,
    setFiles,
    checkLimitsAndNotify,
    cleanupOptimisticAttachments,
    ensureChatExists,
    handleFileUploads,
    selectedModel,
    isAuthenticated,
    systemPrompt,
    enableSearch,
    cacheAndAddMessage,
    clearDraft,
    messages,
    bumpChat,
    reload,
  ])

  useEffect(() => () => clearPolling(), [])

  // Handle suggestion
  const handleSuggestion = useCallback(
    async (suggestion: string) => {
      setIsSubmitting(true)
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimisticMessage = {
        id: optimisticId,
        content: suggestion,
        role: "user" as const,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      try {
        const uid = await getOrCreateGuestUserId(user)

        if (!uid) {
          setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
          return
        }

        const allowed = await checkLimitsAndNotify(uid)
        if (!allowed) {
          setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
          return
        }

        const currentChatId = await ensureChatExists(uid, suggestion)

        if (!currentChatId) {
          setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
          return
        }

        const options = {
          body: {
            chatId: currentChatId,
            userId: uid,
            model: selectedModel,
            isAuthenticated,
            systemPrompt: SYSTEM_PROMPT_DEFAULT,
          },
        }

        append(
          {
            role: "user",
            content: suggestion,
          },
          options
        )
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      } catch {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        toast({ title: "Failed to send suggestion", status: "error" })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      ensureChatExists,
      selectedModel,
      user,
      append,
      checkLimitsAndNotify,
      isAuthenticated,
      setMessages,
      setIsSubmitting,
    ]
  )

  // Handle reload
  const handleReload = useCallback(async () => {
    const uid = await getOrCreateGuestUserId(user)
    if (!uid) {
      return
    }

    const options = {
      body: {
        chatId,
        userId: uid,
        model: selectedModel,
        isAuthenticated,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      },
    }

    reload(options)
  }, [user, chatId, selectedModel, isAuthenticated, systemPrompt, reload])

  // Handle input change - now with access to the real setInput function!
  const { setDraftValue } = useChatDraft(chatId)
  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
      setDraftValue(value)
    },
    [setInput, setDraftValue]
  )

  const handleCancelQueuedJob = useCallback(
    async (queueId: string) => {
    updatePendingQueueJobs((prev) => prev.filter((job) => job.queueId !== queueId))

    try {
      await postJson<{ success: boolean; error?: string }>(API_ROUTE_PROMPT_QUEUE_CANCEL, {
        queueId,
        userId: user?.id,
        isAuthenticated,
      })
    } catch (error) {
        console.error("Failed to cancel queue job", error)
        toast({ title: "Failed to cancel job", status: "error" })
      }
    }, [isAuthenticated, user?.id])

  return {
    // Chat state
    messages,
    input,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setMessages,
    setInput,
    append,
    isAuthenticated,
    systemPrompt,
    hasSentFirstMessageRef,

    // Component state
    isSubmitting,
    setIsSubmitting,
    hasDialogAuth,
    setHasDialogAuth,
    enableSearch,
    pendingQueueJobs,

    // Actions
    submit,
    handleSuggestion,
    handleReload,
    handleInputChange,
    handleCancelQueuedJob,
  }
}
