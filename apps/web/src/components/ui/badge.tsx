import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    tone: {
      info: 'bg-zinc-700/40 text-zinc-300',
      low: 'bg-sky-500/15 text-sky-300',
      medium: 'bg-amber-500/15 text-amber-300',
      high: 'bg-orange-500/15 text-orange-300',
      critical: 'bg-red-500/15 text-red-300',
      neutral: 'bg-zinc-700/40 text-zinc-300',
      success: 'bg-emerald-500/15 text-emerald-300',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
