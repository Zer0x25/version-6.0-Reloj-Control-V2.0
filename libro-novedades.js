const LS_NOVEDADES = "libro-novedades-registros";
const LS_PROVEEDORES = "libro-novedades-proveedores";
// --- NUEVA LÓGICA DE LIBRO DE NOVEDADES DIGITAL ---

const LS_TURNOS_CERRADOS = "libro-novedades-turnos-cerrados";
const LS_TURNO_ABIERTO = "libro-novedades-turno-abierto";

try {
  document.getElementById("fecha").valueAsDate = new Date();
} catch(e) {}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("inputHora").value = "";
  document.getElementById("inputNota").value = "";
}

function sweetAlertError(msg) {
  if (window.Swal) {
    Swal.fire({icon:'warning', title:'Atención', text:msg, confirmButtonText:'OK'});
  } else {
    alert(msg);
  }
}

function guardarRegistroDesdeModal() {
  const hora = document.getElementById("inputHora").value;
  const nota = document.getElementById("inputNota").value;
  if (!hora || !nota) return sweetAlertError("Debe ingresar hora y anotación.");

  // Guardar en localStorage
  let registros = obtenerDeLS(LS_NOVEDADES) || [];
  registros.push({ hora, nota });
  guardarEnLS(LS_NOVEDADES, registros);

  agregarRegistroATabla(hora, nota);
  cerrarModal();
}

function cerrarProveedorModal() {
  document.getElementById("modalProveedor").style.display = "none";
  document.getElementById("provHora").value = "";
  document.getElementById("provPatente").value = "";
  document.getElementById("provConductor").value = "";
  document.getElementById("provAcompanantes").value = "";
  document.getElementById("provMotivo").value = "";
}

function guardarProveedor() {
  const hora = document.getElementById("provHora").value;
  const patente = document.getElementById("provPatente").value;
  const conductor = document.getElementById("provConductor").value;
  const acompanantes = document.getElementById("provAcompanantes").value;
  const motivo = document.getElementById("provMotivo").value;

  if (!hora || !patente || !conductor || !acompanantes || !motivo) {
    return sweetAlertError("Complete todos los campos del proveedor.");
  }

  // Guardar en localStorage
  let proveedores = obtenerDeLS(LS_PROVEEDORES) || [];
  proveedores.push({ hora, patente, conductor, acompanantes, motivo });
  guardarEnLS(LS_PROVEEDORES, proveedores);

  agregarProveedorATabla(hora, patente, conductor, acompanantes, motivo);
  cerrarProveedorModal();
}

function inicializarLibroNovedades() {
  // Si hay turno abierto, mostrar cabecera y bloquear edición
  const turnoAbierto = obtenerDeLS(LS_TURNO_ABIERTO);
  if (turnoAbierto) {
    mostrarCabeceraTurno(turnoAbierto);
    bloquearCabeceraTurno();
    return;
  }
  // Si no hay turno abierto, mostrar modal de inicio
  mostrarModalInicioTurno();
}

