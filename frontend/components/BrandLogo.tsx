type BrandLogoProps = {
  size?: number;
  className?: string;
};

export default function BrandLogo({ size = 36, className = "" }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="80 168 295 260"
      width={size}
      height={size}
      role="img"
      aria-label="Sidequest"
      className={`shrink-0 text-foreground ${className}`}
    >
      <circle cx="108" cy="340" r="9" fill="currentColor" opacity="0.2" />
      <circle cx="148" cy="356" r="7" fill="currentColor" opacity="0.3" />
      <circle cx="186" cy="366" r="5" fill="currentColor" opacity="0.4" />
      <g stroke="currentColor" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
        <path d="M248 362 L226 412" />
        <path d="M248 362 L276 412" />
        <path d="M248 362 L248 288" />
        <path d="M248 314 L210 340" />
        <path d="M248 302 L296 266" />
      </g>
      <circle cx="248" cy="246" r="36" fill="currentColor" />
      <circle
        cx="322"
        cy="224"
        r="40"
        stroke="currentColor"
        strokeWidth="16"
        fill="none"
      />
      <text
        x="322"
        y="240"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="44"
        fontWeight="800"
        fill="currentColor"
      >
        !
      </text>
    </svg>
  );
}
