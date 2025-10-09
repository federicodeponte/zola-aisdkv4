"use client"

import {
  MessageAction,
  MessageActions,
  Message as MessageContainer,
  MessageContent,
} from "@/components/prompt-kit/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Message as MessageType } from "@ai-sdk/react"
import { Check, Copy, Trash, XCircle } from "@phosphor-icons/react"
import { useMemo, useRef, useState } from "react"

import { AttachmentPreviewList } from "./attachment-preview"
import type { PendingQueueMessage } from "./use-chat-core"

export type MessageUserProps = {
  hasScrollAnchor?: boolean
  attachments?: MessageType["experimental_attachments"]
  children: string
  copied: boolean
  copyToClipboard: () => void
  onEdit: (id: string, newText: string) => void
  onReload: () => void
  onDelete: (id: string) => void
  id: string
  className?: string
  pendingQueueJobs: PendingQueueMessage[]
  onCancelQueuedJob: (queueId: string) => void
}

export function MessageUser({
  hasScrollAnchor,
  attachments,
  children,
  copied,
  copyToClipboard,
  onEdit,
  onReload,
  onDelete,
  id,
  className,
  pendingQueueJobs,
  onCancelQueuedJob,
}: MessageUserProps) {
  const [editInput, setEditInput] = useState(children)
  const [isEditing, setIsEditing] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const queueEntry = useMemo(
    () => pendingQueueJobs.find((job) => job.clientId === id),
    [pendingQueueJobs, id]
  )

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditInput(children)
  }

  const handleSave = () => {
    if (onEdit) {
      onEdit(id, editInput)
    }
    onReload()
    setIsEditing(false)
  }

  const handleDelete = () => {
    onDelete(id)
  }

  return (
    <MessageContainer
      className={cn(
        "group flex w-full max-w-3xl flex-col items-end gap-0.5 px-6 pb-2",
        hasScrollAnchor && "min-h-scroll-anchor",
        className
      )}
    >
      {queueEntry && (
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              queueEntry.status === "processing"
                ? "bg-amber-500/10 text-amber-600"
                : "bg-blue-500/10 text-blue-500"
            )}
          >
            <span className="inline-block size-2 rounded-full bg-current" />
            {queueEntry.status === "processing" ? "Processing" : "Queued"}
          </span>
          {queueEntry.queueId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCancelQueuedJob(queueEntry.queueId!)}
              className="h-6 px-2 text-xs"
            >
              <XCircle className="mr-1 size-3.5" />
              Cancel
            </Button>
          )}
        </div>
      )}
      <AttachmentPreviewList attachments={attachments} />
      {isEditing ? (
        <div
          className="bg-accent relative flex min-w-[180px] flex-col gap-2 rounded-3xl px-5 py-2.5"
          style={{
            width: contentRef.current?.offsetWidth,
          }}
        >
          <textarea
            className="w-full resize-none bg-transparent outline-none"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSave()
              }
              if (e.key === "Escape") {
                handleEditCancel()
              }
            }}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={handleEditCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <MessageContent
          className="bg-accent prose dark:prose-invert relative max-w-[70%] rounded-3xl px-5 py-2.5"
          markdown={true}
          ref={contentRef}
          components={{
            code: ({ children }) => <>{children}</>,
            pre: ({ children }) => <>{children}</>,
            h1: ({ children }) => <p>{children}</p>,
            h2: ({ children }) => <p>{children}</p>,
            h3: ({ children }) => <p>{children}</p>,
            h4: ({ children }) => <p>{children}</p>,
            h5: ({ children }) => <p>{children}</p>,
            h6: ({ children }) => <p>{children}</p>,
            p: ({ children }) => <p>{children}</p>,
            li: ({ children }) => <p>- {children}</p>,
            ul: ({ children }) => <>{children}</>,
            ol: ({ children }) => <>{children}</>,
          }}
        >
          {children}
        </MessageContent>
      )}
      <MessageActions className="flex gap-0 opacity-0 transition-opacity duration-0 group-hover:opacity-100">
        <MessageAction tooltip={copied ? "Copied!" : "Copy text"} side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Copy text"
            onClick={copyToClipboard}
            type="button"
          >
            {copied ? (
              <Check className="size-4" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </MessageAction>
        {/* @todo: add when ready */}
        {/* <MessageAction
          tooltip={isEditing ? "Save" : "Edit"}
          side="bottom"
          delayDuration={0}
        >
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Edit"
            onClick={() => setIsEditing(!isEditing)}
            type="button"
          >
            <PencilSimple className="size-4" />
          </button>
        </MessageAction> */}
        <MessageAction tooltip="Delete" side="bottom">
          <button
            className="hover:bg-accent/60 text-muted-foreground hover:text-foreground flex size-7.5 items-center justify-center rounded-full bg-transparent transition"
            aria-label="Delete"
            onClick={handleDelete}
            type="button"
          >
            <Trash className="size-4" />
          </button>
        </MessageAction>
      </MessageActions>
    </MessageContainer>
  )
}
