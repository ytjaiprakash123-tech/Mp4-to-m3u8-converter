const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const { PassThrough } = require('stream');
const app = express();

app.use(express.json());

const API_KEY = "d1383831-40c8-4f42-8aa5-4ba29ff5bcdb";
const AUTH_HEADER = "Basic " + Buffer.from(":" + API_KEY).toString('base64');

app.post('/convert', async (req, res) => {
    const { video_url } = req.body; // Input MP4 URL
    if (!video_url) return res.status(400).json({ error: "video_url is required" });

    try {
        console.log("Processing stream conversion...");
        
        // Random ID for unique filename allocation
        const fileId = "stream_" + Math.floor(Math.random() * 100000);
        const m3u8Name = `${fileId}.m3u8`;

        // Create a memory stream block
        const memoryStream = new PassThrough();
        const chunks = [];

        memoryStream.on('data', (chunk) => chunks.push(chunk));
        memoryStream.on('end', async () => {
            const fileBuffer = Buffer.concat(chunks);

            // Directly uploading the generated structure to pixeldrain via PUT stream
            const uploadUrl = `https://pixeldrain.dev/api/file/${m3u8Name}`;
            
            try {
                const pixeldrainResp = await axios.put(uploadUrl, fileBuffer, {
                    headers: {
                        'Authorization': AUTH_HEADER,
                        'Content-Type': 'application/x-mpegURL'
                    }
                });

                if (pixeldrainResp.data.success) {
                    const finalId = pixeldrainResp.data.id;
                    
                    // EXACT RESPONSE FORMAT REQUIRED BY YOU
                    return res.json({
                        "Url": `https://pixeldrain.dev/api/file/${finalId}`
                    });
                } else {
                    res.status(500).json({ error: "Pixeldrain rejected the stream upload" });
                }
            } catch (err) {
                res.status(500).json({ error: "Upload failed", message: err.message });
            }
        });

        // FFmpeg executing operations directly inside RAM buffer streams
        ffmpeg(video_url)
            .addOption('-profile:v', 'baseline')
            .addOption('-level', '3.0')
            .addOption('-start_number', '0')
            .addOption('-hls_time', '10') 
            .addOption('-hls_list_size', '0')
            .format('hls')
            .pipe(memoryStream);

    } catch (e) {
        res.status(500).json({ error: "Conversion Error", details: e.message });
    }
});

app.listen(3000, () => console.log('Pure Stream Converter running on port 3000'));
          
