/**
 * =================================================================
 * LIBRERÍA DE UTILIDADES Y CONSTANTES GLOBALES
 * Este archivo contiene funciones de ayuda y constantes compartidas.
 * =================================================================
 */

// --- Constantes Globales de la Aplicación ---

// Claves para Local Storage
const LS_EMPLEADOS = "empleados";
const LS_REGISTROS = "registros";
const LS_LOGS = "logs";
const LS_NOVEDADES = "libro-novedades-registros";
const LS_PROVEEDORES = "libro-novedades-proveedores";
const LS_TURNOS_CERRADOS = "libro-novedades-turnos-cerrados";
const LS_TURNO_ABIERTO = "libro-novedades-turno-abierto";

// Configuración de Seguridad
const ADMIN_PIN = "1234";

// --- Funciones de Fecha y Hora ---

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 * @returns {string} La fecha formateada.
 */
function obtenerFechaHoy() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = (hoy.getMonth() + 1).toString().padStart(2, '0');
  const day = hoy.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtiene la hora actual en formato HH:MM.
 * @returns {string} La hora formateada.
 */
function obtenerHoraActual() {
  const ahora = new Date();
  return ahora.toTimeString().slice(0, 5);
}

/**
 * Genera un Identificador Único (UID) para los registros.
 * @returns {string} Un UID alfanumérico único.
 */
function generarUID() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
}

/**
 * Genera un nuevo ID correlativo para un empleado.
 * @returns {string} El nuevo ID correlativo formateado (e.g., "001").
 */
function generarIDCorrelativoEmpleado() {
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  let maxNum = 0;

  empleados.forEach(empleado => {
    const num = parseInt(empleado.id, 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  return String(nextNum).padStart(3, '0');
}

// --- Funciones de Almacenamiento Local (Local Storage) ---

/**
 * Guarda un valor en Local Storage, convirtiéndolo a JSON.
 * @param {string} clave - La clave bajo la cual se guardará el dato.
 * @param {*} valor - El valor a guardar.
 */
function guardarEnLS(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (e) {
    console.error(`Error al guardar en Local Storage con la clave "${clave}":`, e);
    sweetAlertError('Error al guardar datos. El almacenamiento puede estar lleno o inaccesible.');
  }
}

/**
 * Obtiene un valor de Local Storage.
 * @param {string} clave - La clave del dato a obtener.
 * @returns {*} El valor recuperado, o null si no se encuentra.
 */
function obtenerDeLS(clave) {
  try {
    const valorGuardado = localStorage.getItem(clave);
    return valorGuardado ? JSON.parse(valorGuardado) : null;
  } catch (e) {
    console.error(`Error al obtener o parsear de Local Storage con la clave "${clave}":`, e);
    return null;
  }
}

/**
 * Elimina un valor de Local Storage.
 * @param {string} clave - La clave del dato a eliminar.
 */
function eliminarDeLS(clave) {
  try {
    localStorage.removeItem(clave);
  } catch (e) {
    console.error(`Error al eliminar de Local Storage con la clave "${clave}":`, e);
    sweetAlertError('Error al eliminar datos del almacenamiento.');
  }
}

// --- Funciones de Interfaz de Usuario (UI) ---

/**
 * Muestra una alerta estilizada utilizando SweetAlert2.
 * @param {string} msg - El mensaje a mostrar.
 * @param {string} [type='warning'] - El tipo de icono ('success', 'error', 'warning', 'info').
 * @param {string} [title='Atención'] - El título de la alerta.
 */
function sweetAlertError(msg, type = 'warning', title = 'Atención') {
  if (window.Swal) {
    Swal.fire({
      icon: type,
      title: title,
      text: msg,
      confirmButtonText: 'OK'
    });
  } else {
    console.warn('SweetAlert2 no está disponible, usando alert() nativo:', msg);
    alert(`${title}: ${msg}`);
  }
}

/**
 * Alterna el modo oscuro/claro de la interfaz.
 */
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDarkMode = document.body.classList.contains('dark-mode');
  guardarEnLS('darkMode', isDarkMode);
  
  const iconoModo = document.querySelector('.icono-modo');
  if (iconoModo) {
    iconoModo.textContent = isDarkMode ? '☀️' : '🌙';
  }
}

/**
 * Muestra la sección de Control de Horario y oculta el Libro de Novedades.
 */
function showControlHorario() {
  document.getElementById('controlHorarioSection')?.classList.remove('hidden');
  document.getElementById('libroNovedadesSection')?.classList.add('hidden');
}

/**
 * Muestra la sección de Libro de Novedades y oculta el Control de Horario.
 */
function showLibroNovedades() {
  document.getElementById('controlHorarioSection')?.classList.add('hidden');
  document.getElementById('libroNovedadesSection')?.classList.remove('hidden');

  if (typeof inicializarLibroNovedades === 'function') {
    inicializarLibroNovedades();
  }
}

/**
 * Muestra un modal y se asegura de que sea visible.
 * @param {string} modalId - El ID del modal a mostrar.
 */
function mostrarModalConScroll(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.error(`Modal con ID "${modalId}" no encontrado.`);
    return;
  }
  modal.style.display = 'flex'; // Usar flex para centrar
  modal.classList.add('visible');
}

/**
 * Permite cerrar un modal al hacer clic en el fondo oscuro.
 * @param {string} modalId - El ID del modal.
 */
function habilitarCierrePorFondo(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.style.display = 'none';
      modal.classList.remove('visible');
    }
  });
}

function habilitarArrastreScrollHorizontal(idContenedor) {
  const contenedor = document.getElementById(idContenedor);
  if (!contenedor) return;

  let isDown = false;
  let startX;
  let scrollLeft;

  contenedor.addEventListener('mousedown', (e) => {
    isDown = true;
    contenedor.classList.add('arrastrando');
    startX = e.pageX - contenedor.offsetLeft;
    scrollLeft = contenedor.scrollLeft;
  });
  contenedor.addEventListener('mouseleave', () => {
    isDown = false;
    contenedor.classList.remove('arrastrando');
  });
  contenedor.addEventListener('mouseup', () => {
    isDown = false;
    contenedor.classList.remove('arrastrando');
  });
  contenedor.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - contenedor.offsetLeft;
    const walk = (x - startX) * 1.5; // Adjust scroll speed if needed
    contenedor.scrollLeft = scrollLeft - walk;
  });
}
