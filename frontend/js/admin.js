(function () {
  var page = document.body.dataset.page;
  var state = window.HealthcareState;
  var utils = window.HealthcareUtils;

  function statusBadge(status) {
    return (
      '<span class="status-badge status-' +
      status +
      '">' +
      utils.escapeHtml(utils.statusLabel(status)) +
      "</span>"
    );
  }
  function doctorName(doctorId) {
    var doctor = utils.getDoctor(doctorId);
    return doctor ? doctor.name : "Unknown doctor";
  }
  function renderDashboard() {
    var appointments = state.data.appointments;
    var count = function (status) {
      return appointments.filter(function (item) {
        return item.status === status;
      }).length;
    };
    document.querySelector('[data-kpi="total"]').textContent =
      appointments.length;
    document.querySelector('[data-kpi="confirmed"]').textContent =
      count("confirmed");
    document.querySelector('[data-kpi="checked-in"]').textContent =
      count("checked_in");
    document.querySelector('[data-kpi="completed"]').textContent =
      count("completed");
    var summary = [
      "confirmed",
      "checked_in",
      "waiting",
      "completed",
      "cancelled",
    ]
      .map(function (status) {
        return (
          '<div class="summary-row"><span>' +
          utils.statusLabel(status) +
          "</span><strong>" +
          count(status) +
          "</strong></div>"
        );
      })
      .join("");
    document.querySelector("[data-appointment-summary]").innerHTML = summary;
    var capacity = {};
    state.data.slots.forEach(function (slot) {
      var doctor = utils.getDoctor(slot.doctorId);
      var department = doctor ? doctor.department : "Unassigned";
      var info = state.slotInfo(slot.doctorId, slot.date, slot.time);
      if (!capacity[department]) capacity[department] = { booked: 0, total: 0 };
      capacity[department].booked += info.booked;
      capacity[department].total += info.capacity;
    });
    document.querySelector("[data-capacity-summary]").innerHTML = Object.keys(
      capacity,
    )
      .map(function (department) {
        var item = capacity[department];
        var percentage =
          item.total ? Math.round((item.booked / item.total) * 100) : 0;
        return (
          '<div><div class="capacity-row"><span>' +
          utils.escapeHtml(department) +
          "</span><strong>" +
          item.booked +
          " / " +
          item.total +
          '</strong></div><div class="capacity-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
          percentage +
          '" aria-label="' +
          utils.escapeHtml(department) +
          ' capacity booked"><span style="width:' +
          percentage +
          '%"></span></div></div>'
        );
      })
      .join("");
  }
  function renderAppointments() {
    var search = (
      document.querySelector("[data-appointment-search]").value || ""
    ).toLowerCase();
    var date = document.querySelector("[data-appointment-date]").value;
    var status = document.querySelector("[data-appointment-status]").value;
    var rows = state.data.appointments.filter(function (item) {
      var searchable = (item.id + " " + item.patientName).toLowerCase();
      return (
        searchable.indexOf(search) !== -1 &&
        (!date || item.date === date) &&
        (!status || item.status === status)
      );
    });
    var empty = document.querySelector("[data-appointment-empty]");
    empty.hidden = rows.length !== 0;
    document.querySelector("[data-appointment-table]").innerHTML = rows
      .map(function (item) {
        return (
          "<tr><td><strong>" +
          utils.escapeHtml(item.id) +
          "</strong></td><td>" +
          utils.escapeHtml(item.patientName) +
          "</td><td>" +
          utils.escapeHtml(doctorName(item.doctorId)) +
          "</td><td>" +
          utils.escapeHtml(utils.formatDate(item.date)) +
          '<br><span class="muted">' +
          utils.escapeHtml(item.time) +
          "</span></td><td>" +
          statusBadge(item.status) +
          '</td><td><button class="table-action" data-view-appointment="' +
          item.id +
          '" type="button">View</button> <button class="table-action" data-delete-appointment="' +
          item.id +
          '" type="button">Delete</button></td></tr>'
        );
      })
      .join("");
  }
  function setupAppointmentFilters() {
    var select = document.querySelector("[data-appointment-status]");
    state.statuses.forEach(function (status) {
      select.insertAdjacentHTML(
        "beforeend",
        '<option value="' +
          status +
          '">' +
          utils.statusLabel(status) +
          "</option>",
      );
    });
    [
      "[data-appointment-search]",
      "[data-appointment-date]",
      "[data-appointment-status]",
    ].forEach(function (selector) {
      document
        .querySelector(selector)
        .addEventListener("input", renderAppointments);
    });
    document
      .querySelector("[data-appointment-table]")
      .addEventListener("click", function (event) {
        var deleteButton = event.target.closest("[data-delete-appointment]");
        if (deleteButton) {
          var appointmentId = deleteButton.dataset.deleteAppointment;
          if (
            !window.confirm(
              "Permanently delete appointment " + appointmentId +
              "? This cannot be undone."
            )
          ) {
            return;
          }
          state.deleteAppointment(appointmentId);
          return;
        }

        var button = event.target.closest("[data-view-appointment]");
        if (!button) return;
        var appointment = state.data.appointments.find(function (item) {
          return item.id === button.dataset.viewAppointment;
        });
        var dialog = document.querySelector("[data-appointment-dialog]");
        document.querySelector("[data-appointment-details]").innerHTML =
          "<p><strong>" +
          utils.escapeHtml(appointment.patientName) +
          "</strong><br>" +
          utils.escapeHtml(appointment.phone) +
          "</p><p>" +
          utils.escapeHtml(doctorName(appointment.doctorId)) +
          "<br>" +
          utils.escapeHtml(utils.formatDate(appointment.date)) +
          " at " +
          utils.escapeHtml(appointment.time) +
          "</p><p>" +
          statusBadge(appointment.status) +
          "</p>";
        document.querySelector(
          "[data-cancel-appointment]",
        ).dataset.appointmentId = appointment.id;
        document.querySelector("[data-cancel-appointment]").disabled =
          ["cancelled", "completed", "skipped"].indexOf(appointment.status) !==
          -1;
        document.querySelector(
          "[data-reschedule-appointment]",
        ).dataset.appointmentId = appointment.id;
        document.querySelector("[data-reschedule-appointment]").disabled =
          ["cancelled", "completed", "skipped"].indexOf(appointment.status) !==
          -1;
        document.querySelector("[data-reschedule-form]").hidden = true;
        dialog.showModal();
      });
    document
      .querySelector("[data-cancel-appointment]")
      .addEventListener("click", function (event) {
        var id = event.currentTarget.dataset.appointmentId;
        if (!window.confirm("Cancel appointment " + id + "?")) return;
        state.updateAppointment(id, { status: "cancelled" });
        document.querySelector("[data-appointment-dialog]").close();
        renderAppointments();
      });
    document
      .querySelector("[data-reschedule-appointment]")
      .addEventListener("click", function (event) {
        var id = event.currentTarget.dataset.appointmentId;
        var appointment = state.data.appointments.find(function (item) {
          return item.id === id;
        });
        document.querySelector("[data-reschedule-date]").value =
          appointment.date;
        document.querySelector("[data-reschedule-time]").value =
          appointment.time;
        document.querySelector("[data-reschedule-form]").hidden = false;
        document.querySelector("[data-save-reschedule]").dataset.appointmentId =
          id;
      });
    document
      .querySelector("[data-save-reschedule]")
      .addEventListener("click", function (event) {
        var date = document.querySelector("[data-reschedule-date]").value;
        var time = document.querySelector("[data-reschedule-time]").value;
        if (!date || !time) return;
        var id = event.currentTarget.dataset.appointmentId;
        try {
          state.rescheduleAppointment(id, date, time);
          document.querySelector("[data-appointment-dialog]").close();
          renderAppointments();
        } catch (error) {
          window.alert(error.message);
        }
      });
  }
  function renderDoctors() {
    var query = (
      document.querySelector("[data-doctor-search]").value || ""
    ).toLowerCase();
    var doctors = state.data.doctors.filter(function (doctor) {
      return (
        (doctor.name + " " + doctor.department).toLowerCase().indexOf(query) !==
        -1
      );
    });
    document.querySelector("[data-doctor-table]").innerHTML = doctors
      .map(function (doctor) {
        return (
          "<tr><td>" +
          utils.escapeHtml(doctor.name) +
          "</td><td>" +
          utils.escapeHtml(doctor.department) +
          "</td><td>" +
          doctor.consultationMinutes +
          " min</td><td>₹" +
          doctor.fee +
          '</td><td><button class="table-action" aria-label="' +
          (doctor.status === "active" ? "Deactivate " : "Activate ") +
          utils.escapeHtml(doctor.name) +
          '" data-toggle-doctor="' +
          doctor.id +
          '" type="button">' +
          utils.escapeHtml(utils.statusLabel(doctor.status)) +
          '</button></td><td><button class="table-action" data-edit-doctor="' +
          doctor.id +
          '" type="button">Edit</button></td></tr>'
        );
      })
      .join("");
  }
  function setupDoctors() {
    var dialog = document.querySelector("[data-doctor-dialog]");
    var form = document.querySelector("[data-doctor-form]");
    document
      .querySelector("[data-doctor-search]")
      .addEventListener("input", renderDoctors);
    document
      .querySelector("[data-add-doctor]")
      .addEventListener("click", function () {
        form.reset();
        form.elements.id.value = "";
        document.querySelector("[data-doctor-form-title]").textContent =
          "Add doctor";
        dialog.showModal();
      });
    document
      .querySelector("[data-doctor-table]")
      .addEventListener("click", function (event) {
        var toggle = event.target.closest("[data-toggle-doctor]");
        var edit = event.target.closest("[data-edit-doctor]");
        if (toggle) {
          var toggled = utils.getDoctor(toggle.dataset.toggleDoctor);
          state.updateDoctor(toggled.id, {
            status: toggled.status === "active" ? "inactive" : "active",
          });
          renderDoctors();
        }
        if (edit) {
          var doctor = utils.getDoctor(edit.dataset.editDoctor);
          form.elements.id.value = doctor.id;
          form.elements.name.value = doctor.name;
          form.elements.department.value = doctor.department;
          form.elements.consultationMinutes.value = doctor.consultationMinutes;
          form.elements.fee.value = doctor.fee;
          document.querySelector("[data-doctor-form-title]").textContent =
            "Edit doctor";
          dialog.showModal();
        }
      });
    document.querySelectorAll("[data-close-doctor").forEach(function (button) {
      button.addEventListener("click", function () {
        dialog.close();
      });
    });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var values = Object.fromEntries(new FormData(form).entries());
      values.consultationMinutes = Number(values.consultationMinutes);
      values.fee = Number(values.fee);
      if (values.id) state.updateDoctor(values.id, values);
      else state.addDoctor(values);
      dialog.close();
      renderDoctors();
    });
  }
  if (page === "dashboard") {
    renderDashboard();
    state.subscribe(renderDashboard);
    document
      .querySelector("[data-reset-demo]")
      .addEventListener("click", function () {
        if (window.confirm("Reset all demo changes?")) state.reset();
      });
  }
  if (page === "appointments") {
    setupAppointmentFilters();
    renderAppointments();
    state.subscribe(renderAppointments);
  }
  if (page === "doctors") {
    setupDoctors();
    renderDoctors();
    state.subscribe(renderDoctors);
  }
})();
