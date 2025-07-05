const { nodewhisper } = require('nodejs-whisper');
const fs = require('fs-extra');
const path = require('path');

// 將音檔轉換為文稿 (使用本地 Whisper)
async function transcriptToText(audioPath, videoId) {
    try {
        console.log(`🎙️ 開始使用本地 Whisper 轉換音檔: ${audioPath}`);
        
        // 檢查檔案是否存在
        if (!await fs.pathExists(audioPath)) {
            throw new Error('音檔檔案不存在');
        }
        
        // 檢查檔案大小（太大的檔案可能需要很長時間處理）
        const stats = await fs.stat(audioPath);
        const fileSizeMB = stats.size / (1024 * 1024);
        console.log(`📁 音檔大小: ${fileSizeMB.toFixed(2)} MB`);
        
        if (fileSizeMB > 100) {
            console.log('⚠️ 警告: 音檔檔案較大，轉換可能需要較長時間');
        }
        
        // 使用 nodejs-whisper 轉換音檔
        console.log('🔄 正在使用 Whisper 模型轉換音檔...');
        
        const whisperOptions = {
            modelName: 'medium',                        // 使用 base 模型平衡速度和準確度
            autoDownloadModelName: 'medium',            // 自動下載模型（如果需要）
            removeWavFileAfterTranscription: false,   // 保留暫存檔案以便偵錯
            withCuda: false,                          // 不使用 CUDA，使用 CPU
            logger: console,                          // 使用 console 記錄
            whisperOptions: {
                outputInText: true,                   // 輸出文字檔案
                outputInSrt: true,                   // 不需要字幕檔
                outputInJson: false,                  // 不需要 JSON 檔
                outputInVtt: false,                   // 不需要 VTT 檔
                translateToEnglish: false,            // 不翻譯成英文，保持原語言
                wordTimestamps: false,                // 不需要單詞級時間戳
                timestamps_length: 20,                // 對話片段長度
                splitOnWord: true,                    // 按單詞分割而非標記
            }
        };
        
        // 執行轉換
        const result = await nodewhisper(audioPath, whisperOptions);
        
        console.log('✅ Whisper 轉換成功');
        
        // 儲存文稿到檔案
        const outputDir = path.join(__dirname, '..', 'data');
        await fs.ensureDir(outputDir);
        const transcriptPath = path.join(outputDir, `${videoId}.raw.txt`);
        
        // 添加文件標頭和時間戳
        const timestamp = new Date().toLocaleString('zh-TW');
        let content = `# ${videoId} 文稿
轉換時間: ${timestamp}
轉換工具: nodejs-whisper (本地模型)
音檔大小: ${fileSizeMB.toFixed(2)} MB

---

`;
        
        // 處理轉換結果
        if (typeof result === 'string') {
            content += result;
        } else if (result && result.text) {
            content += result.text;
        } else {
            // 嘗試讀取自動生成的文字檔案
            const autoTextFile = audioPath.replace(/\.[^/.]+$/, '.txt');
            if (await fs.pathExists(autoTextFile)) {
                const autoText = await fs.readFile(autoTextFile, 'utf8');
                content += autoText;
                // 清理自動生成的檔案
                await fs.remove(autoTextFile);
                console.log(`🧹 已清理自動生成的文字檔: ${autoTextFile}`);
            } else {
                throw new Error('無法取得轉換結果');
            }
        }
        
        // 確保內容不為空
        if (!content.split('---')[1]?.trim()) {
            throw new Error('Whisper 無法從音檔中提取文字內容');
        }
        
        await fs.writeFile(transcriptPath, content, 'utf8');
        console.log(`📝 文稿已儲存至: ${transcriptPath}`);
        
        // 清理所有音檔 (MP3, WAV 等)
        const audioDir = path.dirname(audioPath);
        const audioBaseName = path.basename(audioPath, path.extname(audioPath));
        
        // 定義可能的音檔副檔名
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
        
        for (const ext of audioExtensions) {
            const audioFile = path.join(audioDir, audioBaseName + ext);
            if (await fs.pathExists(audioFile)) {
                await fs.remove(audioFile);
                console.log(`🗑️ 已刪除音檔: ${audioFile}`);
            }
        }
        
        // 刪除原始音檔（確保清理）
        if (await fs.pathExists(audioPath)) {
            await fs.remove(audioPath);
            console.log(`🗑️ 已刪除原始音檔: ${audioPath}`);
        }
        
        // 清理可能存在的 .wav.txt 檔案並重新命名
        const oldTxtPath = path.join(outputDir, `${videoId}.wav.txt`);
        if (await fs.pathExists(oldTxtPath)) {
            await fs.remove(oldTxtPath);
            console.log(`🧹 已清理舊格式文字檔: ${oldTxtPath}`);
        }
        
        return transcriptPath;
        
    } catch (error) {
        console.error('❌ nodejs-whisper 轉換文稿錯誤:', error.message);
        
        // 處理不同類型的錯誤
        let placeholderContent = `# ${videoId} 文稿\n\n`;
        
        if (error.message.includes('whisper not found') || error.message.includes('make') || error.message.includes('build')) {
            console.log('💡 提示: 請安裝編譯工具和下載 Whisper 模型');
            placeholderContent += `[nodejs-whisper 轉換失敗: 缺少編譯工具或模型]\n\n`;
            placeholderContent += `請執行以下指令:\n`;
            placeholderContent += `1. 安裝編譯工具: brew install make (macOS)\n`;
            placeholderContent += `2. 下載模型: npx nodejs-whisper download\n\n`;
        } else if (error.message.includes('ENOENT') || error.message.includes('檔案不存在')) {
            placeholderContent += `[nodejs-whisper 轉換失敗: 音檔檔案不存在]\n\n`;
        } else if (error.message.includes('timeout') || error.message.includes('killed')) {
            placeholderContent += `[nodejs-whisper 轉換失敗: 處理超時或被中斷]\n\n`;
            placeholderContent += `音檔可能太大或系統資源不足\n\n`;
        } else {
            placeholderContent += `[nodejs-whisper 轉換失敗: ${error.message}]\n\n`;
        }
        
        placeholderContent += `音檔路徑: ${audioPath}\n`;
        placeholderContent += `錯誤詳情: ${error.message}`;
        
        // 建立錯誤文稿檔案 (使用 .raw.txt 格式)
        const outputDir = path.join(__dirname, '..', 'data');
        await fs.ensureDir(outputDir);
        const transcriptPath = path.join(outputDir, `${videoId}.raw.txt`);
        await fs.writeFile(transcriptPath, placeholderContent, 'utf8');
        
        // 仍然嘗試清理所有音檔以節省空間
        try {
            const audioDir = path.dirname(audioPath);
            const audioBaseName = path.basename(audioPath, path.extname(audioPath));
            const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
            
            for (const ext of audioExtensions) {
                const audioFile = path.join(audioDir, audioBaseName + ext);
                if (await fs.pathExists(audioFile)) {
                    await fs.remove(audioFile);
                    console.log(`🗑️ 已刪除音檔: ${audioFile}`);
                }
            }
            
            // 刪除原始音檔
            if (await fs.pathExists(audioPath)) {
                await fs.remove(audioPath);
                console.log(`🗑️ 已刪除原始音檔: ${audioPath}`);
            }
        } catch (removeError) {
            console.log(`⚠️ 無法刪除音檔: ${removeError.message}`);
        }
        
        return transcriptPath;
    }
}

