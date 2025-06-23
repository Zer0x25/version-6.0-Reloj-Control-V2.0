// Obtener la fecha de hoy en formato YYYY-MM-DD
function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const day = hoy.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Obtener la hora actual en formato HH:MM
function obtenerHoraActual() {
  const ahora = new Date();
  return ahora.toTimeString().slice(0,5);
}

// Guardar en localStorage
function guardarEnLS(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

// Obtener de localStorage
function obtenerDeLS(clave) {
  const dato = localStorage.getItem(clave);
  return dato ? JSON.parse(dato) : null;
}

// Eliminar de localStorage
function eliminarDeLS(clave) {
  localStorage.removeItem(clave);
}// Corrige la asignación de la fecha para evitar desfase por zona horaria

function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const day = hoy.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Obtener la hora actual en formato HH:MM
function obtenerHoraActual() {
  const ahora = new Date();
  return ahora.toTimeString().slice(0,5);
}

function showControlHorario() {
  controlHorarioSection.classList.remove('hidden');
  libroNovedadesSection.classList.add('hidden');
}

function showLibroNovedades() {
  controlHorarioSection.classList.add('hidden');
  libroNovedadesSection.classList.remove('hidden');
   if (typeof inicializarLibroNovedades === 'function') {
      inicializarLibroNovedades();
   }
}

// Guardar en localStorage
function guardarEnLS(clave, valor) {
  localStorage.setItem(clave, JSON.stringify(valor));
}

// Obtener de localStorage
function obtenerDeLS(clave) {
  const dato = localStorage.getItem(clave);
  return dato ? JSON.parse(dato) : null;
}

// Eliminar de localStorage
function eliminarDeLS(clave) {
  localStorage.removeItem(clave);
}