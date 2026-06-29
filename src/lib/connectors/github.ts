import { projectConnectors } from "@/data/project-connectors";

export function getGitHubRepoConnectors() {
  return projectConnectors
    .filter((connector) => connector.githubRepoUrl)
    .map(({ name, githubRepoUrl, enabled }) => ({ name, githubRepoUrl, enabled }));
}
