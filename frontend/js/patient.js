(function () {
  var search = document.querySelector("#doctor-search");
  var results = document.querySelector("#doctor-results");
  if (!search || !results) return;
  function render() {
    var query = search.value.toLowerCase();
    var matches = HealthcareState.data.doctors.filter(function (doctor) { return (doctor.name + " " + doctor.department).toLowerCase().indexOf(query) !== -1; });
    results.innerHTML = matches.map(function (doctor) { return '<article class="card"><h2>' + HealthcareUtils.escapeHtml(doctor.name) + '</h2><p>' + HealthcareUtils.escapeHtml(doctor.department) + '</p><a class="btn btn-primary" href="doctor-details.html?doctor=' + doctor.id + '">View availability</a></article>'; }).join("") || '<p class="empty-state">No doctors found. Try another search.</p>';
  }
  search.addEventListener("input", render);
  render();
}());
