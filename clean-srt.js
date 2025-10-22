const fs = require('fs-extra');
const path = require('path');

// 清理單個 SRT 檔案
async function cleanSRT(srtPath) {
    try {
        console.log(`🧹 正在清理: ${path.basename(srtPath)}`);

        // 讀取 SRT 內容
        const content = await fs.readFile(srtPath, 'utf8');

        // 清理字幕文本中的時間戳記 [HH:MM:SS.mmm --> HH:MM:SS.mmm]
        const cleanedContent = content.replace(/\[[\d:.,]+\s*-->\s*[\d:.,]+\]\s*/g, '');

        // 寫回檔案
        await fs.writeFile(srtPath, cleanedContent, 'utf8');

        console.log(`✅ 清理完成: ${path.basename(srtPath)}`);
        return true;

    } catch (error) {
        console.error(`❌ 清理失敗 ${path.basename(srtPath)}:`, error.message);
        return false;
    }
}

// 清理所有 SRT 檔案
async function cleanAllSRT() {
    try {
        const dataDir = path.join(__dirname, 'data');

        // 讀取目錄中的所有檔案
        const files = await fs.readdir(dataDir);

        // 過濾出 SRT 檔案
        const srtFiles = files.filter(file => file.endsWith('.srt'));

        if (srtFiles.length === 0) {
            console.log('⚠️ 沒有找到任何 SRT 檔案');
            return;
        }

        console.log(`📁 找到 ${srtFiles.length} 個 SRT 檔案`);
        console.log('================================\n');

        let successCount = 0;
        let failCount = 0;

        for (const srtFile of srtFiles) {
            const srtPath = path.join(dataDir, srtFile);
            const success = await cleanSRT(srtPath);

            if (success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        console.log('\n================================');
        console.log(`🎉 清理完成！成功: ${successCount}, 失敗: ${failCount}`);

    } catch (error) {
        console.error('❌ 清理所有 SRT 失敗:', error.message);
    }
}

// 執行清理
if (require.main === module) {
    cleanAllSRT().catch(console.error);
}

module.exports = { cleanSRT, cleanAllSRT };
