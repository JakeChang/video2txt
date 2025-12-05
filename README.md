# 影片轉字幕工具 (Video2TXT)

一個自動將影片轉換為文稿和字幕檔案的工具，使用 OpenAI Whisper AI 進行語音識別。

## 功能特色

- 自動掃描 `videos` 目錄中的影片檔案
- 使用 FFmpeg 將影片轉換為音檔
- 使用 Whisper Medium Model 進行語音轉文字
- 自動生成精準時間軸的 SRT 字幕檔案
- 自動清理暫存檔案
- 顯示處理進度和結果摘要

## 系統需求

- Python 3.9 或以上版本
- FFmpeg（用於影片處理）
- 足夠的磁碟空間（Whisper 模型約 1.5GB）

## 完整安裝流程

### 步驟 1：安裝 FFmpeg

```bash
# macOS
brew install ffmpeg

# Windows (使用 Chocolatey)
choco install ffmpeg

# Windows (手動安裝)
# 從 https://ffmpeg.org/download.html 下載並加入系統 PATH

# Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg

# Linux (CentOS/RHEL)
sudo yum install ffmpeg
```

驗證安裝：
```bash
ffmpeg -version
```

### 步驟 2：建立 Python 虛擬環境

```bash
# 進入專案目錄
cd video2txt

# 建立虛擬環境
python3 -m venv venv

# 啟動虛擬環境
# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# 退出虛擬環境（完成後執行）
deactivate
```

### 步驟 3：安裝 Python 依賴

```bash
pip install -r requirements.txt
```

首次安裝會下載以下套件：
- `openai-whisper` - OpenAI 官方 Whisper 語音識別
- `ffmpeg-python` - FFmpeg Python 包裝器
- `torch` - PyTorch 深度學習框架
- `tqdm` - 進度條顯示

### 步驟 4：放置影片檔案

將要轉換的影片檔案放入 `videos` 目錄：

```bash
# 建立目錄（如果不存在）
mkdir -p videos

# 複製影片到目錄
cp /path/to/your/video.mp4 videos/
```

### 步驟 5：執行程式

```bash
# 確保虛擬環境已啟動
source venv/bin/activate

# 執行主程式
python main.py
```

首次執行會自動下載 Whisper Medium 模型（約 1.5GB），請耐心等待。

## 使用方法

### 基本使用

```bash
# 啟動虛擬環境
source venv/bin/activate

# 執行轉換
python main.py
```

### 清理字幕格式（獨立工具）

如果字幕檔案中有多餘的時間戳記，可以使用清理工具：

```bash
python clean_srt.py
```

## 支援格式

**影片格式**：
- `.mp4`
- `.avi`
- `.mkv`
- `.mov`
- `.wmv`
- `.flv`
- `.webm`
- `.m4v`

## 輸出檔案

轉換完成後，輸出檔案會保存在 `data` 目錄：

| 檔案 | 說明 |
|------|------|
| `[影片名稱].raw.txt` | 原始文稿檔案（含標頭資訊） |
| `[影片名稱].srt` | SRT 字幕檔案（含精準時間軸） |

### 文稿檔案範例

```
# Project 文稿
轉換時間: 2024/01/15 14:30:00
轉換工具: openai-whisper (本地模型)
音檔大小: 10.32 MB

---

這是轉換後的文字內容...
```

### 字幕檔案範例

```
1
00:00:00,000 --> 00:00:03,500
第一句話的內容

2
00:00:03,500 --> 00:00:07,200
第二句話的內容
```

## 目錄結構

```
video2txt/
├── videos/              # 放置影片檔案
├── data/                # 輸出檔案目錄
├── temp/                # 暫存檔案（自動清理）
├── venv/                # Python 虛擬環境
├── main.py              # 主程式
├── transcript.py        # Whisper 語音識別模組
├── clean_srt.py         # 字幕清理工具
├── requirements.txt     # Python 依賴配置
└── README.md            # 說明文件
```

## 處理流程

```
1. 掃描 videos 目錄
        ↓
2. 驗證 FFmpeg 安裝
        ↓
3. 影片轉音檔 (WAV 16kHz 單聲道)
        ↓
4. Whisper 語音識別
        ↓
5. 生成文稿和字幕
        ↓
6. 清理暫存檔案
        ↓
7. 輸出結果到 data 目錄
```

## 注意事項

- 大檔案處理時間較長，請耐心等待
- 確保有足夠的磁碟空間（模型 + 暫存檔案）
- 影片需要包含音訊軌道
- 首次使用會自動下載 Whisper 模型（約 1.5GB）
- 建議使用 GPU 加速（如有 NVIDIA 顯卡）

## 故障排除

### FFmpeg 未安裝

```
❌ FFmpeg 未安裝或配置錯誤
```

解決方法：
1. 確認 FFmpeg 已正確安裝
2. 確認 FFmpeg 已加入系統 PATH
3. 重新開啟終端機

### 虛擬環境問題

```
ModuleNotFoundError: No module named 'whisper'
```

解決方法：
```bash
# 確認虛擬環境已啟動
source venv/bin/activate

# 重新安裝依賴
pip install -r requirements.txt
```

### 記憶體不足

處理大檔案時可能遇到記憶體不足：

解決方法：
1. 關閉其他應用程式
2. 使用較小的 Whisper 模型（修改 `transcript.py` 中的 `medium` 為 `small` 或 `tiny`）
3. 將影片分割為較小的片段

### Whisper 模型下載失敗

解決方法：
1. 檢查網路連接
2. 使用 VPN（如在中國大陸）
3. 手動下載模型到 `~/.cache/whisper/`

## Whisper 模型選擇

可在 `transcript.py` 中修改模型大小：

| 模型 | 大小 | 記憶體需求 | 相對速度 | 準確度 |
|------|------|-----------|---------|--------|
| tiny | 39M | ~1GB | 最快 | 較低 |
| base | 74M | ~1GB | 快 | 一般 |
| small | 244M | ~2GB | 中等 | 良好 |
| medium | 769M | ~5GB | 較慢 | 很好 |
| large | 1550M | ~10GB | 最慢 | 最佳 |

## 授權

MIT License
