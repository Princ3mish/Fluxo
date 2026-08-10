import { useMutation } from 'urql'
import { useWorkflowStore } from '../../store/workflowStore'
import type { StepRunItem } from '../../hooks/useStepRunsSubscription'
import { Button } from '../ui/Button'

export const APPROVE_STEP_MUTATION = `
  mutation ApproveStep($workflow_run_id: uuid!, $approved: Boolean!) {
    approveStep(workflow_run_id: $workflow_run_id, approved: $approved) {
      workflow_run_id
      status
    }
  }
`

interface ApprovalBannerProps {
  pausedStepRun: StepRunItem | null
  stepName?: string
  userRole?: string | null
}

export function ApprovalBanner({ pausedStepRun, stepName = 'Approval Gate', userRole }: ApprovalBannerProps) {
  const { currentWorkflowRunId } = useWorkflowStore()
  const [{ fetching }, executeApproveStep] = useMutation(APPROVE_STEP_MUTATION)

  if (!pausedStepRun || !currentWorkflowRunId) {
    return null
  }

  const canApprove = userRole === 'owner' || userRole === 'editor'

  const handleDecision = async (approved: boolean) => {
    await executeApproveStep({
      workflow_run_id: currentWorkflowRunId,
      approved,
    })
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-surface/95 backdrop-blur-md border border-amber-500/40 rounded-2xl px-6 py-3.5 shadow-[0_12px_32px_rgba(8,12,24,0.75)] flex items-center gap-6 animate-in fade-in slide-in-from-top-3 duration-200 ease-out select-none">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
          <span className="material-symbols-outlined text-[20px]">pause_circle</span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-textPrimary tracking-tight">Execution Paused at {stepName}</h4>
          <p className="text-[11px] text-textSecondary leading-normal">Human intervention required to resume or abort</p>
        </div>
      </div>

      {canApprove ? (
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="success"
            icon="check"
            disabled={fetching}
            onClick={() => handleDecision(true)}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="danger"
            icon="close"
            disabled={fetching}
            onClick={() => handleDecision(false)}
          >
            Reject
          </Button>
        </div>
      ) : (
        <div className="text-xs text-amber-400/90 font-medium italic bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
          Awaiting approval from an owner or editor
        </div>
      )}
    </div>
  )
}
