import { v4 as uuidv4 } from 'uuid';

export interface GoogleCalendarEventPayload {
  summary: string;
  description: string;
  startDateTime: string; // ISO
  endDateTime: string;   // ISO
  attendeeEmail?: string;
  location?: string;
}

export interface GoogleCalendarEventResult {
  googleEventId: string;
  linkEvento: string;
  htmlLink: string;
  estado: 'SINCRONIZADO' | 'ERROR';
  sincronizadoEn: string;
}

export class GoogleCalendarService {
  /**
   * Sincroniza y crea un evento en el Google Calendar del paciente o médico
   */
  public static async sincronizarEvento(payload: GoogleCalendarEventPayload): Promise<GoogleCalendarEventResult> {
    const googleEventId = `gcal_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const mockMeetLink = `https://meet.google.com/med-${uuidv4().substring(0, 4)}-${uuidv4().substring(0, 4)}`;
    const mockCalendarLink = `https://calendar.google.com/calendar/event?eid=${Buffer.from(googleEventId).toString('base64')}`;

    // Simulación de respuesta de Google Calendar API v3
    return {
      googleEventId,
      linkEvento: mockMeetLink,
      htmlLink: mockCalendarLink,
      estado: 'SINCRONIZADO',
      sincronizadoEn: new Date().toISOString()
    };
  }

  /**
   * Cancela o desvincula un evento en Google Calendar
   */
  public static async cancelarEvento(googleEventId: string): Promise<boolean> {
    if (!googleEventId) return false;
    return true;
  }
}