function mostrarUltimoReporteEnModalInicioTurno() {
  const contenedor = document.querySelector('#modalInicioTurno .modal-content');
  if (!contenedor) return;
  // Eliminar reporte previo si existe
  const previo = document.getElementById('ultimoReportePreview');
  if (previo) previo.remove();
  // Buscar último turno cerrado
  const turnos = obtenerDeLS('libro-novedades-turnos-cerrados') || [];
  if (!turnos.length) return;
  const ultimo = turnos[turnos.length - 1];
  let html = `<div id='ultimoReportePreview' style='text-align:left;margin-bottom:1.5em;padding:1em;border:1px solid #ccc;border-radius:8px;background:#f9f9f9;'>`;
  html += `<h4 style='margin-top:0'>Último Reporte Generado (Folio ${ultimo.folio})</h4>`;
  html += `<div><strong>Fecha de Reporte:</strong> ${ultimo.cerradoEn ? new Date(ultimo.cerradoEn).toLocaleString('es-CL') : '-'}</div>`;
  html += `<div><strong>Turno:</strong> ${ultimo.turno}</div>`;
  html += `<div><strong>Responsable:</strong> ${ultimo.responsable}</div>`;
  html += `<hr><strong>Registros Guardados</strong><br>`;
  if (ultimo.registros && ultimo.registros.length) {
    html += `<table style='width:100%;margin-bottom:1em;'><thead><tr><th>Hora</th><th>Anotación</th></tr></thead><tbody>`;
    html += ultimo.registros.map(r => `<tr><td>${r.hora}</td><td>${r.nota}</td></tr>`).join('');
    html += `</tbody></table>`;
  } else {
    html += `<div style='color:#888;'>Sin registros guardados</div>`;
  }
  html += `<strong>Proveedores Ingresados</strong><br>`;
  if (ultimo.proveedores && ultimo.proveedores.length) {
    html += `<table style='width:100%'><thead><tr><th>Hora</th><th>Patente</th><th>Conductor</th><th>Acompañantes</th><th>Motivo</th></tr></thead><tbody>`;
    html += ultimo.proveedores.map(p => `<tr><td>${p.hora}</td><td>${p.patente}</td><td>${p.conductor}</td><td>${p.acompanantes}</td><td>${p.motivo}</td></tr>`).join('');
    html += `</tbody></table>`;
  } else {
    html += `<div style='color:#888;'>Sin proveedores ingresados</div>`;
  }
  html += `</div>`;
  contenedor.insertAdjacentHTML('afterbegin', html);
}

function reemplazarBotonIniciarPorHeLeido() {
  const btn = document.getElementById('btnIniciarTurno');
  if (btn) {
    btn.textContent = 'He Leído, Iniciar Turno';
  }
}

function mostrarModalInicioTurno() {
  // Folio correlativo
  const turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
  const folio = (turnosCerrados.length + 1).toString().padStart(4, '0');
  document.getElementById('folioTurno').value = folio;
  document.getElementById('fechaInicioTurno').value = obtenerFechaHoy();
  // Cargar responsables (empleados con cargo "Reloj Control")
  cargarResponsablesRelojControl();
  document.getElementById('modalInicioTurno').style.display = 'flex';
  mostrarUltimoReporteEnModalInicioTurno();
  reemplazarBotonIniciarPorHeLeido();
}

function cargarResponsablesRelojControl() {
  let empleados = [];
  try {
    empleados = obtenerDeLS('empleados') || [];
  } catch {}
  const select = document.getElementById('responsableInicioTurno');
  select.innerHTML = '';
  // Opción vacía siempre primero y seleccionada
  const optVacio = document.createElement('option');
  optVacio.value = '';
  optVacio.textContent = 'Seleccione el responsable';
  optVacio.selected = true;
  optVacio.disabled = true;
  select.appendChild(optVacio);
  empleados.filter(e => (e.cargo || '').toLowerCase() === 'reloj control').forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.nombre;
    opt.textContent = e.nombre + ' (' + e.id + ')';
    select.appendChild(opt);
  });
}

document.getElementById('btnIniciarTurno').addEventListener('click', function() {
  const folio = document.getElementById('folioTurno').value;
  const fecha = document.getElementById('fechaInicioTurno').value;
  const turno = document.getElementById('turnoInicioTurno').value;
  const responsable = document.getElementById('responsableInicioTurno').value;
  if (!folio || !fecha || !turno || !responsable) {
    sweetAlertError('Debe completar todos los campos para iniciar el turno.');
    return;
  }
  const turnoAbierto = { folio, fecha, turno, responsable };
  guardarEnLS(LS_TURNO_ABIERTO, turnoAbierto);
  document.getElementById('modalInicioTurno').style.display = 'none';
  mostrarCabeceraTurno(turnoAbierto);
  bloquearCabeceraTurno();
  // Agregar registro automático de inicio de turno
  const ahora = new Date();
  const hora = ahora.getHours().toString().padStart(2, '0') + ':' + ahora.getMinutes().toString().padStart(2, '0');
  let registros = obtenerDeLS(LS_NOVEDADES) || [];
  registros.push({ hora, nota: 'Inicio de Turno y lectura de Novedades anteriores' });
  guardarEnLS(LS_NOVEDADES, registros);
  agregarRegistroATabla(hora, 'Inicio de Turno y lectura de Novedades anteriores');
});

