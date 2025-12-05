"""
影片轉字幕工具 - 主程式
使用 FFmpeg 和 Whisper 將影片轉換為文稿和字幕
"""

import os
import re
import shutil
import subprocess
from pathlib import Path

from transcript import transcript_to_text


# 取得專案根目錄
BASE_DIR = Path(__file__).parent

# 支援的影片格式
SUPPORTED_VIDEO_FORMATS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v']


def check_ffmpeg() -> bool:
    """
    檢查 FFmpeg 是否已安裝

    Returns:
        True 如果 FFmpeg 可用
    """
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ FFmpeg 已就緒")
            return True
        else:
            raise Exception("FFmpeg 返回錯誤")
    except FileNotFoundError:
        print("❌ FFmpeg 未安裝或配置錯誤")
        print("💡 請先安裝 FFmpeg:")
        print("   macOS: brew install ffmpeg")
        print("   Windows: 從 https://ffmpeg.org/download.html 下載")
        print("   Linux: sudo apt-get install ffmpeg")
        return False


def convert_video_to_audio(video_path: str, output_path: str) -> str:
    """
    將影片轉換為音檔

    Args:
        video_path: 影片路徑
        output_path: 輸出音檔路徑

    Returns:
        輸出音檔路徑
    """
    print(f"🎬 正在轉換影片為音檔: {os.path.basename(video_path)}")

    # FFmpeg 指令
    cmd = [
        'ffmpeg',
        '-i', video_path,
        '-vn',  # 不處理視訊
        '-acodec', 'pcm_s16le',  # 使用 PCM 格式
        '-ar', '16000',  # 16kHz 採樣率
        '-ac', '1',  # 單聲道
        '-f', 'wav',  # WAV 格式
        '-y',  # 覆寫現有檔案
        output_path
    ]

    print(f"🔄 FFmpeg 指令: {' '.join(cmd)}")

    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True
        )

        # 等待完成
        stdout, stderr = process.communicate()

        if process.returncode != 0:
            raise Exception(f"FFmpeg 錯誤: {stderr}")

        print(f"✅ 影片轉音檔完成: {output_path}")
        return output_path

    except Exception as error:
        print(f"❌ 影片轉音檔失敗: {error}")
        raise


def convert_transcript_to_srt(transcript_path: str, video_id: str) -> str:
    """
    將文稿轉換為 SRT 字幕格式 (備用方法)

    Args:
        transcript_path: 文稿檔案路徑
        video_id: 影片識別碼

    Returns:
        SRT 檔案路徑
    """
    try:
        print(f"📝 正在轉換文稿為 SRT 字幕: {video_id}")

        with open(transcript_path, 'r', encoding='utf-8') as f:
            transcript_content = f.read()

        # 提取文稿內容（去除標頭資訊）
        content_parts = transcript_content.split('---')
        if len(content_parts) < 2:
            raise ValueError("文稿格式不正確")

        text_content = content_parts[1].strip()

        if not text_content:
            raise ValueError("文稿內容為空")

        # 簡單的字幕分割邏輯（按句號、問號、驚嘆號分割）
        lines = re.split(r'[。！？\n]+', text_content)
        lines = [line.strip() for line in lines if line.strip()]

        srt_lines = []
        subtitle_index = 1

        for i, line in enumerate(lines):
            if not line:
                continue

            # 計算時間戳（每段 3 秒）
            start_time = i * 3
            end_time = (i + 1) * 3

            # 格式化時間戳
            start_time_str = format_srt_time(start_time)
            end_time_str = format_srt_time(end_time)

            srt_lines.append(f"{subtitle_index}")
            srt_lines.append(f"{start_time_str} --> {end_time_str}")
            srt_lines.append(line)
            srt_lines.append("")  # 空行

            subtitle_index += 1

        # 儲存 SRT 檔案
        output_dir = BASE_DIR / "data"
        output_dir.mkdir(exist_ok=True)
        srt_path = output_dir / f"{video_id}.srt"

        srt_path.write_text("\n".join(srt_lines), encoding="utf-8")
        print(f"✅ SRT 字幕檔已儲存至: {srt_path}")

        return str(srt_path)

    except Exception as error:
        print(f"❌ 轉換 SRT 字幕失敗: {error}")
        raise


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


def clean_whisper_srt(video_id: str) -> str | None:
    """
    清理 Whisper 生成的 SRT 檔案格式

    Args:
        video_id: 影片識別碼

    Returns:
        SRT 檔案路徑，如果不存在則返回 None
    """
    try:
        # 檢查 data 目錄中是否已有 SRT 檔案
        output_dir = BASE_DIR / "data"
        srt_path = output_dir / f"{video_id}.srt"

        if not srt_path.exists():
            print(f"⚠️ SRT 檔案不存在: {srt_path}")
            return None

        print(f"🧹 正在清理 Whisper SRT 格式: {video_id}.srt")

        # 讀取 SRT 內容
        content = srt_path.read_text(encoding="utf-8")

        # 清理字幕文本中的時間戳記 [HH:MM:SS.mmm --> HH:MM:SS.mmm]
        cleaned_content = re.sub(r'\[[\d:.,]+\s*-->\s*[\d:.,]+\]\s*', '', content)

        # 寫回檔案
        srt_path.write_text(cleaned_content, encoding="utf-8")
        print(f"✅ SRT 格式清理完成: {srt_path}")

        return str(srt_path)

    except Exception as error:
        print(f"❌ 清理 SRT 格式失敗: {error}")
        return None


