const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

function Icon({ className = "h-4 w-4 shrink-0", children }) {
  return (
    <svg className={className} {...svgProps}>
      {children}
    </svg>
  );
}

export function NavDashboardIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Icon>
  );
}

export function NavTasksIcon(props) {
  return (
    <Icon {...props}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Icon>
  );
}

export function NavThoughtsIcon(props) {
  return (
    <Icon {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Icon>
  );
}

export function NavPlansIcon(props) {
  return (
    <Icon {...props}>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </Icon>
  );
}

export function NavPlanningIcon(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </Icon>
  );
}

export function NavFinancialIcon(props) {
  return (
    <Icon {...props}>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20M6 14h.01M10 14h4" />
    </Icon>
  );
}

export function NavCategoriesIcon(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h7v7H4zM13 7h7v7h-7zM4 16h7v5H4zM13 16h7v5h-7z" />
    </Icon>
  );
}

export const NAV_LINK_ICONS = {
  "/dashboard": NavDashboardIcon,
  "/tasks": NavTasksIcon,
  "/thoughts": NavThoughtsIcon,
  "/plans": NavPlansIcon,
  "/planning": NavPlanningIcon,
  "/financial-records": NavFinancialIcon,
  "/categories": NavCategoriesIcon,
};
