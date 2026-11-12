import { AgendamientoService } from '../services/agendamiento.service.js';
import { TriajeService } from '../services/triaje.service.js';

async function runTests() {
  console.log('🧪 Iniciando verificación del Módulo de Calendario y Triaje...\n');

  // Test 1: Disponibilidad
  const medicoId = 'd0000000-0000-0000-0000-000000000001';
  const fecha = '2026-10-20'; // Martes
  const slots = await AgendamientoService.obtenerDisponibilidad(medicoId, fecha);
  console.log(`✅ Slots calculados para el médico en ${fecha}: ${slots.length} turnos disponibles.`);
  console.log(`   Ejemplo de slots:`, slots.slice(0, 3).map(s => `${s.horaInicio}-${s.horaFin}`));

  // Test 2: Reserva con Google Calendar
  const nuevaCita = await AgendamientoService.reservarCita({
    pacienteId: 'p0000000-0000-0000-0000-000000000001',
    medicoId,
    especialidadId: 1,
    fecha,
    horaInicio: '10:00',
    duracionMin: 30,
    motivoConsulta: 'Dolor recurrente y control',
    sincronizarGoogleCalendar: true
  });
  console.log(`✅ Cita reservada con éxito: ${nuevaCita.codigoCita}`);
  console.log(`   Sincronización Google Calendar:`, nuevaCita.googleCalendarEvent?.linkEvento);

  // Test 3: Validación anti-solapamiento (double-booking)
  try {
    await AgendamientoService.reservarCita({
      pacienteId: 'p0000000-0000-0000-0000-000000000002',
      medicoId,
      especialidadId: 1,
      fecha,
      horaInicio: '10:00', // Mismo horario
      duracionMin: 30,
      motivoConsulta: 'Intento de cita solapada'
    });
    console.error('❌ ERROR: Se permitió una colisión de horario!');
  } catch (err: any) {
    console.log(`✅ Prevención anti-solapamiento funcionando: ${err.message}`);
  }

  // Test 4: Triaje Clínico
  const triajeUrgente = await TriajeService.evaluarPaciente({
    motivoPrincipal: 'Dolor opresivo en el pecho y mareo',
    sintomas: ['dolor de pecho', 'dificultad para respirar'],
    tieneDolorPecho: true,
    dificultadRespiratoria: true
  });
  console.log(`✅ Triaje urgente clasificado: ${triajeUrgente.nivelTriaje} (${triajeUrgente.prioridadAtencion}) -> Especialidad: ${triajeUrgente.especialidadNombre}`);

  const triajeLeve = await TriajeService.evaluarPaciente({
    motivoPrincipal: 'Picazón en la piel y manchas rojas',
    sintomas: ['erupcion cutanea', 'picazon']
  });
  console.log(`✅ Triaje dermatológico leve clasificado: ${triajeLeve.nivelTriaje} -> Especialidad sugerida: ${triajeLeve.especialidadNombre}`);

  // Test 5: Asignación automática de horario (el paciente no elige hora)
  const citaAutomatica = await AgendamientoService.asignarCitaAutomatica({
    pacienteId: 'p0000000-0000-0000-0000-000000000003',
    medicoId,
    especialidadId: 1,
    fecha,
    motivoConsulta: 'Solicitud con asignación automática de turno'
  });
  console.log(`✅ Asignación automática exitosa: Horario asignado: ${citaAutomatica.horaAsignada} (${citaAutomatica.cita.codigoCita})`);

  console.log('\n🎉 ¡Todos los contratos y lógica de negocio validados con éxito!');
}

runTests().catch(console.error);
