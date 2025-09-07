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
  }

  // Alumnes_<CURS>
  async listAlumnes(params: { grup?: string; anyCurs?: string; estat?: string }): Promise<any[]> {
    const anyCurs = params.anyCurs || (await this.getConfig()).anyActual;
    const sheet = `Alumnes_${anyCurs}`;
    const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H10000` });
    const values = resp.data.values || [];
    const header = values[0] || [];
    const rows = values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
    return rows.filter(r => (!params.grup || r.grup === params.grup) && (!params.estat || r.estat === params.estat))
      .map(r => ({ id: r.alumneId, nom: r.nom, grup: r.grup, estat: r.estat }));
  }

  async getAlumneFull(id: string): Promise<any | null> {
    const cfg = await this.getConfig();
    const anyCurs = cfg.anyActual;
    const sheet = `Alumnes_${anyCurs}`;
    const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:H10000` });
    const values = resp.data.values || [];
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
    const cfg = await this.getConfig();
    const any = params.anyCurs || cfg.anyActual;
    const sheet = `Entrevistes_${any}`;
    const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:G10000` });
    const values = resp.data.values || [];
    const header = values[0] || [];
    const rows = values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
    return rows.filter(r => (!params.alumneId || r.alumneId === params.alumneId))
      .map(r => ({ id: r.id, data: r.data, acords: r.acords, anyCurs: r.anyCurs }));
  }

  async getEntrevista(id: string, anyCurs?: string): Promise<any | null> {
    const cfg = await this.getConfig();
    const anys = [anyCurs || cfg.anyActual];
    for (const any of anys) {
      const sheet = `Entrevistes_${any}`;
      const resp = await this.sheets.spreadsheets.values.get({ spreadsheetId: this.spreadsheetId, range: `${sheet}!A1:G10000` });
      const values = resp.data.values || [];
      const header = values[0] || [];
      const rows = values.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
      const row = rows.find(r => r.id === id);
      if (row) return { id: row.id, alumneId: row.alumneId, anyCurs: row.anyCurs, data: row.data, acords: row.acords, usuariCreadorId: row.usuariCreadorId };
    }
    return null;
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


