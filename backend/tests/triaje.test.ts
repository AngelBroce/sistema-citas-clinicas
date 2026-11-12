import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TriajeService } from '../src/services/triaje.service.js';

describe('TriajeService — Clasificación Clínica y Derivación', () => {
  it('clasifica como URGENTE (rojo) ante dolor de pecho o falta de aire', async () => {
    const res = await TriajeService.evaluarPaciente({
      pacienteId: 'p-1',
      motivoPrincipal: 'Dolor de pecho intenso',
      sintomas: ['falta de aire'],
      tieneDolorPecho: true
    });

    assert.equal(res.nivelTriaje, 'URGENTE');
    assert.equal(res.colorAlerta, 'rojo');
    assert.equal(res.requiereAtencionInmediata, true);
    assert.equal(res.especialidadSugeridaId, 2);
  });

  it('clasifica como MODERADO (amarillo) con fiebre >= 38.5', async () => {
    const res = await TriajeService.evaluarPaciente({
      pacienteId: 'p-2',
      motivoPrincipal: 'Fiebre y malestar general',
      sintomas: ['fiebre alta'],
      temperatura: 39.1
    });

    assert.equal(res.nivelTriaje, 'MODERADO');
    assert.equal(res.colorAlerta, 'amarillo');
    assert.equal(res.requiereAtencionInmediata, false);
  });

  it('clasifica como LEVE (verde) y orienta a Dermatología por síntomas cutáneos', async () => {
    const res = await TriajeService.evaluarPaciente({
      pacienteId: 'p-3',
      motivoPrincipal: 'Mancha en la piel con picazón leve',
      sintomas: ['erupcion', 'picazon']
    });

    assert.equal(res.nivelTriaje, 'LEVE');
    assert.equal(res.colorAlerta, 'verde');
    assert.equal(res.especialidadSugeridaId, 4);
    assert.equal(res.especialidadNombre, 'Dermatología');
  });
});

