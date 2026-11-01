export const WORKSPACE_STORAGE_KEY = "ptp-workspace-v1";
export const WORKSPACE_SECTION_EXPANDED_KEY = "ptp-workspace-section-expanded";

export function emptyWorkspaceState() {
  return {
    apps: [],
    openTabIds: [],
    activeTabId: null,
  };
}
