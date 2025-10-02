import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Entrevistes App API',
      version: '1.0.0',
      description: 'API para gestión de entrevistas, citas y tutorías académicas',
      contact: {
        name: 'Equipo de Desarrollo',
        email: 'dev@entrevistes.app'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:8081',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.entrevistes.app',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenido del login de Google OAuth'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            },
            details: {
              type: 'array',
              items: {
                type: 'object'
              },
              description: 'Detalles adicionales del error (opcional)'
            }
          }
        },
        Cita: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único de la cita',
              example: 'cita_1759380337377_abc123'
            },
            alumne_id: {
              type: 'string',
              description: 'ID del alumno'
            },
            tutor_email: {
              type: 'string',
              format: 'email',
              description: 'Email del tutor'
            },
            any_curs: {
              type: 'string',
              description: 'Año curso',
              example: '2025-2026'
            },
            data_cita: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de la cita'
            },
            durada_minuts: {
              type: 'integer',
              description: 'Duración de la cita en minutos',
              example: 30
            },
            nom_familia: {
              type: 'string',
              description: 'Nombre de la familia'
            },
            email_familia: {
              type: 'string',
              format: 'email',
              description: 'Email de la familia'
            },
            telefon_familia: {
              type: 'string',
              description: 'Teléfono de la familia'
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales',
              nullable: true
            },
            estat: {
              type: 'string',
              enum: ['pendent', 'confirmada', 'cancelada', 'completada'],
              description: 'Estado de la cita'
            },
            google_event_id: {
              type: 'string',
              description: 'ID del evento en Google Calendar',
              nullable: true
            },
            google_event_url: {
              type: 'string',
              format: 'uri',
              description: 'URL del evento en Google Calendar',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización'
            }
          }
        },
        NuevaCita: {
          type: 'object',
          required: ['tutor_email', 'data_cita', 'nom_familia', 'email_familia', 'telefon_familia'],
          properties: {
            tutor_email: {
              type: 'string',
              format: 'email',
              description: 'Email del tutor'
            },
            data_cita: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de la cita'
            },
            durada_minuts: {
              type: 'integer',
              default: 30,
              description: 'Duración de la cita en minutos'
            },
            nom_familia: {
              type: 'string',
              description: 'Nombre de la familia'
            },
            email_familia: {
              type: 'string',
              format: 'email',
              description: 'Email de la familia'
            },
            telefon_familia: {
              type: 'string',
              description: 'Teléfono de la familia'
            },
            notes: {
              type: 'string',
              description: 'Notas adicionales'
            }
          }
        },
        Entrevista: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único de la entrevista'
            },
            alumne_id: {
              type: 'string',
              description: 'ID del alumno'
            },
            any_curs: {
              type: 'string',
              description: 'Año curso'
            },
            data: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de la entrevista'
            },
            acords: {
              type: 'string',
              description: 'Acuerdos y notas de la entrevista'
            },
            usuari_creador_id: {
              type: 'string',
              description: 'Email del usuario que creó la entrevista'
            },
            cita_id: {
              type: 'string',
              description: 'ID de la cita asociada',
              nullable: true
            }
          }
        },
        ConfiguracionHorarios: {
          type: 'object',
          required: ['tutor_email', 'nombre', 'fecha_inicio', 'fecha_fin', 'duracion_cita', 'dias_semana'],
          properties: {
            tutor_email: {
              type: 'string',
              format: 'email',
              description: 'Email del tutor'
            },
            nombre: {
              type: 'string',
              description: 'Nombre de la configuración'
            },
            fecha_inicio: {
              type: 'string',
              format: 'date',
              description: 'Fecha de inicio'
            },
            fecha_fin: {
              type: 'string',
              format: 'date',
              description: 'Fecha de fin'
            },
            duracion_cita: {
              type: 'integer',
              default: 30,
              description: 'Duración por defecto de las citas'
            },
            dias_semana: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  dia: {
                    type: 'string',
                    enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
                  },
                  inicio: {
                    type: 'string',
                    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                    example: '09:00'
                  },
                  fin: {
                    type: 'string',
                    pattern: '^([0-1][0-9]|2[0-3]):[0-5][0-9]$',
                    example: '17:00'
                  },
                  activo: {
                    type: 'boolean'
                  }
                }
              }
            }
          }
        },
        SyncLogEntry: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              description: 'ID del registro'
            },
            action: {
              type: 'string',
              enum: ['push', 'pull', 'conflict'],
              description: 'Tipo de acción de sincronización'
            },
            entity_type: {
              type: 'string',
              enum: ['cita', 'event'],
              description: 'Tipo de entidad sincronizada'
            },
            entity_id: {
              type: 'string',
              description: 'ID de la entidad'
            },
            google_event_id: {
              type: 'string',
              description: 'ID del evento en Google Calendar',
              nullable: true
            },
            status: {
              type: 'string',
              enum: ['success', 'error', 'pending'],
              description: 'Estado de la sincronización'
            },
            error_message: {
              type: 'string',
              description: 'Mensaje de error si aplica',
              nullable: true
            },
            sync_direction: {
              type: 'string',
              enum: ['to_google', 'from_google', 'bidirectional'],
              description: 'Dirección de la sincronización'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del registro'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'No autenticado - Token JWT faltante o inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'No autenticat'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Prohibido - No tiene permisos para esta acción',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'No tens permisos per aquesta acció'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso no encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Recurs no trobat'
              }
            }
          }
        },
        ValidationError: {
          description: 'Error de validación de datos',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Dades invàlides',
                details: [
                  {
                    code: 'invalid_type',
                    expected: 'string',
                    received: 'undefined',
                    path: ['email_familia'],
                    message: 'Required'
                  }
                ]
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Citas',
        description: 'Gestión de citas con familias'
      },
      {
        name: 'Horarios',
        description: 'Configuración de horarios de tutores'
      },
      {
        name: 'Sincronización',
        description: 'Sincronización con Google Calendar'
      },
      {
        name: 'Entrevistas',
        description: 'Gestión de entrevistas académicas'
      },
      {
        name: 'Alumnos',
        description: 'Gestión de alumnos'
      },
      {
        name: 'Sistema',
        description: 'Endpoints del sistema'
      }
    ]
  },
  apis: [
    './src/routes/*.ts',
    './dist/routes/*.js'
  ]
};

export const swaggerSpec = swaggerJsdoc(options);
