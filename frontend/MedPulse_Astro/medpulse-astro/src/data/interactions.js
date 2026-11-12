import data from './seeds.json';

const toast = (text) => {
  const el = document.querySelector('#toast');
  if (el) {
    el.textContent = text;
    el.style.display = 'block';
    setTimeout(() => { if (el) el.style.display = 'none'; }, 3500);
  }
};

document.querySelector('#menu')?.addEventListener('click', () => document.body.classList.toggle('menu-open'));

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

document.querySelectorAll('[data-entity]').forEach((form) => {
  const id = form.elements?.namedItem('id')?.value || Array.from(form.elements || []).filter(x => x.name).map(x => x.value).join('|');
  const key = 'medpulse-demo:' + form.dataset.entity + ':' + id;
  const saved = read(key);
  if (saved) {
    Object.entries(saved).forEach(([k, v]) => {
      const input = form.elements?.namedItem(k);
      if (input) input.value = v;
    });
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      localStorage.setItem(key, JSON.stringify(Object.fromEntries(new FormData(form))));
      toast('Cambios guardados en este navegador');
    } catch {
      toast('No se pudo guardar: almacenamiento no disponible');
    }
  });
  form.querySelector('[data-reset]')?.addEventListener('click', () => {
    localStorage.removeItem(key);
    form.reset();
    toast('Datos iniciales restablecidos');
  });
});

document.querySelectorAll('[data-search]').forEach((input) => {
  if (input.closest('#appointments-section')) return;
  const card = input.closest('.card');
  if (!card) return;
  const filter = () => {
    let count = 0;
    card.querySelectorAll('tbody tr').forEach((row) => {
      const show = row.textContent.toLowerCase().includes(input.value.toLowerCase()) &&
        (!card.querySelector('[data-status]')?.value || row.dataset.state === card.querySelector('[data-status]').value);
      row.hidden = !show;
      if (show) count++;
    });
    const empty = card.querySelector('[data-empty]');
    if (empty) empty.hidden = count > 0;
  };
  input.addEventListener('input', filter);
  card.querySelector('[data-status]')?.addEventListener('change', filter);
});

const booking = document.querySelector('#booking');
if (booking) {
  const specialty = booking.querySelector('#specialty');
  const doctor = booking.querySelector('#doctor');
  const date = booking.elements?.namedItem('fecha');
  const slot = booking.querySelector('#slot');

  if (date) {
    date.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama' }).format(new Date());
  }

  const updateSlots = () => {
    if (!slot) return;
    slot.replaceChildren();
    if (!date?.value) return;
    const day = new Date(date.value + 'T12:00:00').getDay() || 7;
    const h = data.horarios_medicos.find(h => h.medico_id === doctor?.value && h.dia_semana === day);
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = h ? 'Selecciona una hora' : 'Sin horarios para esta fecha';
    slot.append(opt);
    if (!h) {
      const room = booking.querySelector('#room');
      if (room) room.value = '';
      return;
    }
    const room = data.consultorios.find(c => c.id === h.consultorio_id);
    const roomEl = booking.querySelector('#room');
    if (roomEl && room) {
      roomEl.value = room.nombre;
      roomEl.dataset.id = String(room.id);
    }
    const mins = t => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    for (let i = mins(h.hora_inicio); i + h.duracion_cita_min <= mins(h.hora_fin); i += h.duracion_cita_min) {
      const time = String(Math.floor(i / 60)).padStart(2, '0') + ':' + String(i % 60).padStart(2, '0');
      const occupied = data.citas.some(c => c.medico_id === doctor?.value && c.fecha_hora_inicio.slice(0, 16) === date.value + ' ' + time);
      if (!occupied) {
        const o = document.createElement('option');
        o.value = time;
        o.textContent = time;
        slot.append(o);
      }
    }
    const info = booking.querySelector('#booking-info');
    if (info && room) {
      info.textContent = 'Duración: ' + h.duracion_cita_min + ' minutos · ' + room.sede;
    }
  };

  const updateDoctors = () => {
    if (!doctor || !specialty) return;
    doctor.replaceChildren();
    data.medicos
      .filter(m => data.medicos_especialidades.some(e => e.medico_id === m.id && e.especialidad_id === Number(specialty.value)))
      .forEach(m => {
        const o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.nombres + ' ' + m.apellidos;
        doctor.append(o);
      });
    updateSlots();
  };

  specialty?.addEventListener('change', updateDoctors);
  doctor?.addEventListener('change', updateSlots);
  date?.addEventListener('change', updateSlots);
  updateDoctors();

  booking.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!slot?.value) return;
    const row = Object.fromEntries(new FormData(booking));
    row.consultorio_id = booking.querySelector('#room')?.dataset?.id;
    row.fecha_hora_inicio = row.fecha + ' ' + row.hora;
    row.canal_origen = 'WEB_PACIENTE';
    row.estado = 'PENDIENTE';
    row.codigo_cita = 'DEMO-' + Date.now();
    try {
      localStorage.setItem('medpulse-demo:reserva', JSON.stringify(row));
      const res = booking.querySelector('#booking-result');
      if (res) {
        res.textContent = 'Reserva de ejemplo ' + row.codigo_cita + ' guardada localmente. No se ha enviado a la clínica.';
      }
    } catch {
      toast('No se pudo guardar en este navegador');
    }
  });
}

// Nota: el chatbot/asistente conversacional NO forma parte de la web.
// Se atiende por WhatsApp (ver backend: triaje.service.ts / chatbot.service.ts).
