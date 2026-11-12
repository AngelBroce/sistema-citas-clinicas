import { v4 as uuidv4 } from 'uuid';
import { TriajeInputDTO, TriajeResultadoDTO, NivelTriaje } from '../types/index.js';

export class TriajeService {
  /**
   * Evalúa la sintomatología del paciente y genera una clasificación clínica
   * con nivel de urgencia y sugerencia de especialidad médica.
   */
  public static async evaluarPaciente(input: TriajeInputDTO): Promise<TriajeResultadoDTO> {
    const sintomasTexto = (input.sintomas || []).join(' ').toLowerCase() + ' ' + (input.motivoPrincipal || '').toLowerCase();
    
    let nivel: NivelTriaje = 'LEVE';
    let color: 'verde' | 'amarillo' | 'rojo' = 'verde';
    let prioridad = 'Consulta ambulatoria estándar (Prioridad 3)';
    let especialidadId = 1; // Medicina General por defecto
    let especialidadNombre = 'Medicina General';
    let requiereInmediata = false;
    const recomendaciones: string[] = [];

    // 1. Evaluación de signos de alarma roja (Urgente / Emergencia)
    const signosRojos = [
      input.tieneDolorPecho,
      input.dificultadRespiratoria,
      input.perdidaConocimiento,
      sintomasTexto.includes('dolor de pecho'),
      sintomasTexto.includes('falta de aire'),
      sintomasTexto.includes('desmayo'),
      sintomasTexto.includes('convulsion'),
      sintomasTexto.includes('hemorragia grave')
    ];

    if (signosRojos.some(Boolean)) {
      nivel = 'URGENTE';
      color = 'rojo';
      prioridad = 'Atención Inmediata o Urgencias Hospitalarias (Prioridad 1)';
      requiereInmediata = true;
      recomendaciones.push('Debe acudir inmediatamente a la sala de emergencias más cercana.');
      recomendaciones.push('Evite realizar esfuerzos físicos y manténgase en reposo con compañía.');
      
      if (sintomasTexto.includes('pecho') || input.tieneDolorPecho) {
        especialidadId = 2; // Cardiología
        especialidadNombre = 'Cardiología de Urgencia';
      }
    } 
    // 2. Evaluación de signos moderados (Prioridad 2)
    else {
      const temperaturaAlta = input.temperatura && input.temperatura >= 38.5;
      const duracionProlongada = input.duracionDias && input.duracionDias >= 5;

      const esCardiologico = sintomasTexto.includes('palpitacion') || sintomasTexto.includes('hipertension') || sintomasTexto.includes('presion alta');
      const esPediatrico = sintomasTexto.includes('bebe') || sintomasTexto.includes('nino') || sintomasTexto.includes('lactante');
      const esDermatologico = sintomasTexto.includes('erupcion') || sintomasTexto.includes('mancha') || sintomasTexto.includes('picazon') || sintomasTexto.includes('piel');

      if (temperaturaAlta || duracionProlongada || esCardiologico) {
        nivel = 'MODERADO';
        color = 'amarillo';
        prioridad = 'Consulta Prioritaria en menos de 24-48 horas (Prioridad 2)';
        recomendaciones.push('Agendar cita prioritaria para evaluación presencial.');
        recomendaciones.push('Monitorear signos vitales y mantener hidratación.');

        if (esCardiologico) {
          especialidadId = 2;
          especialidadNombre = 'Cardiología';
        } else if (esPediatrico) {
          especialidadId = 3;
          especialidadNombre = 'Pediatría';
        } else {
          especialidadId = 1;
          especialidadNombre = 'Medicina General';
        }
      } else {
        // Nivel Leve
        nivel = 'LEVE';
        color = 'verde';
        prioridad = 'Consulta Médica General Programada (Prioridad 3)';
        recomendaciones.push('Puede agendar cita regular según disponibilidad en el calendario.');
        recomendaciones.push('Si los síntomas empeoran o presenta fiebre superior a 38.5°C, acuda a triaje.');

        if (esDermatologico) {
          especialidadId = 4;
          especialidadNombre = 'Dermatología';
        } else if (esPediatrico) {
          especialidadId = 3;
          especialidadNombre = 'Pediatría';
        } else {
          especialidadId = 1;
          especialidadNombre = 'Medicina General';
        }
      }
    }

    const resumen = `Paciente evaluado con motivo principal: "${input.motivoPrincipal}". Clasificación clínica: ${nivel}. Especialidad orientada: ${especialidadNombre}.`;

    return {
      triajeId: uuidv4(),
      nivelTriaje: nivel,
      colorAlerta: color,
      prioridadAtencion: prioridad,
      resumenClinico: resumen,
      especialidadSugeridaId: especialidadId,
      especialidadNombre,
      requiereAtencionInmediata: requiereInmediata,
      recomendaciones,
      fechaEvaluacion: new Date().toISOString()
    };
  }
}
