import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSave: (base64: string) => void;
  onClear: () => void;
}

export default function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle responsive sizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      // Set buffer width/height based on display width/height to avoid pixelation
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1e293b'; // Slate 800
        ctx.lineWidth = 2.5;
        
        // draw helper dotted baseline
        drawBaseline(ctx, rect.width, rect.height);
      }
    };

    // Delay slightly to ensure client bounding rect matches rendered size
    const timer = setTimeout(resizeCanvas, 50);
    
    // Listen for resize
    window.addEventListener('resize', resizeCanvas);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const drawBaseline = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = '#cbd5e1'; // slate-200
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, height - 35);
    ctx.lineTo(width - 20, height - 35);
    ctx.stroke();
    ctx.restore();
  };

  // Coordinates helper
  const getCoordinates = (e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Check if Touch
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    } else if ('nativeEvent' in e && e.nativeEvent && 'touches' in e.nativeEvent) {
      const nativeTouch = (e.nativeEvent as any).touches;
      if (nativeTouch && nativeTouch.length > 0) {
        const touch = nativeTouch[0];
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top
        };
      }
    }

    // Mouse event
    const mouseEvent = e as MouseEvent | React.MouseEvent;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling on touch devices when signing
    if (e.cancelable) {
      e.preventDefault();
    }
    
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) {
      e.preventDefault();
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save to parent state as Base64 image
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redraw dotted baseline
    const rect = canvas.getBoundingClientRect();
    drawBaseline(ctx, rect.width, rect.height);
    
    setHasSigned(false);
    onClear();
  };

  // Simulate signature for easier verification/testing
  const handleSimulate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    handleClear();
    
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.save();
    ctx.strokeStyle = '#2563eb'; // Blue 600
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw pre-made professional aesthetic wave representing signature
    ctx.beginPath();
    // Capital letter
    ctx.moveTo(w * 0.15, h * 0.6);
    ctx.bezierCurveTo(w * 0.1, h * 0.2, w * 0.25, h * 0.1, w * 0.2, h * 0.65);
    // Connect to tail
    ctx.bezierCurveTo(w * 0.22, h * 0.75, w * 0.3, h * 0.5, w * 0.35, h * 0.55);
    // Dynamic mini waves
    ctx.quadraticCurveTo(w * 0.4, h * 0.45, w * 0.45, h * 0.55);
    ctx.quadraticCurveTo(w * 0.5, h * 0.48, w * 0.55, h * 0.53);
    ctx.quadraticCurveTo(w * 0.6, h * 0.49, w * 0.68, h * 0.52);
    // Flourish cross line / line under typical signature
    ctx.moveTo(w * 0.12, h * 0.7);
    ctx.quadraticCurveTo(w * 0.4, h * 0.75, w * 0.85, h * 0.62);
    
    ctx.stroke();
    ctx.restore();

    setHasSigned(true);
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Assinatura Digital do Recebedor <span className="text-rose-500">*</span>
        </label>
        
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSimulate}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-650 hover:text-blue-750 bg-blue-50 hover:bg-blue-100 rounded-lg px-2 py-0.5 cursor-pointer"
            id="btn-auto-signature"
            title="Preencher com rubrica eletrônica de demonstração"
          >
            <Sparkles className="h-2.5 w-2.5 text-blue-500" /> Auto-Rubrica
          </button>
          
          {hasSigned && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-0.5 cursor-pointer"
              id="btn-clear-signature"
            >
              <Eraser className="h-2.5 w-2.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 hover:border-slate-400 transition-colors">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="block h-36 w-full cursor-crosshair touch-none"
        />
        
        {!hasSigned && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center p-4">
            <div>
              <p className="text-[11px] font-bold text-slate-400">Assine com o dedo ou mouse neste campo</p>
              <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wide">Área Digital Segura</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
