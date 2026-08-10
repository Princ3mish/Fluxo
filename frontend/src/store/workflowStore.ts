import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react'
import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  XYPosition,
} from '@xyflow/react'

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused'

export interface WorkflowNodeData extends Record<string, unknown> {
  stepType: string
  label?: string
  status?: StepStatus
  config?: Record<string, any>
}

export type WorkflowNode = Node<WorkflowNodeData>

export interface RunLogItem {
  id: string
  timestamp: string
  message: string
  type?: 'info' | 'error' | 'success' | 'warning'
}

interface WorkflowState {
  nodes: WorkflowNode[]
  edges: Edge[]
  selectedNodeId: string | null
  workflowName: string
  currentWorkflowId: string | null
  currentWorkflowRunId: string | null
  runError: string | null
  runLogs: RunLogItem[]
  setWorkflowName: (name: string) => void
  setCurrentWorkflowId: (id: string | null) => void
  setCurrentWorkflowRunId: (id: string | null) => void
  setRunError: (error: string | null) => void
  addRunLog: (message: string, type?: 'info' | 'error' | 'success' | 'warning') => void
  clearRunLogs: () => void
  updateNodeStatus: (stepId: string, status: StepStatus) => void
  addNode: (stepType: string, position: XYPosition) => void
  updateNodeConfig: (id: string, config: Record<string, any>) => void
  removeNode: (id: string) => void
  selectNode: (id: string | null) => void
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  setNodes: (nodes: WorkflowNode[]) => void
  setEdges: (edges: Edge[]) => void
}

let nodeIdCounter = 1

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  workflowName: 'Untitled Workflow',
  currentWorkflowId: null,
  currentWorkflowRunId: null,
  runError: null,
  runLogs: [],

  setWorkflowName: (name) => set({ workflowName: name }),
  setCurrentWorkflowId: (id) => set({ currentWorkflowId: id }),
  setCurrentWorkflowRunId: (id) => set({ currentWorkflowRunId: id, runError: null }),
  setRunError: (error) => set({ runError: error }),
  addRunLog: (message, type = 'info') => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false })
    const newItem: RunLogItem = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: timeStr,
      message,
      type,
    }
    set({ runLogs: [...get().runLogs, newItem] })
  },
  clearRunLogs: () => set({ runLogs: [] }),

  updateNodeStatus: (stepId, status) => {
    const currentNodes = get().nodes
    const targetNode = currentNodes.find((n) => n.id === stepId)
    if (!targetNode || targetNode.data.status === status) {
      return
    }
    set({
      nodes: currentNodes.map((node) => {
        if (node.id === stepId) {
          return {
            ...node,
            data: {
              ...node.data,
              status,
            },
          }
        }
        return node
      }),
    })
  },

  addNode: (stepType, position) => {
    const id = `step_${Date.now()}_${nodeIdCounter++}`
    const newNode: WorkflowNode = {
      id,
      type: stepType,
      position,
      data: {
        stepType,
        status: 'pending',
        config: {},
      },
    }
    set({
      nodes: [...get().nodes, newNode],
      selectedNodeId: id,
    })
  },

  updateNodeConfig: (id, config) => {
    const currentNodes = get().nodes
    const targetNode = currentNodes.find((n) => n.id === id)
    if (!targetNode || JSON.stringify(targetNode.data?.config) === JSON.stringify(config)) {
      return
    }
    set({
      nodes: currentNodes.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
            },
          }
        }
        return node
      }),
    })
  },

  removeNode: (id) => {
    set({
      nodes: get().nodes.filter((node) => node.id !== id),
      edges: get().edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    })
  },

  selectNode: (id) => {
    set({ selectedNodeId: id })
  },

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    })
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    })
  },

  onConnect: (connection) => {
    set({
      edges: addEdge(connection, get().edges),
    })
  },

  setNodes: (nodes) => {
    if (get().nodes === nodes) return
    set({ nodes })
  },
  setEdges: (edges) => {
    if (get().edges === edges) return
    set({ edges })
  },
}))
