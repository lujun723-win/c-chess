# 部署与发布（MVP）

## 1. 环境要求
- Node.js 18+
- 可写目录：`server/data/`（数据库文件）
- 局域网多设备访问时，确保防火墙放通服务端口（默认 `3001`）

## 2. 启动
在仓库根目录执行：

```bash
npm start
```

默认监听：
- `HOST=0.0.0.0`
- `PORT=3001`
- `MDNS_ALIAS=chess.local`

可覆盖环境变量：

```bash
HOST=0.0.0.0 PORT=3001 MDNS_ALIAS=chess.local npm start
```

## 3. 发布前门禁（建议每次都跑）

```bash
npm run test:release-check
```

包含：
- `test:regression`（评估与记谱回归）
- `test:realtime-sync`（SSE 实时同步）
- `test:release-gate`（健康检查、访问信息、DB 接口、异常请求、写入限流）

## 4. 异常兜底机制（已内置）
- 前端：SSE 断开时自动降级到轮询同步；恢复后自动回到实时同步。
- 后端：
  - `PUT /api/db` 串行写入，减少并发覆盖风险。
  - 写入限流（默认 5 秒 80 次/客户端 IP），超过返回 `429`。
  - 请求体过大返回 `413`，非法 JSON 返回 `400`。

可调参数（默认值）：
- `DB_WRITE_RATE_LIMIT_WINDOW_MS=5000`
- `DB_WRITE_RATE_LIMIT_MAX=80`

## 5. 常用接口
- 健康检查：`GET /api/health`
- 访问地址探测：`GET /api/access`
- 数据读取：`GET /api/db`
- 数据写入：`PUT /api/db`
- 实时事件：`GET /api/events`

## 6. 数据目录
- 主数据库：`server/data/db.json`
- 备份目录（脚本生成）：`server/backups/`

备份与恢复说明见：
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