function mostrarCabeceraTurno(turno) {
  document.getElementById('cabeceraTurno').style.display = '';
  document.getElementById('folioActual').textContent = turno.folio;
  document.getElementById('fechaActual').textContent = turno.fecha;
  document.getElementById('turnoActual').textContent = turno.turno;
  document.getElementById('responsableActual').textContent = turno.responsable;
}

function bloquearCabeceraTurno() {
  // Solo intenta bloquear si los elementos existen
  const fecha = document.getElementById('fecha');
  if (fecha) {
    fecha.value = document.getElementById('fechaActual').textContent;
    fecha.readOnly = true;
  }
  const turno = document.getElementById('turno');
  if (turno) {
    turno.value = document.getElementById('turnoActual').textContent;
    turno.disabled = true;
  }
  const responsable = document.getElementById('responsable');
  if (responsable) {
    responsable.value = document.getElementById('responsableActual').textContent;
    responsable.disabled = true;
  }
}

// Al reportar turno, guardar todo y limpiar estado de turno abierto
const oldReportarTurno = typeof reportarTurno === 'function' ? reportarTurno : null;
function reportarTurno() {
  const turnoAbierto = obtenerDeLS(LS_TURNO_ABIERTO);
  if (!turnoAbierto) {
    sweetAlertError('No hay turno abierto para reportar.');
    return;
  }
  // Recolectar registros y proveedores
  const registros = [];
  document.querySelectorAll("#tabla-guardados tbody tr").forEach(f => {
    registros.push({ hora: f.children[0].textContent, nota: f.children[1].textContent });
  });
  // Agregar registro automático de cierre de turno
  const ahora = new Date();
  const horaCierre = ahora.getHours().toString().padStart(2, '0') + ':' + ahora.getMinutes().toString().padStart(2, '0');
  registros.push({ hora: horaCierre, nota: 'Cierre de Turno con Novedades Mencionadas' });
  const proveedores = [];
  document.querySelectorAll("#tabla-proveedores tbody tr").forEach(f => {
    proveedores.push({
      hora: f.children[0].textContent,
      patente: f.children[1].textContent,
      conductor: f.children[2].textContent,
      acompanantes: f.children[3].textContent,
      motivo: f.children[4].textContent
    });
  });
  const turnoCerrado = {
    ...turnoAbierto,
    registros,
    proveedores,
    cerradoEn: new Date().toISOString()
  };
  // Guardar en array de turnos cerrados
  const turnosCerrados = obtenerDeLS(LS_TURNOS_CERRADOS) || [];
  turnosCerrados.push(turnoCerrado);
  guardarEnLS(LS_TURNOS_CERRADOS, turnosCerrados);
  // Limpiar estado de turno abierto y registros temporales
  eliminarDeLS(LS_TURNO_ABIERTO);
  eliminarDeLS(LS_NOVEDADES);
  eliminarDeLS(LS_PROVEEDORES);
  mostrarNotificacionTurnoCerrado('El turno ha sido reportado y cerrado correctamente.', function() {
    window.location.href = 'index.html';
  });
}
// Reemplazar el handler del botón reportar turno
const reportarTurnoBtn = document.getElementById('reportarTurnoBtn');
if (reportarTurnoBtn) {
  reportarTurnoBtn.removeEventListener('click', oldReportarTurno);
  reportarTurnoBtn.addEventListener('click', reportarTurno);
}

