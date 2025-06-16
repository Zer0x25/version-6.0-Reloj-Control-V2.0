// Obtener la fecha de hoy en formato YYYY-MM-DD
function obtenerFechaHoy() {
  const hoy = new Date();
  return hoy.toISOString().split('T')[0];
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
}