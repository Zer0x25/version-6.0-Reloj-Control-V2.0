// --- Las constantes (LS_NOVEDADES, etc.) ahora están centralizadas en utils.js ---

/**
 * Verifica si hay un turno abierto consultando el Local Storage.
 * @returns {boolean} - Devuelve true si hay un turno abierto, de lo contrario false.
 */
function turnoEstaAbierto() {
  return obtenerDeLS(LS_TURNO_ABIERTO) !== null;
}

/**
 * Genera un folio correlativo para el turno (ej: "001", "002").
 * Busca el folio más alto en los turnos cerrados y lo incrementa.
 * @returns {string} El nuevo folio correlativo.
 */
function generarFolioTurno() {
  const turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
  let maxFolio = 0;

  if (turnosCerrados.length > 0) {
    // Extraer y encontrar el número de folio más alto
    maxFolio = Math.max(...turnosCerrados.map(turno => {
      const num = parseInt(turno.folio, 10);
      // Si el folio no es un número (por implementaciones antiguas), se trata como 0
      return isNaN(num) ? 0 : num; 
    }));
  }

  const nuevoFolio = maxFolio + 1;
  return String(nuevoFolio).padStart(3, '0'); // Formatear a 3 dígitos, ej: "001"
}


/**
 * Inicia un nuevo turno, solicitando al usuario los detalles mediante un modal.
 */