function mostrarNotificacionTurnoCerrado(mensaje, callback) {
  // Crear modal si no existe
  let notif = document.getElementById('modalNotificacion');
  if (!notif) {
    notif = document.createElement('div');
    notif.id = 'modalNotificacion';
    notif.className = 'modal';
    notif.innerHTML = `
      <div class="modal-content" style="max-width:400px;text-align:center;">
        <h3>¡Turno Cerrado!</h3>
        <div id="mensajeNotificacion"></div>
        <button id="btnNotifAceptar">Aceptar</button>
      </div>
    `;
    document.body.appendChild(notif);
  }
  document.getElementById('mensajeNotificacion').innerHTML = mensaje;
  notif.style.display = 'flex';
  document.getElementById('btnNotifAceptar').onclick = function() {
    notif.style.display = 'none';
    if (callback) callback();
  };
}

function agregarRegistroATabla(hora, nota) {
  const tbody = document.getElementById("tabla-guardados").querySelector("tbody");
  const fila = document.createElement("tr");
  fila.innerHTML = `<td>${hora}</td><td>${nota}</td>`;
  tbody.appendChild(fila);
}

function agregarProveedorATabla(hora, patente, conductor, acompanantes, empresa, motivo) {
  const tbody = document.getElementById("tabla-proveedores").querySelector("tbody");
  const fila = document.createElement("tr");
  fila.innerHTML = `<td>${hora}</td><td>${patente}</td><td>${conductor}</td><td>${acompanantes}</td><td>${empresa || '-'}</td><td>${motivo}</td>`;
  tbody.appendChild(fila);
}

