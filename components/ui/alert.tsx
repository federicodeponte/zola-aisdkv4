"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

const alertVariants = cva(
  "w-full rounded-lg border p-4 [&>svg]:text-foreground [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg+div]:pl-2 [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive", // style destructive state
        warning:
          "border-yellow-500/40 text-yellow-700 bg-yellow-50 dark:border-yellow-400/40 dark:bg-yellow-500/10 dark:text-yellow-300 [&>svg]:text-yellow-500", // warning variant for more granular states
        muted:
          "border-muted bg-muted/60 text-muted-foreground dark:bg-muted/30 [&>svg]:text-muted-foreground", // muted variant for low emphasis notices
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, role = "alert", ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5
      ref={ref}
      data-slot="alert-title"
      className={cn("mb-1 text-sm font-medium leading-none tracking-tight", className)}
      {...props}
    />
  )
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed", className)}
      {...props}
    />
  )
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertDescription, AlertTitle }

