# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 語言設定

請使用繁體中文回答。

## 常用指令

```bash
# 啟動虛擬環境
source venv/bin/activate

# 安裝依賴
pip install -r requirements.txt

# 執行主程式（轉換 videos/ 目錄中的影片）
python main.py

# 清理 SRT 字幕格式
python clean_srt.py

# 退出虛擬環境
deactivate
```

## 架構概述

這是一個影片轉字幕工具，使用 FFmpeg 和 OpenAI Whisper 進行語音識別。

**處理流程**：
1. `main.py` 掃描 `videos/` 目錄
2. FFmpeg 將影片轉為 WAV 音檔（16kHz 單聲道）
3. `transcript.py` 使用 Whisper 進行語音識別
4. 輸出文稿 (.raw.txt) 和字幕 (.srt) 到 `data/` 目錄

**模組分工**：
- `main.py` - 流程控制、FFmpeg 轉檔、目錄掃描
- `transcript.py` - Whisper 語音識別、SRT 生成
- `clean_srt.py` - 清理字幕中多餘的時間戳記

**Whisper 模型**：預設使用 `medium` 模型，可在 `transcript.py` 中修改為 `tiny`/`small`/`large`。
