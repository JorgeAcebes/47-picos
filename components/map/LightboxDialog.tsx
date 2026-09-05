import React from "react";
const IconClose = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface LightboxDialogProps {
  lightboxPhoto: any;
  hasPrevPhoto: boolean;
  hasNextPhoto: boolean;
  showPrevPhoto: () => void;
  showNextPhoto: () => void;
  isReadOnly: boolean;
  lightboxMenuOpen: boolean;
  setLightboxMenuOpen: (open: boolean) => void;
  setEditorPhoto: (photo: any) => void;
  setLightboxNewCaption: (caption: string) => void;
  setLightboxCaptionModalOpen: (open: boolean) => void;
  deletePhoto: (photo: any) => void;
  isPeaks: boolean;
  selected: any;
  ascents: any[];
  currentPhotoGroup: any[];
  lightboxIndex: number;
  setLightboxPhoto: (photo: any) => void;
  lightboxCaptionModalOpen: boolean;
  lightboxNewCaption: string;
  handleSaveCaption: () => void;
  saving: boolean;
  formatShortDate: (date: string) => string;
}

export function LightboxDialog({
  lightboxPhoto,
  hasPrevPhoto,
  hasNextPhoto,
  showPrevPhoto,
  showNextPhoto,
  isReadOnly,
  lightboxMenuOpen,
  setLightboxMenuOpen,
  setEditorPhoto,
  setLightboxNewCaption,
  setLightboxCaptionModalOpen,
  deletePhoto,
  isPeaks,
  selected,
  ascents,
  currentPhotoGroup,
  lightboxIndex,
  setLightboxPhoto,
  lightboxCaptionModalOpen,
  lightboxNewCaption,
  handleSaveCaption,
  saving,
  formatShortDate
}: LightboxDialogProps) {
  if (!lightboxPhoto) return null;

  return (
    <div
      className="lightbox-backdrop"
      onClick={() => window.history.back()}
    >
      {hasPrevPhoto && (
        <button className="lightbox-nav lightbox-nav--prev" onClick={(e) => { e.stopPropagation(); showPrevPhoto(); }} aria-label="Foto anterior">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
      )}
      {hasNextPhoto && (
        <button className="lightbox-nav lightbox-nav--next" onClick={(e) => { e.stopPropagation(); showNextPhoto(); }} aria-label="Foto siguiente">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      )}
      <button
        className="lightbox-close"
        onClick={(e) => {
          e.stopPropagation();
          window.history.back();
        }}
        aria-label="Cerrar imagen"
      >
        <IconClose />
      </button>
      {!isReadOnly && (
        <>
          <button
            className="lightbox-menu-btn"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxMenuOpen(!lightboxMenuOpen);
            }}
            aria-label="Opciones"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <circle cx="12" cy="5" r="2"></circle>
              <circle cx="12" cy="12" r="2"></circle>
              <circle cx="12" cy="19" r="2"></circle>
            </svg>
          </button>
          {lightboxMenuOpen && (
            <div className="lightbox-dropdown">
              <button onClick={(e) => {
                e.stopPropagation();
                setLightboxMenuOpen(false);
                setEditorPhoto(lightboxPhoto);
                window.history.pushState(null, "", "#editor");
              }}>Editar foto</button>
              <button onClick={(e) => {
                e.stopPropagation();
                setLightboxMenuOpen(false);
                setLightboxNewCaption(lightboxPhoto.caption || "");
                setLightboxCaptionModalOpen(true);
              }}>Descripción</button>

              <button className="danger" onClick={(e) => {
                e.stopPropagation();
                setLightboxMenuOpen(false);
                deletePhoto(lightboxPhoto);
              }}>Eliminar</button>
            </div>
          )}
        </>
      )}
      <img
        key={lightboxPhoto.id}
        className="lightbox-image"
        src={lightboxPhoto.public_url}
        alt={`${isPeaks ? "Ascensión a" : "Visita a"} ${selected?.title}`}
        onClick={(e) => {
          e.stopPropagation();
          setLightboxMenuOpen(false);
        }}
      />
      <div style={{ position: 'fixed', bottom: '24px', left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', zIndex: 10002 }}>
        <span className="lightbox-caption" style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', width: '90%', textAlign: 'center', zIndex: 10001 }}>
          {lightboxPhoto.caption && (
            <strong style={{ display: 'block', fontSize: '15px', marginBottom: '2px', color: 'white' }}>{lightboxPhoto.caption}</strong>
          )}
          <span style={{ opacity: lightboxPhoto.caption ? 0.7 : 1 }}>
            {selected?.title}
            {(() => {
              let dateStr = "";
              if (!lightboxPhoto.taken_on.startsWith("1900-01-01")) {
                const relatedAscent = ascents.find(a => a.summit_id === selected?.id && a.achieved_on === lightboxPhoto.taken_on);
                dateStr = ` · ${formatShortDate(lightboxPhoto.taken_on)}${relatedAscent?.end_date ? ` - ${formatShortDate(relatedAscent.end_date)}` : ""}`;
              }
              const pageStr = currentPhotoGroup.length > 1 ? ` · ${lightboxIndex + 1} de ${currentPhotoGroup.length}` : "";
              return dateStr + pageStr;
            })()}
          </span>
        </span>

        {currentPhotoGroup.length > 1 && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentPhotoGroup.map((photo: any, idx: number) => (
              <div 
                key={photo.id || idx} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setLightboxPhoto(photo); 
                }}
                style={{ 
                  width: idx === lightboxIndex ? '18px' : '8px', 
                  height: '8px', 
                  borderRadius: '4px', 
                  backgroundColor: idx === lightboxIndex ? 'white' : 'rgba(255,255,255,0.4)', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }} 
              />
            ))}
          </div>
        )}
      </div>

      {lightboxCaptionModalOpen && (
        <div className="lightbox-date-modal" onClick={(e) => e.stopPropagation()}>
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "bold" }}>Añadir descripción</h3>

          <div style={{ marginTop: 12 }}>
            <textarea placeholder="Añade una descripción..." value={lightboxNewCaption} onChange={(e) => setLightboxNewCaption(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #dce4da', minHeight: '100px', resize: 'vertical' }} />
          </div>

          <div className="lightbox-date-modal-actions" style={{ marginTop: 16 }}>
            <button className="cancel" onClick={() => setLightboxCaptionModalOpen(false)}>Cancelar</button>
            <button className="save" onClick={handleSaveCaption} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </div>
      )}

    </div>
  );
}
