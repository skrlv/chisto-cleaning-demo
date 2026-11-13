import type { CSSProperties } from "react";
export function Icon({
  name = "spark",
  size = 24,
  style,
}: {
  name?: string;
  size?: number;
  style?: CSSProperties;
}) {
  const paths: Record<string, React.ReactNode> = {
    spark: (
      <>
        <path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z" />
        <path d="M21 1v4M19 3h4" />
      </>
    ),
    arrow: (
      <>
        <path d="M4 12h15M13 5l7 7-7 7" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    home: (
      <>
        <path d="m3 11 9-8 9 8M5 9v12h14V9M10 21v-7h4v7" />
      </>
    ),
    leaf: (
      <>
        <path d="M20 3C8 1 1 9 5 17s17 3 15-14ZM5 20 16 9" />
      </>
    ),
    window: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="1" />
        <path d="M12 3v18M4 12h16" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    list: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </>
    ),
    shield: (
      <>
        <path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5Z" />
        <path d="m8 11 3 3 5-6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name] ?? paths.spark}
    </svg>
  );
}
