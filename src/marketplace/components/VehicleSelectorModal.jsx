import { useState, useMemo } from "react";
import { T, FONT } from "../../theme";
import { VEHICLES } from "../api/mockDatabase";
import { useStore } from "../../store";

export function VehicleSelectorModal({ open, onClose }) {
  const { saveVehicle, selectedVehicle: currentVehicle } = useStore();

  // Progressive Disclosure State
  const [step, setStep] = useState(1); // 1: Year, 2: Make, 3: Model
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMake, setSelectedMake] = useState(null);

  // Data processing based on current selection — ALL hooks must run before any early return
  const availableYears = useMemo(() => {
    return [...new Set(VEHICLES.map(v => v.year))].sort((a, b) => b - a); // Newest first
  }, []);

  const availableMakes = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(VEHICLES.filter(v => v.year === selectedYear).map(v => v.brand))].sort();
  }, [selectedYear]);

  const availableModels = useMemo(() => {
    if (!selectedYear || !selectedMake) return [];
    return VEHICLES.filter(v => v.year === selectedYear && v.brand === selectedMake);
  }, [selectedYear, selectedMake]);

  // Early return AFTER all hooks — fixes React hook order violation
  if (!open) return null;

  // Handlers
  const handleSelectYear = (year) => {
    setSelectedYear(year);
    setStep(2);
  };

  const handleSelectMake = (make) => {
    setSelectedMake(make);
    setStep(3);
  };

  const handleSelectModel = (vehicle) => {
    saveVehicle(vehicle);
    resetAndClose();
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedYear(null);
    setSelectedMake(null);
    onClose();
  };

  const removeVehicle = () => {
    saveVehicle(null);
    resetAndClose();
  };

  const goBack = () => {
    if (step === 2) { setSelectedYear(null); setStep(1); }
    if (step === 3) { setSelectedMake(null); setStep(2); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.2s" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,15,29,0.8)", backdropFilter: "blur(8px)" }} onClick={resetAndClose} />

      <div style={{ position: "relative", background: T.surface, width: 440, borderRadius: 20, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", border: `1px solid ${T.borderHi}`, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh", animation: "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.card }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {step > 1 && (
              <button onClick={goBack} style={{ background: "transparent", border: "none", color: T.amber, fontSize: 18, cursor: "pointer", padding: "4px 8px", marginLeft: -8 }}>
                ←
              </button>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: T.t1 }}>
                {step === 1 ? "Select Year" : step === 2 ? "Select Make" : "Select Model"}
              </div>
              <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>For Guaranteed Fitment.</div>
            </div>
          </div>
          <button onClick={resetAndClose} style={{ background: "transparent", border: "none", color: T.t3, fontSize: 24, cursor: "pointer" }}>✕</button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>

          {/* Current Selection Ribbon */}
          {currentVehicle && step === 1 && (
            <div style={{ background: `${T.emerald}14`, border: `1px dashed ${T.emerald}55`, borderRadius: 12, padding: "16px", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{currentVehicle.type === "Car" ? "🚙" : "🏍️"}</span>
                <div>
                  <div style={{ fontSize: 11, color: T.emerald, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>Saved Garage Vehicle</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{currentVehicle.brand} {currentVehicle.model}</div>
                  <div style={{ fontSize: 13, color: T.t3 }}>{currentVehicle.year} · {currentVehicle.variant}</div>
                </div>
              </div>
              <button
                onClick={removeVehicle}
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.t2, borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700, transition: "all 0.15s" }}
                className="btn-hover"
              >
                Clear
              </button>
            </div>
          )}

          {/* Step 1: YEAR Selection */}
          {step === 1 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {availableYears.map(year => (
                <button
                  key={year}
                  onClick={() => handleSelectYear(year)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "16px", fontSize: 16, fontWeight: 800, cursor: "pointer", fontFamily: FONT.mono, transition: "all 0.15s" }}
                  className="card-hover"
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Step 2: MAKE Selection */}
          {step === 2 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {availableMakes.map(make => (
                <button
                  key={make}
                  onClick={() => handleSelectMake(make)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 10, padding: "16px", fontSize: 15, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
                  className="card-hover"
                >
                  {make}
                </button>
              ))}
            </div>
          )}

          {/* Step 3: MODEL Selection */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {availableModels.map(m => (
                <div
                  key={m.id}
                  onClick={() => handleSelectModel(m)}
                  style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 20px", cursor: "pointer", transition: "all 0.15s", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  className="card-hover"
                >
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: T.t1 }}>{m.model}</div>
                    <div style={{ fontSize: 13, color: T.t3, marginTop: 4 }}>{m.variant}</div>
                  </div>
                  <div style={{ color: T.amber, fontSize: 18 }}>→</div>
                </div>
              ))}
              {availableModels.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: T.t3, fontSize: 14 }}>
                  No models available for the selected Year and Make.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer / VIN Input Mock */}
        {step === 1 && (
          <div style={{ padding: "16px 24px", background: T.bg, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.t3, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Have a VIN Number?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="Enter 17-digit VIN"
                style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", color: T.t1, fontFamily: FONT.mono, fontSize: 13, textTransform: "uppercase" }}
              />
              <button style={{ background: T.borderHi, color: T.t1, border: "none", borderRadius: 8, padding: "0 16px", fontSize: 13, fontWeight: 800, cursor: "pointer" }} className="btn-hover">
                Decode
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
