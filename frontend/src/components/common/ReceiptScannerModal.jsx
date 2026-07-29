import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReceiptScannerModal({ onClose }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);

  // Initialize camera stream
  useEffect(() => {
    async function startCamera() {
      try {
        setError(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Camera access error:', err);
        setError('Không thể truy cập camera. Vui lòng sử dụng tính năng tải ảnh từ máy.');
      }
    }
    startCamera();

    // Cleanup: stop camera tracks when modal closes or unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Shared function to call Gemini API
  const processImageWithGemini = async (base64Data, mimeType = 'image/jpeg') => {
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is not defined in environment variables.');
      }

      const promptText = `Bạn là một trợ lý ảo phân tích hóa đơn. Hãy đọc hóa đơn tiếng Việt trong ảnh này. Trả về cho tôi duy nhất một object JSON (không dùng markdown, không có text dư thừa, không bao quanh bằng ba dấu nháy ngược \`\`\`) với các trường sau:
{
  "amount": <số tổng tiền cuối cùng, kiểu number>,
  "currency": "VND",
  "date": "<ngày trên hóa đơn, định dạng YYYY-MM-DD>",
  "description": "<Mô tả ngắn gọn bằng tiếng Việt, ví dụ: Ăn trưa tại quán X>",
  "category": "<Chọn 1 trong các từ sau: Food, Transport, Tickets, Accommodation, Other>"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ]
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error ${response.status}: ${errorData.error?.message || 'Unknown Gemini API error'}`);
      }

      const data = await response.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      console.log("Raw Gemini Response:", rawText);

      // Clean up markdown blocks case-insensitively
      const cleanText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      let parsedResult;
      try {
        parsedResult = JSON.parse(cleanText);
      } catch (jsonErr) {
        throw new Error("Gemini returned invalid JSON. Check console for raw text.");
      }
      
      // Redirect to expenses form and pass scannedData
      navigate('/expenses', { state: { scannedData: parsedResult } });
      onClose();
    } catch (err) {
      console.error('Gemini OCR API error:', err);
      alert("Lỗi hệ thống:\n" + err.message);
      onClose();
    } finally {
      setProcessing(false);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions equal to current video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame on canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Capture the base64 data URL
    const dataUrl = canvas.toDataURL('image/jpeg');
    const base64Data = dataUrl.split(',')[1]; // Strip prefix

    // Stop live tracks
    stream.getTracks().forEach(track => track.stop());

    setCapturedImage(dataUrl);
    setProcessing(true);

    processImageWithGemini(base64Data, 'image/jpeg');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Detect MIME type
    const mimeType = file.type || 'image/jpeg';

    // Stop live camera tracks immediately to release webcam
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    setProcessing(true);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setCapturedImage(dataUrl);
      const base64Data = dataUrl.split(',')[1];
      processImageWithGemini(base64Data, mimeType);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#191c1d] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
        />

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 bg-black/30 z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0058be] text-[22px]">photo_camera</span>
            <span className="text-sm font-bold text-white">Quét hóa đơn trực tuyến</span>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Video / Scanner body */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {processing ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20 space-y-4">
              {capturedImage && (
                <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-contain opacity-40 filter blur-sm" />
              )}
              <span className="animate-spin text-[36px] text-white material-symbols-outlined">progress_activity</span>
              <p className="text-xs font-bold text-white tracking-wider animate-pulse">Đang nhận diện ký tự OCR...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <span className="material-symbols-outlined text-[#727785] text-[48px] block">videocam_off</span>
              <p className="text-xs text-gray-300 leading-relaxed max-w-xs mx-auto">{error}</p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-bold bg-[#0058be] hover:bg-[#2170e4] text-white px-4 py-2 rounded-xl transition-all"
              >
                Chọn ảnh từ máy
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Target Cutout Overlay Mask */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-[80%] h-[75%] border-2 border-dashed border-[#0058be] rounded-xl flex items-center justify-center bg-transparent">
                  {/* Glowing Laser Scan Bar */}
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#0058be] to-transparent shadow-[0_0_12px_#0058be] animate-scan-laser top-0"></div>
                </div>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Actions panel */}
        {!processing && (
          <div className="p-6 bg-black/40 border-t border-white/10 flex justify-center gap-3 z-10">
            {!error && (
              <button 
                onClick={handleCapture}
                className="px-5 py-2.5 bg-[#0058be] hover:bg-[#2170e4] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#0058be]/20"
              >
                <span className="material-symbols-outlined text-[16px]">capture</span>
                Chụp và phân tích
              </button>
            )}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-2 border border-white/20 transition-all hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px]">upload</span>
              Tải ảnh từ máy
            </button>
          </div>
        )}

      </div>

      {/* Embedded laser scanning keyframes animation */}
      <style>{`
        @keyframes scan-laser {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan-laser {
          animation: scan-laser 2.2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
