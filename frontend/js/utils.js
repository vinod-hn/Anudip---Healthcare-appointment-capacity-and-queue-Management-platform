window.HealthcareUtils = {
  createId: function (prefix) { return prefix + Date.now().toString().slice(-6); },
  formatDate: function (value) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value + "T00:00:00")); },
  escapeHtml: function (value) { return String(value).replace(/[&<>"']/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]; }); },
  getDoctor: function (doctorId) { return HealthcareState.data.doctors.find(function (doctor) { return doctor.id === doctorId; }); },
  getAppointmentDoctor: function (appointment) { return this.getDoctor(appointment.doctorId); },
  statusLabel: function (status) { return status.replace(/_/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); }); }
};
