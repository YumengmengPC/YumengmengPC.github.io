/**
 * GitHub 贡献日历（CSS Grid 实现）
 * 用法：{% githubStats %}
 */
const GITHUB_USERNAME = "YumengmengPC";

let cachedData = null;

async function fetchAllData(username) {
  // 构建期请求第三方 API:对方不可用不应拖垮整个部署(部署失败 = 全站停更)。
  // 10s 超时 + 异常捕获,失败时降级为空数据,页面渲染空占位(肉眼可见,不属于静默类)。
  try {
    const contribRes = await fetch(
      `https://github-contributions-api.deno.dev/${username}.json`,
      { signal: AbortSignal.timeout(10_000) }
    );

    const data = {};

    if (contribRes.ok) {
      const c = await contribRes.json();
      data.totalContributions = c.totalContributions;
      if (Array.isArray(c.contributions)) {
        const days = [];
        c.contributions.forEach((week) => {
          if (Array.isArray(week)) {
            week.forEach((day) => {
              days.push({
                count: day.contributionCount || 0,
                date: day.date || "",
              });
            });
          }
        });
        data.days = days;
      }
    } else {
      console.warn(`github-stats: 贡献 API 返回 ${contribRes.status},本页渲染空占位`);
    }

    return data;
  } catch (e) {
    console.warn(`github-stats: 拉取贡献数据失败(${e.message}),本页渲染空占位`);
    return {};
  }
}

