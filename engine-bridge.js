// Puente entre app.js (script clásico, motor clínico sin cambios) y flow.mjs (módulo del flujo común).
// No contiene lógica: solo expone por nombre lo que flow.mjs necesita.
window.CMO_ENGINE = { APP_CONFIG, calculateStratification, collectFormData, state, patientRepository, refreshPatientsList, startNewRecord, setExportStatus, setStorageStatus, setFactorState, getFactorState };
