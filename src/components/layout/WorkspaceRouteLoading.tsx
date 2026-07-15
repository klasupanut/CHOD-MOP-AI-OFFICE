export function WorkspaceRouteLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="workspace-route-loading">
      <span className="sr-only">Loading workspace</span>
      <div className="workspace-loading-heading">
        <i />
        <b />
      </div>
      <div className="workspace-loading-kpis">
        {Array.from({ length: 4 }, (_, index) => <i key={index} />)}
      </div>
      <div className="workspace-loading-body">
        <i />
        <i />
      </div>
    </div>
  );
}
