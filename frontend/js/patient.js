/* ===== Screen 1: Patient Home / Find a Doctor ===== */
(function () {
  "use strict";

  var search = document.querySelector("#doctor-search");
  var results = document.querySelector("#doctor-results");
  var deptBox = document.querySelector("#department-cards");
  var count = document.querySelector("#results-count");
  var form = document.querySelector("#search-form");
  if (!search || !results) return;

  var selectedDepartment = "";
  var esc = HealthcareUtils.escapeHtml;

  function activeDoctors() {
    return HealthcareState.data.doctors.filter(function (d) { return d.status === "active"; });
  }

  function departmentsOf(doctors) {
    var seen = [];
    doctors.forEach(function (d) { if (seen.indexOf(d.department) === -1) seen.push(d.department); });
    return seen;
  }

  function nextOpenSlot(doctorId) {
    var open = HealthcareState.data.slots.filter(function (s) {
      return s.doctorId === doctorId &&
        HealthcareState.slotInfo(s.doctorId, s.date, s.time).status === "available";
    }).sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
    return open[0] || null;
  }

  function initials(name) {
    var w = name.replace(/^Dr\.?\s*/i, "").split(/\s+/).filter(Boolean);
    return ((w[0] || "?").charAt(0) + (w[1] || "").charAt(0)).toUpperCase();
  }

  function renderDepartments(doctors) {
    var departments = departmentsOf(doctors);
    if (selectedDepartment && departments.indexOf(selectedDepartment) === -1) selectedDepartment = "";

    function card(label, value, total) {
      var pressed = selectedDepartment === value;
      return '<button type="button" class="dept-card" data-dept="' + esc(value) + '" aria-pressed="' + pressed + '">' +
        '<strong>' + esc(label) + '</strong><span>' + total + (total === 1 ? " doctor" : " doctors") + '</span></button>';
    }

    deptBox.innerHTML = card("All departments", "", doctors.length) + departments.map(function (department) {
      var total = doctors.filter(function (d) { return d.department === department; }).length;
      return card(department, department, total);
    }).join("");
  }

  function doctorCard(doctor) {
    var slot = nextOpenSlot(doctor.id);
    var slotBadge = slot
      ? '<span class="status-badge status-confirmed">Next slot: ' + esc(HealthcareUtils.formatDate(slot.date)) + ", " + esc(slot.time) + '</span>'
      : '<span class="status-badge status-waiting">No open slots</span>';
    var fee = Number(doctor.fee) > 0 ? "\u20B9" + Number(doctor.fee).toLocaleString("en-IN") : "Fee not listed";

    return '<article class="card doctor-card">' +
      '<div class="doctor-card-head">' +
        '<div class="doctor-avatar" aria-hidden="true">' + esc(initials(doctor.name)) + '</div>' +
        '<div><h3>' + esc(doctor.name) + '</h3><p class="doctor-department">' + esc(doctor.department) + '</p></div>' +
      '</div>' +
      '<ul class="doctor-meta"><li>' + esc(doctor.consultationMinutes) + ' min consultation</li><li>' + esc(fee) + '</li></ul>' +
      '<div>' + slotBadge + '</div>' +
      '<a class="btn btn-primary" href="doctor-details.html?doctor=' + encodeURIComponent(doctor.id) + '">View availability</a>' +
    '</article>';
  }

  function render() {
    var doctors = activeDoctors();
    renderDepartments(doctors);

    var query = search.value.trim().toLowerCase();
    var matches = doctors.filter(function (d) {
      var inDepartment = !selectedDepartment || d.department === selectedDepartment;
      var inQuery = (d.name + " " + d.department).toLowerCase().indexOf(query) !== -1;
      return inDepartment && inQuery;
    });

    count.textContent = matches.length + (matches.length === 1 ? " doctor found" : " doctors found");
    results.innerHTML = matches.length
      ? matches.map(doctorCard).join("")
      : '<div class="empty-state"><p>No doctors match your search. Try a different name or department.</p>' +
        '<button type="button" class="btn btn-secondary" data-clear>Clear filters</button></div>';
  }

  search.addEventListener("input", render);
  form.addEventListener("submit", function (e) { e.preventDefault(); render(); });

  deptBox.addEventListener("click", function (e) {
    var button = e.target.closest(".dept-card");
    if (!button) return;
    var value = button.getAttribute("data-dept");
    selectedDepartment = selectedDepartment === value ? "" : value;
    render();
  });

  results.addEventListener("click", function (e) {
    if (!e.target.closest("[data-clear]")) return;
    search.value = "";
    selectedDepartment = "";
    render();
    search.focus();
  });

  HealthcareState.subscribe(render);
  render();
}());

