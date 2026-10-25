/* Shared demo data and business rules.
   Frontend-only: localStorage is per browser. */

(function () {
  "use strict";

  var KEY = "healthcare-plus-demo-state-v2";

  var VALID = [
    "confirmed",
    "checked_in",
    "waiting",
    "called",
    "in_consultation",
    "completed",
    "cancelled",
    "skipped"
  ];

  var seed = window.HealthcareMockData;

  function copy(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function load() {
    try {
      var saved = localStorage.getItem(KEY);

      if (saved) {
        var parsed = JSON.parse(saved);

        if (
          parsed &&
          Array.isArray(parsed.doctors) &&
          Array.isArray(parsed.slots) &&
          Array.isArray(parsed.appointments)
        ) {
          parsed.appointments = parsed.appointments.filter(function (appointment) {
            return appointment.patientName !== "Demo Patient";
          });
          return parsed;
        }
      }
    } catch (error) {
      console.warn("Could not read saved demo data.", error);
    }

    return {
      doctors: copy(seed.doctors),
      slots: [],
      appointments: copy(seed.appointments || []),
      nextAppointment: 1001,
      nextToken: {}
    };
  }

  var data = load();

  data.nextAppointment = Number(data.nextAppointment || 1002);
  data.nextToken = data.nextToken || {};

  // Normalize saved slot records.
  data.slots = data.slots.map(function (slot) {
    return {
      doctorId: slot.doctorId,
      date: slot.date,
      time: slot.time,
      capacity: Number(slot.capacity || 1),
      blocked: Boolean(slot.blocked)
    };
  });

  data.appointments.forEach(function (appointment) {
    if (!appointment.status) {
      appointment.status = "confirmed";
    }

    if (typeof appointment.token === "undefined") {
      appointment.token = null;
    }
  });

  function tokenKey(appointment) {
    return appointment.doctorId + "|" + appointment.date;
  }

  function tokenNumber(token) {
    var match = /^T(\d+)$/.exec(String(token || ""));
    return match ? Number(match[1]) : 0;
  }

  function nextTokenNumber(appointment) {
    var key = tokenKey(appointment);
    var next = Number(data.nextToken[key]) || 1;

    data.appointments.forEach(function (item) {
      if (tokenKey(item) === key) {
        next = Math.max(next, tokenNumber(item.token) + 1);
      }
    });

    return next;
  }

  function assignToken(appointment) {
    if (!appointment.token) {
      var key = tokenKey(appointment);
      var next = nextTokenNumber(appointment);

      appointment.token =
        "T" + String(next).padStart(3, "0");
      data.nextToken[key] = next + 1;
    }

    return appointment.token;
  }

  function normalizeTokens() {
    data.nextToken = data.nextToken || {};

    data.appointments.forEach(function (appointment) {
      if (appointment.token) {
        var key = tokenKey(appointment);
        data.nextToken[key] = Math.max(
          Number(data.nextToken[key]) || 1,
          tokenNumber(appointment.token) + 1
        );
      }
    });

    data.appointments
      .filter(function (appointment) {
        return !appointment.token;
      })
      .sort(function (a, b) {
        return (
          tokenKey(a).localeCompare(tokenKey(b)) ||
          String(a.time || "").localeCompare(String(b.time || "")) ||
          String(a.id || "").localeCompare(String(b.id || ""))
        );
      })
      .forEach(assignToken);
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (error) {
      console.error(
        "Could not save demo data. Browser storage may be full.",
        error
      );
    }

    window.HealthcareState.data = data;

    window.dispatchEvent(
      new CustomEvent("healthcare:state-change")
    );
  }

  function dateValid(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return false;
    }

    return !isNaN(new Date(date + "T00:00:00").getTime());
  }

  function getDoctor(id) {
    return data.doctors.find(function (doctor) {
      return doctor.id === id && doctor.status !== "inactive";
    });
  }

  function minutesToTime(minutes) {
    return (
      String(Math.floor(minutes / 60)).padStart(2, "0") +
      ":" +
      String(minutes % 60).padStart(2, "0")
    );
  }

  function getSlot(doctorId, date, time) {
    return data.slots.find(function (slot) {
      return (
        slot.doctorId === doctorId &&
        slot.date === date &&
        slot.time === time
      );
    });
  }

  /*
   * DEMO WORKING HOURS:
   * Monday-Saturday
   * 09:00-13:00
   * 14:00-17:00
   *
   * Slot duration comes from each doctor's consultationMinutes.
   *
   * These are generated demo schedules, not real hospital schedules.
   */

  function ensureSlots(doctorId, date) {
    var doctor = getDoctor(doctorId);

    if (!doctor || !dateValid(date)) {
      return [];
    }

    var day = new Date(date + "T00:00:00").getDay();

    // Sunday closed.
    if (day === 0) {
      return [];
    }

    var duration = Math.max(
      10,
      Number(doctor.consultationMinutes || 15)
    );

    var workingPeriods = [
      [540, 780], // 09:00-13:00
      [840, 1020] // 14:00-17:00
    ];

    workingPeriods.forEach(function (period) {
      for (
        var minutes = period[0];
        minutes + duration <= period[1];
        minutes += duration
      ) {
        var time = minutesToTime(minutes);

        if (!getSlot(doctorId, date, time)) {
          data.slots.push({
            doctorId: doctorId,
            date: date,
            time: time,
            capacity: 1,
            blocked: false
          });
        }
      }
    });

    return data.slots
      .filter(function (slot) {
        return (
          slot.doctorId === doctorId &&
          slot.date === date
        );
      })
      .sort(function (a, b) {
        return a.time.localeCompare(b.time);
      });
  }

  /*
   * Every non-cancelled appointment consumes capacity,
   * including completed appointments.
   *
   * Cancelling an appointment releases its capacity.
   */

  function activeAtSlot(doctorId, date, time) {
    return data.appointments.filter(function (appointment) {
      return (
        appointment.doctorId === doctorId &&
        appointment.date === date &&
        appointment.time === time &&
        appointment.status !== "cancelled"
      );
    });
  }

  function slotInfo(doctorId, date, time) {
    var slot = getSlot(doctorId, date, time);

    var booked = activeAtSlot(
      doctorId,
      date,
      time
    ).length;

    if (!slot) {
      return {
        doctorId: doctorId,
        date: date,
        time: time,
        capacity: 1,
        booked: booked,
        available: 0,
        blocked: false,
        status: "unavailable"
      };
    }

    var capacity = Number(slot.capacity || 1);

    var available = Math.max(
      0,
      capacity - booked
    );

    var status = slot.blocked
      ? "blocked"
      : available === 0
      ? "full"
      : "available";

    return {
      doctorId: doctorId,
      date: date,
      time: time,
      capacity: capacity,
      booked: booked,
      available: available,
      blocked: Boolean(slot.blocked),
      status: status
    };
  }

  function canBook(doctorId, date, time) {
    var doctor = getDoctor(doctorId);

    if (!doctor) {
      return {
        ok: false,
        message: "Please select an active doctor."
      };
    }

    var today = new Date().toISOString().slice(0, 10);

    if (!dateValid(date) || date < today) {
      return {
        ok: false,
        message: "Choose today or a future date."
      };
    }

    var slots = ensureSlots(doctorId, date);

    var exists = slots.some(function (slot) {
      return slot.time === time;
    });

    if (!exists) {
      return {
        ok: false,
        message:
          "This time is outside the doctor's working schedule."
      };
    }

    var info = slotInfo(doctorId, date, time);

    if (info.blocked) {
      return {
        ok: false,
        message: "This slot is blocked and cannot be booked."
      };
    }

    if (info.available < 1) {
      return {
        ok: false,
        message:
          "This slot is fully occupied. Please choose another time."
      };
    }

    return {
      ok: true,
      message: "Slot available."
    };
  }

  /*
   * Prevent duplicate active appointments for the same phone,
   * doctor and date.
   *
   * A patient can still have appointments with different doctors.
   */

  function findDuplicate(phone, date, doctorId) {
    var digits = String(phone || "").replace(/\D/g, "");

    return data.appointments.find(function (appointment) {
      return (
        String(appointment.phone || "").replace(/\D/g, "") === digits &&
        appointment.date === date &&
        appointment.doctorId === doctorId &&
        appointment.status !== "cancelled"
      );
    });
  }

  function bookAppointment(input) {
    var name = String(input.patientName || "").trim();

    var phone = String(input.phone || "")
      .replace(/\D/g, "");

    if (name.length < 2) {
      throw new Error("Enter the patient's full name.");
    }

    if (!/^\d{10}$/.test(phone)) {
      throw new Error("Enter a valid 10-digit phone number.");
    }

    var availability = canBook(
      input.doctorId,
      input.date,
      input.time
    );

    if (!availability.ok) {
      throw new Error(availability.message);
    }

    if (findDuplicate(phone, input.date, input.doctorId)) {
      throw new Error(
        "This patient already has an active appointment with this doctor on this date."
      );
    }

    var doctor = getDoctor(input.doctorId);

    var id =
      "APT" +
      String(data.nextAppointment++).padStart(4, "0");

    var appointment = {
      id: id,
      patientName: name,
      phone: phone,
      doctorId: doctor.id,
      department: doctor.department,
      date: input.date,
      time: input.time,
      status: "confirmed",
      token: null,
      createdAt: new Date().toISOString(),
      checkedInAt: null
    };

    assignToken(appointment);
    data.appointments.push(appointment);

    save();

    return copy(appointment);
  }

  /*
   * Check-in changes queue status; it does not change the booking token.
   * Repeated check-in is rejected because status is no longer confirmed.
   */

  function checkIn(id) {
    var appointment = data.appointments.find(function (item) {
      return item.id === id;
    });

    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    if (appointment.status !== "confirmed") {
      throw new Error(
        "Only confirmed appointments can be checked in. Current status: " +
        appointment.status.replace(/_/g, " ")
      );
    }

    assignToken(appointment);

    appointment.status = "waiting";
    appointment.checkedInAt = new Date().toISOString();

    save();

    return copy(appointment);
  }

  function registerWalkIn(input) {
    var name = String(input.patientName || "").trim();

    var phone = String(input.phone || "")
      .replace(/\D/g, "");

    if (name.length < 2) {
      throw new Error("Enter the patient's full name.");
    }

    if (!/^\d{10}$/.test(phone)) {
      throw new Error("Enter a valid 10-digit phone number.");
    }

    // A walk-in must use a genuinely available slot.
    var availability = canBook(
      input.doctorId,
      input.date,
      input.time
    );

    if (!availability.ok) {
      throw new Error(availability.message);
    }

    if (findDuplicate(phone, input.date, input.doctorId)) {
      throw new Error(
        "This patient already has an active appointment with this doctor on this date."
      );
    }

    var doctor = getDoctor(input.doctorId);

    var id =
      "APT" +
      String(data.nextAppointment++).padStart(4, "0");

    var appointment = {
      id: id,
      patientName: name,
      phone: phone,
      doctorId: doctor.id,
      department: doctor.department,
      date: input.date,
      time: input.time,
      status: "confirmed",
      token: null,
      walkIn: true,
      createdAt: new Date().toISOString(),
      checkedInAt: null
    };

    assignToken(appointment);
    data.appointments.push(appointment);

    save();

    return copy(appointment);
  }

  function setBlocked(doctorId, date, time, blocked) {
    var info = slotInfo(doctorId, date, time);

    if (blocked && info.booked > 0) {
      throw new Error(
        "Cannot block a slot that already has appointments. Cancel or reschedule them first."
      );
    }

    var slot = getSlot(doctorId, date, time);

    if (!slot) {
      throw new Error("Slot not found in the doctor's schedule.");
    }

    slot.blocked = Boolean(blocked);

    save();

    return slotInfo(doctorId, date, time);
  }

  /*
   * Queue rules:
   * 1. Only waiting patients can be called.
   * 2. Only one patient may be called or in consultation at a time.
   * 3. The earliest scheduled waiting patient must be called first.
   * 4. A consultation must be completed before another starts.
   */

  function changeStatus(id, next) {
    var appointment = data.appointments.find(function (item) {
      return item.id === id;
    });

    if (!appointment) {
      throw new Error("Appointment not found.");
    }

    var allowed = {
      waiting: ["called", "skipped"],
      called: ["in_consultation", "waiting", "skipped"],
      in_consultation: ["completed"]
    };

    if (
      !(allowed[appointment.status] || []).includes(next)
    ) {
      throw new Error(
        "Invalid action for a patient with status '" +
        appointment.status.replace(/_/g, " ") +
        "'."
      );
    }

    if (next === "called") {
      var alreadyActive = data.appointments.some(function (item) {
        return (
          item.doctorId === appointment.doctorId &&
          item.date === appointment.date &&
          (
            item.status === "called" ||
            item.status === "in_consultation"
          ) &&
          item.id !== appointment.id
        );
      });

      if (alreadyActive) {
        throw new Error(
          "Finish or return the currently called patient before calling another patient."
        );
      }

      var first = data.appointments
        .filter(function (item) {
          return (
            item.doctorId === appointment.doctorId &&
            item.date === appointment.date &&
            item.status === "waiting"
          );
        })
        .sort(function (a, b) {
          return (
            a.time.localeCompare(b.time) ||
            (a.checkedInAt || a.createdAt || "").localeCompare(
              b.checkedInAt || b.createdAt || ""
            ) ||
            String(a.token || "").localeCompare(
              String(b.token || "")
            )
          );
        })[0];

      if (first && first.id !== appointment.id) {
        throw new Error(
          "Call the earliest scheduled waiting patient first: " +
          first.patientName +
          ", " +
          first.time +
          "."
        );
      }
    }

    if (
      next === "in_consultation" &&
      data.appointments.some(function (item) {
        return (
          item.doctorId === appointment.doctorId &&
          item.date === appointment.date &&
          item.status === "in_consultation" &&
          item.id !== appointment.id
        );
      })
    ) {
      throw new Error(
        "This doctor already has a consultation in progress."
      );
    }

    appointment.status = next;

    if (next === "called") {
      appointment.calledAt = new Date().toISOString();
    }

    if (next === "in_consultation") {
      appointment.consultationStartedAt = new Date().toISOString();
    }

    if (next === "completed") {
      appointment.completedAt = new Date().toISOString();
    }

    save();

    return copy(appointment);
  }

  window.HealthcareState = {
    data: data,
    statuses: VALID,

    subscribe: function (listener) {
      window.addEventListener("healthcare:state-change", listener);

      return function () {
        window.removeEventListener(
          "healthcare:state-change",
          listener
        );
      };
    },

    update: function (changes) {
      Object.assign(data, changes);
      save();
    },

    updateAppointment: function (id, changes) {
      var appointment = data.appointments.find(function (item) {
        return item.id === id;
      });

      if (!appointment) {
        throw new Error("Appointment not found.");
      }

      if (
        changes.status &&
        VALID.indexOf(changes.status) === -1
      ) {
        throw new Error("Invalid status.");
      }

      Object.assign(appointment, changes);

      save();

      return appointment;
    },

    deleteAppointment: function (id) {
      var index = data.appointments.findIndex(function (item) {
        return item.id === id;
      });

      if (index === -1) {
        throw new Error("Appointment not found.");
      }

      data.appointments.splice(index, 1);
      save();
    },

    getDoctor: getDoctor,
    ensureSlots: ensureSlots,
    slotInfo: slotInfo,
    canBook: canBook,
    bookAppointment: bookAppointment,
    checkIn: checkIn,
    registerWalkIn: registerWalkIn,
    setBlocked: setBlocked,
    changeStatus: changeStatus,

    reset: function () {
      localStorage.removeItem(KEY);

      data = {
        doctors: copy(seed.doctors),
        slots: [],
        appointments: copy(seed.appointments || []),
        nextAppointment: 1001,
        nextToken: {}
      };

      normalizeTokens();
      save();
    }
  };

  normalizeTokens();

  // Generate slots for existing demo appointments.
  data.appointments.forEach(function (appointment) {
    if (appointment.doctorId && appointment.date) {
      ensureSlots(appointment.doctorId, appointment.date);
    }
  });

  save();
})();