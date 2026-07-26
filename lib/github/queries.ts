export const REPO_STATS_QUERY = `
  query RepoStats($owner: String!, $repo: String!) {
    rateLimit { limit remaining resetAt cost }
    repository(owner: $owner, name: $repo) {
      stargazerCount
      forkCount
      watchers { totalCount }
      openIssues: issues(states: OPEN) { totalCount }
      openPRs: pullRequests(states: OPEN) { totalCount }
      defaultBranchRef { name }
      description
      homepageUrl
      pushedAt
      createdAt
      diskUsage
      licenseInfo { name }
      languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
        edges { size node { name } }
      }
      repositoryTopics(first: 20) {
        nodes { topic { name } }
      }
    }
  }
`;

export const ISSUES_QUERY = `
  query Issues($owner: String!, $repo: String!, $cursor: String) {
    rateLimit { limit remaining resetAt cost }
    repository(owner: $owner, name: $repo) {
      issues(
        first: 100
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
        states: [OPEN, CLOSED]
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number title state createdAt closedAt updatedAt
          author { login avatarUrl url }
          assignees(first: 5) { nodes { login avatarUrl url } }
          labels(first: 10) { nodes { name color } }
          comments { totalCount }
          timelineItems(first: 1, itemTypes: [LABELED_EVENT, ASSIGNED_EVENT, ISSUE_COMMENT]) {
            nodes {
              ... on LabeledEvent  { createdAt actor { login avatarUrl url } }
              ... on AssignedEvent { createdAt actor { login avatarUrl url } }
              ... on IssueComment  { createdAt author { login avatarUrl url } }
            }
          }
        }
      }
    }
  }
`;

export const PULL_REQUESTS_QUERY = `
  query PullRequests($owner: String!, $repo: String!, $cursor: String) {
    rateLimit { limit remaining resetAt cost }
    repository(owner: $owner, name: $repo) {
      pullRequests(
        first: 100
        after: $cursor
        orderBy: { field: UPDATED_AT, direction: DESC }
        states: [OPEN, CLOSED, MERGED]
      ) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number title state createdAt closedAt mergedAt updatedAt
          author { login avatarUrl url }
          assignees(first: 5) { nodes { login avatarUrl url } }
          labels(first: 10) { nodes { name color } }
          reviewDecision
          reviews(first: 20) {
            totalCount
            nodes { author { login avatarUrl url } submittedAt state }
          }
          comments { totalCount }
          changedFiles additions deletions baseRefName headRefName
        }
      }
    }
  }
`;

export const CONTRIBUTORS_QUERY = `
  query Contributors($owner: String!, $repo: String!, $cursor: String) {
    rateLimit { limit remaining resetAt cost }
    repository(owner: $owner, name: $repo) {
      defaultBranchRef {
        target {
          ... on Commit {
            history(first: 100, after: $cursor) {
              pageInfo { hasNextPage endCursor }
              nodes {
                author { user { login avatarUrl url } date }
              }
            }
          }
        }
      }
    }
  }
`;
