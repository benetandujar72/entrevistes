/**
 * Apps Script: timestamps, validaciones básicas, auditoría.
 * Adjuntar al Spreadsheet (por nivell) y al PF compartido.
 */

const AUDIT_SHEET = 'Auditoria';

function onEdit(e) {
  if (!e || !e.range || !e.source) return;
  const sheet = e.range.getSheet();
  const name = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();
  if (row === 1) return; // cabeceras

  try {
    addTimestamps(sheet, row);
    validateDomainIfPresent(sheet, row);
    ensureIdsIfMissing(sheet, row, name);
    enforceAnyActualLock(sheet, name);
  } catch (err) {
    logAudit('script_error', name, String(row), { error: String(err) });
  }
}

function addTimestamps(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const createdIdx = headers.indexOf('createdAt') + 1;
  const updatedIdx = headers.indexOf('updatedAt') + 1;
  const now = new Date();
  if (createdIdx > 0 && sheet.getRange(row, createdIdx).isBlank()) {
    sheet.getRange(row, createdIdx).setValue(now);
  }
  if (updatedIdx > 0) {
    sheet.getRange(row, updatedIdx).setValue(now);
  }
}

function validateDomainIfPresent(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const creatorIdx = headers.indexOf('usuariCreadorId') + 1;
  if (creatorIdx > 0) {
    const email = String(sheet.getRange(row, creatorIdx).getValue() || '').trim().toLowerCase();
    if (email && !email.endsWith('@insbitacola.cat')) {
      throw new Error('Domini d\'email no permès');
    }
  }
}

function ensureIdsIfMissing(sheet, row, name) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idFields = ['id', 'alumneId', 'personalId'];
  idFields.forEach(field => {
    const idx = headers.indexOf(field) + 1;
    if (idx > 0 && sheet.getRange(row, idx).isBlank()) {
      const value = generateUlid();
      sheet.getRange(row, idx).setValue(value);
      logAudit('autofix_id', name, value, { field });
    }
  });
}

function enforceAnyActualLock(sheet, name) {
  if (!name.startsWith('Entrevistes_')) return;
  const anyFromTab = name.split('_')[1];
  const anyActual = getConfigValue(sheet, 'anyActual');
  if (anyActual && anyFromTab && anyFromTab !== anyActual) {
    // Solo permitir lectura
    // Sugerencia: usar protección de rango a nivel de interfaz.
    throw new Error('Edició bloquejada: any de la pestanya no és anyActual');
  }
}

function getConfigValue(sheet, key) {
  const ss = sheet.getParent();
  const config = ss.getSheetByName('Config');
  if (!config) return null;
  const range = config.getRange(2, 1, config.getLastRow(), 2).getValues();
  for (let i = 0; i < range.length; i++) {
    if (String(range[i][0]).trim() === key) return range[i][1];
  }
  return null;
}

function logAudit(accio, entitat, entitatId, detalls) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(AUDIT_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(AUDIT_SHEET);
    sheet.appendRow(['timestamp','accio','entitat','entitatId','detalls']);
  }
  sheet.appendRow([new Date(), accio, entitat, entitatId, JSON.stringify(detalls || {})]);
}

// ULID simple (no cryptographically strong). Alternativa: UUID v4.
function generateUlid() {
  const now = Date.now().toString(36);
  const rand = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join('');
  return `ulid_${now}${rand}`;
}


