import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'

export interface StepNodeData extends Record<string, unknown> {
  stepType: string
  label?: string
  status?: StepStatus
  config?: Record<string, any>
}

export type StepCustomNode = Node<StepNodeData, string>

interface TypeTheme {
  icon: string
  defaultLabel: string
  stripeColor: string
  badgeBg: string
  badgeText: string
  borderColor: string
}

const TYPE_THEMES: Record<string, TypeTheme> = {
  llm_call: {
    icon: 'psychology',
    defaultLabel: 'LLM Call',
    stripeColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
    borderColor: 'border-purple-500/80',
  },
  http_request: {
    icon: 'http',
    defaultLabel: 'HTTP Request',
    stripeColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
    borderColor: 'border-blue-500/80',
  },
  db_write: {
    icon: 'database',
    defaultLabel: 'DB Write',
    stripeColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
    borderColor: 'border-emerald-500/80',
  },
  notify: {
    icon: 'notifications',
    defaultLabel: 'Notify',
    stripeColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
    borderColor: 'border-amber-500/80',
  },
  conditional_branch: {
    icon: 'call_split',
    defaultLabel: 'Conditional Branch',
    stripeColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    borderColor: 'border-cyan-500/80',
  },
  approval_gate: {
    icon: 'verified_user',
    defaultLabel: 'Approval Gate',
    stripeColor: 'bg-accent',
    badgeBg: 'bg-accent/20',
    badgeText: 'text-accent',
    borderColor: 'border-accent/80',
  },
}

const STATUS_COLOR_MAP: Record<StepStatus, string> = {
  pending: 'bg-slate-400',
  running: 'bg-accent animate-pulse-ring ring-2 ring-accent/50',
  completed: 'bg-emerald-400 ring-2 ring-emerald-400/30',
  failed: 'bg-rose-500 ring-2 ring-rose-500/30',
  paused: 'bg-amber-400 ring-2 ring-amber-400/30',
}

export const StepNode = memo(({ data, selected }: NodeProps<StepCustomNode>) => {
  const stepType = (data?.stepType as string) || 'llm_call'
  const theme = TYPE_THEMES[stepType] || TYPE_THEMES.llm_call
  const label = (data?.label as string) || theme.defaultLabel
  const status: StepStatus = (data?.status as StepStatus) || 'pending'
  const statusClass = STATUS_COLOR_MAP[status] || STATUS_COLOR_MAP.pending

  return (
    <div
      className={`w-60 rounded-xl bg-surface border transition-all duration-200 ease-out select-none relative overflow-visible group ${
        selected
          ? 'border-accent ring-2 ring-accent/60 shadow-[0_8px_30px_rgba(234,75,113,0.3)] -translate-y-0.5'
          : 'border-border/80 hover:border-textSecondary/50 shadow-[0_4px_18px_rgba(8,12,24,0.45)] hover:shadow-[0_8px_24px_rgba(8,12,24,0.6)]'
      }`}
    >
      <div className={`absolute top-0 bottom-0 left-0 w-1.5 rounded-l-xl ${theme.stripeColor}`} />

      <Handle
        type="target"
        position={Position.Left}
        className="!w-4 !h-4 !bg-accent !border-2 !border-surface !-left-2 transition-transform duration-150 hover:!scale-125 !opacity-90 group-hover:!opacity-100 !cursor-crosshair shadow-sm z-10"
      />

      <div className="pl-4 pr-3.5 py-3 flex items-center justify-between border-b border-border/60 bg-background/30 rounded-t-xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${theme.badgeBg} ${theme.badgeText} shadow-sm`}>
            <span className="material-symbols-outlined text-[16px]">{theme.icon}</span>
          </div>
          <span className="text-xs font-bold text-textPrimary truncate tracking-tight">{label}</span>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusClass} transition-colors duration-200`} title={`Status: ${status}`} />
      </div>

      <div className="pl-4 pr-3.5 py-2.5 flex items-center justify-between bg-surface/50 rounded-b-xl">
        <span className="text-[10px] font-mono text-textSecondary uppercase tracking-wider font-semibold">
          {stepType}
        </span>
        <span className="text-[10px] text-textSecondary/70 font-medium capitalize">
          {status}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-4 !h-4 !bg-accent !border-2 !border-surface !-right-2 transition-transform duration-150 hover:!scale-125 !opacity-90 group-hover:!opacity-100 !cursor-crosshair shadow-sm z-10"
      />
    </div>
  )
})
