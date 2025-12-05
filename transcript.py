"""
Whisper 語音識別模組
使用 OpenAI Whisper 將音檔轉換為文字
"""

import os
import whisper
from datetime import datetime
from pathlib import Path


# 取得專案根目錄
BASE_DIR = Path(__file__).parent


def transcript_to_text(audio_path: str, video_id: str) -> str:
    """
    將音檔轉換為文稿 (使用 medium 模型)

    Args:
        audio_path: 音檔路徑
        video_id: 影片識別碼

    Returns:
        文稿檔案路徑
    """
    try:
        print(f"🎙️ 開始使用本地 Whisper 轉換音檔: {audio_path}")

        # 檢查檔案是否存在
        if not os.path.exists(audio_path):
            raise FileNotFoundError("音檔檔案不存在")

        # 檢查檔案大小
        file_size_mb = os.path.getsize(audio_path) / (1024 * 1024)
        print(f"📁 音檔大小: {file_size_mb:.2f} MB")

        if file_size_mb > 100:
            print("⚠️ 警告: 音檔檔案較大，轉換可能需要較長時間")

        # 載入 Whisper 模型
        print("🔄 正在載入 Whisper medium 模型...")
        model = whisper.load_model("medium")

        # 執行轉換
        print("🔄 正在使用 Whisper 模型轉換音檔...")
        result = model.transcribe(
            audio_path,
            language=None,  # 自動偵測語言
            task="transcribe",  # 不翻譯，保持原語言
            verbose=True
        )

        print("✅ Whisper 轉換成功")

        # 儲存文稿到檔案
        output_dir = BASE_DIR / "data"
        output_dir.mkdir(exist_ok=True)
        transcript_path = output_dir / f"{video_id}.raw.txt"

        # 添加文件標頭和時間戳
        timestamp = datetime.now().strftime("%Y/%m/%d %H:%M:%S")
        content = f"""# {video_id} 文稿
轉換時間: {timestamp}
轉換工具: openai-whisper (本地模型)
音檔大小: {file_size_mb:.2f} MB

---

{result['text']}
"""

        # 確保內容不為空
        if not result['text'].strip():
            raise ValueError("Whisper 無法從音檔中提取文字內容")

        transcript_path.write_text(content, encoding="utf-8")
        print(f"📝 文稿已儲存至: {transcript_path}")

        # 生成 SRT 字幕檔案
        srt_path = output_dir / f"{video_id}.srt"
        srt_content = generate_srt_from_segments(result.get('segments', []))
        if srt_content:
            srt_path.write_text(srt_content, encoding="utf-8")
            print(f"📺 SRT 字幕已儲存至: {srt_path}")

        # 清理音檔
        _cleanup_audio_files(audio_path)

        return str(transcript_path)

    except Exception as error:
        print(f"❌ Whisper 轉換文稿錯誤: {error}")

        # 建立錯誤文稿檔案
        placeholder_content = f"# {video_id} 文稿\n\n"
        placeholder_content += f"[Whisper 轉換失敗: {error}]\n\n"
        placeholder_content += f"音檔路徑: {audio_path}\n"

        output_dir = BASE_DIR / "data"
        output_dir.mkdir(exist_ok=True)
        transcript_path = output_dir / f"{video_id}.raw.txt"
        transcript_path.write_text(placeholder_content, encoding="utf-8")

        # 仍然嘗試清理音檔
        _cleanup_audio_files(audio_path)

        return str(transcript_path)


def transcript_to_text_fast(audio_path: str, video_id: str) -> str:
    """
    使用更小的模型以提高速度 (tiny 模型)

    Args:
        audio_path: 音檔路徑
        video_id: 影片識別碼

    Returns:
        文稿檔案路徑
    """
    try:
        print("🚀 使用快速模式轉換音檔...")

        # 載入 tiny 模型
        print("🔄 正在載入 Whisper tiny 模型...")
        model = whisper.load_model("tiny")

        # 執行轉換
        result = model.transcribe(
            audio_path,
            language=None,
            task="transcribe",
            verbose=True
        )

        # 儲存文稿
        output_dir = BASE_DIR / "data"
        output_dir.mkdir(exist_ok=True)
        transcript_path = output_dir / f"{video_id}.raw.txt"

        timestamp = datetime.now().strftime("%Y/%m/%d %H:%M:%S")
        content = f"""# {video_id} 文稿 (快速模式)
轉換時間: {timestamp}
轉換工具: openai-whisper Tiny Model (本地)

---

{result['text']}
"""

        transcript_path.write_text(content, encoding="utf-8")
        print(f"📝 快速模式文稿已儲存至: {transcript_path}")

        # 生成 SRT 字幕檔案
        srt_path = output_dir / f"{video_id}.srt"
        srt_content = generate_srt_from_segments(result.get('segments', []))
        if srt_content:
            srt_path.write_text(srt_content, encoding="utf-8")
            print(f"📺 SRT 字幕已儲存至: {srt_path}")

        # 清理音檔
        _cleanup_audio_files(audio_path)

        return str(transcript_path)

    except Exception as error:
        print(f"快速模式轉換錯誤: {error}")
        # 如果快速模式失敗，回退到普通模式
        return transcript_to_text(audio_path, video_id)


def generate_srt_from_segments(segments: list) -> str:
    """
    從 Whisper 的 segments 生成 SRT 字幕內容

    Args:
        segments: Whisper 返回的 segments 列表

    Returns:
        SRT 格式的字幕內容
    """
    if not segments:
        return ""

    srt_lines = []

    for i, segment in enumerate(segments, 1):
        start_time = format_srt_time(segment['start'])
        end_time = format_srt_time(segment['end'])
        text = segment['text'].strip()

        srt_lines.append(f"{i}")
        srt_lines.append(f"{start_time} --> {end_time}")
        srt_lines.append(text)
        srt_lines.append("")  # 空行分隔

    return "\n".join(srt_lines)


def format_srt_time(seconds: float) -> str:
    """
    格式化時間為 SRT 格式 (HH:MM:SS,mmm)

    Args:
        seconds: 秒數

    Returns:
        SRT 時間格式字串
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d},{milliseconds:03d}"


def _cleanup_audio_files(audio_path: str):
    """
    清理音檔檔案

    Args:
        audio_path: 音檔路徑
    """
    audio_extensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg']
    audio_dir = os.path.dirname(audio_path)
    audio_basename = os.path.splitext(os.path.basename(audio_path))[0]

    for ext in audio_extensions:
        audio_file = os.path.join(audio_dir, audio_basename + ext)
        if os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                print(f"🗑️ 已刪除音檔: {audio_file}")
            except Exception as e:
                print(f"⚠️ 無法刪除音檔 {audio_file}: {e}")

    # 刪除原始音檔
    if os.path.exists(audio_path):
        try:
            os.remove(audio_path)
            print(f"🗑️ 已刪除原始音檔: {audio_path}")
        except Exception as e:
            print(f"⚠️ 無法刪除原始音檔: {e}")


if __name__ == "__main__":
    # 測試用
    print("此模組提供 Whisper 語音識別功能")
    print("請使用 main.py 執行完整的影片轉字幕流程")
