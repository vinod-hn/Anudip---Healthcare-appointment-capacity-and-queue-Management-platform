window.HealthcareMockData = {
  departments: ["General Medicine", "Cardiology", "Dermatology"],
  doctors: [
    {
      id: "DOC001",
      name: "Dr. Ananya Rao",
      department: "General Medicine",
      consultationMinutes: 15,
      fee: 500,
      status: "active",
    },
    {
      id: "DOC002",
      name: "Dr. Arjun Mehta",
      department: "Cardiology",
      consultationMinutes: 20,
      fee: 800,
      status: "active",
    },
    {
      id: "DOC003",
      name: "Dr. Sara Khan",
      department: "Dermatology",
      consultationMinutes: 15,
      fee: 600,
      status: "active",
    },
  ],
  slots: [
    {
      doctorId: "DOC001",
      date: "2026-10-26",
      time: "10:00",
      capacity: 2,
      booked: 1,
      blocked: false,
    },
    {
      doctorId: "DOC001",
      date: "2026-10-26",
      time: "10:15",
      capacity: 2,
      booked: 2,
      blocked: false,
    },

  ],
  appointments: [],
};
