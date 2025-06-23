/**
 * Constantes para las claves del Local Storage.
 * Usar constantes evita errores por escribir mal las claves.
 */
const LS_NOVEDADES = "libro-novedades-registros";
const LS_PROVEEDORES = "libro-novedades-proveedores";
const LS_TURNOS_CERRADOS = "libro-novedades-turnos-cerrados";
const LS_TURNO_ABIERTO = "libro-novedades-turno-abierto"; // Almacena el turno actual abierto

// La función sweetAlertError ya está definida en utils.js, no es necesario duplicarla aquí.
// Se asume que utils.js se carga antes que este script.

/**A
 * Verifica si hay un turno abierto consultando el Local Storage.
 * @returns {boolean} - Devuelve true si hay un turno abierto, de lo contrario false.
 */
function turnoEstaAbierto() {
  return obtenerDeLS(LS_TURNO_ABIERTO) !== null;
}

/**
 * Genera un folio único para el turno, basado en la fecha y hora actuales.
 * @returns {string} El folio generado (ej: 20250623-143000).
 */
function generarFolioTurno() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}


/**
 * Inicia un nuevo turno, solicitando al usuario los detalles del turno.
 * Utiliza SweetAlert2 para la interacción.
 */
async function iniciarTurno() {
  // Cargar la lista de empleados para el selector de responsable
  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const responsableOptions = empleados.map(emp => `<option value="${emp.nombre}">${emp.nombre}</option>`).join('');

  const folioGenerado = generarFolioTurno(); // Generar el folio automáticamente
  const fechaHoy = obtenerFechaHoy(); // Obtener la fecha actual

  const { value: formValues } = await Swal.fire({
    title: 'Iniciar Turno',
    html: `
      <div class="form-grid">
        <div>
          <label for="swal-folio">Folio:</label>
          <input type="text" id="swal-folio" value="${folioGenerado}" readonly>
        </div>
        <div>
          <label for="swal-fecha">Fecha:</label>
          <input type="date" id="swal-fecha" value="${fechaHoy}" readonly>
        </div>
        <div>
          <label for="swal-turno">Turno:</label>
          <select id="swal-turno">
            <option value="" selected disabled>Seleccione el turno</option>
            <option value="Día">Día</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <label for="swal-responsable">Responsable:</label>
          <select id="swal-responsable">
            <option value="" selected disabled>Seleccione el responsable</option>
            ${responsableOptions}
          </select>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Iniciar Turno',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const folio = document.getElementById('swal-folio').value;
      const fecha = document.getElementById('swal-fecha').value;
      const turno = document.getElementById('swal-turno').value;
      const responsable = document.getElementById('swal-responsable').value;

      if (!folio || !fecha || !turno || !responsable) {
        Swal.showValidationMessage('Todos los campos son obligatorios.');
        return false;
      }
      return { folio, fecha, turno, responsable };
    }
  });

  if (formValues) {
    const nuevoTurno = {
      ...formValues,
      novedades: [],
      proveedores: []
    };
    guardarEnLS(LS_TURNO_ABIERTO, nuevoTurno);
    sweetAlertError('Turno iniciado exitosamente.', 'success', 'Turno Abierto');
    actualizarCabeceraTurno();
    cargarNovedadesDelTurno();
    cargarProveedoresDelTurno();
    // Deshabilitar botón de inicio de turno si existe uno abierto
    document.getElementById('btnIniciarTurno')?.style.display = 'none';
  } else {
    // Si se cancela el inicio del turno, asegurarse de que el modal de inicio de turno esté visible
    // para que el usuario pueda intentar de nuevo.
    document.getElementById('modalInicioTurno').style.display = 'block';
  }
}

/**
 * Actualiza la información del turno en la cabecera de la sección Libro de Novedades.
 */
function actualizarCabeceraTurno() {
  const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);
  const cabecera = document.getElementById('cabeceraTurno');

  if (turnoActual) {
    document.getElementById('folioActual').textContent = turnoActual.folio;
    document.getElementById('fechaActual').textContent = turnoActual.fecha;
    document.getElementById('turnoActual').textContent = turnoActual.turno;
    document.getElementById('responsableActual').textContent = turnoActual.responsable;
    cabecera.style.display = 'flex'; // Asegurarse de que la cabecera sea visible
    document.getElementById('reportarTurnoBtn').style.display = 'inline-block'; // Muestra el botón de cierre de turno
    document.getElementById('abrirReportesBtn').style.display = 'inline-block'; // Muestra el botón de reportes
    document.getElementById('abrirRegistroBtn').style.display = 'inline-block'; // Muestra el botón de registro de novedades
    document.getElementById('abrirProveedorBtn').style.display = 'inline-block'; // Muestra el botón de registro de proveedores
  } else {
    // Si no hay turno abierto, ocultar la cabecera y los botones de acción del turno
    cabecera.style.display = 'none';
    document.getElementById('folioActual').textContent = '';
    document.getElementById('fechaActual').textContent = '';
    document.getElementById('turnoActual').textContent = '';
    document.getElementById('responsableActual').textContent = '';
    document.getElementById('reportarTurnoBtn').style.display = 'none';
    document.getElementById('abrirReportesBtn').style.display = 'none';
    document.getElementById('abrirRegistroBtn').style.display = 'none';
    document.getElementById('abrirProveedorBtn').style.display = 'none';

    // Limpiar tablas si no hay turno abierto
    document.getElementById('tabla-guardados').querySelector('tbody').innerHTML = '';
    document.getElementById('tabla-proveedores').querySelector('tbody').innerHTML = '';
  }
}

/**
 * Agrega un nuevo registro de novedad a la tabla y al Local Storage del turno actual.
 * @param {string} hora - Hora de la novedad.
 * @param {string} anotacion - Descripción de la novedad.
 */
function agregarNovedadATabla(hora, anotacion) {
  const tablaBody = document.getElementById('tabla-guardados')?.querySelector('tbody');
  if (!tablaBody) return;

  const row = tablaBody.insertRow();
  row.innerHTML = `
    <td>${hora}</td>
    <td>${anotacion}</td>
  `;
}

/**
 * Carga y muestra todas las novedades del turno actual en la tabla.
 */
function cargarNovedadesDelTurno() {
  const tablaBody = document.getElementById('tabla-guardados')?.querySelector('tbody');
  if (!tablaBody) return;

  tablaBody.innerHTML = ''; // Limpiar la tabla
  const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);

  if (turnoActual && turnoActual.novedades) {
    // Ordenar novedades de la más reciente a la más antigua
    const novedadesOrdenadas = [...turnoActual.novedades].sort((a, b) => {
      const timeA = new Date(`2000/01/01T${a.hora}`);
      const timeB = new Date(`2000/01/01T${b.hora}`);
      return timeB - timeA; // Descendente
    });

    novedadesOrdenadas.forEach(novedad => {
      agregarNovedadATabla(novedad.hora, novedad.anotacion);
    });
  }
}

/**
 * Abre un modal (SweetAlert2) para que el usuario registre una nueva novedad.
 */
async function abrirModalRegistroNovedad() {
  if (!turnoEstaAbierto()) {
    sweetAlertError('Primero debes iniciar un turno para registrar novedades.');
    return;
  }

  const horaActual = obtenerHoraActual();

  const { value: anotacion } = await Swal.fire({
    title: 'Registrar Novedad',
    html: `
      <div class="form-grid">
        <div>
          <label for="swal-novedad-hora">Hora:</label>
          <input type="text" id="swal-novedad-hora" value="${horaActual}" readonly>
        </div>
        <div style="grid-column: 1 / -1;"> <!-- Ocupa todo el ancho -->
          <label for="swal-novedad-anotacion">Anotación:</label>
          <textarea id="swal-novedad-anotacion" rows="5" placeholder="Escribe aquí la novedad..."></textarea>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar Novedad',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const anotacionValue = document.getElementById('swal-novedad-anotacion').value.trim();
      if (!anotacionValue) {
        Swal.showValidationMessage('La anotación no puede estar vacía.');
        return false;
      }
      return anotacionValue;
    }
  });

  if (anotacion) {
    const turno = obtenerDeLS(LS_TURNO_ABIERTO);
    if (turno) {
      const nuevaNovedad = {
        hora: horaActual,
        anotacion: anotacion
      };
      turno.novedades.push(nuevaNovedad);
      guardarEnLS(LS_TURNO_ABIERTO, turno); // Guardar el turno actualizado
      agregarNovedadATabla(nuevaNovedad.hora, nuevaNovedad.anotacion);
      sweetAlertError('Novedad guardada exitosamente.', 'success', 'Novedad Registrada');
      cargarNovedadesDelTurno(); // Recargar para mantener el orden de visualización
    }
  }
}