async function iniciarTurno() {
  if (turnoEstaAbierto()) return; // Prevenir iniciar un turno si ya hay uno.

  const empleados = obtenerDeLS(LS_EMPLEADOS) || [];
  const responsableOptions = empleados.map(emp => `<option value="${emp.nombre}">${emp.nombre}</option>`).join('');

  const { value: formValues } = await Swal.fire({
    title: 'Iniciar Turno',
    html: `
      <div class="form-grid" style="text-align: left;">
        <div>
          <label for="swal-folio">Folio:</label>
          <input type="text" id="swal-folio" class="swal2-input" value="${generarFolioTurno()}" readonly>
        </div>
        <div>
          <label for="swal-fecha">Fecha:</label>
          <input type="date" id="swal-fecha" class="swal2-input" value="${obtenerFechaHoy()}" readonly>
        </div>
        <div>
          <label for="swal-turno">Turno:</label>
          <select id="swal-turno" class="swal2-select">
            <option value="" selected disabled>Seleccione...</option>
            <option value="Día">Día</option>
            <option value="Noche">Noche</option>
          </select>
        </div>
        <div>
          <label for="swal-responsable">Responsable:</label>
          <select id="swal-responsable" class="swal2-select">
            <option value="" selected disabled>Seleccione...</option>
            ${responsableOptions}
          </select>
        </div>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Iniciar Turno',
    cancelButtonText: 'Cancelar',
    allowOutsideClick: false, // Evita que se cierre al hacer clic fuera
    preConfirm: () => {
      const turno = document.getElementById('swal-turno').value;
      const responsable = document.getElementById('swal-responsable').value;
      if (!turno || !responsable) {
        Swal.showValidationMessage('Debe seleccionar el turno y el responsable.');
        return false;
      }
      return {
        folio: document.getElementById('swal-folio').value,
        fecha: document.getElementById('swal-fecha').value,
        turno,
        responsable,
      };
    }
  });

  if (formValues) {
    const nuevoTurno = {
      ...formValues,
      novedades: [],
      proveedores: []
    };
    guardarEnLS(LS_TURNO_ABIERTO, nuevoTurno);
    sweetAlertError('Turno iniciado exitosamente.', 'success');
    inicializarLibroNovedades(); // Refrescar toda la UI
  }
}

/**
 * Actualiza la información del turno en la cabecera de la sección.
 */
function actualizarCabeceraTurno() {
  const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);
  const cabecera = document.getElementById('cabeceraTurno');
  const controlesTurno = document.querySelectorAll('#reportarTurnoBtn, #abrirReportesBtn, #abrirRegistroBtn, #abrirProveedorBtn');

  if (turnoActual) {
    document.getElementById('folioActual').textContent = turnoActual.folio;
    document.getElementById('fechaActual').textContent = turnoActual.fecha;
    document.getElementById('turnoActual').textContent = turnoActual.turno;
    document.getElementById('responsableActual').textContent = turnoActual.responsable;
    cabecera.style.display = 'flex';
    controlesTurno.forEach(btn => btn.style.display = 'inline-block');
  } else {
    cabecera.style.display = 'none';
    controlesTurno.forEach(btn => btn.style.display = 'none');
    document.getElementById('tabla-guardados').querySelector('tbody').innerHTML = '';
    document.getElementById('tabla-proveedores').querySelector('tbody').innerHTML = '';
  }
}

/**
 * Carga y muestra las novedades y proveedores del turno actual en las tablas.
 */
function cargarDatosDelTurno() {
    const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);
    const novedadesBody = document.getElementById('tabla-guardados')?.querySelector('tbody');
    const proveedoresBody = document.getElementById('tabla-proveedores')?.querySelector('tbody');

    if (!novedadesBody || !proveedoresBody) return;

    novedadesBody.innerHTML = '';
    proveedoresBody.innerHTML = '';

    if (turnoActual) {
        // Cargar novedades ordenadas
        [...turnoActual.novedades]
            .sort((a, b) => b.hora.localeCompare(a.hora))
            .forEach(novedad => {
                const row = novedadesBody.insertRow();
                row.innerHTML = `<td>${novedad.hora}</td><td>${novedad.anotacion}</td>`;
            });

        // Cargar proveedores ordenados
        [...turnoActual.proveedores]
            .sort((a, b) => b.hora.localeCompare(a.hora))
            .forEach(p => {
                const row = proveedoresBody.insertRow();
                row.innerHTML = `<td>${p.hora}</td><td>${p.patente}</td><td>${p.conductor}</td><td>${p.acompanantes}</td><td>${p.empresa}</td><td>${p.motivo}</td>`;
            });
    }
}


/**
 * Abre un modal para registrar una nueva novedad.
 */
async function abrirModalRegistroNovedad() {
  if (!turnoEstaAbierto()) return sweetAlertError('Primero debes iniciar un turno.');

  const { value: anotacion } = await Swal.fire({
    title: 'Registrar Novedad',
    input: 'textarea',
    inputPlaceholder: 'Escribe aquí la novedad...',
    showCancelButton: true,
    confirmButtonText: 'Guardar Novedad',
    cancelButtonText: 'Cancelar',
    inputValidator: (value) => !value && 'La anotación no puede estar vacía.'
  });

  if (anotacion) {
    const turno = obtenerDeLS(LS_TURNO_ABIERTO);
    turno.novedades.push({ hora: obtenerHoraActual(), anotacion });
    guardarEnLS(LS_TURNO_ABIERTO, turno);
    cargarDatosDelTurno();
    sweetAlertError('Novedad guardada.', 'success');
  }
}

/**
 * Abre un modal para registrar un nuevo ingreso de proveedor.
 */
async function abrirModalRegistroProveedor() {
  if (!turnoEstaAbierto()) return sweetAlertError('Primero debes iniciar un turno.');

  const { value: formValues } = await Swal.fire({
    title: 'Registrar Proveedor',
    html: `
      <div class="form-grid" style="text-align: left;">
        <input type="text" id="swal-prov-patente" class="swal2-input" placeholder="Patente (Ej: ABCD12)">
        <input type="text" id="swal-prov-conductor" class="swal2-input" placeholder="Nombre del conductor">
        <input type="number" id="swal-prov-acompanantes" class="swal2-input" placeholder="Acompañantes" value="0" min="0">
        <input type="text" id="swal-prov-empresa" class="swal2-input" placeholder="Nombre de la empresa">
        <textarea id="swal-prov-motivo" class="swal2-textarea" placeholder="Motivo de la visita..."></textarea>
      </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar Proveedor',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const patente = document.getElementById('swal-prov-patente').value.trim().toUpperCase();
      const conductor = document.getElementById('swal-prov-conductor').value.trim();
      if (!patente || !conductor) {
        Swal.showValidationMessage('La patente y el conductor son obligatorios.');
        return false;
      }
      return {
        hora: obtenerHoraActual(),
        patente,
        conductor,
        acompanantes: document.getElementById('swal-prov-acompanantes').value || 0,
        empresa: document.getElementById('swal-prov-empresa').value.trim(),
        motivo: document.getElementById('swal-prov-motivo').value.trim()
      };
    }
  });

  if (formValues) {
    const turno = obtenerDeLS(LS_TURNO_ABIERTO);
    turno.proveedores.push(formValues);
    guardarEnLS(LS_TURNO_ABIERTO, turno);
    cargarDatosDelTurno();
    sweetAlertError('Proveedor guardado.', 'success');
  }
}

/**
 * Cierra el turno actual, lo archiva y prepara para un nuevo turno.
 */
