// Lista fija de 5 propiedades
const PROPIEDADES = [
  { id: 'U4', nombre: 'Unidad 4' },
  { id: 'U7', nombre: 'Unidad 7' },
  { id: 'U8', nombre: 'Unidad 8' },
  { id: 'U13', nombre: 'Unidad 13' },
  { id: 'U14', nombre: 'Unidad 14' }
];

const STORAGE_KEY = 'reservas_v1';

document.addEventListener('DOMContentLoaded', () => {
  inicializarSelects();
  vincularEventos();
  renderizarTabla();
});

function inicializarSelects() {
  const selPropiedad = document.getElementById('propiedad');
  const selFiltro = document.getElementById('filtroPropiedad');

  // Opciones para el formulario
  PROPIEDADES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    selPropiedad.appendChild(opt);
  });

  // Opciones para el filtro (incluye "Todas")
  const optTodas = document.createElement('option');
  optTodas.value = 'todas';
  optTodas.textContent = 'Todas';
  selFiltro.appendChild(optTodas);
  PROPIEDADES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.nombre;
    selFiltro.appendChild(opt);
  });

  selFiltro.value = 'todas';
}

function vincularEventos() {
  document.getElementById('formReserva').addEventListener('submit', onSubmitReserva);
  document.getElementById('filtroPropiedad').addEventListener('change', renderizarTabla);
  document.getElementById('btnBorrarTodo').addEventListener('click', borrarTodo);
  document.getElementById('btnExportar').addEventListener('click', exportarCSV);
}

function onSubmitReserva(event) {
  event.preventDefault();

  const propiedadId = document.getElementById('propiedad').value;
  const entrada = document.getElementById('entrada').value; // YYYY-MM-DD
  const salida = document.getElementById('salida').value;
  const huespedes = parseInt(document.getElementById('huespedes').value, 10);
  const monto = parseFloat(document.getElementById('monto').value);
  const medioPago = document.getElementById('medioPago').value;

  // Validaciones básicas
  if (!propiedadId || !entrada || !salida || isNaN(huespedes) || isNaN(monto)) {
    alert('Completá todos los campos.');
    return;
  }

  const dEntrada = new Date(entrada);
  const dSalida = new Date(salida);
  if (!(dSalida > dEntrada)) {
    alert('La fecha de salida debe ser posterior a la de entrada.');
    return;
  }
  if (huespedes < 1) {
    alert('La cantidad de huéspedes debe ser al menos 1.');
    return;
  }
  if (monto < 0) {
    alert('El monto no puede ser negativo.');
    return;
  }

  // Validar solapamiento en la misma propiedad
  const reservas = obtenerReservas();
  const solapa = reservas.some(r => r.propiedadId === propiedadId && rangosSeSolapan(entrada, salida, r.entrada, r.salida));
  if (solapa) {
    alert('Ya existe una reserva que se solapa para esta propiedad.');
    return;
  }

  const noches = calcularNoches(entrada, salida);

  const nueva = {
    id: generarId(),
    propiedadId,
    entrada,
    salida,
    noches,
    huespedes,
    monto,
    medioPago
  };

  reservas.push(nueva);
  guardarReservas(reservas);
  (event.target).reset();
  renderizarTabla();
}

function rangosSeSolapan(aInicio, aFin, bInicio, bFin) {
  // Solapa si (aInicio < bFin) y (bInicio < aFin)
  return new Date(aInicio) < new Date(bFin) && new Date(bInicio) < new Date(aFin);
}

function calcularNoches(entrada, salida) {
  const ms = new Date(salida) - new Date(entrada);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function obtenerReservas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function guardarReservas(reservas) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reservas));
}

function renderizarTabla() {
  const tbody = document.getElementById('tbodyReservas');
  const filtro = document.getElementById('filtroPropiedad').value;
  const reservas = obtenerReservas();

  const filtradas = filtro === 'todas' ? reservas : reservas.filter(r => r.propiedadId === filtro);

  tbody.innerHTML = '';
  if (filtradas.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 8;
    td.textContent = 'No hay reservas.';
    td.style.color = 'var(--muted)';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  filtradas.sort((a, b) => new Date(a.entrada) - new Date(b.entrada));

  for (const r of filtradas) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${nombrePropiedad(r.propiedadId)}</td>
      <td>${formatearFecha(r.entrada)}</td>
      <td>${formatearFecha(r.salida)}</td>
      <td><span class="tag">${r.noches}</span></td>
      <td>${r.huespedes}</td>
      <td>${formatearMoneda(r.monto)}</td>
      <td>${r.medioPago}</td>
      <td>
        <button class="btn btn-danger btn-sm" data-id="${r.id}">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  }

  // Delegación para eliminar
  tbody.querySelectorAll('button[data-id]').forEach(btn => {
    btn.addEventListener('click', () => eliminarReserva(btn.getAttribute('data-id')));
  });
}

function eliminarReserva(id) {
  if (!confirm('¿Eliminar esta reserva?')) return;
  const reservas = obtenerReservas().filter(r => r.id !== id);
  guardarReservas(reservas);
  renderizarTabla();
}

function borrarTodo() {
  if (!confirm('¿Borrar TODAS las reservas? Esta acción no se puede deshacer.')) return;
  guardarReservas([]);
  renderizarTabla();
}

function exportarCSV() {
  const reservas = obtenerReservas();
  if (reservas.length === 0) {
    alert('No hay datos para exportar.');
    return;
  }
  const encabezados = ['Propiedad','Entrada','Salida','Noches','Huéspedes','Monto(ARS)','Medio de pago'];
  const filas = reservas.map(r => [
    nombrePropiedad(r.propiedadId),
    r.entrada,
    r.salida,
    r.noches,
    r.huespedes,
    r.monto,
    r.medioPago
  ]);

  const csv = [encabezados, ...filas].map(cols => cols.map(escaparCSV).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reservas.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escaparCSV(valor) {
  const s = String(valor ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replaceAll('"', '""') + '"';
  }
  return s;
}

function nombrePropiedad(id) {
  const p = PROPIEDADES.find(x => x.id === id);
  return p ? p.nombre : id;
}

function formatearFecha(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatearMoneda(n) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n);
  } catch (_) {
    return `$${Number(n).toFixed(2)}`;
  }
}

function generarId() {
  return 'r_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