/**
 * Agrega un nuevo registro de proveedor a la tabla y al Local Storage del turno actual.
 * @param {string} hora - Hora de ingreso del proveedor.
 * @param {string} patente - Patente del vehículo.
 * @param {string} conductor - Nombre del conductor.
 * @param {number} acompanantes - Número de acompañantes.
 * @param {string} empresa - Empresa del proveedor.
 * @param {string} motivo - Motivo del ingreso.
 */
function agregarProveedorATabla(hora, patente, conductor, acompanantes, empresa, motivo) {
  const tablaBody = document.getElementById('tabla-proveedores')?.querySelector('tbody');
  if (!tablaBody) return;

  const row = tablaBody.insertRow();
  row.innerHTML = `
    <td>${hora}</td>
    <td>${patente}</td>
    <td>${conductor}</td>
    <td>${acompanantes}</td>
    <td>${empresa}</td>
    <td>${motivo}</td>
  `;
}

/**
 * Carga y muestra todos los registros de proveedores del turno actual en la tabla.
 */
function cargarProveedoresDelTurno() {
  const tablaBody = document.getElementById('tabla-proveedores')?.querySelector('tbody');
  if (!tablaBody) return;

  tablaBody.innerHTML = ''; // Limpiar la tabla
  const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);

  if (turnoActual && turnoActual.proveedores) {
    // Ordenar proveedores de los más recientes a los más antiguos
    const proveedoresOrdenados = [...turnoActual.proveedores].sort((a, b) => {
      const timeA = new Date(`2000/01/01T${a.hora}`);
      const timeB = new Date(`2000/01/01T${b.hora}`);
      return timeB - timeA; // Descendente
    });

    proveedoresOrdenadas.forEach(proveedor => {
      agregarProveedorATabla(
        proveedor.hora,
        proveedor.patente,
        proveedor.conductor,
        proveedor.acompanantes,
        proveedor.empresa,
        proveedor.motivo
      );
    });
  }
}

