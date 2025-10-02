/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Migración: Consolidar Sistema de Citas y Entrevistas
 * Fecha: 2025-10-02
 * Descripción: Unifica el sistema de citas eliminando duplicados y vinculando citas con entrevistas
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Agregar columna cita_id a entrevistes si no existe
  pgm.addColumns('entrevistes', {
    cita_id: {
      type: 'varchar(255)',
      notNull: false,
      references: 'cites_calendari(id)',
      onDelete: 'SET NULL'
    }
  }, {
    ifNotExists: true
  });

  // 2. Agregar índice para cita_id
  pgm.createIndex('entrevistes', 'cita_id', {
    ifNotExists: true,
    name: 'idx_entrevistes_cita_id'
  });

  // 3. Agregar campos de Google Calendar a cites_calendari si no existen
  pgm.addColumns('cites_calendari', {
    google_event_id: {
      type: 'varchar(255)',
      notNull: false
    },
    google_event_url: {
      type: 'text',
      notNull: false
    }
  }, {
    ifNotExists: true
  });

  // 4. Agregar índice para google_event_id
  pgm.createIndex('cites_calendari', 'google_event_id', {
    ifNotExists: true,
    name: 'idx_cites_google_event_id'
  });

  // 5. Crear función para actualizar updated_at
  pgm.createFunction(
    'update_updated_at_column',
    [],
    {
      returns: 'trigger',
      language: 'plpgsql',
      replace: true
    },
    `
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    `
  );

  // 6. Crear trigger para cites_calendari (si no existe)
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_cites_calendari_updated_at'
      ) THEN
        CREATE TRIGGER update_cites_calendari_updated_at
          BEFORE UPDATE ON cites_calendari
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);

  // 7. Crear trigger para horarios_tutor (si la tabla existe)
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'horarios_tutor') THEN
        DROP TRIGGER IF EXISTS update_horarios_tutor_updated_at ON horarios_tutor;
        CREATE TRIGGER update_horarios_tutor_updated_at
          BEFORE UPDATE ON horarios_tutor
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      END IF;
    END $$;
  `);

  // 8. Crear vista v_citas_completas
  pgm.createView('v_citas_completas', {
    replace: true
  }, `
    SELECT
      c.id,
      c.data_cita,
      c.durada_minuts,
      c.estat,
      c.nom_familia,
      c.email_familia,
      c.telefon_familia,
      c.notes,
      c.google_event_url,
      c.tutor_email,
      a.nom as alumne_nom,
      a.email as alumne_email,
      g.nom as grup_nom,
      c.created_at,
      c.updated_at
    FROM cites_calendari c
    LEFT JOIN alumnes a ON c.alumne_id = a.alumne_id
    LEFT JOIN alumnes_curs ac ON a.alumne_id = ac.alumne_id AND ac.any_curs = c.any_curs
    LEFT JOIN grups g ON ac.grup_id = g.grup_id
  `);

  // 9. Crear vista v_entrevistes_amb_cites
  pgm.createView('v_entrevistes_amb_cites', {
    replace: true
  }, `
    SELECT
      e.id as entrevista_id,
      e.data as entrevista_data,
      e.acords,
      e.usuari_creador_id,
      c.id as cita_id,
      c.data_cita,
      c.nom_familia,
      c.email_familia,
      c.google_event_url,
      a.nom as alumne_nom,
      a.email as alumne_email
    FROM entrevistes e
    LEFT JOIN cites_calendari c ON e.cita_id = c.id
    LEFT JOIN alumnes a ON e.alumne_id = a.alumne_id
  `);

  // 10. Agregar comentarios
  pgm.sql(`
    COMMENT ON COLUMN entrevistes.cita_id IS 'Referencia a la cita que generó esta entrevista';
    COMMENT ON COLUMN cites_calendari.google_event_id IS 'ID del evento en Google Calendar';
    COMMENT ON COLUMN cites_calendari.google_event_url IS 'URL del evento en Google Calendar';
    COMMENT ON VIEW v_citas_completas IS 'Vista con información completa de citas incluyendo datos de alumno y grupo';
    COMMENT ON VIEW v_entrevistes_amb_cites IS 'Vista de entrevistas con información de citas vinculadas';
  `);
};

/**
 * Rollback de la migración
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  // Eliminar vistas
  pgm.dropView('v_entrevistes_amb_cites', { ifExists: true });
  pgm.dropView('v_citas_completas', { ifExists: true });

  // Eliminar triggers
  pgm.dropTrigger('cites_calendari', 'update_cites_calendari_updated_at', { ifExists: true });
  pgm.sql(`DROP TRIGGER IF EXISTS update_horarios_tutor_updated_at ON horarios_tutor;`);

  // Eliminar función
  pgm.dropFunction('update_updated_at_column', [], { ifExists: true });

  // Eliminar índices
  pgm.dropIndex('cites_calendari', 'google_event_id', { ifExists: true, name: 'idx_cites_google_event_id' });
  pgm.dropIndex('entrevistes', 'cita_id', { ifExists: true, name: 'idx_entrevistes_cita_id' });

  // Eliminar columnas
  pgm.dropColumns('cites_calendari', ['google_event_id', 'google_event_url'], { ifExists: true });
  pgm.dropColumns('entrevistes', ['cita_id'], { ifExists: true });
};
