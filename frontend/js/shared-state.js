(function () {
  var STORAGE_KEY = "healthcare-plus-demo-state";
  var VALID_STATUSES = ["confirmed", "checked_in", "waiting", "called", "in_consultation", "completed", "cancelled", "skipped"];
  var initial = window.HealthcareMockData;
  var defaultState = {
    doctors: initial.doctors.map(function (item) { return Object.assign({}, item); }),
    slots: initial.slots.map(function (item) { return Object.assign({}, item); }),
    appointments: initial.appointments.map(function (item) { return Object.assign({}, item); }),
    booking: {}
  };
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function loadState() {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return clone(defaultState);
    try {
      var parsed = JSON.parse(saved);
      if (!Array.isArray(parsed.doctors) || !Array.isArray(parsed.slots) || !Array.isArray(parsed.appointments)) {
        throw new Error("Saved demo state has an invalid shape.");
      }
      return Object.assign(clone(defaultState), parsed);
    } catch (error) {
      console.error("Unable to load saved Healthcare+ state.", error);
      return clone(defaultState);
    }
  }
  var state = loadState();
  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error("Unable to save Healthcare+ state to localStorage.", error);
    }
  }
  function publish() {
    persist();
    window.HealthcareState.data = state;
    window.dispatchEvent(new CustomEvent("healthcare:state-change"));
  }
  window.HealthcareState = {
    data: state,
    statuses: VALID_STATUSES,
    subscribe: function (listener) {
      window.addEventListener("healthcare:state-change", listener);
      return function () { window.removeEventListener("healthcare:state-change", listener); };
    },
    update: function (nextState) {
      state = Object.assign(state, nextState);
      publish();
    },
    updateAppointment: function (id, changes) {
      var appointment = state.appointments.find(function (item) { return item.id === id; });
      if (!appointment) throw new Error("Appointment " + id + " was not found.");
      if (changes.status && VALID_STATUSES.indexOf(changes.status) === -1) throw new Error("Invalid appointment status.");
      Object.assign(appointment, changes);
      publish();
      return appointment;
    },
    addDoctor: function (doctor) {
      if (!doctor.name || !doctor.department) throw new Error("Doctor name and department are required.");
      var nextDoctor = Object.assign({ id: HealthcareUtils.createId("DOC"), consultationMinutes: 15, fee: 0, status: "active" }, doctor);
      state.doctors.push(nextDoctor);
      publish();
      return nextDoctor;
    },
    updateDoctor: function (id, changes) {
      var doctor = state.doctors.find(function (item) { return item.id === id; });
      if (!doctor) throw new Error("Doctor " + id + " was not found.");
      Object.assign(doctor, changes);
      publish();
      return doctor;
    },
    reset: function () {
      window.localStorage.removeItem(STORAGE_KEY);
      state = clone(defaultState);
      publish();
    }
  };
}());
