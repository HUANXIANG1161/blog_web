---
title: 尝试在文章中插入代码块
published: 2026-11-03
description: 真的假的
category: 随笔
draft: false
---

Dijkstra 求的是**非负边权图单源最短路**：起点 `s`，一次算出它到所有点的最短距离。有负权就得换 Bellman-Ford 或者 SPFA。

## 模板

```cpp
using ll = long long;
using pli = pair<ll, int>;              // (距离, 点)
const ll INF = 1e18;
vector<pair<int, ll>> g[100005];       // 邻接表
vector<ll> dijkstra(int n, int s) {
    vector<ll> dis(n + 1, INF);
    priority_queue<pli, vector<pli>, greater<>> pq;
    dis[s] = 0; pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dis[u]) continue;      // 跳过过期
        for (auto [v, w] : g[u])
            if (dis[v] > d + w) {
                dis[v] = d + w;
                pq.push({dis[v], v});
            }
    }
    return dis;
}
```

## 复杂度

- **时间**：`O((n + m) log n)`。每条边最多引起一次入队，堆操作是 `O(log n)`
- **空间**：`O(n + m)`

## 另外
迪杰斯特拉这个名字真好听。
