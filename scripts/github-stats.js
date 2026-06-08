/**
 * GitHub 统计卡片插件
 * 用法：{% githubStats %} 或 {% githubStats YumengmengPC %}
 *
 * 生成一个美观的 GitHub 统计卡片，包含仓库数、关注者数等公开信息。
 * 如需显示年度贡献数，请设置 GITHUB_TOKEN 环境变量。
 */
const GITHUB_USERNAME = "YumengmengPC";

// 缓存：避免多次构建时重复请求
let cachedStats = null;

async function fetchGithubStats(username) {
  // 基础用户信息（公开 API，无需认证）
  const [userRes, contributions] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "User-Agent": "Hexo-GitHub-Stats",
        Accept: "application/vnd.github.v3+json",
      },
    }),
    fetchContributions(username),
  ]);

  const stats = {};

  if (userRes.ok) {
    const userData = await userRes.json();
    stats.public_repos = userData.public_repos;
    stats.followers = userData.followers;
    stats.following = userData.following;
  }

  if (contributions !== null) {
    stats.totalContributions = contributions;
  }

  return stats;
}

async function fetchContributions(username) {
  // 优先使用 GitHub GraphQL API（需要 token）
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) {
    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
            }
          }
        }
      }
    `;

    try {
      const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          "User-Agent": "Hexo-GitHub-Stats",
          Authorization: `bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables: { username } }),
      });

      if (res.ok) {
        const json = await res.json();
        const count =
          json.data?.user?.contributionsCollection?.contributionCalendar
            ?.totalContributions;
        if (count != null) return count;
      }
    } catch {
      // 降级到公开 API
    }
  }

  // 降级：使用公开的第三方 API
  try {
    const res = await fetch(
      `https://github-contributions-api.deno.dev/${username}.json`
    );
    if (res.ok) {
      const json = await res.json();
      if (json.totalContributions != null) return json.totalContributions;
    }
  } catch {
    // 无法获取贡献数
  }

  return null;
}

function renderStats(stats, username) {
  if (!stats || Object.keys(stats).length === 0) {
    return `<div class="github-stat-item">
        <span class="github-stat-loading">获取中...</span>
      </div>`;
  }

  let html = "";

  if (stats.totalContributions !== null && stats.totalContributions !== undefined) {
    html += `<div class="github-stat-item">
        <span class="github-stat-num">${stats.totalContributions}</span>
        <span class="github-stat-label">过去一年贡献</span>
      </div>`;
  }

  if (stats.public_repos !== undefined && stats.public_repos !== null) {
    html += `<div class="github-stat-item">
        <span class="github-stat-num">${stats.public_repos}</span>
        <span class="github-stat-label">公开仓库</span>
      </div>`;
  }

  if (stats.followers !== undefined && stats.followers !== null) {
    html += `<div class="github-stat-item">
        <span class="github-stat-num">${stats.followers}</span>
        <span class="github-stat-label">关注者</span>
      </div>`;
  }

  if (!html) {
    html = `<div class="github-stat-item">
        <span class="github-stat-loading">无法获取数据</span>
      </div>`;
  }

  html += `<a href="https://github.com/${username}" class="github-card-link" target="_blank" rel="noopener">访问主页 →</a>`;
  return html;
}

// 注册异步标签 —— Hexo 支持 async tag 函数
hexo.extend.tag.register(
  "githubStats",
  async function (args) {
    const username = args[0] || GITHUB_USERNAME;

    // 使用缓存避免重复请求
    if (!cachedStats) {
      cachedStats = await fetchGithubStats(username);
    }

    return `
<style>
.github-card {
  background: var(--grey-1);
  border-radius: 12px;
  padding: 20px 24px;
  margin: 20px 0;
  border: 1px solid var(--grey-2);
  max-width: 420px;
}
.github-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--grey-9);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--grey-2);
}
.github-card-body {
  display: flex;
  align-items: center;
  gap: 16px;
}
.github-card-avatar img {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid var(--grey-3);
}
.github-card-info {
  flex: 1;
}
.github-card-name {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--grey-9);
  text-decoration: none;
}
.github-card-name:hover {
  color: var(--color-primary, #0366d6);
  text-decoration: underline;
}
.github-card-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 10px;
  align-items: flex-end;
}
.github-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.github-stat-num {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--grey-9);
  line-height: 1.2;
}
.github-stat-label {
  font-size: 0.72rem;
  color: var(--grey-6);
  white-space: nowrap;
}
.github-stat-loading {
  font-size: 0.85rem;
  color: var(--grey-5);
}
.github-card-link {
  display: inline-block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--color-primary, #0366d6);
  text-decoration: none;
}
.github-card-link:hover {
  text-decoration: underline;
}
</style>
<div class="github-card">
  <div class="github-card-header">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:middle">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
    <span>GitHub</span>
  </div>
  <div class="github-card-body">
    <div class="github-card-avatar">
      <img src="https://github.com/${username}.png" alt="${username}" loading="lazy" />
    </div>
    <div class="github-card-info">
      <a href="https://github.com/${username}" class="github-card-name" target="_blank" rel="noopener">@${username}</a>
      <div class="github-card-stats">
        ${renderStats(cachedStats, username)}
      </div>
    </div>
  </div>
</div>`;
  },
  { async: true }
);
