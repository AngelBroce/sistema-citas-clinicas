import { Request, Response } from 'express';
import { TriajeService } from '../services/triaje.service.js';
import { TriajeInputDTO } from '../types/index.js';

export class TriajeController {
  public static async evaluar(req: Request, res: Response) {
    try {
      const {
        pacienteId,
        motivoPrincipal,
        sintomas,
        duracionDias,
        temperatura,
        presionArterial,
        tieneDolorPecho,
        dificultadRespiratoria,
        perdidaConocimiento,
        alergiasConocidas
      } = req.body;

      if (!motivoPrincipal) {
        return res.status(400).json({
          ok: false,
          error: 'El campo "motivoPrincipal" es obligatorio para la evaluación de triaje.'
        });
      }

      const input: TriajeInputDTO = {
        pacienteId,
        motivoPrincipal,
        sintomas: Array.isArray(sintomas) ? sintomas : (sintomas ? [sintomas] : []),
        duracionDias: duracionDias ? Number(duracionDias) : undefined,
        temperatura: temperatura ? Number(temperatura) : undefined,
        presionArterial,
        tieneDolorPecho: Boolean(tieneDolorPecho),
        dificultadRespiratoria: Boolean(dificultadRespiratoria),
        perdidaConocimiento: Boolean(perdidaConocimiento),
        alergiasConocidas
      };

      const resultado = await TriajeService.evaluarPaciente(input);

      return res.status(200).json({
        ok: true,
        message: 'Triaje clínico completado exitosamente.',
        data: resultado
      });
    } catch (error: any) {
      return res.status(500).json({
        ok: false,
        error: error.message || 'Error al procesar el triaje del paciente.'
      });
    }
  }
}