/* ===== Helpers for Screens 2-4 ===== */
window.PatientBooking = (function () {
  "use strict";
  var esc = HealthcareUtils.escapeHtml;

  function doctor(id) {
    var found = id ? HealthcareUtils.getDoctor(id) : null;
    return found && found.status === "active" ? found : null;
  }
  function slotsFor(doctorId) {
    return HealthcareState.data.slots.filter(function (s) { return s.doctorId === doctorId; })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });
  }
  function findSlot(doctorId, date, time) {
    return HealthcareState.data.slots.find(function (s) {
      return s.doctorId === doctorId && s.date === date && s.time === time;
    }) || null;
  }
  function slotStatus(s) {
    var info = HealthcareState.slotInfo(s.doctorId, s.date, s.time);
    return {
      key: info.status,
      label: info.status === "blocked"
        ? "Blocked"
        : info.status === "full"
        ? "Full"
        : info.available + " left",
      open: info.status === "available"
    };
  }
  function fee(d) {
    return Number(d.fee) > 0 ? "\u20B9" + Number(d.fee).toLocaleString("en-IN") : "Fee not listed";
  }
  function initials(name) {
    var w = name.replace(/^Dr\.?\s*/i, "").split(/\s+/).filter(Boolean);
    return ((w[0] || "?").charAt(0) + (w[1] || "").charAt(0)).toUpperCase();
  }
  function notice(el, title, text) {
    el.innerHTML = '<div class="card empty-state"><h2>' + esc(title) + '</h2><p>' + esc(text) +
      '</p><a class="btn btn-primary" href="home.html">Find a doctor</a></div>';
  }
  function row(label, value) {
    return '<div><dt>' + esc(label) + '</dt><dd>' + value + '</dd></div>';
  }
  return { doctor: doctor, slotsFor: slotsFor, findSlot: findSlot, slotStatus: slotStatus,
           fee: fee, initials: initials, notice: notice, row: row };
}());

