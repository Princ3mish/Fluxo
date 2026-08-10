import { useState, useEffect, useRef } from 'react'
import { useWorkflowStore } from '../../store/workflowStore'
import { useStepRunsSubscription } from '../../hooks/useStepRunsSubscription'

interface TypeTheme {
  icon: string
  defaultLabel: string
  badgeBg: string
  badgeText: string
}

const TYPE_THEMES: Record<string, TypeTheme> = {
  llm_call: {
    icon: 'psychology',
    defaultLabel: 'LLM Call',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
  },
  http_request: {
    icon: 'http',
    defaultLabel: 'HTTP Request',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
  },
  db_write: {
    icon: 'database',
    defaultLabel: 'DB Write',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
  },
  notify: {
    icon: 'notifications',
    defaultLabel: 'Notify',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
  },
  conditional_branch: {
    icon: 'call_split',
    defaultLabel: 'Conditional Branch',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
  },
  approval_gate: {
    icon: 'verified_user',
    defaultLabel: 'Approval Gate',
    badgeBg: 'bg-accent/20',
    badgeText: 'text-accent',
  },
}

const STATUS_STYLE_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-slate-500/15 border-slate-500/30', text: 'text-slate-400', dot: 'bg-slate-400' },
  running: { bg: 'bg-accent/15 border-accent/30', text: 'text-accent', dot: 'bg-accent animate-pulse' },
  completed: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  failed: { bg: 'bg-rose-500/15 border-rose-500/30', text: 'text-rose-400', dot: 'bg-rose-500' },
  paused: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-400' },
}

