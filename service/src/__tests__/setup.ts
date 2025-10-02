// Setup global para tests
import dotenv from 'dotenv';

// Cargar variables de entorno de prueba
dotenv.config({ path: '.env.test' });

// Mock de servicios externos
jest.mock('../calendar/google-calendar.js', () => ({
  googleCalendarService: {
    createEvent: jest.fn().mockResolvedValue({
      googleEventId: 'mock_event_123',
      eventUrl: 'https://calendar.google.com/mock'
    }),
    updateEvent: jest.fn().mockResolvedValue(undefined),
    deleteEvent: jest.fn().mockResolvedValue(undefined),
    checkConflicts: jest.fn().mockResolvedValue(false)
  }
}));

jest.mock('../email/email-service.js', () => ({
  emailService: {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendCitaNotification: jest.fn().mockResolvedValue(true)
  }
}));

// Timeout global para tests
jest.setTimeout(10000);

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
});