async function reportarCierreTurno() {
  const turnoActual = obtenerDeLS(LS_TURNO_ABIERTO);
  if (!turnoActual) return sweetAlertError('No hay un turno abierto para cerrar.', 'info');

  const { value: observacionesFinales } = await Swal.fire({
    title: 'Confirmar Cierre de Turno',
    text: `Estás a punto de cerrar el turno de ${turnoActual.responsable}.`,
    input: 'textarea',
    inputPlaceholder: 'Observaciones finales (opcional)...',
    showCancelButton: true,
    confirmButtonText: 'Confirmar Cierre',
    cancelButtonText: 'Cancelar'
  });

  if (observacionesFinales !== undefined) {
    turnoActual.horaCierre = obtenerHoraActual();
    turnoActual.observacionesFinales = observacionesFinales;

    let turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
    turnosCerrados.push(turnoActual);
    guardarEnLS(LS_TURNOS_CERRADOS, turnosCerrados);
    eliminarDeLS(LS_TURNO_ABIERTO);

    sweetAlertError('Turno cerrado y archivado.', 'success');
    inicializarLibroNovedades();
  }
}

/**
 * Cierra el modal de reportes.
 */
function cerrarModalReportes() {
  const modal = document.getElementById('modalReportes');
  modal.style.display = 'none';
  modal.classList.remove('visible');
  document.getElementById('listadoReportes').innerHTML = '';
}

/**
 * Abre el modal de reportes y lista los turnos cerrados.
 */
function abrirReportes() {
  const turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
  const listadoReportesDiv = document.getElementById('listadoReportes');
  
  listadoReportesDiv.innerHTML = '';

  if (turnosCerrados.length === 0) {
    listadoReportesDiv.innerHTML = '<p>No hay turnos cerrados para reportar.</p>';
  } else {
    const ul = document.createElement('ul');
    [...turnosCerrados]
        .sort((a, b) => b.folio.localeCompare(a.folio))
        .forEach(turno => {
            const li = document.createElement('li');
            li.textContent = `Folio: ${turno.folio} | ${turno.fecha} | ${turno.turno} | ${turno.responsable}`;
            li.style.cursor = 'pointer';
            li.addEventListener('click', () => mostrarDetalleReporte(turno.folio));
            ul.appendChild(li);
        });
    listadoReportesDiv.appendChild(ul);
  }
  
  mostrarModalConScroll('modalReportes');
}

/**
 * Muestra el detalle de un turno cerrado seleccionado.
 * @param {string} folio - El folio del turno a mostrar.
 */
function mostrarDetalleReporte(folio) {
  const turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
  const turno = turnosCerrados.find(t => t.folio === folio);
  if (!turno) return;

  const listadoReportesDiv = document.getElementById('listadoReportes');
  const novedadesHtml = turno.novedades.length > 0
      ? `<ul>${turno.novedades.map(n => `<li><b>${n.hora}:</b> ${n.anotacion}</li>`).join('')}</ul>`
      : '<p>No se registraron novedades.</p>';
  
  const proveedoresHtml = turno.proveedores.length > 0
      ? `<div class="table-responsive"><table class="table table-sm table-bordered">
          <thead><tr><th>Hora</th><th>Patente</th><th>Conductor</th><th>Empresa</th><th>Motivo</th></tr></thead>
          <tbody>${turno.proveedores.map(p => `<tr><td>${p.hora}</td><td>${p.patente}</td><td>${p.conductor}</td><td>${p.empresa}</td><td>${p.motivo}</td></tr>`).join('')}</tbody>
        </table></div>`
      : '<p>No se registraron proveedores.</p>';

  listadoReportesDiv.innerHTML = `
    <h4>Detalle del Turno: ${turno.folio}</h4>
    <p><strong>Fecha:</strong> ${turno.fecha} | <strong>Turno:</strong> ${turno.turno} | <strong>Responsable:</strong> ${turno.responsable}</p>
    <p><strong>Observaciones:</strong> ${turno.observacionesFinales || 'N/A'}</p>
    <h5>Novedades:</h5>
    ${novedadesHtml}
    <h5>Proveedores:</h5>
    ${proveedoresHtml}
    <button onclick="abrirReportes()" class="btn-report" style="margin-top: 15px;">Volver a la lista</button>
  `;
}

/**
 * Función principal de inicialización para la sección del Libro de Novedades.
 */
function inicializarLibroNovedades() {
  if (!turnoEstaAbierto()) {
    actualizarCabeceraTurno(); // Ocultará los controles
    iniciarTurno(); // Inicia el proceso para crear un nuevo turno
  } else {
    actualizarCabeceraTurno(); // Mostrará la información del turno
    cargarDatosDelTurno(); // Cargará novedades y proveedores
  }
}