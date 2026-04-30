# 首版发布清单（Release v1）

## A. 运行前检查
- [ ] 服务可启动：`npm start`
- [ ] 健康检查通过：`GET /api/health`
- [ ] 局域网入口可访问：`/lan` 与 `/mvp/`

## B. 数据安全
- [ ] 执行备份：`npm run backup:db`
- [ ] 记录备份文件路径（`server/backups/db_*.json`）
- [ ] 恢复演练（可选）：`npm run restore:db -- <backup-file>`

## C. 自动门禁
- [ ] 执行：`npm run test:release-check`
- [ ] 输出应包含：
  - `PASS: realtime SSE db-updated broadcast`
  - `PASS: release gate (health/access/db/rate-limit)`
  - `PASS: release check bundle`

> 说明：若 Node 运行时过老，不支持可选链语法，`test:regression` 会被自动跳过并打印 `SKIP`。

## D. 功能验收（人工）
- [ ] 账号：注册/登录/退出流程正常
- [ ] 家庭组：创建、加入、维护（改名/重置邀请码/解散）正常
- [ ] 人机对战：新建、走子、悔棋、认输/结束、棋谱抽屉、提示卡正常
- [ ] 双人对战：建房、搜索加入、轮走同步、自动更新、悔棋与结束正常
- [ ] 复盘分析：选局、总览/关键点切换、时间线跳转、红黑筛选正常

## E. 视觉验收（人工）
- [ ] 桌面端（Chrome）：主页/人机/双人/复盘布局完整无重叠
- [ ] 移动端（iOS Safari）：走子不卡顿、棋盘不乱跳、声音可触发
- [ ] 棋盘比例与棋子落点保持居中对齐

## F. 发布动作
- [ ] 执行一键发布准备：`npm run release:prepare`
- [ ] 更新发布说明（变更点 + 风险 + 回滚方式）
- [ ] 如需回滚，使用最近 `pre_restore_*.json` 或正式备份执行恢复
