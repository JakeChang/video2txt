# 影片轉字幕工具 (Video2TXT)

🎬 一個自動將影片轉換為文稿和字幕檔案的工具，使用 Whisper AI 進行語音識別。

## 功能特色

- 🎯 自動掃描 `videos` 目錄中的影片檔案
- 🔄 使用 FFmpeg 將影片轉換為音檔
- 🎙️ 使用 Whisper Medium Model 進行語音轉文字
- 📺 自動生成 SRT 字幕檔案
- 🧹 自動清理暫存檔案
- 📊 顯示處理進度和結果摘要

## 系統需求

- Node.js 14.0 或以上版本
- FFmpeg（用於影片處理）
- 足夠的磁碟空間（處理大檔案時）

## 安裝設置

1. **安裝依賴項**：
   ```bash
   npm install
   ```

2. **安裝 FFmpeg**：
   ```bash
   # macOS
   brew install ffmpeg
   
   # Windows
   # 從 https://ffmpeg.org/download.html 下載並安裝
   
   # Linux (Ubuntu/Debian)
   sudo apt-get install ffmpeg
   ```

3. **下載 Whisper 模型**（首次運行時會自動下載）：
   ```bash
   npx nodejs-whisper download
   ```

## 使用方法

1. **將影片檔案放入 `videos` 目錄**

2. **運行程式**：
   ```bash
   npm start
   ```
   或者
   ```bash
   node main.js
   ```

3. **等待處理完成**，輸出檔案將保存在 `data` 目錄中

## 支援格式

**影片格式**：`.mp4`, `.avi`, `.mkv`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`

## 輸出檔案

- `[影片名稱].raw.txt` - 原始文稿檔案
- `[影片名稱].srt` - SRT 字幕檔案

## 目錄結構

```
video2txt/
├── videos/           # 放置影片檔案
├── data/            # 輸出檔案目錄
├── temp/            # 暫存檔案（自動清理）
├── main.js          # 主程式
├── transcript.js    # 轉換模組
└── package.json     # 依賴配置
```

## 注意事項

- 🕐 大檔案處理時間較長，請耐心等待
- 💾 確保有足夠的磁碟空間
- 🔊 影片需要包含音訊軌道
- 📝 首次使用會自動下載 Whisper 模型

## 故障排除

**FFmpeg 未安裝**：
- 確認 FFmpeg 已正確安裝並加入系統 PATH

**記憶體不足**：
- 處理大檔案時可能需要更多記憶體
- 建議先處理較小的測試檔案

**Whisper 模型下載失敗**：
- 檢查網路連接
- 手動運行 `npx nodejs-whisper download`

## 授權

MIT License 