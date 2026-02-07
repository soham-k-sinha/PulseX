import { motion } from 'framer-motion'
import {
  Users, Wallet, Lock, Shield, Zap,
  Heart, Home, Utensils,
} from 'lucide-react'

interface Props {
  activeStep?: number       // -1 = all dim, 0-7 = highlight up to that node
  animated?: boolean        // show flowing particles
  className?: string
}

const NODES = [
  { id: 'donors',   label: 'DONORS',   sub: 'Crossmark',  x: 70,  y: 140, r: 28, color: '#60A5FA', Icon: Users },
  { id: 'pool',     label: 'POOL',     sub: 'Batching',   x: 220, y: 140, r: 28, color: '#818CF8', Icon: Wallet },
  { id: 'escrow',   label: 'ESCROW',   sub: 'Time-Lock',  x: 370, y: 140, r: 28, color: '#FBBF24', Icon: Lock },
  { id: 'reserve',  label: 'RESERVE',  sub: 'Emergency',  x: 520, y: 140, r: 28, color: '#34D399', Icon: Shield },
  { id: 'disaster', label: 'DISASTER', sub: 'Response',   x: 670, y: 140, r: 28, color: '#F87171', Icon: Zap },
  { id: 'org1',     label: 'HEALTH',   sub: '',           x: 880, y: 60,  r: 22, color: '#F472B6', Icon: Heart },
  { id: 'org2',     label: 'SHELTER',  sub: '',           x: 880, y: 140, r: 22, color: '#C084FC', Icon: Home },
  { id: 'org3',     label: 'FOOD',     sub: '',           x: 880, y: 220, r: 22, color: '#FB923C', Icon: Utensils },
]

const PATHS = [
  { id: 'p0', d: 'M 98 140 L 192 140',                         color: '#818CF8', dur: '2.4s', delay: '0s'   },
  { id: 'p1', d: 'M 248 140 L 342 140',                         color: '#FBBF24', dur: '2.6s', delay: '0.4s' },
  { id: 'p2', d: 'M 398 140 L 492 140',                         color: '#34D399', dur: '2.2s', delay: '0.8s' },
  { id: 'p3', d: 'M 548 140 L 642 140',                         color: '#F87171', dur: '2.5s', delay: '1.2s' },
  { id: 'p4', d: 'M 698 140 C 760 140, 830 60, 858 60',        color: '#F472B6', dur: '2.0s', delay: '0s'   },
  { id: 'p5', d: 'M 698 140 L 858 140',                         color: '#C084FC', dur: '1.8s', delay: '0.3s' },
  { id: 'p6', d: 'M 698 140 C 760 140, 830 220, 858 220',      color: '#FB923C', dur: '2.1s', delay: '0.6s' },
]

export default function EscrowFlowViz({ activeStep = -1, animated = true, className = '' }: Props) {
  return (
    <div className={className}>
      <svg viewBox="0 0 950 280" className="w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="fg" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="pg" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Subtle grid */}
          <pattern id="fgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.012)" strokeWidth="0.5" />
          </pattern>
        </defs>

        <rect width="950" height="280" fill="url(#fgrid)" />

        {/* Bracket label for orgs */}
        <text x="880" y="258" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="Inter,sans-serif" fontWeight="700" letterSpacing="0.18em">ORGANIZATIONS</text>

        {/* Connection paths */}
        {PATHS.map((p, i) => {
          const pathStep = i <= 3 ? i + 1 : 5 + (i - 4) // map path index to step
          const lit = activeStep >= 0 && pathStep <= activeStep
          return (
            <g key={p.id}>
              {/* Base path */}
              <motion.path
                id={p.id}
                d={p.d}
                stroke={lit ? p.color : 'rgba(255,255,255,0.04)'}
                strokeWidth={lit ? 2 : 1.5}
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.15 * i, duration: 0.8, ease: 'easeOut' }}
              />

              {/* Glow overlay when lit */}
              {lit && (
                <path d={p.d} stroke={p.color} strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.08" />
              )}

              {/* Animated particles */}
              {animated && (
                <>
                  <circle r="3.5" fill={p.color} filter="url(#pg)" opacity="0.9">
                    <animateMotion dur={p.dur} repeatCount="indefinite" begin={p.delay}>
                      <mpath href={`#${p.id}`} />
                    </animateMotion>
                  </circle>
                  <circle r="2" fill={p.color} opacity="0.4">
                    <animateMotion dur={p.dur} repeatCount="indefinite" begin={`${parseFloat(p.delay) + 1.1}s`}>
                      <mpath href={`#${p.id}`} />
                    </animateMotion>
                  </circle>
                </>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {NODES.map((node, i) => {
          const lit = activeStep < 0 || i <= activeStep
          const pulse = activeStep >= 0 && i === activeStep
          const { Icon } = node
          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.08 * i + 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            >
              {/* Outer pulse ring */}
              {pulse && (
                <circle cx={node.x} cy={node.y} r={node.r + 14} fill="none" stroke={node.color} strokeWidth="0.8" opacity="0.3">
                  <animate attributeName="r" values={`${node.r + 8};${node.r + 20};${node.r + 8}`} dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0.08;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
              )}

              {/* Outer glow ring */}
              <circle
                cx={node.x} cy={node.y} r={node.r + 6}
                fill="none" stroke={node.color}
                strokeWidth="0.5" opacity={lit ? 0.25 : 0.06}
              />

              {/* Main circle */}
              <circle
                cx={node.x} cy={node.y} r={node.r}
                fill="rgba(8,8,8,0.85)"
                stroke={node.color}
                strokeWidth={lit ? 1.2 : 0.6}
                opacity={lit ? 1 : 0.35}
                filter={pulse ? 'url(#fg)' : undefined}
              />

              {/* Icon via foreignObject */}
              <foreignObject
                x={node.x - node.r * 0.45} y={node.y - node.r * 0.45}
                width={node.r * 0.9} height={node.r * 0.9}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                  <Icon size={node.r * 0.55} color={lit ? node.color : 'rgba(255,255,255,0.15)'} />
                </div>
              </foreignObject>

              {/* Label */}
              <text
                x={node.x} y={node.y + node.r + 18}
                textAnchor="middle" fill={lit ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)'}
                fontSize="8.5" fontFamily="Inter,sans-serif" fontWeight="700"
                letterSpacing="0.14em"
              >
                {node.label}
              </text>
              {node.sub && (
                <text
                  x={node.x} y={node.y + node.r + 30}
                  textAnchor="middle" fill={lit ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}
                  fontSize="7.5" fontFamily="Inter,sans-serif" fontWeight="500"
                >
                  {node.sub}
                </text>
              )}
            </motion.g>
          )
        })}
      </svg>
    </div>
  )
}
