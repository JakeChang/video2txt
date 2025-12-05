請建立 git commit，不要在 commit 訊息中加入 "Generated with [Claude Code]" 或 "Co-Authored-By: Claude" 等標記。

請執行以下步驟：
1. 使用 `git status` 和 `git diff` 查看變更
2. 分析變更內容，撰寫清晰簡潔的 commit 訊息
3. 使用 `git add .` 加入所有變更的檔案
4. 使用 `git commit -m` 建立 commit，訊息格式如下：

```
<type>: <簡短描述>

- <詳細變更項目 1>
- <詳細變更項目 2>
- <詳細變更項目 3>
```

type 可以是：feat, fix, refactor, chore, docs, style, test 等

最後使用 `git log -1 --stat` 顯示剛建立的 commit 詳情。
