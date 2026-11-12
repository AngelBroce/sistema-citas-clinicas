process.env.DISABLE_DB = 'true';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ChatbotService } from '../src/services/chatbot.service.js';
import { AgendamientoService } from '../src/services/agendamiento.service.js';

describe('ChatbotService — NLU, Guardrails y Agendamiento WhatsApp', () => {
  beforeEach(async () => {
    await AgendamientoService.limpiarTodasLasCitas();
  });

  it('extrae nombre, cédula panameña, fecha relativa y hora correctamente', () => {
    const analisis = ChatbotService.analizarMensajeConIA(
      'Hola, soy Ana Morales cédula 8-1234-56789 y quiero una cita para mañana a las 5'
    );

    assert.equal(analisis.intencion, 'SOLICITUD_CITA_DIRECTA');
    assert.equal(analisis.nombreExtraido, 'Ana Morales');
    assert.equal(analisis.cedulaExtraida, '8-1234-56789');
    assert.equal(analisis.horaExtraida, '17:00');
    assert.match(analisis.fechaExtraida || '', /^202\d-\d{2}-\d{2}$/);
  });

  it('aplica guardrail y se niega a recetar medicamentos por WhatsApp', async () => {
    const resp = await ChatbotService.procesarMensajeEntrante({
      telefonoRemitente: '+507 6000-1111',
      mensajeTexto: 'Recetame amoxicilina para el dolor de garganta'
    });

    assert.equal(resp.citaCreada, null);
    assert.match(resp.respuestaBot, /no estoy autorizado para recetar medicamentos/i);
  });

  it('detecta hora llena, sugiere alternativas y crea la cita en PENDIENTE al elegir otra hora', async () => {
    const primerAnalisis = ChatbotService.analizarMensajeConIA('mañana a las 5');
    const fechaObjetivo = primerAnalisis.fechaExtraida!;

    // Ocupar las 17:00 del día objetivo
    await AgendamientoService.reservarCita({
      pacienteId: 'e0000000-0000-0000-0000-000000000099',
      pacienteNombre: 'Paciente Previo',
      medicoId: 'c0000000-0000-0000-0000-000000000001',
      especialidadId: 1,
      fecha: fechaObjetivo,
      horaInicio: '17:00',
      sincronizarGoogleCalendar: false
    });

    const telPrueba = '+507 6555-9901';
    await ChatbotService.procesarMensajeEntrante({
      telefonoRemitente: telPrueba,
      mensajeTexto: 'reiniciar'
    });

    const respOcupada = await ChatbotService.procesarMensajeEntrante({
      telefonoRemitente: telPrueba,
      mensajeTexto: 'Hola soy Luis Perez cedula 8-999-1234 quiero cita mañana a las 5'
    });

    assert.equal(respOcupada.citaCreada, null);
    assert.match(respOcupada.respuestaBot, /ocupado|llena|alternativas|elige/i);

    // Elegir la primera alternativa sugerida ("1")
    const respConfirmada = await ChatbotService.procesarMensajeEntrante({
      telefonoRemitente: telPrueba,
      mensajeTexto: '1'
    });

    assert.ok(respConfirmada.citaCreada, 'Debe crear cita al elegir una hora alternativa libre');
    assert.equal(respConfirmada.citaCreada?.estado, 'PENDIENTE');
    assert.equal(respConfirmada.citaCreada?.pacienteDocumento, '8-999-1234');
  });
});

