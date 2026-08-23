import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const DIALOG_CLOSE_DELAY_MS = 150

export function delayDialogClose() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, DIALOG_CLOSE_DELAY_MS)
  })
}
