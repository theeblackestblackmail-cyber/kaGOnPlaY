import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';

interface VisualizerCanvasProps {
  mode?: 'bars' | 'wave' | 'compact';
  height?: number;
  className?: string;
}

export const VisualizerCanvas: React.FC<VisualizerCanvasProps> = ({
  mode = 'bars',
  height = 100,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = 64;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    // Peak levels for fall-off effect
    const peaks = new Float32Array(bufferLength).fill(0);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, width, h);

      if (mode === 'wave') {
        audioEngine.getWaveformData(timeData);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff3e3e';
        ctx.shadowColor = 'rgba(255, 62, 62, 0.6)';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * h) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, h / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Bars spectrum
        audioEngine.getFrequencyData(freqData);

        const barCount = mode === 'compact' ? 32 : 48;
        const totalGap = (barCount - 1) * 2;
        const barWidth = Math.max(2, (width - totalGap) / barCount);

        const gradient = ctx.createLinearGradient(0, h, 0, 0);
        gradient.addColorStop(0, '#141418');
        gradient.addColorStop(0.3, '#ff3e3e');
        gradient.addColorStop(0.85, '#f43f5e');
        gradient.addColorStop(1, '#ffffff');

        for (let i = 0; i < barCount; i++) {
          const val = freqData[i] || 0;
          const barHeight = Math.max(3, (val / 255) * (h - 6));
          const x = i * (barWidth + 2);
          const y = h - barHeight;

          // Peak falloff
          if (barHeight > peaks[i]) {
            peaks[i] = barHeight;
          } else {
            peaks[i] = Math.max(0, peaks[i] - 1.2);
          }

          // Draw active bar
          ctx.fillStyle = gradient;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Draw glowing peak indicator
          ctx.fillStyle = '#ff3e3e';
          ctx.fillRect(x, h - peaks[i] - 2, barWidth, 1.5);
        }
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      className={`w-full block rounded-lg ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
