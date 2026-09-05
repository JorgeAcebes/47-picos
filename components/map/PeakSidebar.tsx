import React from "react";
import { getIconComponent } from "../icons";

const IconClose = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const IconCheck = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const IconEdit = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const IconCamera = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
);

interface PeakSidebarProps {
  selected: any;
  closePanel: () => void;
  isPeaks: boolean;
  dynamicCategories: any[];
  experienceRecords: any[];
  selectedPhotos: any[];
  setSelectingLocationForExp: (key: string) => void;
  expToggleSort: React.ReactNode;
  renderExpRecord: (record: any) => React.ReactNode;
  isReadOnly: boolean;
  ascentsSortOrder: "desc" | "asc";
  setAscentsSortOrder: (order: "desc" | "asc") => void;
  selectedAscents: any[];
  formatDate: (date: string) => string;
  handleAddPhotosToDate: (e: React.ChangeEvent<HTMLInputElement>, ascent: any) => void;
  togglePhotoSelection: (photoId: string) => void;
  selectedPhotosForEdit: string[];
  handlePhotoClick: (photo: any) => void;
  hasWishlist: boolean;
  openRecord: (item: any) => void;
  saveWishlist: () => void;
  selectedExperienceRecords: any[];
}

export function PeakSidebar({
  selected,
  closePanel,
  isPeaks,
  dynamicCategories,
  experienceRecords,
  selectedPhotos,
  setSelectingLocationForExp,
  expToggleSort,
  renderExpRecord,
  isReadOnly,
  ascentsSortOrder,
  setAscentsSortOrder,
  selectedAscents,
  formatDate,
  handleAddPhotosToDate,
  togglePhotoSelection,
  selectedPhotosForEdit,
  handlePhotoClick,
  hasWishlist,
  openRecord,
  saveWishlist,
  selectedExperienceRecords
}: PeakSidebarProps) {
  if (!selected) return null;

  return (
    <aside
      className="info-panel"
      aria-label={`Información sobre ${selected.title}`}
    >
      <button className="icon-button" onClick={closePanel} aria-label="Cerrar">
        <IconClose />
      </button>

      {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) ? (
        <>
          <span className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {selected.label && getIconComponent(selected.label) && (
              <span style={{ display: 'flex', width: 14, height: 14, alignItems: 'center' }}>
                {getIconComponent(selected.label)}
              </span>
            )}
            {selected.detail ? selected.detail.toUpperCase() : "EXPERIENCIA"}
          </span>
          <h2>{selected.title}</h2>
          <div style={{ marginTop: '16px' }}>
            {(() => {
              const cat = dynamicCategories.find(c => c.name === selected.detail);
              const exp = cat?.experiences.find((e: any) => e.id === selected.id);
              if (exp?.subItems) {
                return (
                  <div style={{ marginTop: 16 }}>
                    <h4 style={{ marginBottom: 8, fontSize: '0.9rem', color: 'var(--foreground)' }}>Desglose:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {exp.subItems.map((item: any) => {
                        const subItemKey = `${exp.id}::${item.id}`;
                        const records = experienceRecords.filter(r => r.experience_id === exp.id && r.sub_item_id === item.id);
                        const hasRecords = records.length > 0;
                        const subItemRegisteredDates = new Set(records.map(a => a.achieved_on));
                        const subItemOtherPhotos = selectedPhotos.filter(p => p.summit_id === subItemKey && !subItemRegisteredDates.has(p.taken_on));
                        
                        const isOpenable = hasRecords || subItemOtherPhotos.length > 0;
                        
                        if (!isOpenable) {
                          return (
                            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '14px' }}>
                                {item.name}
                              </span>
                              <button className="button button--purple button--small" style={{ margin: '-6px 0', padding: '4px 12px', minHeight: '28px', height: 'auto', lineHeight: '1.2' }} onClick={(e) => {
                                e.preventDefault();
                                setSelectingLocationForExp(subItemKey);
                                window.location.hash = "mapa";
                              }}>Registrar</button>
                            </div>
                          );
                        }

                        return (
                          <details key={item.id} className="subitem-details" style={{ display: 'flex', flexDirection: 'column', padding: '12px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                            <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', outline: 'none', fontWeight: 500, fontSize: '14px', listStyle: 'none' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg className="details-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', flexShrink: 0 }}>
                                  <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                                {item.name}
                              </span>
                              {!hasRecords ? (
                                <button className="button button--purple button--small" style={{ margin: '-6px 0', padding: '4px 12px', minHeight: '28px', height: 'auto', lineHeight: '1.2' }} onClick={(e) => {
                                  e.preventDefault();
                                  setSelectingLocationForExp(subItemKey);
                                  window.location.hash = "mapa";
                                }}>Registrar</button>
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <IconCheck style={{ color: 'var(--pine)', width: 16, height: 16 }} />
                                </div>
                              )}
                            </summary>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: 16 }}>
                              {records.length > 1 && expToggleSort}
                              {hasRecords ? (
                                <>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {records.map(renderExpRecord)}
                                  </div>
                                </>
                              ) : (
                                <div className="pending-card" style={{ padding: '12px', fontSize: '13px' }}>
                                  {isReadOnly ? "Aún no ha vivido esta experiencia." : "Aún no has registrado esta experiencia."}
                                </div>
                              )}

                              {subItemOtherPhotos.length > 0 && (
                                <div className="photo-section" style={{ marginTop: 8 }}>
                                  <div className="photo-grid">
                                    {subItemOtherPhotos.map((photo) => {
                                      const isSelected = selectedPhotosForEdit.includes(photo.id);
                                      return (
                                        <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                                          {!isReadOnly && (
                                            <button
                                              type="button"
                                              className={`photo-select-circle ${isSelected ? 'active' : ''}`}
                                              onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                                              aria-label="Seleccionar foto"
                                            >
                                              {isSelected && <IconCheck />}
                                            </button>
                                          )}
                                          <img src={photo.public_url} alt={`Foto en ${item.name}`} loading="lazy" />
                                          <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                                        </figure>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              return <p>{selected.note}</p>;
            })()}
          </div>
        </>
      ) : (
        <>
          <span className="eyebrow">{isPeaks ? "PUNTO MÁS ALTO" : selected.detail.toUpperCase()}</span>
          <h2>{selected.title}</h2>
          <p>{selected.label} · {selected.subtitle}</p>
          {!isPeaks && selected.note && <p style={{ marginTop: 4 }}>{selected.note}</p>}
        </>
      )}

      {/* Main record list for peaks and countries */}
      {!(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) && (
        <>
          {selectedAscents.length > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 24, marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>Historial</h3>
              {selectedAscents.length > 1 && (
                <button
                  className="button button--quiet button--small"
                  onClick={() => setAscentsSortOrder(ascentsSortOrder === 'desc' ? 'asc' : 'desc')}
                  style={{ fontSize: '12px', padding: '4px 8px', margin: '-4px 0' }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, marginRight: 4 }}>
                    <path d="M11 5h10"></path>
                    <path d="M11 9h7"></path>
                    <path d="M11 13h4"></path>
                    <path d="M3 17l3 3 3-3"></path>
                    <path d="M6 18V4"></path>
                  </svg>
                  {ascentsSortOrder === 'desc' ? 'Más recientes' : 'Más antiguos'}
                </button>
              )}
            </div>
          ) : <h3 style={{ marginTop: 24, marginBottom: 8 }}>Historial</h3>}

          {selectedAscents.length > 0 ? (
            selectedAscents.map((ascent: any, index: number) => {
              const isLast = index === selectedAscents.length - 1;
              const ascentPhotos = selectedPhotos.filter(p => p.taken_on === ascent.achieved_on);

              return (
                <div key={`${ascent.achieved_on}-${index}`} className="ascent-card" style={{ marginBottom: isLast ? 0 : 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconCheck style={{ color: isPeaks ? "var(--green)" : "var(--purple)", width: 18, height: 18 }} />
                      <strong>
                        {formatDate(ascent.achieved_on)}
                        {ascent.end_date && ` - ${formatDate(ascent.end_date)}`}
                      </strong>
                    </div>
                    {!isReadOnly && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="icon-button"
                          onClick={() => openRecord(ascent)}
                          aria-label="Editar"
                          style={{ width: 28, height: 28 }}
                        >
                          <IconEdit style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                        </button>
                        <label className="icon-button" style={{ width: 28, height: 28, cursor: 'pointer', opacity: ascentPhotos.length >= 4 ? 0.5 : 1 }} title={ascentPhotos.length >= 4 ? "Máximo 4 fotos por registro" : "Añadir foto"}>
                          <IconCamera style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => handleAddPhotosToDate(e, ascent)}
                            style={{ display: 'none' }}
                            disabled={ascentPhotos.length >= 4}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  {ascent.location_name && (
                    <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {ascent.location_name}
                    </div>
                  )}
                  {ascent.notes && <p style={{ marginTop: '4px' }}>&ldquo;{ascent.notes}&rdquo;</p>}

                  {ascentPhotos.length > 0 && (
                    <div className="photo-section" style={{ marginTop: 16 }}>
                      <div className="photo-grid">
                        {ascentPhotos.map((photo: any) => {
                          const isSelected = selectedPhotosForEdit.includes(photo.id);
                          return (
                            <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                              {!isReadOnly && (
                                <button
                                  type="button"
                                  className={`photo-select-circle ${isSelected ? 'active' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                                  aria-label="Seleccionar foto"
                                >
                                  {isSelected && <IconCheck />}
                                </button>
                              )}
                              <img src={photo.public_url} alt={`Foto en ${selected.title}`} loading="lazy" />
                              <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                            </figure>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : hasWishlist && !isPeaks ? (
            <div className="pending-card" style={{ background: "var(--amber-bg)", color: "#a67c29", borderColor: "#ecd9a5" }}>
              ★ En tu lista de deseos
            </div>
          ) : (
            <div className="pending-card">
              {isPeaks
                ? (isReadOnly ? "Aún no ha registrado esta cima." : "Aún no has registrado esta cima.")
                : (isReadOnly ? "Aún no ha registrado este país." : "Aún no has registrado este país.")}
            </div>
          )}

          {/* Other photos that don't match any registered date */}
          {(() => {
            const registeredDates = new Set(selectedAscents.map(a => a.achieved_on));
            const otherPhotos = selectedPhotos.filter(p => !registeredDates.has(p.taken_on));
            if (otherPhotos.length === 0) return null;
            return (
              <div className="photo-section" style={{ marginTop: 24 }}>
                <h3>Otras fotos <small>{otherPhotos.length}</small></h3>
                <div className="photo-grid">
                  {otherPhotos.map((photo: any) => {
                    const isSelected = selectedPhotosForEdit.includes(photo.id);
                    return (
                      <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                        {!isReadOnly && (
                          <button
                            type="button"
                            className={`photo-select-circle ${isSelected ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                            aria-label="Seleccionar foto"
                          >
                            {isSelected && <IconCheck />}
                          </button>
                        )}
                        <img src={photo.public_url} alt={`Foto en ${selected.title}`} loading="lazy" />
                        <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="panel-actions">
            {!isReadOnly && (
              <button
                className={`button ${isPeaks ? "button--green" : "button--purple"} button--wide`}
                onClick={() => openRecord(selected)}
              >
                {selectedAscents.length > 0
                  ? "Registrar otra fecha"
                  : isPeaks ? "Marcar como completado" : "Marcar como visitado"}
              </button>
            )}
            {(!selectedAscents.length || hasWishlist) && !isReadOnly && (
              <button
                className="button button--quiet button--wide"
                style={{ marginTop: 8 }}
                onClick={() => saveWishlist()}
              >
                {hasWishlist ? "Quitar de mi lista de deseos" : "Añadir a mi lista de deseos"}
              </button>
            )}
          </div>
        </>
      )}

      {(selected.id.startsWith("exp-") || selected.id.startsWith("cexp-")) && (
        <>
          {(() => {
            if (selected.subItems && selected.subItems.length > 0) {
              return null;
            }

            if (selectedExperienceRecords.length === 0) {
              return (
                <div className="pending-card">
                  {isReadOnly ? "Aún no ha vivido esta experiencia." : "Aún no has vivido esta experiencia."}
                </div>
              );
            }

            return (
              <>
                {selectedExperienceRecords.length > 1 && expToggleSort}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {selectedExperienceRecords.map(renderExpRecord)}
                </div>
              </>
            );
          })()}

          {/* Otras fotos (experiencias) */}
          {(() => {
            const registeredDates = new Set(selectedExperienceRecords.map(a => a.achieved_on));
            const otherPhotos = selectedPhotos.filter(p => !registeredDates.has(p.taken_on) && p.summit_id === selected.id);
            if (otherPhotos.length === 0) return null;
            return (
              <div className="photo-section" style={{ marginTop: 24 }}>
                <h3>Otras fotos <small>{otherPhotos.length}</small></h3>
                <div className="photo-grid">
                  {otherPhotos.map((photo: any) => {
                    const isSelected = selectedPhotosForEdit.includes(photo.id);
                    return (
                      <figure key={photo.id} className={isSelected ? 'selected' : ''} onClick={() => handlePhotoClick(photo)}>
                        {!isReadOnly && (
                          <button
                            type="button"
                            className={`photo-select-circle ${isSelected ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); togglePhotoSelection(photo.id); }}
                            aria-label="Seleccionar foto"
                          >
                            {isSelected && <IconCheck />}
                          </button>
                        )}
                        <img src={photo.public_url} alt={`Foto en ${selected.title}`} loading="lazy" />
                        <figcaption>{photo.caption ? photo.caption : formatDate(photo.taken_on)}</figcaption>
                      </figure>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </aside>
  );
}
