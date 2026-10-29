(function () {
  "use strict";

  var state = window.HealthcareState;
  var utils = window.HealthcareUtils;
  var page = document.body.dataset.page;

  // COMMON FUNCTIONS

  function $(selector) {
    return document.querySelector(selector);
  }

  function safe(value) {
    return utils.escapeHtml(value == null ? "" : value);
  }

  function today() {
    var d = new Date();

    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function doctorName(id) {
    var doctor = state.getDoctor(id);
    return doctor ? doctor.name : "Unknown doctor";
  }

  function showMessage(element, text, type) {
    if (!element) return;

    element.textContent = text;
    element.className = "notice" + (type ? " notice-" + type : "");
  }

  function fillDoctors(select) {
    if (!select) return;

    select.innerHTML = state.data.doctors
      .filter(function (doctor) {
        return doctor.status !== "inactive";
      })
      .map(function (doctor) {
        return '<option value="' + safe(doctor.id) + '">' +
          safe(doctor.name) + " — " +
          safe(doctor.department) + "</option>";
      })
      .join("");
  }

  function statusBadge(status) {
    return '<span class="status-badge status-' +
      safe(status) + '">' +
      safe(utils.statusLabel(status)) +
      "</span>";
  }


  // 1. SCHEDULE AND CAPACITY

  function initSchedule() {
    var doctor = $("[data-schedule-doctor]");
    var date = $("[data-schedule-date]");
    var grid = $("[data-slot-grid]");
    var msg = $("[data-schedule-message]");

    if (!doctor || !date || !grid) return;

    fillDoctors(doctor);
    date.value = today();

    function render() {
      state.ensureSlots(doctor.value, date.value);

      var slots = state.data.slots.filter(function (slot) {
        return slot.doctorId === doctor.value &&
          slot.date === date.value;
      });

      slots.sort(function (a, b) {
        return a.time.localeCompare(b.time);
      });

      var info = slots.map(function (slot) {
        return state.slotInfo(
          doctor.value,
          date.value,
          slot.time
        );
      });

      var total = 0;
      var booked = 0;
      var available = 0;

      info.forEach(function (slot) {
        total += slot.capacity;
        booked += slot.booked;
        available += slot.available;
      });

      if ($("[data-capacity-total]")) {
        $("[data-capacity-total]").textContent = total;
      }

      if ($("[data-capacity-booked]")) {
        $("[data-capacity-booked]").textContent = booked;
      }

      if ($("[data-capacity-available]")) {
        $("[data-capacity-available]").textContent = available;
      }

      if ($("[data-schedule-doctor-name]")) {
        $("[data-schedule-doctor-name]").textContent =
          doctorName(doctor.value);
      }

      if ($("[data-schedule-date-label]")) {
        $("[data-schedule-date-label]").textContent = date.value;
      }

      if (info.length === 0) {
        grid.innerHTML =
          '<p class="empty-state">' +
          "No slots available on this date. Sundays are closed." +
          "</p>";

        return;
      }

      grid.innerHTML = info.map(function (slot) {
        var label = slot.status === "available"
          ? "Available"
          : slot.status === "full"
          ? "Fully booked"
          : slot.status === "blocked"
          ? "Blocked"
          : "Unavailable";

        var disabled = slot.booked > 0 ||
          slot.status === "unavailable";

        return '<article class="slot-card slot-' +
          safe(slot.status) + '">' +

          '<div class="slot-top">' +
          "<strong>" + safe(slot.time) + "</strong>" +
          '<span class="slot-state">' + label + "</span>" +
          "</div>" +

          "<p>" + slot.booked + " booked · " +
          slot.available + " available · Capacity " +
          slot.capacity + "</p>" +

          '<button class="btn ' +
          (slot.blocked ? "btn-secondary" : "btn-primary") +
          '" aria-label="' + (slot.blocked ? "Unblock " : "Block ") +
          safe(slot.time) + ' slot" data-slot="' + safe(slot.time) + '"' +
          (disabled ? " disabled" : "") + ">" +
          (slot.blocked ? "Unblock slot" : "Block slot") +
          "</button></article>";
      }).join("");
    }

    doctor.addEventListener("change", render);
    date.addEventListener("change", render);

    grid.addEventListener("click", function (event) {
      var button = event.target.closest("[data-slot]");

      if (!button) return;

      try {
        var info = state.slotInfo(
          doctor.value,
          date.value,
          button.dataset.slot
        );

        state.setBlocked(
          doctor.value,
          date.value,
          button.dataset.slot,
          !info.blocked
        );

        showMessage(msg, "Slot updated.", "success");
        render();

      } catch (error) {
        showMessage(msg, error.message, "error");
      }
    });

    state.subscribe(render);
    render();
  }


  // 2. PATIENT CHECK-IN

  function initCheckin() {
    var search = $("[data-checkin-search]");
    var table = $("[data-checkin-table]");
    var empty = $("[data-checkin-empty]");
    var details = $("[data-checkin-details]");
    var msg = $("[data-checkin-message]");
    var form = $("[data-walkin-form]");

    if (!search || !table) return;

    var selectedId = "";

    function showDetails(a) {
      if (!details) return;

      selectedId = a.id;
      details.hidden = false;

      details.innerHTML =
        "<h2>Appointment details</h2>" +
        '<div class="detail-grid">' +

        "<p><b>ID</b><br>" + safe(a.id) + "</p>" +
        "<p><b>Patient</b><br>" + safe(a.patientName) + "</p>" +
        "<p><b>Phone</b><br>" + safe(a.phone) + "</p>" +
        "<p><b>Doctor</b><br>" +
        safe(doctorName(a.doctorId)) + "</p>" +

        "<p><b>Date and time</b><br>" +
        safe(a.date) + " " + safe(a.time) + "</p>" +

        "<p><b>Status</b><br>" +
        statusBadge(a.status) + "</p>" +

        "<p><b>Token</b><br>" +
        safe(a.token || "Token unavailable") + "</p>" +

        "</div>" +

        '<button class="btn btn-primary" data-checkin="' +
        safe(a.id) + '"' +
        (a.status !== "confirmed" ? " disabled" : "") +
        ">Check in patient</button>";
      details.focus();
    }

    function render() {
      var query = search.value.trim().toLowerCase();

      var appointments = state.data.appointments.filter(function (a) {
        return a.status === "confirmed" &&
          [a.id, a.patientName, a.phone].some(function (value) {
            return String(value || "").toLowerCase().includes(query);
          });
      });

      table.innerHTML = appointments.map(function (a) {
        return "<tr>" +
          "<td>" + safe(a.id) + "</td>" +
          "<td>" + safe(a.patientName) + "</td>" +
          "<td>" + safe(a.phone) + "</td>" +
          "<td>" + safe(doctorName(a.doctorId)) + "</td>" +
          "<td>" + safe(a.date) + "<br>" +
          safe(a.time) + "</td>" +
          "<td>" + statusBadge(a.status) + "</td>" +

          '<td><button class="btn btn-primary" data-view="' +
          safe(a.id) + '">View</button></td>' +

          "</tr>";
      }).join("");

      if (empty) {
        empty.hidden = appointments.length > 0;
        if (appointments.length === 0) {
          empty.textContent =
            "No appointments awaiting check-in match your search.";
        }
      }

      if (selectedId) {
        var selected = state.data.appointments.find(function (a) {
          return a.id === selectedId && a.status === "confirmed";
        });

        if (selected) {
          showDetails(selected);
        } else if (details) {
          selectedId = "";
          details.hidden = true;
          details.innerHTML = "";
        }
      }
    }

    table.addEventListener("click", function (event) {
      var button = event.target.closest("[data-view]");

      if (!button) return;

      var appointment = state.data.appointments.find(function (a) {
        return a.id === button.dataset.view;
      });

      if (appointment) showDetails(appointment);
    });

    if (details) {
      details.addEventListener("click", function (event) {
        var button = event.target.closest("[data-checkin]");

        if (!button) return;

        try {
          var appointment = state.checkIn(button.dataset.checkin);

          showMessage(
            msg,
            "Checked in successfully. Token number: " +
            appointment.token,
            "success"
          );

          showDetails(appointment);
          render();

        } catch (error) {
          showMessage(msg, error.message, "error");
        }
      });
    }

    search.addEventListener("input", render);


    // REGISTER WALK-IN PATIENT

    if (form) {
      var doctor = form.querySelector('[name="doctorId"]');
      var date = form.querySelector('[name="date"]');
      var time = form.querySelector('[name="time"]');

      fillDoctors(doctor);
      date.value = today();

      function updateSlots() {
        state.ensureSlots(doctor.value, date.value);

        var slots = state.data.slots.filter(function (slot) {
          return slot.doctorId === doctor.value &&
            slot.date === date.value;
        });

        slots.sort(function (a, b) {
          return a.time.localeCompare(b.time);
        });

        time.innerHTML = slots.map(function (slot) {
          var info = state.slotInfo(
            doctor.value,
            date.value,
            slot.time
          );

          return '<option value="' + safe(slot.time) + '"' +
            (info.status !== "available" ? " disabled" : "") +
            ">" + safe(slot.time) + " — " +
            info.status + "</option>";
        }).join("");

        if (!slots.length) {
          time.innerHTML =
            '<option value="">No slots available</option>';
        }
      }

      doctor.addEventListener("change", updateSlots);
      date.addEventListener("change", updateSlots);

      state.subscribe(updateSlots);
      updateSlots();

      form.addEventListener("submit", function (event) {
        event.preventDefault();

        var values = new FormData(form);

        try {
          var appointment = state.registerWalkIn({
            patientName: values.get("patientName"),
            phone: values.get("phone"),
            doctorId: values.get("doctorId"),
            date: values.get("date"),
            time: values.get("time")
          });

          showMessage(
            msg,
            "Walk-in appointment created. Token number: " +
            appointment.token +
            ". Check in the patient when they arrive.",
            "success"
          );

          form.reset();
          date.value = today();
          fillDoctors(doctor);
          updateSlots();
          render();

        } catch (error) {
          showMessage(msg, error.message, "error");
        }
      });
    }

    state.subscribe(render);
    render();
  }


  // 3. LIVE QUEUE

  function initQueue() {
    var doctor = $("[data-queue-doctor]");
    var date = $("[data-queue-date]");
    var table = $("[data-queue-table]");
    var empty = $("[data-queue-empty]");
    var msg = $("[data-queue-message]");

    if (!doctor || !date || !table) return;

    fillDoctors(doctor);

    // Find the nearest appointment date for this doctor.

    function chooseDate() {
      var dates = state.data.appointments.filter(function (a) {
        return a.doctorId === doctor.value &&
          a.date &&
          !["cancelled", "completed", "skipped"].includes(a.status);
      }).map(function (a) {
        return a.date;
      }).sort();

      if (dates.includes(today())) return today();

      return dates.find(function (d) {
        return d >= today();
      }) || today();
    }

    date.value = chooseDate();

    // Get appointments for the selected doctor and date.

    function queueList() {
      var list = state.data.appointments.filter(function (a) {
        return a.doctorId === doctor.value &&
          a.date === date.value &&
          ["confirmed", "waiting", "called", "in_consultation"]
            .includes(a.status);
      });

      list.sort(function (a, b) {
        return a.time.localeCompare(b.time) ||
          String(a.token || "").localeCompare(String(b.token || ""));
      });

      return list;
    }

    function render() {
      var list = queueList();

      var serving = list.find(function (a) {
        return a.status === "in_consultation";
      });

      var called = list.find(function (a) {
        return a.status === "called";
      });

      var next = list.find(function (a) {
        return a.status === "waiting";
      });

      var element = $("[data-now-serving]");

      if (element) {
        element.textContent = serving
          ? serving.patientName
          : called ? called.patientName : "—";
      }

      element = $("[data-now-token]");

      if (element) {
        element.textContent = serving
          ? "Token: " + (serving.token || "—")
          : called
          ? "Token: " + (called.token || "—")
          : "No patient called";
      }

      element = $("[data-next-patient]");

      if (element) {
        element.textContent = next ? next.patientName : "—";
      }

      element = $("[data-next-token]");

      if (element) {
        element.textContent = next
          ? "Token: " + (next.token || "—")
          : "No waiting patient";
      }

      element = $("[data-waiting-count]");

      if (element) {
        element.textContent = list.filter(function (a) {
          return a.status === "waiting";
        }).length;
      }

      // Show the token in the first column.

      table.innerHTML = list.map(function (a) {
        var token = a.token || "Token unavailable";

        var actions = "";

        if (a.status === "waiting") {
          actions =
            '<button class="btn btn-primary" data-action="called" data-id="' +
            safe(a.id) + '" aria-label="Call ' + safe(a.patientName) + ', token ' + safe(token) + '">Call patient</button> ' +

            '<button class="btn btn-secondary" data-action="skipped" data-id="' +
            safe(a.id) + '" aria-label="Skip ' + safe(a.patientName) + ', token ' + safe(token) + '">Skip</button>';

        } else if (a.status === "called") {
          actions =
            '<button class="btn btn-primary" data-action="in_consultation" data-id="' +
            safe(a.id) + '" aria-label="Start consultation for ' + safe(a.patientName) + '">Start consultation</button> ' +

            '<button class="btn btn-secondary" data-action="waiting" data-id="' +
            safe(a.id) + '" aria-label="Return ' + safe(a.patientName) + ' to waiting">Return to waiting</button> ' +

            '<button class="btn btn-secondary" data-action="skipped" data-id="' +
            safe(a.id) + '" aria-label="Skip ' + safe(a.patientName) + '">Skip</button>';

        } else if (a.status === "in_consultation") {
          actions =
            '<button class="btn btn-primary" data-action="completed" data-id="' +
            safe(a.id) + '" aria-label="Complete consultation for ' + safe(a.patientName) + '">Complete consultation</button>';

        } else {
          actions = "<span>Check in first</span>";
        }

        return "<tr>" +

          '<td><strong>' + safe(token) + "</strong></td>" +
          "<td>" + safe(a.patientName) + "</td>" +
          "<td>" + safe(a.id) + "</td>" +
          "<td>" + safe(a.time) + "</td>" +
          "<td>" + statusBadge(a.status) + "</td>" +
          '<td class="action-cell">' + actions + "</td>" +

          "</tr>";
      }).join("");

      if (empty) {
        empty.hidden = list.length > 0;

        if (list.length === 0) {
          empty.textContent =
            "No appointments for this doctor and date. " +
            "Check the selected date or create a booking.";
        }
      }
    }

    doctor.addEventListener("change", function () {
      date.value = chooseDate();
      render();
    });

    date.addEventListener("change", render);

    // Handle queue buttons.

    table.addEventListener("click", function (event) {
      var button = event.target.closest("[data-action]");

      if (!button) return;

      try {
        var id = button.dataset.id;
        var action = button.dataset.action;

        if (action === "waiting") {
          state.updateAppointment(id, {
            status: "waiting"
          });
        } else {
          state.changeStatus(id, action);
        }

        showMessage(msg, "Queue updated.", "success");
        render();

      } catch (error) {
        showMessage(msg, error.message, "error");
      }
    });

    state.subscribe(render);
    render();
  }


  // START THE CURRENT PAGE

  if (page === "schedules") initSchedule();
  if (page === "check-in") initCheckin();
  if (page === "queue") initQueue();

})();