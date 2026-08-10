import React from 'react'
import { useWorkflowStore } from '../../store/workflowStore'

export interface NodeTypeDefinition {
  type: string
  label: string
  icon: string
  description: string
  stripeColor: string
  badgeBg: string
  badgeText: string
}

export const NODE_TYPES: NodeTypeDefinition[] = [
  {
    type: 'llm_call',
    label: 'LLM Call',
    icon: 'psychology',
    description: 'Invoke AI / LLM model',
    stripeColor: 'bg-purple-500',
    badgeBg: 'bg-purple-500/20',
    badgeText: 'text-purple-300',
  },
  {
    type: 'http_request',
    label: 'HTTP Request',
    icon: 'http',
    description: 'Make HTTP/REST API call',
    stripeColor: 'bg-blue-500',
    badgeBg: 'bg-blue-500/20',
    badgeText: 'text-blue-300',
  },
  {
    type: 'db_write',
    label: 'DB Write',
    icon: 'database',
    description: 'Insert record to database',
    stripeColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-300',
  },
  {
    type: 'notify',
    label: 'Notify',
    icon: 'notifications',
    description: 'Send a notification',
    stripeColor: 'bg-amber-500',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-300',
  },
  {
    type: 'conditional_branch',
    label: 'Conditional Branch',
    icon: 'call_split',
    description: 'Branch on condition',
    stripeColor: 'bg-cyan-500',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
  },
  {
    type: 'approval_gate',
    label: 'Approval Gate',
    icon: 'verified_user',
    description: 'Pause for human approval',
    stripeColor: 'bg-accent',
    badgeBg: 'bg-accent/20',
    badgeText: 'text-accent',
  },
]

export function NodePalette() {
  const { addNode, nodes } = useWorkflowStore()

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleQuickAdd = (nodeType: string, index: number) => {
    const xPos = 250 + (nodes.length % 3) * 280
    const yPos = 150 + Math.floor(nodes.length / 3) * 160 + index * 10
    addNode(nodeType, { x: xPos, y: yPos })
  }

  return (
    <aside className="w-64 bg-surface border-r border-border/80 h-full flex flex-col p-5 z-10 select-none overflow-y-auto shrink-0 shadow-[4px_0_24px_rgba(8,12,24,0.3)]">
      <div className="mb-4 pb-3.5 border-b border-border/70">
        <h2 className="text-xs font-bold text-textPrimary uppercase tracking-wider">Node Library</h2>
        <p className="text-[11px] text-textSecondary mt-0.5 leading-relaxed">Drag or click + to add to canvas</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {NODE_TYPES.map((node, index) => (
          <div
            key={node.type}
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className="flex items-center justify-between p-3 rounded-xl bg-background/50 hover:bg-background/90 border border-border/70 hover:border-textSecondary/50 hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(8,12,24,0.5)] transition-all duration-200 ease-out cursor-grab active:cursor-grabbing group shadow-sm relative overflow-hidden"
          >
            <div className={`absolute top-0 bottom-0 left-0 w-1 ${node.stripeColor}`} />

            <div className="flex items-center gap-3 pl-2 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${node.badgeBg} ${node.badgeText} transition-transform duration-200 group-hover:scale-105 shadow-sm`}>
                <span className="material-symbols-outlined text-[16px]">{node.icon}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-textPrimary truncate">{node.label}</span>
                <span className="text-[11px] text-textSecondary/80 truncate leading-tight">{node.description}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleQuickAdd(node.type, index)
              }}
              title={`Add ${node.label}`}
              className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-surface text-textSecondary hover:text-accent border border-transparent hover:border-border/80 transition-all duration-150 shrink-0 ml-1"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
