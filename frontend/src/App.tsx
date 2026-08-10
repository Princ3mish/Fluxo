import { useState, useEffect } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import { useMutation, useQuery, useSubscription } from 'urql'
import { useUserId } from '@nhost/react'
import nhost from './lib/nhost'
import { AuthGate } from './components/AuthGate'
import { OrgProvider, useOrg } from './context/OrgContext'
import { WorkflowCanvas } from './components/canvas/WorkflowCanvas'
import { useWorkflowStore } from './store/workflowStore'
import { Button } from './components/ui/Button'
import { Logo } from './components/ui/Logo'

const CREATE_WORKFLOW_MUTATION = `
  mutation CreateWorkflow($org_id: uuid!, $name: String!, $created_by: uuid!) {
    insert_workflows_one(object: {org_id: $org_id, name: $name, created_by: $created_by}) {
      id
    }
  }
`

const ADD_WORKFLOW_STEP_MUTATION = `
  mutation AddWorkflowStep($workflow_id: uuid!, $step_order: Int!, $type: String!, $config: jsonb!) {
    insert_workflow_steps_one(object: {workflow_id: $workflow_id, step_order: $step_order, type: $type, config: $config}) {
      id
    }
  }
`

const ADD_WORKFLOW_TRIGGER_MUTATION = `
  mutation AddWorkflowTrigger($workflow_id: uuid!, $type: String!, $config: jsonb!) {
    insert_workflow_triggers_one(object: {workflow_id: $workflow_id, type: $type, config: $config}) {
      id
    }
  }
`

const TRIGGER_WORKFLOW_RUN_MUTATION = `
  mutation TriggerRun($workflow_id: uuid!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      workflow_run_id
      status
    }
  }
`

const GET_ORG_QUOTA_QUERY = `
  query GetOrgQuota($org_id: uuid!) {
    organizations_by_pk(id: $org_id) {
      quota_used
      quota_limit
    }
  }
`

const ORG_QUOTA_SUBSCRIPTION = `
  subscription OrgQuotaLive($org_id: uuid!) {
    organizations_by_pk(id: $org_id) {
      quota_used
      quota_limit
    }
  }
`