/* ===== Screen 2: Doctor Details & Availability ===== */
(function () {
  "use strict";
  var view = document.querySelector("#doctor-view");
  if (!view) return;

  var P = PatientBooking, esc = HealthcareUtils.escapeHtml;
  var params = new URLSearchParams(location.search);
  var doc = P.doctor(params.get("doctor"));
  if (!doc) { P.notice(view, "Doctor not found", "This doctor is not available. Go back and pick another."); return; }

  var slots = P.slotsFor(doc.id);
  var dates = slots.reduce(function (list, s) { if (list.indexOf(s.date) === -1) list.push(s.date); return list; }, []);
  var date = dates.indexOf(params.get("date")) !== -1 ? params.get("date") : (dates[0] || "");
  var time = "", focusKey = "";

  function render() {
    var daySlots = slots.filter(function (s) { return s.date === date; });
    var chosen = time ? P.findSlot(doc.id, date, time) : null;
    var canContinue = !!(chosen && P.slotStatus(chosen).open);

    var html = '<section class="card doctor-profile">' +
      '<div class="doctor-avatar" aria-hidden="true">' + esc(P.initials(doc.name)) + '</div>' +
      '<div><h1>' + esc(doc.name) + '</h1><p class="doctor-department">' + esc(doc.department) + '</p>' +
      '<ul class="doctor-meta"><li>' + esc(doc.consultationMinutes) + ' min consultation</li><li>' + esc(P.fee(doc)) + '</li></ul></div>' +
      '</section>';

    if (!dates.length) {
      html += '<section class="card"><p class="empty-state">No time slots are listed for this doctor yet.</p>' +
        '<a class="btn btn-secondary" href="home.html">Back to doctors</a></section>';
    } else {
      html += '<section class="card"><h2>Choose a date</h2><div class="chip-row" role="group" aria-label="Available dates">' +
        dates.map(function (d) {
          return '<button type="button" class="chip" data-date="' + esc(d) + '" data-key="d-' + esc(d) + '" aria-pressed="' + (d === date) + '">' +
            esc(HealthcareUtils.formatDate(d)) + '</button>';
        }).join("") + '</div>' +
        '<h2>Choose a time</h2><div class="slot-grid" role="group" aria-label="Time slots">' +
        daySlots.map(function (s) {
          var st = P.slotStatus(s);
          return '<button type="button" class="slot slot-' + st.key + '" data-time="' + esc(s.time) + '" data-key="t-' + esc(s.time) + '"' +
            ' aria-pressed="' + (s.time === time) + '"' + (st.open ? "" : " disabled") + '>' +
            '<strong>' + esc(s.time) + '</strong><span>' + esc(st.label) + '</span></button>';
        }).join("") + '</div>' +
        '<p class="slot-note">Full and blocked times cannot be selected.</p>' +
        '<div class="slot-actions"><p aria-live="polite">' +
        (canContinue ? 'Selected: ' + esc(HealthcareUtils.formatDate(date)) + ' at ' + esc(time) : 'Select a time to continue.') + '</p>' +
        '<button type="button" class="btn btn-primary" id="continue-btn"' + (canContinue ? "" : " disabled") + '>Continue to booking</button></div></section>';
    }

    view.innerHTML = html;
    if (focusKey) {
      var el = view.querySelector('[data-key="' + focusKey + '"]');
      if (el && !el.disabled) el.focus();
    }
  }

  view.addEventListener("click", function (e) {
    var chip = e.target.closest(".chip");
    var slot = e.target.closest(".slot");
    if (chip) {
      date = chip.getAttribute("data-date"); time = ""; focusKey = chip.getAttribute("data-key"); render();
    } else if (slot) {
      time = slot.getAttribute("data-time"); focusKey = slot.getAttribute("data-key"); render();
    } else if (e.target.closest("#continue-btn")) {
      var chosen = P.findSlot(doc.id, date, time);
      if (!chosen || !P.slotStatus(chosen).open) { time = ""; render(); return; }
      location.href = "booking.html?doctor=" + encodeURIComponent(doc.id) + "&date=" + encodeURIComponent(date) + "&time=" + encodeURIComponent(time);
    }
  });

  render();
}());

