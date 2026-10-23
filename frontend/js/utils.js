window.HealthcareUtils = {
  createId: function (prefix) { return prefix + Date.now().toString().slice(-6); },
  formatDate: function (value) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value + "T00:00:00")); },
  escapeHtml: function (value) { return String(value).replace(/[&<>"']/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]; }); }
};
