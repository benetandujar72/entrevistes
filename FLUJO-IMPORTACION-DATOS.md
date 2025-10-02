# 📋 Flujo de Importación de Datos Personales

## ✅ **Proceso Correcto de Asignación de Tutores**

Los tutores se asignan **automáticamente** durante la importación de datos personales, no mediante scripts SQL posteriores.

### 🔄 **Flujo de Importación**

#### 1. **Importación CSV Completa** (`/import-complet/dades-complets`)
- **Endpoint**: `POST /import-complet/dades-complets`
- **Archivo**: CSV con datos personales de alumnos
- **Proceso**:
  1. Lee el CSV línea por línea
  2. Para cada alumno:
     - Crea/actualiza datos personales en tabla `pf`
     - Crea/actualiza alumno en tabla `alumnes`
     - **Asigna tutor automáticamente** si existe `tutor_personal_email`
     - Crea entrevista inicial

#### 2. **Importación Individual** (`/import-complet/alumne-individual`)
- **Endpoint**: `POST /import-complet/alumne-individual`
- **Datos**: JSON con datos de un alumno
- **Proceso**:
  1. Valida datos requeridos
  2. Busca alumno existente por nombre
  3. Inserta/actualiza datos personales
  4. **Crea tutor si no existe** en tabla `usuaris`
  5. **Asigna tutor al alumno** en tabla `tutories_alumne`

#### 3. **Importación de Datos Personales** (`/dades-personals/import`)
- **Endpoint**: `POST /dades-personals/import`
- **Datos**: JSON con datos personales
- **Proceso**:
  1. Busca alumno por nombre
  2. Inserta/actualiza datos personales
  3. **Asigna tutor si existe** `tutor_personal_email`

### 📊 **Estructura de Datos Requerida**

#### **CSV de Importación Completa**
```csv
personal_id,alumne_nom,alumne_email,grup,tutor_personal_nom,tutor_personal_email,...
12345,Juan Pérez,juan.perez@insbitacola.cat,1ESO A,María García,maria.garcia@insbitacola.cat,...
```

#### **JSON de Importación Individual**
```json
{
  "personal_id": "12345",
  "alumne_nom": "Juan Pérez",
  "alumne_email": "juan.perez@insbitacola.cat",
  "grup": "1ESO A",
  "tutor_personal_nom": "María García",
  "tutor_personal_email": "maria.garcia@insbitacola.cat"
}
```

### 🔧 **Asignación Automática de Tutores**

#### **En Importación CSV**:
```typescript
// Línea 210-221 en import-complet.ts
if (row.tutor_personal_email) {
  console.log(`👨‍🏫 Asignando tutor ${row.tutor_personal} (${row.tutor_personal_email}) a ${row.alumne_nom}`);
  await query(`
    INSERT INTO tutories_alumne (alumne_id, tutor_email, any_curs, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (alumne_id, any_curs) DO UPDATE SET tutor_email = EXCLUDED.tutor_email
  `, [alumneId, row.tutor_personal_email, anyCurs]);
  tutoresAsignados++;
}
```

#### **En Importación Individual**:
```typescript
// Líneas 441-470 en import-complet.ts
if (tutor_personal_email) {
  // Verificar si el tutor existe
  const tutorExists = await query('SELECT email FROM usuaris WHERE email = $1', [tutor_personal_email]);
  
  if (tutorExists.rows.length === 0) {
    // Crear usuario si no existe
    await query(`
      INSERT INTO usuaris (email, rol)
      VALUES ($1, $2)
      ON CONFLICT (email) DO NOTHING
    `, [tutor_personal_email, 'docent']);
  }
  
  // Asignar tutor al alumno
  await query(`
    INSERT INTO tutories_alumne (alumne_id, tutor_email, any_curs)
    VALUES ($1, $2, $3)
    ON CONFLICT (alumne_id, any_curs) DO UPDATE SET tutor_email = EXCLUDED.tutor_email
  `, [alumneIdFinal, tutor_personal_email, anyCurs]);
}
```

### 📋 **Tablas Involucradas**

1. **`usuaris`**: Almacena tutores (email, rol)
2. **`alumnes`**: Almacena datos de alumnos
3. **`pf`**: Almacena datos personales
4. **`tutories_alumne`**: Relación tutor-alumno (alumne_id, tutor_email, any_curs)

### ✅ **Ventajas del Sistema Actual**

- **Automático**: No requiere scripts SQL posteriores
- **Consistente**: Misma lógica en todos los endpoints
- **Robusto**: Maneja conflictos con `ON CONFLICT`
- **Trazable**: Logs detallados del proceso
- **Flexible**: Funciona con CSV y JSON

### 🚫 **Lo que NO se debe hacer**

- ❌ Crear tutores con scripts SQL
- ❌ Asignar tutores manualmente después de la importación
- ❌ Usar scripts de prueba para datos de producción

### 🎯 **Recomendación**

Usar siempre los endpoints de importación oficiales:
- `POST /import-complet/dades-complets` para importación masiva
- `POST /import-complet/alumne-individual` para alumnos individuales
- `POST /dades-personals/import` para actualizar datos personales

Estos endpoints garantizan que los tutores se asignen correctamente durante el proceso de importación.
