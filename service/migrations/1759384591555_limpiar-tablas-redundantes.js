/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Migración: Limpiar Tablas Redundantes
 * Fecha: 2025-10-02
 * Descripción: Migra datos de configuracion_horarios_tutor a horarios_tutor y elimina tablas obsoletas
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  // 1. Migrar datos de configuracion_horarios_tutor a horarios_tutor
  pgm.sql(`
    DO $$
    DECLARE
      config_record RECORD;
      dia_record JSONB;
    BEGIN
      -- Iterar sobre cada configuración
      FOR config_record IN
        SELECT * FROM configuracion_horarios_tutor WHERE activo = true
      LOOP
        -- Iterar sobre cada día de la semana en el JSONB
        FOR dia_record IN
          SELECT * FROM jsonb_array_elements(config_record.dias_semana)
        LOOP
          -- Solo insertar si el día está activo
          IF (dia_record->>'activo')::boolean THEN
            -- Verificar si ya existe para evitar duplicados
            IF NOT EXISTS (
              SELECT 1 FROM horarios_tutor
              WHERE tutor_email = config_record.tutor_email
              AND dia_semana = dia_record->>'dia'
              AND hora_inicio = (dia_record->>'inicio')::time
              AND hora_fin = (dia_record->>'fin')::time
              AND fecha_inicio = config_record.fecha_inicio
              AND fecha_fin = config_record.fecha_fin
            ) THEN
              INSERT INTO horarios_tutor (
                tutor_email, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin, duracion_cita, activo
              ) VALUES (
                config_record.tutor_email,
                dia_record->>'dia',
                (dia_record->>'inicio')::time,
                (dia_record->>'fin')::time,
                config_record.fecha_inicio,
                config_record.fecha_fin,
                config_record.duracion_cita,
                true
              );

              RAISE NOTICE 'Migrado horario: % - % de % a %',
                config_record.tutor_email, dia_record->>'dia',
                dia_record->>'inicio', dia_record->>'fin';
            END IF;
          END IF;
        END LOOP;
      END LOOP;
    END $$;
  `);

  // 2. Eliminar tabla eventos_calendario (vacía)
  pgm.dropTable('eventos_calendario', {
    ifExists: true,
    cascade: true
  });

  // 3. Crear tabla de respaldo de configuracion_horarios_tutor antes de eliminar
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS configuracion_horarios_tutor_backup AS
    SELECT * FROM configuracion_horarios_tutor;
  `);

  // 4. Eliminar tabla configuracion_horarios_tutor
  pgm.dropTable('configuracion_horarios_tutor', {
    ifExists: true,
    cascade: true
  });

  // 5. Eliminar tabla borradores_entrevista si existe (debería estar vacía)
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'borradores_entrevista') THEN
        -- Crear backup si tiene datos
        EXECUTE 'CREATE TABLE borradores_entrevista_backup AS SELECT * FROM borradores_entrevista';
        -- Eliminar tabla
        DROP TABLE IF EXISTS borradores_entrevista CASCADE;
        RAISE NOTICE 'Tabla borradores_entrevista eliminada (backup creado)';
      END IF;
    END $$;
  `);

  // 6. Agregar campo reminder_sent a cites_calendari si no existe
  pgm.addColumns('cites_calendari', {
    reminder_sent: {
      type: 'boolean',
      default: false,
      notNull: false
    }
  }, {
    ifNotExists: true
  });

  pgm.sql(`
    COMMENT ON COLUMN cites_calendari.reminder_sent IS 'Indica si se ha enviado el recordatorio de la cita';
  `);

  // 7. Crear índices adicionales para optimización
  pgm.createIndex('cites_calendari', ['any_curs', 'estat'], {
    ifNotExists: true,
    name: 'idx_cites_any_curs_estat'
  });

  pgm.createIndex('cites_calendari', 'reminder_sent', {
    ifNotExists: true,
    name: 'idx_cites_reminder_sent',
    where: 'reminder_sent = false AND estat = \'confirmada\''
  });

  pgm.createIndex('entrevistes', ['any_curs', 'data'], {
    ifNotExists: true,
    name: 'idx_entrevistes_any_curs_data'
  });

  pgm.createIndex('horarios_tutor', ['tutor_email', 'activo'], {
    ifNotExists: true,
    name: 'idx_horarios_tutor_email_activo'
  });

  // 8. Mensaje final
  pgm.sql(`
    DO $$
    BEGIN
      RAISE NOTICE '✅ Migración completada:';
      RAISE NOTICE '  - Datos migrados de configuracion_horarios_tutor a horarios_tutor';
      RAISE NOTICE '  - Tabla eventos_calendario eliminada';
      RAISE NOTICE '  - Tabla configuracion_horarios_tutor eliminada (backup creado)';
      RAISE NOTICE '  - Campo reminder_sent agregado a cites_calendari';
      RAISE NOTICE '  - Índices adicionales creados para optimización';
    END $$;
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
  // Eliminar índices
  pgm.dropIndex('horarios_tutor', ['tutor_email', 'activo'], {
    ifExists: true,
    name: 'idx_horarios_tutor_email_activo'
  });
  pgm.dropIndex('entrevistes', ['any_curs', 'data'], {
    ifExists: true,
    name: 'idx_entrevistes_any_curs_data'
  });
  pgm.dropIndex('cites_calendari', 'reminder_sent', {
    ifExists: true,
    name: 'idx_cites_reminder_sent'
  });
  pgm.dropIndex('cites_calendari', ['any_curs', 'estat'], {
    ifExists: true,
    name: 'idx_cites_any_curs_estat'
  });

  // Eliminar columna reminder_sent
  pgm.dropColumns('cites_calendari', ['reminder_sent'], { ifExists: true });

  // Restaurar tablas desde backup
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuracion_horarios_tutor_backup') THEN
        CREATE TABLE configuracion_horarios_tutor AS
        SELECT * FROM configuracion_horarios_tutor_backup;
        DROP TABLE configuracion_horarios_tutor_backup;
        RAISE NOTICE 'Tabla configuracion_horarios_tutor restaurada desde backup';
      END IF;

      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'borradores_entrevista_backup') THEN
        CREATE TABLE borradores_entrevista AS
        SELECT * FROM borradores_entrevista_backup;
        DROP TABLE borradores_entrevista_backup;
        RAISE NOTICE 'Tabla borradores_entrevista restaurada desde backup';
      END IF;
    END $$;
  `);
};
