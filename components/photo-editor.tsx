"use client";
import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface PhotoEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export default function PhotoEditor({ imageUrl, onSave, onCancel }: PhotoEditorProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // When image loads, we can optionally set a default crop
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    // Optionally set default crop
  }

  async function handleSave() {
    if (!imgRef.current) return;
    const image = imgRef.current;
    const canvas = previewCanvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use completedCrop if exists, otherwise crop the whole image
    const cropX = completedCrop?.x ?? 0;
    const cropY = completedCrop?.y ?? 0;
    const cropWidth = completedCrop?.width ?? image.width;
    const cropHeight = completedCrop?.height ?? image.height;

    // Output size
    canvas.width = cropWidth;
    canvas.height = cropHeight;

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.9);
  }

  return (
    <div className="photo-editor-modal" style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', backgroundColor: '#000' }}>
        <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '15px', cursor: 'pointer' }}>
          Cancelar
        </button>
        <button onClick={handleSave} style={{ background: '#fff', border: 'none', color: '#000', fontSize: '15px', fontWeight: '500', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer' }}>
          Guardar
        </button>
      </div>

      {/* Main Edit Area */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backgroundColor: '#000' }}>
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Editor"
            style={{ 
              transform: `scale(${scale}) rotate(${rotate}deg) scaleX(${flipHorizontal ? -1 : 1}) scaleY(${flipVertical ? -1 : 1})`,
              maxHeight: '70vh',
              maxWidth: '100%',
              transition: 'transform 0.3s ease'
            }}
            onLoad={onImageLoad}
          />
        </ReactCrop>
      </div>

      {/* Bottom Toolbar */}
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', gap: '48px', backgroundColor: '#000', borderTop: '1px solid #222' }}>
        
        <button 
          onClick={() => setRotate(r => r - 90)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          <span style={{ fontSize: '12px' }}>Rotar</span>
        </button>
        
        <button 
          onClick={() => setFlipHorizontal(f => !f)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20v-2"/><path d="M12 14v-2"/><path d="M12 8V6"/><path d="M12 2v2"/>
            <path d="M17 22l5-5-5-5v10z"/><path d="M7 22L2 17l5-5v10z"/>
          </svg>
          <span style={{ fontSize: '12px' }}>Espejo H</span>
        </button>

        <button 
          onClick={() => setFlipVertical(f => !f)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
        >
           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h2"/><path d="M10 12h2"/><path d="M16 12h2"/><path d="M22 12h-2"/>
            <path d="M2 17l5 5 5-5H2z"/><path d="M2 7l5-5 5 5H2z"/>
          </svg>
          <span style={{ fontSize: '12px' }}>Espejo V</span>
        </button>

      </div>
    </div>
  );
}
