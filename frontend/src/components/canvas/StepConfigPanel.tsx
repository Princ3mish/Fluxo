import { useState, useEffect } from 'react'
import { useWorkflowStore } from '../../store/workflowStore'

const STEP_TYPE_LABELS: Record<string, string> = {
  llm_call: 'LLM Call',
  http_request: 'HTTP Request',
  db_write: 'DB Write',
  notify: 'Notify',
  conditional_branch: 'Conditional Branch',
  approval_gate: 'Approval Gate',
}

export function StepConfigPanel() {
  const { nodes, selectedNodeId, updateNodeConfig, selectNode } = useWorkflowStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(selectedNode?.data?.config || {})

  useEffect(() => {
    if (selectedNode) {
      setLocalConfig(selectedNode.data?.config || {})
    }
  }, [selectedNodeId])

  if (!selectedNode) {
    return null
  }

  const stepType = (selectedNode.data?.stepType as string) || 'llm_call'
  const stepLabel = (selectedNode.data?.label as string) || undefined

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...localConfig, [key]: value }
    setLocalConfig(updated)
    updateNodeConfig(selectedNode.id, updated)
  }

  const renderFields = () => {
    switch (stepType) {
      case 'llm_call':
        return (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Model Name
              </label>
              <input
                type="text"
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
                placeholder="meta/llama-3.1-8b-instruct"
                value={localConfig.model || ''}
                onChange={(e) => handleFieldChange('model', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Prompt Template
              </label>
              <textarea
                rows={5}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-mono text-[11px] leading-relaxed"
                placeholder="Enter prompt template... Use {step_output_<id>} for variables."
                value={localConfig.prompt || ''}
                onChange={(e) => handleFieldChange('prompt', e.target.value)}
              />
            </div>

            <div className="pt-3 border-t border-border/60 flex flex-col gap-3">
              <span className="text-[10px] font-semibold text-textSecondary uppercase tracking-wider">
                Advanced (optional)
              </span>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-textSecondary font-medium">
                  API Key
                </label>
                <input
                  type="password"
                  className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-mono text-[11px]"
                  placeholder="Leave empty to use default provider"
                  value={localConfig.api_key || ''}
                  onChange={(e) => handleFieldChange('api_key', e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-textSecondary font-medium">
                  Base URL
                </label>
                <input
                  type="text"
                  className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/40 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-mono text-[11px]"
                  placeholder="Leave empty to use default provider (e.g. https://api.openai.com/v1)"
                  value={localConfig.base_url || ''}
                  onChange={(e) => handleFieldChange('base_url', e.target.value)}
                />
              </div>
            </div>
          </>
        )

      case 'http_request':
        return (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Endpoint URL
              </label>
              <input
                type="text"
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
                placeholder="https://api.example.com/data"
                value={localConfig.url || ''}
                onChange={(e) => handleFieldChange('url', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                HTTP Method
              </label>
              <select
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 cursor-pointer font-sans"
                value={localConfig.method || 'GET'}
                onChange={(e) => handleFieldChange('method', e.target.value)}
              >
                <option value="GET" className="bg-surface">GET</option>
                <option value="POST" className="bg-surface">POST</option>
                <option value="PUT" className="bg-surface">PUT</option>
                <option value="DELETE" className="bg-surface">DELETE</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Headers (JSON)
              </label>
              <textarea
                rows={3}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-mono text-[11px]"
                placeholder='{"Content-Type": "application/json"}'
                value={typeof localConfig.headers === 'object' ? JSON.stringify(localConfig.headers, null, 2) : localConfig.headers || ''}
                onChange={(e) => handleFieldChange('headers', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Body Payload (JSON)
              </label>
              <textarea
                rows={4}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-mono text-[11px]"
                placeholder='{"key": "value"}'
                value={typeof localConfig.body === 'object' ? JSON.stringify(localConfig.body, null, 2) : localConfig.body || ''}
                onChange={(e) => handleFieldChange('body', e.target.value)}
              />
            </div>
          </>
        )

      case 'db_write':
        return (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Target Table
              </label>
              <select
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 cursor-pointer font-sans"
                value={localConfig.table || 'workflow_runs'}
                onChange={(e) => handleFieldChange('table', e.target.value)}
              >
                <option value="workflow_runs" className="bg-surface">workflow_runs</option>
                <option value="step_runs" className="bg-surface">step_runs</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Insert Data (JSON)
              </label>
              <textarea
                rows={4}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-mono text-[11px]"
                placeholder='{"status": "completed"}'
                value={typeof localConfig.data === 'object' ? JSON.stringify(localConfig.data, null, 2) : localConfig.data || ''}
                onChange={(e) => handleFieldChange('data', e.target.value)}
              />
            </div>
          </>
        )

      case 'notify':
        return (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Channel
              </label>
              <input
                type="text"
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
                placeholder="console"
                value={localConfig.channel || ''}
                onChange={(e) => handleFieldChange('channel', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Message Template
              </label>
              <textarea
                rows={4}
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans leading-relaxed"
                placeholder="Workflow execution finished successfully."
                value={localConfig.message || ''}
                onChange={(e) => handleFieldChange('message', e.target.value)}
              />
            </div>
          </>
        )

      case 'conditional_branch': {
        const otherNodes = nodes.filter((n) => n.id !== selectedNode.id)
        return (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Condition Key (Step)
              </label>
              <select
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 cursor-pointer font-sans"
                value={localConfig.condition_key || ''}
                onChange={(e) => handleFieldChange('condition_key', e.target.value)}
              >
                <option value="" className="bg-surface">Select step...</option>
                {otherNodes.map((n) => {
                  const stepNum = nodes.findIndex((node) => node.id === n.id) + 1
                  const typeLabel = STEP_TYPE_LABELS[n.data?.stepType as string] || n.data?.stepType || 'Step'
                  const displayLabel = n.data?.label ? `Step ${stepNum} - ${n.data.label}` : `Step ${stepNum} - ${typeLabel}`
                  return (
                    <option key={n.id} value={n.id} className="bg-surface">
                      {displayLabel}
                    </option>
                  )
                })}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Operator
              </label>
              <select
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 cursor-pointer font-sans"
                value={localConfig.operator || 'eq'}
                onChange={(e) => handleFieldChange('operator', e.target.value)}
              >
                <option value="eq" className="bg-surface">Equal (eq)</option>
                <option value="contains" className="bg-surface">Contains (contains)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                Comparison Value
              </label>
              <input
                type="text"
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
                placeholder="expected value"
                value={localConfig.value || ''}
                onChange={(e) => handleFieldChange('value', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                On True Note
              </label>
              <input
                type="text"
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
                placeholder="Message when condition is true"
                value={localConfig.on_true_note || ''}
                onChange={(e) => handleFieldChange('on_true_note', e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
                On False Note
              </label>
              <input
                type="text"
                className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary placeholder:text-textSecondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 font-sans"
                placeholder="Message when condition is false"
                value={localConfig.on_false_note || ''}
                onChange={(e) => handleFieldChange('on_false_note', e.target.value)}
              />
            </div>
          </>
        )
      }

      case 'approval_gate':
        return (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-textSecondary uppercase tracking-wider">
              Required Reviewer Role
            </label>
            <select
              className="w-full bg-background/80 border border-border/80 rounded-lg px-3 py-2 text-xs text-textPrimary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/40 transition-all duration-200 cursor-pointer font-sans"
              value={localConfig.required_role || 'owner'}
              onChange={(e) => handleFieldChange('required_role', e.target.value)}
            >
              <option value="owner" className="bg-surface">Owner only</option>
              <option value="editor" className="bg-surface">Owner or Editor</option>
            </select>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <aside className="w-80 bg-surface/95 backdrop-blur-md border-l border-border/80 h-full flex flex-col z-20 select-none overflow-y-auto shrink-0 shadow-[0_0_30px_rgba(8,12,24,0.6)] animate-in slide-in-from-right-8 duration-300 ease-out">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-background/30">
        <div>
          <h3 className="text-xs font-bold text-textPrimary tracking-tight">{stepLabel || 'Step Settings'}</h3>
          <p className="text-[10px] text-textSecondary font-mono uppercase tracking-wider mt-0.5">{stepType}</p>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="w-7 h-7 flex items-center justify-center text-textSecondary hover:text-textPrimary rounded-lg hover:bg-background/80 border border-transparent hover:border-border/60 transition-all duration-150"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
        {renderFields()}
      </div>
    </aside>
  )
}
