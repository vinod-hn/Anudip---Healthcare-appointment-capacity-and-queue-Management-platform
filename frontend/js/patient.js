(function () {
  "use strict";

  var state = window.HealthcareState;
  var utils = window.HealthcareUtils;

  function esc(value) {
    return utils.escapeHtml(value == null ? "" : value);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function msg(element, text, type) {
    element.textContent = text;
    element.className = "notice" + (type ? " notice-" + type : "");
  }

  // Doctor search page.
  var search = document.querySelector("#doctor-search");
  var results = document.querySelector("#doctor-results");

  if (search && results) {
    function renderDoctors() {
      var query = search.value.toLowerCase();

      var matches = state.data.doctors.filter(function (doctor) {
        return (
          doctor.status !== "inactive" &&
          (doctor.name + " " + doctor.department)
            .toLowerCase()
            .includes(query)
        );
      });

      results.innerHTML = matches.map(function (doctor) {
        return (
          '<article class="card">' +
            "<h2>" + esc(doctor.name) + "</h2>" +
            "<p>" + esc(doctor.department) + "</p>" +
            "<p>" + esc(doctor.consultationMinutes) +
              " minute consultations</p>" +
            '<a class="btn btn-primary" href="booking.html?doctor=' +
              encodeURIComponent(doctor.id) +
            '">Book appointment</a>' +
          "</article>"
        );
      }).join("") ||
        '<p class="empty-state">No active doctors found.</p>';
    }

    search.addEventListener("input", renderDoctors);

    renderDoctors();
  }

  // Patient booking page.
  var form = document.querySelector("#patient-booking-form");

  if (form) {
    var doctor = form.elements.doctorId;
    var date = form.elements.date;
    var time = form.elements.time;
    var notice = document.querySelector("#booking-message");

    doctor.innerHTML = state.data.doctors
      .filter(function (item) {
        return item.status !== "inactive";
      })
      .map(function (item) {
        return (
          '<option value="' + esc(item.id) + '">' +
          esc(item.name) + " — " + esc(item.department) +
          "</option>"
        );
      })
      .join("");

    var requestedDoctor =
      new URLSearchParams(location.search).get("doctor");

    if (requestedDoctor && state.getDoctor(requestedDoctor)) {
      doctor.value = requestedDoctor;
    }

    date.min = today();
    date.value = today();

    function renderSlots() {
      state.ensureSlots(doctor.value, date.value);

      var slots = state.data.slots
        .filter(function (slot) {
          return (
            slot.doctorId === doctor.value &&
            slot.date === date.value
          );
        })
        .sort(function (a, b) {
          return a.time.localeCompare(b.time);
        })
        .map(function (slot) {
          return state.slotInfo(
            doctor.value,
            date.value,
            slot.time
          );
        });

      time.innerHTML =
        '<option value="">Choose a time</option>' +
        slots.map(function (slot) {
          var label =
            slot.status === "available"
              ? "Available"
              : slot.status === "full"
              ? "Fully booked"
              : slot.status === "blocked"
              ? "Blocked"
              : "Unavailable";

          return (
            '<option value="' + esc(slot.time) + '"' +
              (slot.status !== "available" ? " disabled" : "") +
            ">" +
              esc(slot.time) + " — " + label +
            "</option>"
          );
        }).join("");

      var hasAvailableSlot = slots.some(function (slot) {
        return slot.status === "available";
      });

      if (!hasAvailableSlot) {
        msg(
          notice,
          "No slots are available for this date. Please select another date.",
          "error"
        );
      } else {
        msg(
          notice,
          "Only available slots can be selected.",
          ""
        );
      }
    }

    doctor.addEventListener("change", renderSlots);
    date.addEventListener("change", renderSlots);

    state.subscribe(renderSlots);

    renderSlots();

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      try {
        var formData = new FormData(form);

        var appointment = state.bookAppointment({
          patientName: formData.get("patientName"),
          phone: formData.get("phone"),
          doctorId: formData.get("doctorId"),
          date: formData.get("date"),
          time: formData.get("time")
        });

        sessionStorage.setItem(
          "healthcare-last-appointment",
          appointment.id
        );

        location.href =
          "confirmation.html?id=" +
          encodeURIComponent(appointment.id);

      } catch (error) {
        msg(notice, error.message, "error");
        renderSlots();
      }
    });
  }
})();