hexo.extend.tag.register(
  "githubStats",
  async function (args) {
    const username = args[0] || GITHUB_USERNAME;

    if (!cachedData) {
      cachedData = await fetchAllData(username);
    }

    const days = cachedData.days || [];
    const total = cachedData.totalContributions ?? 0;
    const daysJSON = JSON.stringify(days);

    return `
<style>
.github-heatmap {
  margin: 20px 0;
  max-width: 780px;
  --gh-0: #ebedf0;
  --gh-1: #9be9a8;
  --gh-2: #40c463;
  --gh-3: #30a14e;
  --gh-4: #216e39;
}
[data-theme="dark"] .github-heatmap {
  --gh-0: #161b22;
  --gh-1: #0e4429;
  --gh-2: #006d32;
  --gh-3: #26a641;
  --gh-4: #39d353;
}
.gh-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--grey-7);
}
.gh-header a {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--color-primary, #0366d6);
  text-decoration: none;
}
.gh-header a:hover { text-decoration: underline; }

/* 外层滚动容器 */
.gh-scroll {
  overflow-x: auto;
  padding-bottom: 6px;
}

/* Grid: 行[月份 auto, 7x 天 10px, 底部 auto] / 列[标签 auto, 53x 格子 10px] */
.gh-grid {
  display: grid;
  grid-template: auto repeat(7, 10px) auto / auto repeat(53, 10px);
  gap: 3px;
  width: fit-content;
  min-width: 670px;
  font-size: 12px;
  padding: 12px;
  border: solid 1px var(--grey-2);
  border-radius: 8px;
}

/* 月份标签: 第1行 */
.gh-month {
  grid-row: 1;
  font-size: 10px;
  line-height: 1;
  color: var(--grey-5);
}

/* 星期标签: 第1列, 行由 inline style 控制 */
.gh-wk {
  grid-column: 1;
  font-size: 10px;
  color: var(--grey-5);
  line-height: 10px;
  margin-right: 2px;
  text-align: right;
}

/* 格子区域: 列2~54, 行2~8, 内部用 subgrid */
.gh-tiles {
  grid-column: 2 / 55;
  grid-row: 2 / 9;
  display: grid;
  grid-auto-flow: column;
  grid-template: subgrid / subgrid;
}

.gh-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  outline: 1px solid rgba(27,31,35,0.06);
  outline-offset: -1px;
  cursor: pointer;
}
.gh-cell[data-lvl="0"] { background: var(--gh-0); }
.gh-cell[data-lvl="1"] { background: var(--gh-1); }
.gh-cell[data-lvl="2"] { background: var(--gh-2); }
.gh-cell[data-lvl="3"] { background: var(--gh-3); }
.gh-cell[data-lvl="4"] { background: var(--gh-4); }
.gh-cell:hover { outline: 1px solid rgba(27,31,35,0.3); }

/* 底部统计 + 图例 */
.gh-total {
  grid-column: 2 / 30;
  grid-row: 9;
  margin-top: 2px;
  font-size: 10px;
  color: var(--grey-6);
}
.gh-legend {
  grid-column: 30 / 55;
  grid-row: 9;
  margin-top: 2px;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  align-items: center;
  font-size: 10px;
  color: var(--grey-5);
}
.gh-legend-cell {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
</style>

<div class="github-heatmap">
  <div class="gh-header">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
    </svg>
    <span>${total} contributions in the last year</span>
    <a href="https://github.com/${username}" target="_blank" rel="noopener">@${username} →</a>
  </div>
  <div class="gh-scroll">
    <div id="gh-grid-${username}" class="gh-grid"></div>
  </div>
</div>

<script>
(function() {
  var days = ${daysJSON};
  if (!days || days.length === 0) return;

  var MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  var DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""]; // grid-row 2~8

  // 计算 level
  var maxCount = 0;
  days.forEach(function(d) { maxCount = Math.max(maxCount, d.count || 0); });

  function getLevel(count) {
    if (count <= 0) return 0;
    var r = count / Math.max(maxCount, 1);
    if (r <= 0.25) return 1;
    if (r <= 0.5) return 2;
    if (r <= 0.75) return 3;
    return 4;
  }

  var grid = document.getElementById('gh-grid-${username}');
  if (!grid) return;

  // 起止日期从第一天算偏移
  var firstDate = new Date(days[0].date);
  var startDayOfWeek = firstDate.getDay(); // 0=Sun
  var startRow = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Mon=0, Sun=6

  var monthHTML = '';
  var cellHTML = '';
  var lastMonth = -1;
  var lastMonthGridCol = -1;

  for (var i = 0; i < days.length; i++) {
    var d = days[i];
    var date = new Date(d.date);
    var month = date.getMonth();
    var dayOfWeek = date.getDay();
    var monOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    // 计算该天的 Grid 列: 每个周日换新的一周
    // 第 N 周 → grid-column N+2 (第1列是标签列)
    var weekIndex = Math.floor((i + startRow) / 7);
    var gridCol = weekIndex + 2;

    // 月份标签：遇到周日且月份变了
    if (dayOfWeek === 0 && month !== lastMonth) {
      if (gridCol - lastMonthGridCol > 1) {
        monthHTML += '<span class="gh-month" style="grid-column:' + gridCol + '">' + MONTHS[month] + '</span>';
        lastMonthGridCol = gridCol;
      }
      lastMonth = month;
    }

    var lvl = getLevel(d.count || 0);
    cellHTML += '<i class="gh-cell" data-lvl="' + lvl + '" title="' + d.date + ': ' + (d.count || 0) + ' contributions"';
    if (i === 0) {
      // 首格设置 grid-row 偏移
      cellHTML += ' style="grid-row:' + (startRow + 2) + '"';
    }
    cellHTML += '></i>';
  }

  // 星期标签
  var weekLabels = '';
  DAY_LABELS.forEach(function(label, idx) {
    if (!label) return;
    // grid-row: 月份=1, 天从第2行开始
    var row = idx + 2; // Mon=row2, Wed=row4, Fri=row6 (idx 1→2, 3→4, 5→6)
    weekLabels += '<span class="gh-wk" style="grid-row:' + row + '">' + label + '</span>';
  });

  grid.innerHTML = monthHTML + weekLabels +
    '<div class="gh-tiles">' + cellHTML + '</div>' +
    '<div class="gh-total">' + ${total} + ' contributions in total</div>' +
    '<div class="gh-legend">Less' +
      '<span class="gh-legend-cell" style="background:var(--gh-0)"></span>' +
      '<span class="gh-legend-cell" style="background:var(--gh-1)"></span>' +
      '<span class="gh-legend-cell" style="background:var(--gh-2)"></span>' +
      '<span class="gh-legend-cell" style="background:var(--gh-3)"></span>' +
      '<span class="gh-legend-cell" style="background:var(--gh-4)"></span>' +
    'More</div>';
})();
</script>`;
  },
  { async: true }
);