function abrirModalReportes() {
  const modal = document.getElementById('modalReportes');
  const listado = document.getElementById('listadoReportes');
  listado.innerHTML = '';
  const turnos = obtenerDeLS('libro-novedades-turnos-cerrados') || [];
  if (turnos.length === 0) {
    listado.innerHTML = '<p style="color:#888;">No hay reportes de turnos anteriores.</p>';
  } else {
    // Ordenar por folio descendente (más reciente primero)
    turnos.sort((a, b) => parseInt(b.folio) - parseInt(a.folio));
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = `
      <thead><tr><th>Folio</th><th>Fecha de Reporte</th><th>Turno</th><th>Responsable</th></tr></thead>
      <tbody>
        ${turnos.map((t, idx) => `
          <tr>
            <td><a href="#" class="folio-link" data-folio="${t.folio}">${t.folio}</a></td>
            <td>${t.cerradoEn ? new Date(t.cerradoEn).toLocaleString('es-CL') : '-'}</td>
            <td>${t.turno}</td>
            <td>${t.responsable || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    `;
    listado.appendChild(table);
    // Agregar eventos a los links de folio
    setTimeout(() => {
      document.querySelectorAll('.folio-link').forEach(link => {
        link.addEventListener('click', function(e) {
          e.preventDefault();
          const folio = this.getAttribute('data-folio');
          mostrarDetalleReporte(folio);
        });
      });
    }, 0);
  }
  modal.style.display = 'flex';
}

// Modal detalle de reporte sin paginación
function mostrarDetalleReporte(folio) {
  const turnos = obtenerDeLS('libro-novedades-turnos-cerrados') || [];
  const turno = turnos.find(t => t.folio == folio);
  if (!turno) return;
  let html = `<h4>Detalle Folio ${turno.folio}</h4>`;
  html += `<div><strong>Fecha de Reporte:</strong> ${turno.cerradoEn ? new Date(turno.cerradoEn).toLocaleString('es-CL') : '-'}</div>`;
  html += `<div><strong>Turno:</strong> ${turno.turno}</div>`;
  html += `<div><strong>Responsable:</strong> ${turno.responsable}</div>`;
  html += `<hr><strong>Registros Guardados</strong><br>`;
  if (turno.registros && turno.registros.length) {
    html += `<table style='width:100%;margin-bottom:1em;'><thead><tr><th>Hora</th><th>Anotación</th></tr></thead><tbody>`;
    html += turno.registros.map(r => `<tr><td>${r.hora}</td><td>${r.nota}</td></tr>`).join('');
    html += `</tbody></table>`;
  } else {
    html += `<div style='color:#888;'>Sin registros guardados</div>`;
  }
  html += `<strong>Proveedores Ingresados</strong><br>`;
  if (turno.proveedores && turno.proveedores.length) {
    html += `<table style='width:100%'><thead><tr><th>Hora</th><th>Patente</th><th>Conductor</th><th>Acompañantes</th><th>Motivo</th></tr></thead><tbody>`;
    html += turno.proveedores.map(p => `<tr><td>${p.hora}</td><td>${p.patente}</td><td>${p.conductor}</td><td>${p.acompanantes}</td><td>${p.motivo}</td></tr>`).join('');
    html += `</tbody></table>`;
  } else {
    html += `<div style='color:#888;'>Sin proveedores ingresados</div>`;
  }
  // Modal de detalle reutiliza el modalReportes
  const modal = document.getElementById('modalReportes');
  const listado = document.getElementById('listadoReportes');
  listado.innerHTML = `<button class="modal-close" type="button" aria-label="Cerrar" onclick="cerrarModalReportes()">×</button>` + html;
}

// Delegar el cierre del modal de reportes para la X dinámica
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    const listado = document.getElementById('listadoReportes');
    if (listado) {
      listado.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('modal-close')) {
          cerrarModalReportes();
        }
      });
    }
  });
})();

document.addEventListener("DOMContentLoaded", function() {
  // Repoblar tablas aquí
  const registros = obtenerDeLS(LS_NOVEDADES) || [];
  registros.forEach(r => agregarRegistroATabla(r.hora, r.nota));

  const proveedores = obtenerDeLS(LS_PROVEEDORES) || [];
  proveedores.forEach(p => {
    agregarProveedorATabla(p.hora, p.patente, p.conductor, p.acompanantes, p.empresa, p.motivo);
  });

  inicializarLibroNovedades();

  const abrirReportesBtn = document.getElementById('abrirReportesBtn');
  if (abrirReportesBtn) {
    abrirReportesBtn.addEventListener('click', abrirModalReportes);
  }
  // Forzar volver a index si se cierra el modal de inicio de turno sin iniciar
  forzarRedireccionCerrarModalInicioTurno();
});

function cerrarModalReportes() {
  const modal = document.getElementById('modalReportes');
  if (modal) modal.style.display = 'none';
}

// Bloquear apertura de registro/proveedor si no hay turno abierto
function turnoEstaAbierto() {
  return !!obtenerDeLS(LS_TURNO_ABIERTO);
}

// Forzar volver a index si se cierra el modal de inicio de turno sin iniciar
function forzarRedireccionCerrarModalInicioTurno() {
  const modalInicio = document.getElementById('modalInicioTurno');
  if (!modalInicio) return;
  // Cierre por X
  modalInicio.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = function() {
      window.location.href = 'index.html';
    };
  });
  // Cierre por click fuera del modal-content
  modalInicio.addEventListener('mousedown', function(e) {
    if (e.target === modalInicio) {
      window.location.href = 'index.html';
    }
  });
  // Cierre por tecla ESC
  document.addEventListener('keydown', function(e) {
    if (modalInicio.style.display === 'flex' && (e.key === 'Escape' || e.key === 'Esc')) {
      window.location.href = 'index.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  forzarRedireccionCerrarModalInicioTurno();
});

async function abrirModalRegistroSweet() {
  if (!turnoEstaAbierto()) {
    window.location.href = 'index.html';
    return;
  }
  const { value: formValues } = await Swal.fire({
    title: 'Nuevo Registro',
    html:
      `<label>Hora:</label><br><input type="time" id="swal-input-hora" class="swal2-input" style="width:70%"><br>` +
      `<label>Anotación:</label><br><textarea id="swal-input-nota" class="swal2-textarea" placeholder="Anotación..." style="width:90%"></textarea>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const hora = document.getElementById('swal-input-hora').value;
      const nota = document.getElementById('swal-input-nota').value;
      if (!hora || !nota) {
        Swal.showValidationMessage('Debe ingresar hora y anotación.');
        return false;
      }
      return { hora, nota };
    }
  });
  if (formValues) {
    let registros = obtenerDeLS(LS_NOVEDADES) || [];
    registros.push({ hora: formValues.hora, nota: formValues.nota });
    guardarEnLS(LS_NOVEDADES, registros);
    agregarRegistroATabla(formValues.hora, formValues.nota);
    Swal.fire('Registro guardado', '', 'success');
  }
}

