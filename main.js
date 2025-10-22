const fs = require('fs-extra');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { transcriptToText } = require('./transcript');

// 支援的影片格式
const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

// 檢查 ffmpeg 是否已安裝
function checkFFmpeg() {
    return new Promise((resolve, reject) => {
        ffmpeg.getAvailableFormats((err, formats) => {
            if (err) {
                console.error('❌ FFmpeg 未安裝或配置錯誤');
                console.log('💡 請先安裝 FFmpeg:');
                console.log('   macOS: brew install ffmpeg');
                console.log('   Windows: 從 https://ffmpeg.org/download.html 下載');
                console.log('   Linux: sudo apt-get install ffmpeg');
                reject(err);
            } else {
                console.log('✅ FFmpeg 已就緒');
                resolve(formats);
            }
        });
    });
}

// 將影片轉換為音檔
async function convertVideoToAudio(videoPath, outputPath) {
    return new Promise((resolve, reject) => {
        console.log(`🎬 正在轉換影片為音檔: ${path.basename(videoPath)}`);
        
        ffmpeg(videoPath)
            .output(outputPath)
            .audioCodec('pcm_s16le')  // 使用 PCM 格式，相容性最好
            .audioFrequency(16000)    // 16kHz 採樣率，適合語音識別
            .audioChannels(1)         // 單聲道，減少檔案大小
            .format('wav')            // WAV 格式
            .on('start', (commandLine) => {
                console.log('🔄 FFmpeg 指令:', commandLine);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`📊 轉換進度: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                console.log(`✅ 影片轉音檔完成: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('❌ 影片轉音檔失敗:', err.message);
                reject(err);
            })
            .run();
    });
}

// 將文稿轉換為 SRT 字幕格式
async function convertTranscriptToSRT(transcriptPath, videoId) {
    try {
        console.log(`📝 正在轉換文稿為 SRT 字幕: ${videoId}`);
        
        const transcriptContent = await fs.readFile(transcriptPath, 'utf8');
        
        // 提取文稿內容（去除標頭資訊）
        const contentParts = transcriptContent.split('---');
        if (contentParts.length < 2) {
            throw new Error('文稿格式不正確');
        }
        
        const textContent = contentParts[1].trim();
        
        if (!textContent) {
            throw new Error('文稿內容為空');
        }
        
        // 簡單的字幕分割邏輯（每 50 字一段，每段 3 秒）
        const lines = textContent.split(/[。！？\n]+/).filter(line => line.trim());
        let srtContent = '';
        let subtitleIndex = 1;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // 計算時間戳（每段 3 秒）
            const startTime = i * 3;
            const endTime = (i + 1) * 3;
            
            // 格式化時間戳為 SRT 格式
            const startTimeStr = formatSRTTime(startTime);
            const endTimeStr = formatSRTTime(endTime);
            
            // 添加字幕條目
            srtContent += `${subtitleIndex}\n`;
            srtContent += `${startTimeStr} --> ${endTimeStr}\n`;
            srtContent += `${line}\n\n`;
            
            subtitleIndex++;
        }
        
        // 儲存 SRT 檔案
        const outputDir = path.join(__dirname, 'data');
        await fs.ensureDir(outputDir);
        const srtPath = path.join(outputDir, `${videoId}.srt`);
        
        await fs.writeFile(srtPath, srtContent, 'utf8');
        console.log(`✅ SRT 字幕檔已儲存至: ${srtPath}`);
        
        return srtPath;
        
    } catch (error) {
        console.error('❌ 轉換 SRT 字幕失敗:', error.message);
        throw error;
    }
}

// 格式化時間為 SRT 格式 (HH:MM:SS,mmm)
function formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

// 清理 Whisper 生成的 SRT 檔案格式
async function cleanWhisperSRT(videoId) {
    try {
        // Whisper 在 temp 目錄生成 SRT，檔名為 ${videoId}.wav.srt
        const tempDir = path.join(__dirname, 'temp');
        const sourceSrtPath = path.join(tempDir, `${videoId}.wav.srt`);

        // 檢查 Whisper 生成的 SRT 檔案是否存在
        if (!await fs.pathExists(sourceSrtPath)) {
            console.log(`⚠️ Whisper SRT 檔案不存在: ${sourceSrtPath}`);
            return null;
        }

        console.log(`🧹 正在清理 Whisper SRT 格式: ${videoId}.wav.srt`);

        // 讀取 SRT 內容
        const content = await fs.readFile(sourceSrtPath, 'utf8');

        // 清理字幕文本中的時間戳記 [HH:MM:SS.mmm --> HH:MM:SS.mmm]
        // 並移除前後多餘的空格
        const cleanedContent = content.replace(/\[[\d:.,]+\s*-->\s*[\d:.,]+\]\s*/g, '');

        // 將清理後的 SRT 儲存到 data 目錄
        const outputDir = path.join(__dirname, 'data');
        await fs.ensureDir(outputDir);
        const outputSrtPath = path.join(outputDir, `${videoId}.srt`);

        await fs.writeFile(outputSrtPath, cleanedContent, 'utf8');

        console.log(`✅ SRT 格式清理完成: ${outputSrtPath}`);

        // 刪除 temp 目錄中的原始 SRT 檔案
        await fs.remove(sourceSrtPath);
        console.log(`🗑️ 已刪除暫存 SRT: ${sourceSrtPath}`);

        return outputSrtPath;

    } catch (error) {
        console.error('❌ 清理 SRT 格式失敗:', error.message);
        return null;
    }
}