function MainLayout() {
  const { currentOrgId, setCurrentOrgId, myOrgs } = useOrg()
  const currentUserId = useUserId()
  const {
    nodes,
    edges,
    selectedNodeId,
    workflowName,
    setWorkflowName,
    currentWorkflowId,
    setCurrentWorkflowId,
    setCurrentWorkflowRunId,
    setRunError,
    addRunLog,
    clearRunLogs,
    setNodes,
    setEdges,
    selectNode,
  } = useWorkflowStore()

  const [isSaving, setIsSaving] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(null)
  const [resolvedRole, setResolvedRole] = useState<string | null>(null)
  const [resolvedOrgName, setResolvedOrgName] = useState<string | null>(null)
  const [isLoadingOrg, setIsLoadingOrg] = useState(true)

  const [, createWorkflow] = useMutation(CREATE_WORKFLOW_MUTATION)
  const [, addWorkflowStep] = useMutation(ADD_WORKFLOW_STEP_MUTATION)
  const [, addWorkflowTrigger] = useMutation(ADD_WORKFLOW_TRIGGER_MUTATION)
  const [, triggerRun] = useMutation(TRIGGER_WORKFLOW_RUN_MUTATION)

  const activeOrgId = resolvedOrgId || currentOrgId

  useEffect(() => {
    let isMounted = true
    async function fetchOrgInfo() {
      setIsLoadingOrg(true)
      let token: string | null = null
      for (let attempt = 0; attempt < 10; attempt++) {
        token = nhost.auth.getAccessToken() ?? null
        if (token) break
        await new Promise((r) => setTimeout(r, 200))
      }
      const userId = nhost.auth.getUser()?.id || currentUserId
      if (!token || !userId) {
        if (isMounted) setIsLoadingOrg(false)
        return
      }
      try {
        const endpoint = import.meta.env.VITE_HASURA_GRAPHQL_ENDPOINT || ''
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `query GetUserOrg($user_id: uuid!) {
              org_members(where: {user_id: {_eq: $user_id}}) {
                org_id
                role
                organization {
                  name
                }
              }
            }`,
            variables: { user_id: userId },
          }),
        })
        const json = await res.json()
        const members = json.data?.org_members || []
        if (members.length > 0 && isMounted) {
          const ownerRow = members.find((o: any) => o.role === 'owner')
          const editorRow = members.find((o: any) => o.role === 'editor')
          const best = ownerRow ?? editorRow ?? members[0]
          if (best.org_id) setResolvedOrgId(best.org_id)
          if (best.role) setResolvedRole(best.role)
          if (best.organization?.name) setResolvedOrgName(best.organization.name)
        }
      } catch (err) {
        console.error('Failed to fetch org on mount:', err)
      } finally {
        if (isMounted) setIsLoadingOrg(false)
      }
    }
    fetchOrgInfo()
    return () => { isMounted = false }
  }, [currentUserId])

  const [quotaSubResult] = useSubscription({
    query: ORG_QUOTA_SUBSCRIPTION,
    variables: { org_id: activeOrgId || '' },
    pause: !activeOrgId,
  })

  const [{ data: quotaData }, refetchQuota] = useQuery({
    query: GET_ORG_QUOTA_QUERY,
    variables: { org_id: activeOrgId || '' },
    pause: !activeOrgId,
    requestPolicy: 'network-only',
  })

  const quotaUsed =
    quotaSubResult.data?.organizations_by_pk?.quota_used ??
    quotaData?.organizations_by_pk?.quota_used ??
    0
  const quotaLimit =
    quotaSubResult.data?.organizations_by_pk?.quota_limit ??
    quotaData?.organizations_by_pk?.quota_limit ??
    1000

  const currentOrg = myOrgs.find((o) => o.org_id === activeOrgId)
  const userRole = resolvedRole || currentOrg?.role || null
  const isViewer = userRole === 'viewer'
  const canRun =
    (userRole === 'owner' || userRole === 'editor') &&
    Boolean(currentWorkflowId)
  const displayOrgName = isLoadingOrg
    ? 'Loading...'
    : currentOrg?.organization?.name || resolvedOrgName || 'Organization'

  const handleSaveWorkflow = async () => {
    setSaveError(null)
    if (isSaving) return

    let targetOrgId = resolvedOrgId || currentOrgId
    if (isLoadingOrg) {
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise((r) => setTimeout(r, 300))
        targetOrgId = resolvedOrgId || currentOrgId
        if (targetOrgId) break
      }
    }

    if (!targetOrgId) {
      setSaveError('No organization found for current user')
      return
    }

    const userId = nhost.auth.getUser()?.id || currentUserId
    if (!userId) {
      setSaveError('Not signed in')
      return
    }

    setIsSaving(true)
    try {
      const res = await createWorkflow({
        org_id: targetOrgId,
        name: workflowName || 'Untitled Workflow',
        created_by: userId,
      })

      if (res.error) {
        setSaveError(res.error.message)
        return
      }

      const workflowId = res.data?.insert_workflows_one?.id
      if (workflowId) {
        const idMap: Record<string, string> = {}
        const updatedNodes = [...nodes]
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          const stepRes = await addWorkflowStep({
            workflow_id: workflowId,
            step_order: i + 1,
            type: node.data.stepType,
            config: node.data.config || {},
          })
          if (stepRes.error) {
            setSaveError(stepRes.error.message)
            return
          }
          const stepId = stepRes.data?.insert_workflow_steps_one?.id
          if (stepId) {
            idMap[node.id] = stepId
            updatedNodes[i] = { ...updatedNodes[i], id: stepId }
          }
        }
        setNodes(updatedNodes)

        if (Object.keys(idMap).length > 0) {
          const updatedEdges = edges.map((edge) => {
            const newSource = idMap[edge.source] || edge.source
            const newTarget = idMap[edge.target] || edge.target
            return {
              ...edge,
              id: `xy-edge__${newSource}-${newTarget}`,
              source: newSource,
              target: newTarget,
            }
          })
          setEdges(updatedEdges)

          if (selectedNodeId && idMap[selectedNodeId]) {
            selectNode(idMap[selectedNodeId])
          }
        }

        const trigRes = await addWorkflowTrigger({
          workflow_id: workflowId,
          type: 'manual',
          config: {},
        })
        if (trigRes.error) {
          setSaveError(trigRes.error.message)
          return
        }

        setCurrentWorkflowId(workflowId)
      }
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.error('Failed to save workflow:', msg)
      setSaveError(msg)
    } finally {
      setIsSaving(false)
    }
  }

  const handleRunWorkflow = async () => {
    if (!currentWorkflowId || isRunning || !canRun) return
    setIsRunning(true)
    setRunError(null)
    clearRunLogs()
    addRunLog('Starting workflow run...', 'info')

    try {
      const res = await triggerRun({ workflow_id: currentWorkflowId })
      if (res.error) {
        const errorMsg = res.error.message || 'Failed to trigger workflow run'
        setRunError(errorMsg)
        addRunLog(`Run failed to start: ${errorMsg}`, 'error')
        return
      }
      const runId = res.data?.triggerWorkflowRun?.workflow_run_id
      if (runId) {
        setCurrentWorkflowRunId(runId)
        addRunLog(`Run started — workflow_run_id: ${runId}, waiting for step execution...`, 'success')
      } else {
        const errorMsg = 'No workflow_run_id returned from server'
        setRunError(errorMsg)
        addRunLog(`Run failed to start: ${errorMsg}`, 'error')
      }
    } catch (err: any) {
      const errorMsg = err?.message || String(err)
      console.error('Failed to trigger workflow run:', err)
      setRunError(errorMsg)
      addRunLog(`Run failed to start: ${errorMsg}`, 'error')
    } finally {
      setIsRunning(false)
    }
  }


  return (
    <div className="flex flex-col h-screen w-screen bg-background text-textPrimary overflow-hidden font-sans select-none">
      <header className="h-14 bg-surface/95 backdrop-blur-md border-b border-border/80 px-5 flex items-center justify-between z-30 shrink-0 shadow-[0_4px_20px_rgba(8,12,24,0.4)]">
        <div className="flex items-center gap-4">
          <Logo size="sm" />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-background/70 border border-border/80 text-xs text-textSecondary shadow-sm hover:border-border transition-colors">
            <span className="material-symbols-outlined text-[15px] text-accent">corporate_fare</span>
            {myOrgs.length > 1 ? (
              <div className="flex items-center">
                <select
                  value={activeOrgId || ''}
                  onChange={(e) => setCurrentOrgId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-textPrimary focus:outline-none cursor-pointer pr-1 appearance-none"
                >
                  {myOrgs.map((org) => (
                    <option key={org.org_id} value={org.org_id} className="bg-surface text-textPrimary">
                      {org.organization.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined text-[16px] text-textSecondary pointer-events-none">expand_more</span>
              </div>
            ) : (
              <span className="font-medium text-textPrimary">{displayOrgName}</span>
            )}
          </div>

          <div className="h-4 w-px bg-border/60" />

          <div className="flex items-center">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Untitled Workflow"
              className="bg-transparent text-sm font-bold text-textPrimary placeholder:text-textSecondary/50 hover:bg-surface/50 px-2.5 py-1 rounded-lg border border-transparent focus:border-border/80 focus:bg-surface/90 focus:outline-none transition-all duration-150 w-52 font-sans tracking-tight"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-textSecondary bg-background/60 px-3.5 py-1.5 rounded-full border border-border/60 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium text-[11px]">
              {quotaUsed} / {quotaLimit} calls
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="surface"
                icon="save"
                disabled={isSaving}
                onClick={handleSaveWorkflow}
              >
                Save Workflow
              </Button>
              {isSaving && (
                <span className="text-xs text-accent font-medium animate-pulse">
                  Saving...
                </span>
              )}
            </div>
            {saveError && (
              <div className="flex items-center gap-1.5 text-[11px] text-rose-400 font-medium max-w-xs text-right leading-tight">
                <span className="material-symbols-outlined text-[13px] shrink-0">error</span>
                <span>{saveError}</span>
              </div>
            )}
          </div>

          {!isViewer && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="accent"
                icon="play_arrow"
                disabled={!canRun || isRunning}
                onClick={handleRunWorkflow}
              >
                Run
              </Button>
              {isRunning && (
                <span className="text-xs text-accent font-medium animate-pulse">
                  Running...
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <ReactFlowProvider>
        <WorkflowCanvas
          userRole={userRole}
          onRunComplete={() => {
            refetchQuota({ requestPolicy: 'network-only' })
            setTimeout(() => refetchQuota({ requestPolicy: 'network-only' }), 500)
            setTimeout(() => refetchQuota({ requestPolicy: 'network-only' }), 1500)
          }}
        />
      </ReactFlowProvider>
    </div>
  )
}

export default function App() {
  return (
    <AuthGate>
      <OrgProvider>
        <MainLayout />
      </OrgProvider>
    </AuthGate>
  )
}
