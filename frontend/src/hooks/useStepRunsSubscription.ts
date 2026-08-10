import { useEffect, useRef } from 'react'
import { useSubscription } from 'urql'
import { useWorkflowStore } from '../store/workflowStore'
import type { StepStatus } from '../store/workflowStore'

export interface StepRunItem {
  id: string
  step_id: string
  status: StepStatus
  output?: any
  error?: string | null
  attempt_count?: number
  approved_by?: string | null
  approved_at?: string | null
  started_at?: string | null
  finished_at?: string | null
}

export const STEP_RUNS_LIVE_SUBSCRIPTION = `
  subscription StepRunsLive($workflow_run_id: uuid!) {
    step_runs(where: {workflow_run_id: {_eq: $workflow_run_id}}, order_by: {started_at: asc}) {
      id
      step_id
      status
      output
      error
      attempt_count
      approved_by
      approved_at
      started_at
      finished_at
    }
  }
`

export function useStepRunsSubscription(onRunComplete?: () => void) {
  const { currentWorkflowRunId, updateNodeStatus } = useWorkflowStore()
  const prevStepStates = useRef<Record<string, StepStatus>>({})
  const hasLoggedTerminal = useRef<string | null>(null)
  const hasLoggedPaused = useRef<string | null>(null)

  const [result] = useSubscription<{ step_runs: StepRunItem[] }>({
    query: STEP_RUNS_LIVE_SUBSCRIPTION,
    variables: { workflow_run_id: currentWorkflowRunId || '' },
    pause: !currentWorkflowRunId,
  })

  const stepRuns = result.data?.step_runs || []
  const pausedStepRun =
    stepRuns.find((sr) => sr.status === 'paused') ||
    stepRuns.find((sr) => {
      if (sr.status !== 'pending') return false
      const node = useWorkflowStore.getState().nodes.find((n) => n.id === sr.step_id)
      return node?.data?.stepType === 'approval_gate'
    }) ||
    null

  useEffect(() => {
    if (!currentWorkflowRunId) {
      prevStepStates.current = {}
      hasLoggedTerminal.current = null
      hasLoggedPaused.current = null
      return
    }

    if (stepRuns.length > 0) {
      const { nodes, addRunLog } = useWorkflowStore.getState()

      stepRuns.forEach((sr) => {
        if (!sr.step_id || !sr.status) return
        updateNodeStatus(sr.step_id, sr.status)

        const prevStatus = prevStepStates.current[sr.step_id]
        if (prevStatus !== sr.status) {
          prevStepStates.current[sr.step_id] = sr.status

          const node = nodes.find((n) => n.id === sr.step_id)
          const stepLabel = (node?.data?.label as string) || (node?.data?.stepType as string) || 'Step'

          let logMsg = `[${stepLabel}] status changed to ${sr.status}`
          let logType: 'info' | 'error' | 'success' | 'warning' = 'info'

          if (sr.status === 'completed') {
            logType = 'success'
            if (sr.output) {
              const rawStr = typeof sr.output === 'string' ? sr.output : JSON.stringify(sr.output)
              const preview = rawStr.length > 100 ? rawStr.slice(0, 100) + '...' : rawStr
              logMsg += ` — output: ${preview}`
            }
          } else if (sr.status === 'failed') {
            logType = 'error'
            if (sr.error) {
              logMsg += ` — error: ${sr.error}`
            }
          } else if (sr.status === 'paused') {
            logType = 'warning'
          } else if (sr.status === 'running') {
            logType = 'info'
          }

          addRunLog(logMsg, logType)
        }
      })

      const pausedStep =
        stepRuns.find((sr) => sr.status === 'paused') ||
        stepRuns.find((sr) => {
          if (sr.status !== 'pending') return false
          const node = nodes.find((n) => n.id === sr.step_id)
          return node?.data?.stepType === 'approval_gate'
        })
      if (pausedStep && hasLoggedPaused.current !== currentWorkflowRunId) {
        hasLoggedPaused.current = currentWorkflowRunId
        const node = nodes.find((n) => n.id === pausedStep.step_id)
        const stepLabel = (node?.data?.label as string) || (node?.data?.stepType as string) || 'Approval Gate'
        addRunLog(`Run paused — awaiting approval on step: ${stepLabel}`, 'warning')
      }

      const allTerminal = stepRuns.every(
        (sr) => sr.status === 'completed' || sr.status === 'failed',
      )
      if (allTerminal && stepRuns.length > 0 && hasLoggedTerminal.current !== currentWorkflowRunId) {
        hasLoggedTerminal.current = currentWorkflowRunId
        const anyFailed = stepRuns.some((sr) => sr.status === 'failed')
        const overallStatus = anyFailed ? 'failed' : 'completed'
        addRunLog(`Run finished — overall status: ${overallStatus}`, anyFailed ? 'error' : 'success')
        if (onRunComplete) {
          onRunComplete()
        }
      }
    }
  }, [stepRuns, currentWorkflowRunId, updateNodeStatus, onRunComplete])

  return { stepRuns, pausedStepRun, fetching: result.fetching, error: result.error }
}
