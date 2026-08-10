import React, { useMemo, useCallback } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react'
import { NodePalette } from './NodePalette'
import { StepNode } from './StepNode'
import { StepConfigPanel } from './StepConfigPanel'
import { ApprovalBanner } from './ApprovalBanner'
import { ResultsDrawer } from './ResultsDrawer'
import { useWorkflowStore } from '../../store/workflowStore'
import { useStepRunsSubscription } from '../../hooks/useStepRunsSubscription'
import { useOrg } from '../../context/OrgContext'

interface WorkflowCanvasProps {
  userRole?: string | null
  onRunComplete?: () => void
}

export function WorkflowCanvas({ userRole: propUserRole, onRunComplete }: WorkflowCanvasProps) {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const addNode = useWorkflowStore((s) => s.addNode)
  const selectNode = useWorkflowStore((s) => s.selectNode)
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange)
  const onConnect = useWorkflowStore((s) => s.onConnect)

  const { currentOrgId, myOrgs } = useOrg()
  const currentMember = myOrgs.find((o) => o.org_id === currentOrgId)
  const effectiveRole = propUserRole || currentMember?.role || (myOrgs.length > 0 ? myOrgs[0].role : null)

  const { pausedStepRun } = useStepRunsSubscription(onRunComplete)

  const pausedNode = nodes.find((n) => n.id === pausedStepRun?.step_id)
  const pausedStepName =
    (pausedNode?.data?.label as string) ||
    (pausedNode?.data?.stepType as string) ||
    'Approval Gate'

  const { screenToFlowPosition } = useReactFlow()

  const nodeTypes = useMemo(
    () => ({
      llm_call: StepNode,
      http_request: StepNode,
      db_write: StepNode,
      notify: StepNode,
      conditional_branch: StepNode,
      approval_gate: StepNode,
    }),
    [],
  )

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const stepType = event.dataTransfer.getData('application/reactflow')
    if (!stepType) return

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    addNode(stepType, position)
  }

  const handleNodeClick = useCallback((_: React.MouseEvent, node: { id: string }) => {
    selectNode(node.id)
  }, [selectNode])

  const handlePaneClick = useCallback(() => {
    selectNode(null)
  }, [selectNode])

  return (
    <div className="flex flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden relative">
      <NodePalette />

      <main className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
        <ApprovalBanner
          pausedStepRun={pausedStepRun}
          stepName={pausedStepName}
          userRole={effectiveRole}
        />

        {nodes.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none select-none animate-in fade-in duration-300">
            <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-surface/40 backdrop-blur-[2px] border border-border/40 max-w-sm text-center shadow-[0_8px_32px_rgba(8,12,24,0.3)]">
              <div className="w-12 h-12 rounded-xl bg-surface border border-border/80 flex items-center justify-center text-accent shadow-inner">
                <span className="material-symbols-outlined text-[24px]">drag_indicator</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-textPrimary tracking-tight">Canvas is empty</h3>
                <p className="text-xs text-textSecondary mt-1 leading-relaxed">
                  Drag a step from the library on the left or click + to start building
                </p>
              </div>
            </div>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
          proOptions={proOptions}
          className="bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#334155"
          />
          <Controls className="!bg-surface/95 !backdrop-blur !border-border/80 !rounded-xl !shadow-[0_4px_20px_rgba(8,12,24,0.5)] [&>button]:!bg-surface [&>button]:!border-border/80 [&>button]:!fill-textPrimary [&>button:hover]:!bg-background/80 transition-all" />
          <MiniMap
            className="!bg-surface/95 !backdrop-blur !border-border/80 !rounded-xl !shadow-[0_4px_20px_rgba(8,12,24,0.5)]"
            nodeColor="#EA4B71"
            maskColor="rgba(15, 23, 42, 0.8)"
          />
        </ReactFlow>

        <ResultsDrawer />
      </main>

      <StepConfigPanel />
    </div>
  )
}
