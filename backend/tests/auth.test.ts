import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  firmarToken,
  verificarToken,
  requerirAutenticacion,
  requerirRoles
} from '../src/middlewares/auth.middleware.js';

function crearMockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    }
  };
  return res;
}

describe('AuthMiddleware — Tokens HMAC-SHA256 y Control RBAC', () => {
  const originalStrict = process.env.AUTH_STRICT;

  afterEach(() => {
    if (originalStrict === undefined) {
      delete process.env.AUTH_STRICT;
    } else {
      process.env.AUTH_STRICT = originalStrict;
    }
  });

  it('firma y verifica correctamente un token HMAC-SHA256', () => {
    const token = firmarToken({
      id: 'a0000000-0000-0000-0000-000000000001',
      email: 'admin@medpulse.clinic',
      rol: 'ADMINISTRADOR'
    });

    const payload = verificarToken(token);
    assert.ok(payload, 'El token válido debe verificarse');
    assert.equal(payload?.sub, 'a0000000-0000-0000-0000-000000000001');
    assert.equal(payload?.rol, 'ADMINISTRADOR');
  });

  it('rechaza tokens alterados o expirados', () => {
    const token = firmarToken({
      id: 'd0000000-0000-0000-0000-000000000001',
      email: 'juan.perez@gmail.com',
      rol: 'PACIENTE'
    });

    const alterado = token.slice(0, -4) + 'XXXX';
    assert.equal(verificarToken(alterado), null);

    const expirado = firmarToken(
      { id: 'd0000000-0000-0000-0000-000000000001', email: 'juan.perez@gmail.com', rol: 'PACIENTE' },
      -10
    );
    assert.equal(verificarToken(expirado), null);
  });

  it('bloquea con 403 cuando un PACIENTE intenta operar ruta exclusiva de Admin/Secretaria', () => {
    const tokenPaciente = firmarToken({
      id: 'p-1',
      email: 'juan.perez@gmail.com',
      rol: 'PACIENTE'
    });

    const req: any = { headers: { authorization: `Bearer ${tokenPaciente}` } };
    const res = crearMockRes();
    let nextCalled = false;

    requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA'])(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });

  it('permite acceso cuando el rol coincide y rechaza 401 sin token en AUTH_STRICT=true', () => {
    const tokenAdmin = firmarToken({
      id: 'a-1',
      email: 'admin@medpulse.clinic',
      rol: 'ADMINISTRADOR'
    });

    const reqOk: any = { headers: { authorization: `Bearer ${tokenAdmin}` } };
    const resOk = crearMockRes();
    let nextOk = false;

    requerirRoles(['ADMINISTRADOR', 'RECEPCIONISTA'])(reqOk, resOk, () => {
      nextOk = true;
    });

    assert.equal(nextOk, true);
    assert.equal(reqOk.authUser?.rol, 'ADMINISTRADOR');

    process.env.AUTH_STRICT = 'true';
    const reqSinToken: any = { headers: {} };
    const resSinToken = crearMockRes();
    let nextStrict = false;

    requerirRoles(['ADMINISTRADOR'])(reqSinToken, resSinToken, () => {
      nextStrict = true;
    });

    assert.equal(nextStrict, false);
    assert.equal(resSinToken.statusCode, 401);

    const resAuth = crearMockRes();
    let nextAuth = false;
    requerirAutenticacion(reqSinToken, resAuth, () => {
      nextAuth = true;
    });
    assert.equal(nextAuth, false);
    assert.equal(resAuth.statusCode, 401);
  });
});

