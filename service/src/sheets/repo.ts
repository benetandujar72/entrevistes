import { sheets_v4 } from 'googleapis';
import { ulid } from 'ulid';

export class SheetsRepo {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;

  constructor(sheets: sheets_v4.Sheets, spreadsheetId: string) {
    this.sheets = sheets;
    this.spreadsheetId = spreadsheetId;
  }

  async getConfig(): Promise<Record<string, any>> {
    try {
      const range = 'Config!A2:B1000';
      const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range });
      const rows = resp.data.values || [];
      const out: Record<string, any> = {};
      for (const r of rows) {
        const k = (r[0] || '').trim();
        if (!k) continue;
        let v: any = r[1];
        try { v = JSON.parse(r[1]); } catch { /* keep as string */ }
        out[k] = v;
      }
      return out;
    } catch (e) {
      // Fallback: si falla Sheets, intentar con variable de entorno ANY_ACTUAL
      const any = process.env.ANY_ACTUAL || '2025-2026';
      return { anyActual: any };
    }
  }

  // Alumnes_<CURS>
  async listAlumnes(params: { grup?: string; anyCurs?: string; estat?: string }): Promise<any[]> {
    const anyCurs = params.anyCurs || (await this.getConfig()).anyActual;
    const sheet = `Alumnes_${anyCurs}`;
    let values: any[][] = [];
    try {
      const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H10000` });
      values = resp.data.values || [];
    } catch {
      // fallback a vacío si no existe la hoja
      values = [];
    }
    if (values.length === 0) return [];
    const header = values[0] || [];
    const rows = values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
    return rows
      .filter(r => (!params.grup || r.grup === r.grup) && (!params.estat || r.estat === params.estat))
      .map(r => ({ id: r.alumneId, nom: r.nom, grup: r.grup, estat: r.estat, anyCurs }));
  }

  async getAlumneFull(id: string): Promise<any | null> {
    const cfg = await this.getConfig();
    const anyCurs = cfg.anyActual;
    const sheet = `Alumnes_${anyCurs}`;
    let values: any[][] = [];
    try {
      const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H10000` });
      values = resp.data.values || [];
    } catch {
      return null;
    }
    const header = values[0] || [];
    const rows = values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
    const row = rows.find(r => r.alumneId === id);
    if (!row) return null;
    // PF: puede vivir en otro Spreadsheet; aquí asumimos misma hoja con pestaña PF
    const pfResp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `PF!A1:J10000` });
    const pfHeader = (pfResp.data.values || [])[0] || [];
    const pfRows = (pfResp.data.values || []).slice(1).map(r => Object.fromEntries(pfHeader.map((h, i) => [h, r[i]])));
    const pf = pfRows.find(p => p.personalId === row.personalId);
    return {
      id: row.alumneId,
      nom: row.nom,
      grup: row.grup,
      anyCurs: row.anyCurs,
      estat: row.estat,
      dadesPersonals: { sexe: pf?.sexe, dataNaixement: pf?.dataNaixement },
      dadesFamiliars: {
        tutors: [
          pf?.tutor1_nom ? { nom: pf?.tutor1_nom, telefon: pf?.tutor1_tel, email: pf?.tutor1_email } : undefined,
          pf?.tutor2_nom ? { nom: pf?.tutor2_nom, telefon: pf?.tutor2_tel, email: pf?.tutor2_email } : undefined
        ].filter(Boolean)
      }
    };
  }

  async createAlumne(data: { nom: string; grup: string; anyCurs: string; personalId: string }): Promise<string> {
    const id = ulid();
    const now = new Date().toISOString();
    const sheet = `Alumnes_${data.anyCurs}`;
    const row = [id, data.nom, data.grup, data.anyCurs, data.personalId, 'alta', now, now];
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheet}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    });
    return id;
  }

  async updateAlumne(id: string, updates: { grup?: string; estat?: string }): Promise<boolean> {
    const cfg = await this.getConfig();
    const sheet = `Alumnes_${cfg.anyActual}`;
    const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H10000` });
    const values = resp.data.values || [];
    const header = values[0] || [];
    const idx = values.slice(1).findIndex(r => r[0] === id);
    if (idx < 0) return false;
    const row = values[idx + 1];
    const map: Record<string, number> = Object.fromEntries(header.map((h, i) => [h, i]));
    if (updates.grup !== undefined) row[map['grup']] = updates.grup;
    if (updates.estat !== undefined) row[map['estat']] = updates.estat;
    row[map['updatedAt']] = new Date().toISOString();
    const range = `${sheet}!A${idx + 2}:H${idx + 2}`;
    await this.sheets.spreadsheets.values.update({ spreadsheetId: this.spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values: [row] } });
    return true;
  }

  // Entrevistes_<ANY>
  async listEntrevistes(params: { alumneId?: string; anyCurs?: string }): Promise<any[]> {
    try {
      const cfg = await this.getConfig();
      const any = params.anyCurs || cfg.anyActual;
      const sheet = `Entrevistes_${any}`;
      const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:Z10000` });
      const values = resp.data.values || [];
      if (values.length === 0) return [];
      const header = values[0] || [];
      const headerLc = header.map(h => (h || '').toString().trim().toLowerCase());

      const idx = (...keys: string[]) => {
        for (const k of keys) {
          const i = headerLc.indexOf(k);
          if (i !== -1) return i;
        }
        return -1;
      };

      const iId = idx('id', 'entrevistaid');
      const iAlumne = idx('alumneid', 'alumne_id', 'alumne');
      const iAny = idx('anycurs', 'any', 'curs');
      const iData = idx('data', 'fecha');
      const iAcords = idx('acords', 'acuerdos', 'notes');
      const iAuthor = idx('usuariCreadorId'.toLowerCase(), 'autor', 'creador');

      const out: any[] = [];
      for (let r = 1; r < values.length; r++) {
        const row = values[r];
        const alumneId = iAlumne >= 0 ? row[iAlumne] : undefined;
        if (params.alumneId && alumneId !== params.alumneId) continue;
        out.push({
          id: iId >= 0 ? row[iId] : undefined,
          alumneId,
          anyCurs: iAny >= 0 ? row[iAny] : any,
          data: iData >= 0 ? row[iData] : undefined,
          acords: iAcords >= 0 ? row[iAcords] : undefined,
          usuariCreadorId: iAuthor >= 0 ? row[iAuthor] : undefined
        });
      }
      return out;
    } catch (e) {
      // Si la pestanya no existeix o el format no és l'esperat, retornar buit
      // eslint-disable-next-line no-console
      console.warn('listEntrevistes: no es pot llegir el full o el format és desconegut', e);
      return [];
    }
  }

  async getEntrevista(id: string, anyCurs?: string): Promise<any | null> {
    try {
      const cfg = await this.getConfig();
      const anys = [anyCurs || cfg.anyActual];
      for (const any of anys) {
        const sheet = `Entrevistes_${any}`;
        const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:Z10000` });
        const values = resp.data.values || [];
        if (values.length === 0) continue;
        const header = values[0] || [];
        const headerLc = header.map(h => (h || '').toString().trim().toLowerCase());
        const idx = (...keys: string[]) => {
          for (const k of keys) {
            const i = headerLc.indexOf(k);
            if (i !== -1) return i;
          }
          return -1;
        };
        const iId = idx('id', 'entrevistaid');
        const iAlumne = idx('alumneid', 'alumne_id', 'alumne');
        const iAny = idx('anycurs', 'any', 'curs');
        const iData = idx('data', 'fecha');
        const iAcords = idx('acords', 'acuerdos', 'notes');
        const iAuthor = idx('usuariCreadorId'.toLowerCase(), 'autor', 'creador');

        for (let r = 1; r < values.length; r++) {
          const row = values[r];
          const rid = iId >= 0 ? row[iId] : undefined;
          if (rid === id) {
            return {
              id: rid,
              alumneId: iAlumne >= 0 ? row[iAlumne] : undefined,
              anyCurs: iAny >= 0 ? row[iAny] : any,
              data: iData >= 0 ? row[iData] : undefined,
              acords: iAcords >= 0 ? row[iAcords] : undefined,
              usuariCreadorId: iAuthor >= 0 ? row[iAuthor] : undefined
            };
          }
        }
      }
      return null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('getEntrevista: error llegint full', e);
      return null;
    }
  }

  async createEntrevista(data: { alumneId: string; data: string; acords: string; usuariCreadorId: string }): Promise<string> {
    const cfg = await this.getConfig();
    const sheet = `Entrevistes_${cfg.anyActual}`;
    const id = ulid();
    const now = new Date().toISOString();
    const row = [id, data.alumneId, cfg.anyActual, data.data, data.acords, data.usuariCreadorId, now, now];
    await this.sheets.spreadsheets.values.append({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H1`, valueInputOption: 'RAW', requestBody: { values: [row] } });
    return id;
  }

  async updateEntrevista(id: string, updates: { acords: string }): Promise<boolean> {
    const cfg = await this.getConfig();
    const sheet = `Entrevistes_${cfg.anyActual}`;
    const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H10000` });
    const values = resp.data.values || [];
    const header = values[0] || [];
    const idx = values.slice(1).findIndex(r => r[0] === id);
    if (idx < 0) return false;
    const row = values[idx + 1];
    const map: Record<string, number> = Object.fromEntries(header.map((h, i) => [h, i]));
    row[map['acords']] = updates.acords;
    row[map['updatedAt']] = new Date().toISOString();
    const range = `${sheet}!A${idx + 2}:H${idx + 2}`;
    await this.sheets.spreadsheets.values.update({ spreadsheetId: this.spreadsheetId, range, valueInputOption: 'RAW', requestBody: { values: [row] } });
    return true;
  }
}


