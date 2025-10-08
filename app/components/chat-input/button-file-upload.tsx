import {
  FileUpload,
  FileUploadContent,
  FileUploadTrigger,
} from "@/components/prompt-kit/file-upload"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getModelInfo } from "@/lib/models"
import { isSupabaseEnabled } from "@/lib/supabase/config"
import { cn } from "@/lib/utils"
import { FileArrowUp, Paperclip } from "@phosphor-icons/react"
import React from "react"
import { PopoverContentAuth } from "./popover-content-auth"

type ButtonFileUploadProps = {
  onFileUpload: (files: File[]) => void
  isUserAuthenticated: boolean
  model: string
}

export function ButtonFileUpload({
  onFileUpload,
  isUserAuthenticated,
  model,
}: ButtonFileUploadProps) {
  // Temporarily allow file uploads without Supabase for testing heavy tools
  // if (!isSupabaseEnabled) {
  //   return null
  // }

  // Allow file uploads for all models - CSV processing doesn't require vision
  const isFileUploadAvailable = true

  // Temporarily allow unauthenticated uploads for testing
  // if (!isUserAuthenticated) {
  //   return (
  //     <Popover>
  //       <Tooltip>
  //         <TooltipTrigger asChild>
  //           <PopoverTrigger asChild>
  //             <Button
  //               size="sm"
  //               variant="secondary"
  //               className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
  //               type="button"
  //               aria-label="Add files"
  //             >
  //               <Paperclip className="size-4" />
  //             </Button>
  //           </PopoverTrigger>
  //         </TooltipTrigger>
  //         <TooltipContent>Add files</TooltipContent>
  //       </Tooltip>
  //       <PopoverContentAuth />
  //     </Popover>
  //   )
  // }

  return (
    <FileUpload
      onFilesAdded={onFileUpload}
      multiple
      disabled={false}
      accept=".txt,.md,.csv,image/jpeg,image/png,image/gif,image/webp,image/svg,image/heic,image/heif"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <FileUploadTrigger asChild>
            <Button
              size="sm"
              variant="secondary"
              className="border-border dark:bg-secondary size-9 rounded-full border bg-transparent"
              type="button"
              disabled={false}
              aria-label="Add files"
            >
              <Paperclip className="size-4" />
            </Button>
          </FileUploadTrigger>
        </TooltipTrigger>
        <TooltipContent>Add files</TooltipContent>
      </Tooltip>
      <FileUploadContent>
        <div className="border-input bg-background flex flex-col items-center rounded-lg border border-dashed p-8">
          <FileArrowUp className="text-muted-foreground size-8" />
          <span className="mt-4 mb-1 text-lg font-medium">Drop files here</span>
          <span className="text-muted-foreground text-sm">
            Drop any files here to add it to the conversation
          </span>
        </div>
      </FileUploadContent>
    </FileUpload>
  )
}
