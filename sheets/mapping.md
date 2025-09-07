## Mapeo Google Sheets ↔ Modelo Canónico

Convención: un Spreadsheet por nivell (1r–4t). Pestañas por curso/año. Un quinto Spreadsheet compartido para PF.

### Pestañas por nivell
- Alumnes_<CURS>
  - Columnas: alumneId, nom, grup, anyCurs, personalId, estat, createdAt, updatedAt
  - Validaciones:
    - estat: lista ['alta','baixa','migrat']
    - anyCurs: data validation con lista de cursos existentes
    - grup: data validation por lista dinámica desde `Grups_<ANY>`
  - Notas:
    - alumneId: obligatorio; si vacío al importar, generar ULID y registrar en Auditoria
    - personalId: referencia al PF Sheet

- Entrevistes_<ANY>
  - Columnas: id, alumneId, anyCurs, data, acords, usuariCreadorId, createdAt, updatedAt
  - Validaciones:
    - anyCurs: fijo al ANY de la pestaña
    - data: formato fecha
    - usuariCreadorId: dominio @insbitacola.cat
  - Reglas:
    - Edición solo si anyCurs == anyActual (bloquear rango si no)

- Grups_<ANY>
  - Columnas: grupId, curs, nom
  - Opcional: una pestaña asociativa `GrupAlumnes_<ANY>` con columnas {grupId, alumneId}
  - Validaciones: curs en ['1r','2n','3r','4t']

- Config
  - Columnas: anyActual, pfSheetId, mappingDocentGrups (JSON), otros pares clave/valor
  - Validaciones: anyActual formato AAAA-AAAA

### PF (Spreadsheet compartido)
- Pestaña: PF
  - Columnas: personalId, sexe, dataNaixement, tutor1_nom, tutor1_tel, tutor1_email, tutor2_nom, tutor2_tel, tutor2_email, createdAt, updatedAt
  - Validaciones:
    - sexe en ['M','F','X']
    - emails válidos
  - Rangos protegidos: solo admin

### Correspondencia columna↔tabla
- Alumnes_<CURS> → `alumnes_curs` (grup/estat/anyCurs) y `alumnes` (nom/personalId)
- Entrevistes_<ANY> → `entrevistes`
- Grups_<ANY> → `grups`
- PF → `pf`
- Config → `config`

### Reglas de sincronización (Apps Script/API)
- Timestamps `createdAt`/`updatedAt`: actualizar automáticamente al editar filas.
- Autocorrecciones:
  - Generar ULID para alumneId/id si falta.
  - Normalizar emails a minúsculas y validar dominio.
  - Cruzar alumneId inexistente en Entrevistes → marcar en Auditoria como orfe.