/* ===== Screen 3: Appointment Booking ===== */
(function () {
  "use strict";
  var view = document.querySelector("#booking-view");
  if (!view) return;

  var P = PatientBooking, esc = HealthcareUtils.escapeHtml;
  var params = new URLSearchParams(location.search);
  var doc = P.doctor(params.get("doctor"));
  var date = params.get("date") || "", time = params.get("time") || "";
  var slot = doc ? P.findSlot(doc.id, date, time) : null;

  var back = document.querySelector("#change-slot");
  if (doc && back) back.href = "doctor-details.html?doctor=" + encodeURIComponent(doc.id) + "&date=" + encodeURIComponent(date);

  if (!doc || !slot || !P.slotStatus(slot).open) {
    P.notice(view, "This time is not available", "Choose a doctor and an open time to continue.");
    return;
  }

  view.innerHTML = '<div class="booking-layout">' +
    '<form class="card" id="booking-form" novalidate><h2>Patient details</h2>' +
      '<div class="field"><label for="patient-name">Full name</label>' +
      '<input id="patient-name" class="input" type="text" autocomplete="name" aria-describedby="name-error" required>' +
      '<p class="field-error" id="name-error" role="alert"></p></div>' +
      '<div class="field"><label for="patient-phone">Phone number</label>' +
      '<input id="patient-phone" class="input" type="tel" inputmode="numeric" autocomplete="tel" maxlength="15" placeholder="10-digit mobile number" aria-describedby="phone-error" required>' +
      '<p class="field-error" id="phone-error" role="alert"></p></div>' +
      '<p class="form-error" id="form-error" role="alert"></p>' +
      '<button type="submit" class="btn btn-primary" id="confirm-btn">Confirm booking</button></form>' +
    '<aside class="card" aria-labelledby="summary-heading"><h2 id="summary-heading">Appointment summary</h2><dl class="summary-list">' +
      P.row("Doctor", esc(doc.name)) + P.row("Department", esc(doc.department)) +
      P.row("Date", esc(HealthcareUtils.formatDate(date))) + P.row("Time", esc(time)) +
      P.row("Duration", esc(doc.consultationMinutes) + " min") + P.row("Fee", esc(P.fee(doc))) +
    '</dl></aside></div>';

  var form = view.querySelector("#booking-form");
  var nameEl = view.querySelector("#patient-name"), phoneEl = view.querySelector("#patient-phone");
  var nameErr = view.querySelector("#name-error"), phoneErr = view.querySelector("#phone-error");
  var formErr = view.querySelector("#form-error"), btn = view.querySelector("#confirm-btn");

  function setError(input, out, message) {
    out.textContent = message;
    input.classList.toggle("invalid", !!message);
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }
  nameEl.addEventListener("input", function () { setError(nameEl, nameErr, ""); formErr.textContent = ""; });
  phoneEl.addEventListener("input", function () { setError(phoneEl, phoneErr, ""); formErr.textContent = ""; });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = nameEl.value.trim().replace(/\s+/g, " ");
    var phone = phoneEl.value.replace(/[\s-]/g, "");
    var okName = name.length >= 2, okPhone = /^\d{10}$/.test(phone);
    setError(nameEl, nameErr, okName ? "" : "Enter the patient's full name.");
    setError(phoneEl, phoneErr, okPhone ? "" : "Enter a 10-digit phone number.");
    if (!okName || !okPhone) { (okName ? phoneEl : nameEl).focus(); return; }

    var fresh = P.findSlot(doc.id, date, time);
    if (!fresh || !P.slotStatus(fresh).open) {
      formErr.textContent = "This time was just filled. Go back and choose another time.";
      return;
    }

    btn.disabled = true;
    try {
      var appointment = HealthcareState.bookAppointment({
        patientName: name,
        phone: phone,
        doctorId: doc.id,
        date: date,
        time: time
      });
      location.href = "confirmation.html?id=" + encodeURIComponent(appointment.id);
    } catch (error) {
      btn.disabled = false;
      formErr.textContent = error.message;
    }
  });
}());

/* ===== Screen 4: Booking Confirmation ===== */
(function () {
  "use strict";
  var view = document.querySelector("#confirmation-view");
  if (!view) return;

  var P = PatientBooking, esc = HealthcareUtils.escapeHtml;
  var id = new URLSearchParams(location.search).get("id");
  var appt = id ? HealthcareState.data.appointments.find(function (a) { return a.id === id; }) : null;
  if (!appt) { P.notice(view, "Booking not found", "We could not find that appointment. Start a new booking."); return; }

  var doc = HealthcareUtils.getDoctor(appt.doctorId);
  view.innerHTML = '<section class="card confirm-card">' +
    '<div class="confirm-icon" aria-hidden="true">&#10003;</div>' +
    '<h1>Booking confirmed</h1><p>Your appointment is booked. Keep this ID handy.</p>' +
    '<div class="appt-id" aria-label="Appointment ID">' + esc(appt.id) + '</div>' +
    '<dl class="summary-list">' +
      P.row("Patient", esc(appt.patientName)) +
      P.row("Doctor", esc(doc ? doc.name : appt.doctorId)) +
      P.row("Department", esc(appt.department)) +
      P.row("Date", esc(HealthcareUtils.formatDate(appt.date))) +
      P.row("Time", esc(appt.time)) +
      P.row("Status", '<span class="status-badge status-' + esc(appt.status) + '">' + esc(HealthcareUtils.statusLabel(appt.status)) + '</span>') +
    '</dl>' +
    '<div class="next-steps"><p><strong>At the clinic:</strong> show this appointment ID at reception. Your queue token is assigned when you check in.</p></div>' +
    '<div class="confirm-actions"><a class="btn btn-primary" href="home.html">Book another appointment</a></div>' +
  '</section>';
}());