/**
 * Abre un modal (SweetAlert2) para que el usuario registre un nuevo ingreso de proveedor.
 */
async function abrirModalRegistroProveedor() {
  if (!turnoEstaAbierto()) {
    sweetAlertError('Primero debes iniciar un turno para registrar proveedores.');
    return;
  }

  const horaActual = obtenerHoraActual();

  const { value: formValues } = await Swal.fire({
    title: 'Registrar Proveedor',
    html: `
      <div class="form-grid">
        <div>
          <label for="swal-prov-hora">Hora:</label>
          <input type="text" id="swal-prov-hora" value="${horaActual}" readonly>
        </div>
        <div>
          <label for="swal-prov-patente">Patente:</label>
          <input type="text" id="swal-prov-patente" placeholder="Ej: XX-XX-XX o XXXX-XX">
        </div>
        <div>
          <label for="swal-prov-conductor">Conductor:</label>
          <input type="text" id="swal-prov-conductor" placeholder="Nombre del conductor">
        </div>
        <div>
          <label for="swal-prov-acompanantes">+ PAX:</label>
          <input type="number" id="swal-prov-acompanantes" value="0" min="0">
        </div>
        <div>
          <label for="swal-prov-empresa">Empresa:</label>
          <input type="text" id="swal-prov-empresa" placeholder="Nombre de la empresa">
        </div>
        <div style="grid-column: 1 / -1;">
          <label for="swal-prov-motivo">Motivo:</label>
          <textarea id="swal-prov-motivo" rows="3" placeholder="Motivo de la visita..."></textarea>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar Proveedor',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const data = {
        hora: document.getElementById('swal-prov-hora').value,
        patente: document.getElementById('swal-prov-patente').value.trim().toUpperCase(),
        conductor: document.getElementById('swal-prov-conductor').value.trim(),
        acompanantes: document.getElementById('swal-prov-acompanantes').value,
        empresa: document.getElementById('swal-prov-empresa').value.trim(),
        motivo: document.getElementById('swal-prov-motivo').value.trim()
      };

      if (Object.values(data).some(v => v === '')) {
        Swal.showValidationMessage('Complete todos los campos del proveedor.');
        return false;
      }
      // Validación de formato de patente (XX-XX-XX o XXXX-XX)
      if (!/^([A-Z0-9]{2}-){2}[A-Z0-9]{2}$/.test(data.patente) && !/^[A-Z0-9]{4}-[A-Z0-9]{2}$/.test(data.patente)) {
        Swal.showValidationMessage('Formato de patente inválido. Debe ser XX-XX-XX o XXXX-XX.');
        return false;
      }
      if (isNaN(Number(data.acompanantes)) || Number(data.acompanantes) < 0) {
        Swal.showValidationMessage('El número de acompañantes debe ser 0 o mayor.');
        return false;
      }
      return data;
    }
  });

  if (formValues) {
    const turno = obtenerDeLS(LS_TURNO_ABIERTO);
    if (turno) {
      turno.proveedores.push(formValues);
      guardarEnLS(LS_TURNO_ABIERTO, turno);
      agregarProveedorATabla(formValues.hora, formValues.patente, formValues.conductor, formValues.acompanantes, formValues.empresa, formValues.motivo);
      sweetAlertError('Proveedor guardado exitosamente.', 'success', 'Proveedor Registrado');
      cargarProveedoresDelTurno(); // Recargar para mantener el orden de visualización
    }
  }
}

/**
 * Cierra el turno actual, archiva sus novedades y proveedores, y prepara un nuevo turno.
 */
async function reportarCierreTurno() {
  const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);
  if (!turnoActual) {
    sweetAlertError('No hay un turno abierto para cerrar.', 'info');
    return;
  }

  const { value: observacionesFinales } = await Swal.fire({
    title: 'Cerrar Turno',
    html: `
      <p>Estás a punto de cerrar el turno:</p>
      <ul>
        <li><strong>Folio:</strong> ${turnoActual.folio}</li>
        <li><strong>Fecha:</strong> ${turnoActual.fecha}</li>
        <li><strong>Turno:</strong> ${turnoActual.turno}</li>
        <li><strong>Responsable:</strong> ${turnoActual.responsable}</li>
      </ul>
      <label for="swal-observaciones">Observaciones Finales (Opcional):</label>
      <textarea id="swal-observaciones" rows="5" placeholder="Escribe aquí cualquier observación final..."></textarea>
    `,
    showCancelButton: true,
    confirmButtonText: 'Confirmar Cierre',
    cancelButtonText: 'Cancelar',
    focusConfirm: false,
    preConfirm: () => {
      return document.getElementById('swal-observaciones').value;
    }
  });

  if (observacionesFinales !== undefined) { // Si el usuario no canceló
    turnoActual.horaCierre = obtenerHoraActual();
    turnoActual.observacionesFinales = observacionesFinales;

    let turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
    turnosCerrados.push(turnoActual); // Añadir el turno actual a la lista de turnos cerrados

    guardarEnLS(LS_TURNOS_CERRADOS, turnosCerrados);
    eliminarDeLS(LS_TURNO_ABIERTO); // Eliminar el turno actual abierto

    sweetAlertError('Turno cerrado y archivado exitosamente.', 'success', 'Turno Cerrado');
    inicializarLibroNovedades(); // Reiniciar el estado del libro de novedades
  }
}

/**
 * Cierra el modal de reportes.
 */
function cerrarModalReportes() {
  document.getElementById('modalReportes').classList.remove('visible');
  document.getElementById('listadoReportes').innerHTML = ''; // Limpiar contenido al cerrar
}

/**
 * Abre el modal de reportes y muestra un listado de turnos cerrados.
 */
function abrirReportes() {
  const turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
  const listadoReportesDiv = document.getElementById('listadoReportes');
  if (!listadoReportesDiv) return;

  listadoReportesDiv.innerHTML = ''; // Limpiar listado anterior

  if (turnosCerrados.length === 0) {
    listadoReportesDiv.innerHTML = '<p>No hay turnos cerrados para reportar.</p>';
    mostrarModalConScroll('modalReportes');
    return;
  }

  const ul = document.createElement('ul');
  // Mostrar los turnos cerrados del más reciente al más antiguo
  const turnosOrdenados = [...turnosCerrados].sort((a, b) => new Date(b.fecha + 'T' + b.horaCierre) - new Date(a.fecha + 'T' + a.horaCierre));

  turnosOrdenados.forEach(turno => {
    const li = document.createElement('li');
    li.textContent = `Folio: ${turno.folio} - Fecha: ${turno.fecha} - Turno: ${turno.turno} - Responsable: ${turno.responsable}`;
    li.style.cursor = 'pointer';
    li.addEventListener('click', () => mostrarDetalleReporte(turno));
    ul.appendChild(li);
  });
  listadoReportesDiv.appendChild(ul);

  mostrarModalConScroll('modalReportes');
}

/**
 * Muestra el detalle de un turno cerrado seleccionado en el modal de reportes.
 * @param {Object} turno - El objeto del turno cerrado.
 */
function mostrarDetalleReporte(turno) {
  const listadoReportesDiv = document.getElementById('listadoReportes');
  if (!listadoReportesDiv) return;

  listadoReportesDiv.innerHTML = `
    <h4>Detalle del Turno: ${turno.folio}</h4>
    <p><strong>Fecha:</strong> ${turno.fecha}</p>
    <p><strong>Turno:</strong> ${turno.turno}</p>
    <p><strong>Responsable:</strong> ${turno.responsable}</p>
    <p><strong>Hora de Cierre:</strong> ${turno.horaCierre || 'N/A'}</p>
    <p><strong>Observaciones Finales:</strong> ${turno.observacionesFinales || 'Sin observaciones'}</p>

    <h5>Novedades:</h5>
    ${turno.novedades && turno.novedades.length > 0
      ? `<ul>${turno.novedades.map(n => `<li>${n.hora}: ${n.anotacion}</li>`).join('')}</ul>`
      : '<p>No se registraron novedades.</p>'}

    <h5>Proveedores:</h5>
    ${turno.proveedores && turno.proveedores.length > 0
      ? `
        <div class="table-responsive">
          <table class="table table-bordered table-sm">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Patente</th>
                <th>Conductor</th>
                <th>PAX</th>
                <th>Empresa</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              ${turno.proveedores.map(p => `
                <tr>
                  <td>${p.hora}</td>
                  <td>${p.patente}</td>
                  <td>${p.conductor}</td>
                  <td>${p.acompanantes}</td>
                  <td>${p.empresa}</td>
                  <td>${p.motivo}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        `
      : '<p>No se registraron ingresos de proveedores.</p>'}

    <button onclick="abrirReportes()" class="btn-report" style="margin-top: 15px;">Volver a Reportes</button>
  `;
}


/**
 * Función principal de inicialización para la sección del Libro de Novedades.
 * Se llama al cargar la página o al cambiar a esta sección.
 */
function inicializarLibroNovedades() {
  const modalInicioTurno = document.getElementById('modalInicioTurno');

  // Si no hay un turno abierto, mostrar el modal para iniciar uno
  if (!turnoEstaAbierto()) {
    modalInicioTurno.style.display = 'flex'; // Usar flex para centrar
    // Autocompletar la fecha con la fecha actual y el folio
    document.getElementById('fechaInicioTurno').value = obtenerFechaHoy();
    document.getElementById('folioTurno').value = generarFolioTurno();
    // Cargar responsables desde la lista de empleados
    const responsablesSelect = document.getElementById('responsableInicioTurno');
    if (responsablesSelect) {
      responsablesSelect.innerHTML = '<option value="" selected disabled>Seleccione el responsable</option>';
      const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
      empleados.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.nombre;
        option.textContent = emp.nombre;
        responsablesSelect.appendChild(option);
      });
    }
  } else {
    modalInicioTurno.style.display = 'none'; // Ocultar el modal si ya hay un turno
  }

  // Actualizar la cabecera del turno y cargar datos en las tablas
  actualizarCabeceraTurno();
  cargarNovedadesDelTurno();
  cargarProveedoresDelTurno();
}

// --- Event Listeners Específicos del Libro de Novedades ---

// Asignar listeners a los botones solo si existen.
document.getElementById('btnIniciarTurno')?.addEventListener('click', iniciarTurno);
document.getElementById('abrirRegistroBtn')?.addEventListener('click', abrirModalRegistroNovedad);
document.getElementById('abrirProveedorBtn')?.addEventListener('click', abrirModalRegistroProveedor);
document.getElementById('reportarTurnoBtn')?.addEventListener('click', reportarCierreTurno);
document.getElementById('abrirReportesBtn')?.addEventListener('click', abrirReportes);

// Asegurarse de que los modales pueden cerrarse haciendo clic fuera
document.addEventListener("DOMContentLoaded", () => {
    habilitarCierrePorFondo('modalInicioTurno');
    habilitarCierrePorFondo('modalReportes');
});

// El listener DOMContentLoaded en index.html se encarga de llamar a showControlHorario()
// y showLibroNovedades() según el botón de navegación, y showLibroNovedades()
// a su vez llama a inicializarLibroNovedades().
