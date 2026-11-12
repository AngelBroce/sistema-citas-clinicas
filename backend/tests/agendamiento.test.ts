process.env.DISABLE_DB = 'true';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AgendamientoService } from '../src/services/agendamiento.service.js';

const MEDICO_ROBERTO = 'c0000000-0000-0000-0000-000000000001';
const PACIENTE_ID = 'e0000000-0000-0000-0000-000000000001';
const LUNES_HABIL = '2026-11-16';
const DOMINGO = '2026-11-15';

describe('AgendamientoService — Anti Double-Booking y Slots', () => {
  beforeEach(async () => {
    await AgendamientoService.limpiarTodasLasCitas();
  });

  it('retorna slots de 30 minutos en día hábil y lista vacía en domingo', async () => {
    const slotsLunes = await AgendamientoService.obtenerDisponibilidad(MEDICO_ROBERTO, LUNES_HABIL);
    assert.ok(slotsLunes.length > 0, 'Debe haber turnos disponibles el lunes');
    assert.equal(slotsLunes[0].horaInicio, '08:00');
    assert.equal(slotsLunes[0].horaFin, '08:30');
    assert.equal(slotsLunes[0].duracionMin, 30);

    const slotsDomingo = await AgendamientoService.obtenerDisponibilidad(MEDICO_ROBERTO, DOMINGO);
    assert.equal(slotsDomingo.length, 0, 'No debe haber turnos en domingo');
  });

  it('bloquea doble reserva del mismo médico en la misma fecha y hora (Anti Double-Booking)', async () => {
    const primera = await AgendamientoService.reservarCita({
      pacienteId: PACIENTE_ID,
      pacienteNombre: 'María Gómez',
      pacienteDocumento: '8-1234-56789',
      medicoId: MEDICO_ROBERTO,
      especialidadId: 1,
      fecha: LUNES_HABIL,
      horaInicio: '10:00',
      canalOrigen: 'WEB_PACIENTE',
      reservadoPor: 'PACIENTE',
      sincronizarGoogleCalendar: false
    });

    assert.equal(primera.estado, 'PENDIENTE');

    await assert.rejects(
      () =>
        AgendamientoService.reservarCita({
          pacienteId: 'e0000000-0000-0000-0000-000000000002',
          pacienteNombre: 'Carlos Ruiz',
          medicoId: MEDICO_ROBERTO,
          especialidadId: 1,
          fecha: LUNES_HABIL,
          horaInicio: '10:00',
          canalOrigen: 'RECEPCION_PRESENCIAL',
          reservadoPor: 'ADMINISTRADOR',
          sincronizarGoogleCalendar: false
        }),
      /CONFLICTO_HORARIO/
    );
  });

  it('permite volver a reservar un turno si la cita previa fue CANCELADA', async () => {
    const citaCancelada = await AgendamientoService.reservarCita({
      pacienteId: PACIENTE_ID,
      medicoId: MEDICO_ROBERTO,
      especialidadId: 1,
      fecha: LUNES_HABIL,
      horaInicio: '11:00',
      sincronizarGoogleCalendar: false
    });

    await AgendamientoService.actualizarEstadoCita(citaCancelada.id, 'CANCELADA');

    const nuevaCita = await AgendamientoService.reservarCita({
      pacienteId: PACIENTE_ID,
      medicoId: MEDICO_ROBERTO,
      especialidadId: 1,
      fecha: LUNES_HABIL,
      horaInicio: '11:00',
      reservadoPor: 'ADMINISTRADOR',
      sincronizarGoogleCalendar: false
    });

    assert.equal(nuevaCita.estado, 'CONFIRMADA');
  });

  it('asigna automáticamente el primer turno libre sin solapar turnos existentes', async () => {
    const primero = await AgendamientoService.asignarCitaAutomatica({
      pacienteId: PACIENTE_ID,
      medicoId: MEDICO_ROBERTO,
      especialidadId: 1,
      fecha: LUNES_HABIL,
      reservadoPor: 'PACIENTE'
    });
    assert.equal(primero.horaAsignada, '08:00 - 08:30');
    assert.equal(primero.cita.estado, 'PENDIENTE');

    const segundo = await AgendamientoService.asignarCitaAutomatica({
      pacienteId: PACIENTE_ID,
      medicoId: MEDICO_ROBERTO,
      especialidadId: 1,
      fecha: LUNES_HABIL,
      reservadoPor: 'ADMINISTRADOR'
    });
    assert.equal(segundo.horaAsignada, '08:30 - 09:00');
    assert.equal(segundo.cita.estado, 'CONFIRMADA');
  });

  it('detecta hora ocupada y fuera de horario en verificarSlotEspecifico', async () => {
    await AgendamientoService.reservarCita({
      pacienteId: PACIENTE_ID,
      medicoId: MEDICO_ROBERTO,
      especialidadId: 1,
      fecha: LUNES_HABIL,
      horaInicio: '17:00',
      sincronizarGoogleCalendar: false
    });

    const ocupado = await AgendamientoService.verificarSlotEspecifico(MEDICO_ROBERTO, LUNES_HABIL, '17:00');
    assert.equal(ocupado.disponible, false);
    assert.equal(ocupado.motivoRechazo, 'HORA_OCUPADA');
    assert.ok(ocupado.alternativasDisponibles.length > 0);
    assert.ok(!ocupado.alternativasDisponibles.some(s => s.horaInicio === '17:00'));

    const fueraTurno = await AgendamientoService.verificarSlotEspecifico(MEDICO_ROBERTO, LUNES_HABIL, '22:00');
    assert.equal(fueraTurno.disponible, false);
    assert.equal(fueraTurno.motivoRechazo, 'FUERA_DE_HORARIO');
  });
});

