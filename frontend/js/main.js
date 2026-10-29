(function () {
  var main = document.querySelector("main");
  if (main) {
    main.id = "main-content";
    main.tabIndex = -1;
    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main-content";
    skip.textContent = "Skip to main content";
    document.body.insertBefore(skip, document.body.firstChild);
  }
  var page = document.body.dataset.page || "";
  var root = document.querySelector("[data-site-header]");
  if (root) {
    root.outerHTML =
      '<header class="patient-navbar"><a class="brand" href="../../index.html">Healthcare<span>+</span></a><nav aria-label="Patient navigation"><a href="home.html">Find a doctor</a><a href="confirmation.html">My booking</a><a href="../admin/dashboard.html">Staff demo</a></nav></header>';
  }
  var layout = document.querySelector("[data-staff-layout]");
  if (layout) {
    var links = [
      ["dashboard", "Dashboard", "dashboard.html"],
      ["appointments", "Appointments", "appointments.html"],
      ["doctors", "Doctors", "doctors.html"],
      ["schedules", "Schedules", "../reception/schedules.html"],
      ["check-in", "Check-in", "../reception/check-in.html"],
      ["queue", "Live queue", "../reception/queue.html"],
    ];
    var nav = links
      .map(function (item) {
        return (
          '<a href="' +
          item[2] +
          '"' +
          (page === item[0] ? ' aria-current="page"' : "") +
          ">" +
          item[1] +
          "</a>"
        );
      })
      .join("");
    layout.outerHTML =
      '<aside class="staff-sidebar"><a class="brand" href="../../index.html">Healthcare<span>+</span></a><p>Staff workspace</p><nav aria-label="Staff navigation">' +
      nav +
      "</nav></aside>";
  }
})();
