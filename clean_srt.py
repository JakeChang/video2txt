"""
SRT 字幕清理工具
清理字幕檔案中嵌入的時間戳記
"""

import os
import re
from pathlib import Path


# 取得專案根目錄
BASE_DIR = Path(__file__).parent


def clean_srt(srt_path: str) -> bool:
    """
    清理單個 SRT 檔案

    Args:
        srt_path: SRT 檔案路徑

    Returns:
        True 如果清理成功
    """
    try:
        print(f"🧹 正在清理: {os.path.basename(srt_path)}")

        # 讀取 SRT 內容
        with open(srt_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 清理字幕文本中的時間戳記 [HH:MM:SS.mmm --> HH:MM:SS.mmm]
        cleaned_content = re.sub(r'\[[\d:.,]+\s*-->\s*[\d:.,]+\]\s*', '', content)

        # 寫回檔案
        with open(srt_path, 'w', encoding='utf-8') as f:
            f.write(cleaned_content)

        print(f"✅ 清理完成: {os.path.basename(srt_path)}")
        return True

    except Exception as error:
        print(f"❌ 清理失敗 {os.path.basename(srt_path)}: {error}")
        return False


def clean_all_srt():
    """清理所有 SRT 檔案"""
    try:
        data_dir = BASE_DIR / "data"

        # 確保目錄存在
        if not data_dir.exists():
            print("⚠️ data 目錄不存在")
            return

        # 讀取目錄中的所有檔案
        files = os.listdir(data_dir)

        # 過濾出 SRT 檔案
        srt_files = [f for f in files if f.endswith('.srt')]

        if not srt_files:
            print("⚠️ 沒有找到任何 SRT 檔案")
            return

        print(f"📁 找到 {len(srt_files)} 個 SRT 檔案")
        print("================================\n")

        success_count = 0
        fail_count = 0

        for srt_file in srt_files:
            srt_path = str(data_dir / srt_file)
            success = clean_srt(srt_path)

            if success:
                success_count += 1
            else:
                fail_count += 1

        print("\n================================")
        print(f"🎉 清理完成！成功: {success_count}, 失敗: {fail_count}")

    except Exception as error:
        print(f"❌ 清理所有 SRT 失敗: {error}")


if __name__ == "__main__":
    clean_all_srt()
