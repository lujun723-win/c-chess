# 数据备份与恢复

## 1. 创建备份
在仓库根目录执行：

```bash
npm run backup:db
```

默认输出到：
- `server/backups/db_YYYYMMDD_HHMMSS.json`

也支持自定义目标文件：

```bash
node tools/backup-db.js /path/to/backup.json
```

## 2. 恢复备份

```bash
npm run restore:db -- server/backups/db_20260430_120000.json
```

或直接：

```bash
node tools/restore-db.js server/backups/db_20260430_120000.json
```

恢复时会做两件事：
1. 校验备份 JSON 结构（users/families/games/battles 等必须是数组）。
2. 若当前 `server/data/db.json` 已存在，先自动生成一份 `pre_restore_*.json` 回滚备份。

## 3. 推荐流程
1. 停止服务（避免恢复过程被并发写入覆盖）。
2. 执行恢复命令。
3. 启动服务并验证：

```bash
curl -sSf http://127.0.0.1:3001/api/health
```

## 4. 回滚
若恢复后发现异常，可使用自动生成的 `pre_restore_*.json` 再次执行恢复命令回滚。