// 使用更小的模型以提高速度
async function transcriptToTextFast(audioPath, videoId) {
    try {
        console.log('🚀 使用快速模式轉換音檔...');
        
        const fastOptions = {
            modelName: 'tiny',                        // 使用最小模型，速度最快
            autoDownloadModelName: 'tiny',            // 自動下載 tiny 模型
            removeWavFileAfterTranscription: false,   // 保留暫存檔案
            withCuda: false,                          // 使用 CPU
            logger: console,
            whisperOptions: {
                outputInText: true,
                outputInSrt: false,
                outputInJson: false,
                translateToEnglish: false,
                wordTimestamps: false,
                timestamps_length: 20,
                splitOnWord: true,
            }
        };
        
        const result = await nodewhisper(audioPath, fastOptions);
        
        // 儲存文稿 (使用 .raw.txt 格式)
        const outputDir = path.join(__dirname, '..', 'data');
        await fs.ensureDir(outputDir);
        const transcriptPath = path.join(outputDir, `${videoId}.raw.txt`);
        
        const timestamp = new Date().toLocaleString('zh-TW');
        let content = `# ${videoId} 文稿 (快速模式)
轉換時間: ${timestamp}
轉換工具: nodejs-whisper Tiny Model (本地)

---

`;
        
        // 處理轉換結果
        if (typeof result === 'string') {
            content += result;
        } else if (result && result.text) {
            content += result.text;
        } else {
            // 嘗試讀取自動生成的文字檔案
            const autoTextFile = audioPath.replace(/\.[^/.]+$/, '.txt');
            if (await fs.pathExists(autoTextFile)) {
                const autoText = await fs.readFile(autoTextFile, 'utf8');
                content += autoText;
                await fs.remove(autoTextFile);
            } else {
                throw new Error('快速模式無法取得轉換結果');
            }
        }
        
        await fs.writeFile(transcriptPath, content, 'utf8');
        console.log(`📝 快速模式文稿已儲存至: ${transcriptPath}`);
        
        // 清理所有音檔 (MP3, WAV 等)
        const audioDir = path.dirname(audioPath);
        const audioBaseName = path.basename(audioPath, path.extname(audioPath));
        const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg'];
        
        for (const ext of audioExtensions) {
            const audioFile = path.join(audioDir, audioBaseName + ext);
            if (await fs.pathExists(audioFile)) {
                await fs.remove(audioFile);
                console.log(`🗑️ 已刪除音檔: ${audioFile}`);
            }
        }
        
        // 刪除原始音檔
        if (await fs.pathExists(audioPath)) {
            await fs.remove(audioPath);
            console.log(`🗑️ 已刪除原始音檔: ${audioPath}`);
        }
        
        return transcriptPath;
        
    } catch (error) {
        console.error('快速模式轉換錯誤:', error.message);
        // 如果快速模式失敗，回退到普通模式
        return await transcriptToText(audioPath, videoId);
    }
}

module.exports = {
    transcriptToText,
    transcriptToTextFast
}; 