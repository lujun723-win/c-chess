# c-chess
中国象棋训练程序

## 启动
在仓库根目录执行：

```bash
npm start
```

打开：

`http://localhost:3001`

局域网辅助入口：

- `http://localhost:3001/lan` 查看当前可用的局域网地址清单（含 `hostname.local`）
- `http://localhost:3001/go` 自动跳转到优先地址（mDNS/局域网 IP）
- 默认会发布短域名：`http://chess.local:3001/mvp/`
- 可自定义：`MDNS_ALIAS=yourname.local npm start`

## 发布前检查

```bash
npm run test:release-check
npm run release:prepare
```

## 数据备份与恢复

```bash
npm run backup:db
npm run restore:db -- server/backups/<backup-file>.json
```

详细说明：
- [部署与发布](./docs/DEPLOYMENT.md)
- [备份与恢复](./docs/BACKUP_RESTORE.md)
- [首版发布清单](./docs/RELEASE_CHECKLIST.md)
