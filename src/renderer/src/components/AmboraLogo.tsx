interface AmboraLogoProps {
  size?: number
}

export function AmboraLogo({ size = 32 }: AmboraLogoProps): React.JSX.Element {
  return (
    <svg
      viewBox="-80 -80 160 160"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logoGradA" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7B93F5" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#6659D9" stopOpacity={0.55} />
        </linearGradient>
        <linearGradient id="logoGradB" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#95A8F8" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#7B93F5" stopOpacity={0.55} />
        </linearGradient>
      </defs>

      {/* Channel A arcs (left-facing) */}
      <path
        d="M -18,58 A 68,68 0 0,1 -18,-58"
        fill="none"
        stroke="url(#logoGradA)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.35}
      />
      <path
        d="M -14,44 A 52,52 0 0,1 -14,-44"
        fill="none"
        stroke="url(#logoGradA)"
        strokeWidth={3.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <path
        d="M -10,28 A 34,34 0 0,1 -10,-28"
        fill="none"
        stroke="url(#logoGradA)"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Channel B arcs (right-facing) */}
      <path
        d="M 10,28 A 34,34 0 0,0 10,-28"
        fill="none"
        stroke="url(#logoGradB)"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d="M 14,44 A 52,52 0 0,0 14,-44"
        fill="none"
        stroke="url(#logoGradB)"
        strokeWidth={3.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <path
        d="M 18,58 A 68,68 0 0,0 18,-58"
        fill="none"
        stroke="url(#logoGradB)"
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.35}
      />

      {/* Center dot */}
      <circle cx={0} cy={0} r={8} fill="#7B93F5" opacity={0.12} />
      <circle cx={0} cy={0} r={3.5} fill="#EAEAED" opacity={0.9} />
    </svg>
  )
}
