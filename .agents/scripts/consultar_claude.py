#!/usr/bin/env python3
"""
consultar_claude.py - Puente de Colaboración Antigravity <-> Claude
Permite a Antigravity consultar y debatir problemas, arquitecturas o bugs directamente con Claude (Anthropic API).
Funciona sin dependencias externas usando únicamente la biblioteca estándar de Python (urllib).
"""

import sys
import os
import json
import urllib.request
import urllib.error

def obtener_api_key():
    # 1. Variable de entorno directa
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        return api_key.strip()
    
    # 2. Buscar en archivos .env comunes del proyecto
    rutas_env = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), "backend", ".env"),
        os.path.join(os.path.expanduser("~"), ".anthropic_key")
    ]
    for ruta in rutas_env:
        if os.path.exists(ruta):
            with open(ruta, "r", encoding="utf-8") as f:
                for linea in f:
                    linea = linea.strip()
                    if linea.startswith("ANTHROPIC_API_KEY="):
                        return linea.split("=", 1)[1].strip().strip('"').strip("'")
    return None

def consultar_claude(pregunta: str, contexto_codigo: str = "", modelo: str = "claude-3-7-sonnet-20250219"):
    api_key = obtener_api_key()
    if not api_key:
        print("[ERROR] No se encontró la variable ANTHROPIC_API_KEY en el entorno ni en archivos .env.", file=sys.stderr)
        print("Por favor configura ANTHROPIC_API_KEY en tu entorno o en .env para activar el debate en tiempo real.", file=sys.stderr)
        sys.exit(1)

    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }

    contenido_usuario = f"CONTEXTO DEL CÓDIGO Y PROBLEMA:\n{contexto_codigo}\n\nPREGUNTA O PROPUESTA PARA DEBATIR:\n{pregunta}" if contexto_codigo else pregunta

    payload = {
        "model": modelo,
        "max_tokens": 4096,
        "system": (
            "Eres Claude, un Ingeniero y Arquitecto de Software Principal de nivel Staff colaborando en modo "
            "Pair-Programming con Antigravity en el proyecto MedPulse (Sistema Clínico de Citas). "
            "Tu objetivo es debatir soluciones técnicas, identificar 'corner cases', evaluar rendimiento, "
            "seguridad y proponer la arquitectura más limpia y robusta posible. Sé directo, técnico y constructivo."
        ),
        "messages": [
            {"role": "user", "content": contenido_usuario}
        ]
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            texto_respuesta = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text")
            return texto_respuesta
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"[ERROR HTTP {e.code}]: {error_body}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR DE RED]: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Uso: python consultar_claude.py \"Pregunta o problema a debatir\" [ruta/archivo/contexto.ext]")
        sys.exit(1)

    pregunta = sys.argv[1]
    contexto = ""
    if len(sys.argv) >= 3 and os.path.exists(sys.argv[2]):
        with open(sys.argv[2], "r", encoding="utf-8") as f:
            contexto = f"--- Archivo: {sys.argv[2]} ---\n" + f.read()

    print("🤖 Consultando a Claude (Anthropic)...")
    respuesta = consultar_claude(pregunta, contexto)
    print("\n--- 🧠 RESPUESTA DE CLAUDE ---")
    print(respuesta)