def process_video_file(video_path: str) -> dict:
    """
    處理單個影片檔案

    Args:
        video_path: 影片路徑

    Returns:
        處理結果字典
    """
    try:
        video_name = os.path.splitext(os.path.basename(video_path))[0]
        # 清理檔名（保留中英文數字和底線）
        video_id = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fff]', '_', video_name)

        print(f"\n🎯 開始處理影片: {video_name}")
        print(f"📁 影片路徑: {video_path}")

        # 建立暫存目錄
        temp_dir = BASE_DIR / "temp"
        temp_dir.mkdir(exist_ok=True)

        # 音檔輸出路徑
        audio_path = str(temp_dir / f"{video_id}.wav")

        # 步驟 1: 將影片轉換為音檔
        convert_video_to_audio(video_path, audio_path)

        # 步驟 2: 使用 Whisper 轉換音檔為文稿（同時生成 SRT）
        transcript_path = transcript_to_text(audio_path, video_id)

        # 步驟 3: 清理 Whisper 生成的 SRT 格式
        srt_path = clean_whisper_srt(video_id)

        # 如果 Whisper 沒有生成 SRT，則手動生成
        if not srt_path:
            print("⚠️ Whisper 未生成 SRT，使用備用方法生成字幕")
            srt_path = convert_transcript_to_srt(transcript_path, video_id)

        print(f"🎉 影片處理完成: {video_name}")
        print(f"   📝 文稿檔案: {transcript_path}")
        print(f"   📺 字幕檔案: {srt_path}")

        return {
            'video_name': video_name,
            'video_path': video_path,
            'transcript_path': transcript_path,
            'srt_path': srt_path
        }

    except Exception as error:
        print(f"❌ 處理影片失敗: {os.path.basename(video_path)}")
        print(f"   錯誤訊息: {error}")
        raise


def scan_video_directory() -> list:
    """
    掃描影片目錄

    Returns:
        影片檔案路徑列表
    """
    videos_dir = BASE_DIR / "videos"

    try:
        # 確保影片目錄存在
        videos_dir.mkdir(exist_ok=True)

        # 讀取目錄內容
        files = os.listdir(videos_dir)

        # 過濾出影片檔案
        video_files = []
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in SUPPORTED_VIDEO_FORMATS:
                video_files.append(str(videos_dir / file))

        if not video_files:
            print("⚠️ 在 videos 目錄中沒有找到任何影片檔案")
            print(f"📁 支援的格式: {', '.join(SUPPORTED_VIDEO_FORMATS)}")
            return []

        return video_files

    except Exception as error:
        print(f"❌ 掃描影片目錄失敗: {error}")
        raise


def main():
    """主程式"""
    try:
        print("🎬 影片轉字幕工具啟動")
        print("================================")

        # 檢查 FFmpeg
        if not check_ffmpeg():
            return

        # 掃描影片檔案
        print("\n📂 掃描影片目錄...")
        video_files = scan_video_directory()

        if not video_files:
            print("❌ 沒有找到任何影片檔案，程式結束")
            return

        print(f"✅ 找到 {len(video_files)} 個影片檔案:")
        for i, file in enumerate(video_files, 1):
            print(f"   {i}. {os.path.basename(file)}")

        print("\n🎯 使用 Whisper Medium Model 進行轉換")

        # 建立結果目錄
        data_dir = BASE_DIR / "data"
        data_dir.mkdir(exist_ok=True)

        # 處理每個影片檔案
        results = []
        for i, video_file in enumerate(video_files, 1):
            print(f"\n進度: {i}/{len(video_files)}")

            try:
                result = process_video_file(video_file)
                results.append(result)
            except Exception as error:
                print(f"跳過檔案: {os.path.basename(video_file)}")
                results.append({
                    'video_name': os.path.basename(video_file),
                    'video_path': video_file,
                    'error': str(error)
                })

        # 顯示最終結果
        print("\n🎉 處理完成！")
        print("================================")
        print("處理結果摘要:")

        success_count = 0
        error_count = 0

        for result in results:
            if 'error' in result:
                print(f"❌ {result['video_name']}: {result['error']}")
                error_count += 1
            else:
                print(f"✅ {result['video_name']}: 已生成字幕檔案")
                success_count += 1

        print(f"\n總計: {success_count} 成功, {error_count} 失敗")
        print(f"📁 輸出目錄: {data_dir}")

        # 清理暫存目錄
        temp_dir = BASE_DIR / "temp"
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
            print("🧹 已清理暫存檔案")

    except Exception as error:
        print(f"❌ 程式執行失敗: {error}")
        raise


if __name__ == "__main__":
    main()