export function ResultsDrawer() {
  const { nodes, currentWorkflowRunId, runError, runLogs } = useWorkflowStore()
  const { stepRuns } = useStepRunsSubscription()
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (currentWorkflowRunId || runError || runLogs.length > 0) {
      setIsExpanded(true)
    }
  }, [currentWorkflowRunId, runError, runLogs.length])

  useEffect(() => {
    if (isExpanded) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [runLogs.length, isExpanded])

  if (!currentWorkflowRunId && !runError && stepRuns.length === 0 && runLogs.length === 0) {
    return null
  }

  const totalCount = stepRuns.length
  const completedCount = stepRuns.filter((s) => s.status === 'completed').length
  const hasRunning = stepRuns.some((s) => s.status === 'running')
  const hasFailed = stepRuns.some((s) => s.status === 'failed')
  const hasPaused = stepRuns.some((sr) => {
    if (sr.status === 'paused') return true
    if (sr.status === 'pending') {
      const node = nodes.find((n) => n.id === sr.step_id)
      return node?.data?.stepType === 'approval_gate'
    }
    return false
  })
  const isFinished = totalCount > 0 && stepRuns.every((s) => s.status === 'completed' || s.status === 'failed' || s.status === 'paused')

  let summaryBadgeText = 'No runs yet'
  let summaryBadgeClass = 'bg-surface border-border/80 text-textSecondary'

  if (runError) {
    summaryBadgeText = 'Trigger Error'
    summaryBadgeClass = 'bg-rose-500/20 border-rose-500/40 text-rose-300'
  } else if (hasRunning) {
    summaryBadgeText = 'Running...'
    summaryBadgeClass = 'bg-accent/20 border-accent/40 text-accent animate-pulse'
  } else if (hasPaused) {
    summaryBadgeText = 'Execution Paused'
    summaryBadgeClass = 'bg-amber-500/20 border-amber-500/40 text-amber-300'
  } else if (hasFailed) {
    summaryBadgeText = `${completedCount}/${totalCount} completed (Failed)`
    summaryBadgeClass = 'bg-rose-500/20 border-rose-500/40 text-rose-300'
  } else if (totalCount > 0 && completedCount === totalCount) {
    summaryBadgeText = `${completedCount}/${totalCount} completed`
    summaryBadgeClass = 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
  } else if (totalCount > 0) {
    summaryBadgeText = `${completedCount}/${totalCount} completed`
    summaryBadgeClass = 'bg-surface border-border/80 text-textPrimary'
  } else if (runLogs.length > 0) {
    summaryBadgeText = 'Initializing...'
    summaryBadgeClass = 'bg-accent/20 border-accent/40 text-accent animate-pulse'
  }

  const lastStepRun = stepRuns.length > 0 ? stepRuns[stepRuns.length - 1] : null
  const lastNode = lastStepRun ? nodes.find((n) => n.id === lastStepRun.step_id) : null
  const lastStepType = (lastNode?.data?.stepType as string) || 'llm_call'

  let finalOutputText: string | null = null
  if (lastStepRun?.output) {
    if (typeof lastStepRun.output === 'string') {
      finalOutputText = lastStepRun.output
    } else if (typeof lastStepRun.output === 'object') {
      finalOutputText =
        lastStepRun.output.text ||
        lastStepRun.output.result ||
        lastStepRun.output.content ||
        lastStepRun.output.response ||
        lastStepRun.output.data ||
        null
    }
  }

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="fixed bottom-3 left-72 right-24 z-30 transition-all duration-300 ease-in-out">
      <div className="bg-surface/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-[0_12px_40px_rgba(8,12,24,0.7)] overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-background/40 transition-colors select-none group"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-accent">terminal</span>
            <span className="text-xs font-bold text-textPrimary tracking-tight">Run Results</span>
            <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${summaryBadgeClass}`}>
              {summaryBadgeText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-textSecondary group-hover:text-textPrimary transition-colors">
            <span className="text-[11px] font-medium uppercase tracking-wider">{isExpanded ? 'Collapse' : 'Expand'}</span>
            <span className="material-symbols-outlined text-[18px]">
              {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="max-h-80 overflow-y-auto border-t border-border/60 p-4 space-y-3 bg-background/50">
            {runLogs.length > 0 && (
              <div className="rounded-xl bg-black/80 border border-border/80 p-3 font-mono text-xs max-h-36 overflow-y-auto space-y-1 text-slate-300 shadow-inner">
                {runLogs.map((log) => {
                  const color =
                    log.type === 'error'
                      ? 'text-rose-400'
                      : log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warning'
                      ? 'text-amber-400'
                      : 'text-slate-300'
                  return (
                    <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                      <span className="text-slate-500 select-none">[{log.timestamp}]</span>
                      <span className={color}>{log.message}</span>
                    </div>
                  )
                })}
                <div ref={logEndRef} />
              </div>
            )}

            {runError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>Failed to start run: {runError}</span>
              </div>
            )}

            {isFinished && lastStepRun && (
              <div className="p-3.5 rounded-xl bg-surface border border-border/80 space-y-2 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-accent">auto_awesome</span>
                    Final Result ({lastStepRun.status})
                  </span>
                </div>
                {lastStepType === 'llm_call' && finalOutputText ? (
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-xs text-textPrimary font-sans leading-relaxed whitespace-pre-wrap">
                    {finalOutputText}
                  </div>
                ) : lastStepRun.output ? (
                  <pre className="p-3 rounded-lg bg-background border border-border/60 text-xs font-mono text-textPrimary overflow-x-auto">
                    {JSON.stringify(lastStepRun.output, null, 2)}
                  </pre>
                ) : lastStepRun.error ? (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono">
                    {lastStepRun.error}
                  </div>
                ) : (
                  <div className="text-xs text-textSecondary italic">No output produced</div>
                )}
              </div>
            )}

            {stepRuns.length > 0 && (
              <div className="space-y-2">
                {stepRuns.map((sr) => {
                  const node = nodes.find((n) => n.id === sr.step_id)
                  const stepType = (node?.data?.stepType as string) || 'llm_call'
                  const theme = TYPE_THEMES[stepType] || TYPE_THEMES.llm_call
                  const label = (node?.data?.label as string) || theme.defaultLabel
                  const statusStyle = STATUS_STYLE_MAP[sr.status] || STATUS_STYLE_MAP.pending
                  const isRowExpanded = expandedRowId === sr.id

                  return (
                    <div key={sr.id} className="rounded-xl border border-border/60 bg-surface/70 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleRow(sr.id)}
                        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-background/40 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${theme.badgeBg} ${theme.badgeText}`}>
                            <span className="material-symbols-outlined text-[14px]">{theme.icon}</span>
                          </div>
                          <span className="text-xs font-bold text-textPrimary truncate">{label}</span>
                          <span className="text-[10px] font-mono text-textSecondary uppercase">{stepType}</span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1.5 capitalize ${statusStyle.bg} ${statusStyle.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                            {sr.status}
                          </span>
                          <span className="material-symbols-outlined text-[16px] text-textSecondary">
                            {isRowExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </button>

                      {isRowExpanded && (
                        <div className="p-3 border-t border-border/40 bg-background/80 space-y-2">
                          {sr.error ? (
                            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-300">
                              {sr.error}
                            </div>
                          ) : sr.output ? (
                            <pre className="p-2.5 rounded-lg bg-background border border-border/60 text-xs font-mono text-textPrimary overflow-x-auto max-h-48">
                              {JSON.stringify(sr.output, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-xs text-textSecondary italic">No output data yet</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