// 處理單個影片檔案
async function processVideoFile(videoPath) {
    try {
        const videoName = path.basename(videoPath, path.extname(videoPath));
        const videoId = videoName.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_'); // 清理檔名
        
        console.log(`\n🎯 開始處理影片: ${videoName}`);
        console.log(`📁 影片路徑: ${videoPath}`);
        
        // 建立暫存目錄
        const tempDir = path.join(__dirname, 'temp');
        await fs.ensureDir(tempDir);
        
        // 音檔輸出路徑
        const audioPath = path.join(tempDir, `${videoId}.wav`);
        
        // 步驟 1: 將影片轉換為音檔
        await convertVideoToAudio(videoPath, audioPath);
        
        // 步驟 2: 使用 Whisper 轉換音檔為文稿（同時生成 SRT）
        const transcriptPath = await transcriptToText(audioPath, videoId);

        // 步驟 3: 清理 Whisper 生成的 SRT 格式
        let srtPath = await cleanWhisperSRT(videoId);

        // 如果 Whisper 沒有生成 SRT，則手動生成
        if (!srtPath) {
            console.log('⚠️ Whisper 未生成 SRT，使用備用方法生成字幕');
            srtPath = await convertTranscriptToSRT(transcriptPath, videoId);
        }
        
        console.log(`🎉 影片處理完成: ${videoName}`);
        console.log(`   📝 文稿檔案: ${transcriptPath}`);
        console.log(`   📺 字幕檔案: ${srtPath}`);
        
        return {
            videoName,
            videoPath,
            transcriptPath,
            srtPath
        };
        
    } catch (error) {
        console.error(`❌ 處理影片失敗: ${path.basename(videoPath)}`);
        console.error(`   錯誤訊息: ${error.message}`);
        throw error;
    }
}

// 掃描影片目錄
async function scanVideoDirectory() {
    const videosDir = path.join(__dirname, 'videos');
    
    try {
        // 確保影片目錄存在
        await fs.ensureDir(videosDir);
        
        // 讀取目錄內容
        const files = await fs.readdir(videosDir);
        
        // 過濾出影片檔案
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return SUPPORTED_VIDEO_FORMATS.includes(ext);
        });
        
        if (videoFiles.length === 0) {
            console.log('⚠️ 在 videos 目錄中沒有找到任何影片檔案');
            console.log(`📁 支援的格式: ${SUPPORTED_VIDEO_FORMATS.join(', ')}`);
            return [];
        }
        
        // 返回完整路徑
        return videoFiles.map(file => path.join(videosDir, file));
        
    } catch (error) {
        console.error('❌ 掃描影片目錄失敗:', error.message);
        throw error;
    }
}

// 主程式
async function main() {
    try {
        console.log('🎬 影片轉字幕工具啟動');
        console.log('================================');
        
        // 檢查 FFmpeg
        await checkFFmpeg();
        
        // 掃描影片檔案
        console.log('\n📂 掃描影片目錄...');
        const videoFiles = await scanVideoDirectory();
        
        if (videoFiles.length === 0) {
            console.log('❌ 沒有找到任何影片檔案，程式結束');
            return;
        }
        
        console.log(`✅ 找到 ${videoFiles.length} 個影片檔案:`);
        videoFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${path.basename(file)}`);
        });
        
        console.log('\n🎯 使用 Whisper Medium Model 進行轉換');
        
        // 建立結果目錄
        const dataDir = path.join(__dirname, 'data');
        await fs.ensureDir(dataDir);
        
        // 處理每個影片檔案
        const results = [];
        for (let i = 0; i < videoFiles.length; i++) {
            const videoFile = videoFiles[i];
            console.log(`\n進度: ${i + 1}/${videoFiles.length}`);
            
            try {
                const result = await processVideoFile(videoFile);
                results.push(result);
            } catch (error) {
                console.error(`跳過檔案: ${path.basename(videoFile)}`);
                results.push({
                    videoName: path.basename(videoFile),
                    videoPath: videoFile,
                    error: error.message
                });
            }
        }
        
        // 顯示最終結果
        console.log('\n🎉 處理完成！');
        console.log('================================');
        console.log('處理結果摘要:');
        
        let successCount = 0;
        let errorCount = 0;
        
        results.forEach((result, index) => {
            if (result.error) {
                console.log(`❌ ${result.videoName}: ${result.error}`);
                errorCount++;
            } else {
                console.log(`✅ ${result.videoName}: 已生成字幕檔案`);
                successCount++;
            }
        });
        
        console.log(`\n總計: ${successCount} 成功, ${errorCount} 失敗`);
        console.log(`📁 輸出目錄: ${dataDir}`);
        
        // 清理暫存目錄
        const tempDir = path.join(__dirname, 'temp');
        if (await fs.pathExists(tempDir)) {
            await fs.remove(tempDir);
            console.log('🧹 已清理暫存檔案');
        }
        
    } catch (error) {
        console.error('❌ 程式執行失敗:', error.message);
        process.exit(1);
    }
}

// 如果直接執行此檔案，則運行主程式
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    main,
    processVideoFile,
    scanVideoDirectory,
    convertVideoToAudio,
    convertTranscriptToSRT,
    cleanWhisperSRT
}; 