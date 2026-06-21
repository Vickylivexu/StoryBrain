import React from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
} from 'reactflow'
import 'reactflow/dist/style.css'

const nodeColors = {
  core: { background: '#4f46e5', border: '#3730a3', text: '#ffffff' },
  concept: { background: '#818cf8', border: '#6366f1', text: '#ffffff' },
  related: { background: '#a5b4fc', border: '#818cf8', text: '#1e1b4b' },
  default: { background: '#6366f1', border: '#4f46e5', text: '#ffffff' }
}

const KnowledgeGraph = ({ data }) => {
  const initialNodes = (data.nodes || []).map((node) => {
    const colors = nodeColors[node.type] || nodeColors.default
    const shortLabel = node.label.length > 8 ? node.label.substring(0, 8) + '...' : node.label

    return {
      id: node.id.toString(),
      data: {
        label: (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              background: colors.background,
              border: `2px solid ${colors.border}`,
              color: colors.text,
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
          >
            {shortLabel}
          </div>
        )
      },
      position: node.x && node.y ? { x: node.x, y: node.y } : { x: Math.random() * 400 + 100, y: Math.random() * 300 + 50 },
      style: {
        background: 'transparent',
        border: 'none',
        padding: 0
      }
    }
  })

  const initialEdges = (data.edges || []).map((edge) => ({
    id: `e${edge.from}-${edge.to}`,
    source: edge.from.toString(),
    target: edge.to.toString(),
    animated: true,
    style: {
      stroke: '#818cf8',
      strokeWidth: 2,
      opacity: 0.7
    },
    type: 'smoothstep'
  }))

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
      >
        <Controls showInteractive={false} position="bottom-right" />
        <MiniMap
          nodeColor={(node) => {
            return '#6366f1'
          }}
          maskColor="rgba(238, 242, 255, 0.7)"
          position="bottom-left"
        />
        <Background color="#c7d2fe" gap={16} />
      </ReactFlow>
    </div>
  )
}

export default KnowledgeGraph
