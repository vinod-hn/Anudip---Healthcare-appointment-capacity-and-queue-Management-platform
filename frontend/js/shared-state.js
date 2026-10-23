(function () {
  var initial = window.HealthcareMockData;
  var state = {
    doctors: initial.doctors.map(function (item) { return Object.assign({}, item); }),
    slots: initial.slots.map(function (item) { return Object.assign({}, item); }),
    appointments: initial.appointments.map(function (item) { return Object.assign({}, item); }),
    booking: {}
  };
  window.HealthcareState = {
    data: state,
    subscribe: function (listener) { window.addEventListener("healthcare:state-change", listener); return function () { window.removeEventListener("healthcare:state-change", listener); }; },
    update: function (nextState) { state = Object.assign(state, nextState); this.data = state; window.dispatchEvent(new CustomEvent("healthcare:state-change")); },
    reset: function () { window.location.reload(); }
  };
}());