async function abrirModalProveedorSweet() {
  if (!turnoEstaAbierto()) {
    window.location.href = 'index.html';
    return;
  }
  const { value: formValues } = await Swal.fire({
    title: 'Registro de Proveedor',
    html:
      `<label>Hora:</label><br><input type="time" id="swal-prov-hora" class="swal2-input" style="width:30%">` +
      `<label>Patente:</label><br><input type="text" id="swal-prov-patente" class="swal2-input" placeholder="XX-XX-XX" style="width:30%"><br>` +
      `<label>Conductor:</label><br><input type="text" id="swal-prov-conductor" class="swal2-input" placeholder="Nombre del conductor" style="width:90%"><br>` +
      `<label>Acompañantes:</label><br><input type="number" min="0" max="9" id="swal-prov-acompanantes" class="swal2-input" value="0" style="width:60px"><br>` +
      `<label>Empresa:</label><br><input type="text" id="swal-prov-empresa" class="swal2-input" placeholder="Nombre de la Empresa" style="width:90%"><br>` +
      `<label>Motivo:</label><br><input type="text" id="swal-prov-motivo" class="swal2-input" placeholder="Motivo del proveedor" style="width:90%"><br>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const hora = document.getElementById('swal-prov-hora').value;
      const patente = document.getElementById('swal-prov-patente').value;
      const conductor = document.getElementById('swal-prov-conductor').value;
      const acompanantes = document.getElementById('swal-prov-acompanantes').value;
      const empresa = document.getElementById('swal-prov-empresa').value;
      const motivo = document.getElementById('swal-prov-motivo').value;
      if (!hora || !patente || !conductor || acompanantes === '' || !empresa || !motivo) {
        Swal.showValidationMessage('Complete todos los campos del proveedor.');
        return false;
      }
      if (isNaN(Number(acompanantes)) || Number(acompanantes) < 0) {
        Swal.showValidationMessage('El número de acompañantes debe ser 0 o mayor.');
        return false;
      }
      return { hora, patente, conductor, acompanantes, empresa, motivo };
    }
  });
  if (formValues) {
    let proveedores = obtenerDeLS(LS_PROVEEDORES) || [];
    proveedores.push({
      hora: formValues.hora,
      patente: formValues.patente,
      conductor: formValues.conductor,
      acompanantes: formValues.acompanantes,
      empresa: formValues.empresa,
      motivo: formValues.motivo
    });
    guardarEnLS(LS_PROVEEDORES, proveedores);
    agregarProveedorATabla(formValues.hora, formValues.patente, formValues.conductor, formValues.acompanantes, formValues.empresa, formValues.motivo);
    Swal.fire('Proveedor guardado', '', 'success');
  }
}

document.addEventListener("DOMContentLoaded", function() {
  // ...existing code...
  const abrirRegistroBtn = document.getElementById('abrirRegistroBtn');
  if (abrirRegistroBtn) {
    abrirRegistroBtn.removeEventListener('click', abrirModal); // por si acaso
    abrirRegistroBtn.addEventListener('click', abrirModalRegistroSweet);
  }
  const abrirProveedorBtn = document.getElementById('abrirProveedorBtn');
  if (abrirProveedorBtn) {
    abrirProveedorBtn.removeEventListener('click', abrirProveedorModal); // por si acaso
    abrirProveedorBtn.addEventListener('click', abrirModalProveedorSweet);
  }
  // ...existing code...
});

// Forzar z-index alto para SweetAlert2
if (window.Swal) {
  Swal.mixin({
    customClass: {
      popup: 'swal2-zindex-fix'
    }
  });
}
