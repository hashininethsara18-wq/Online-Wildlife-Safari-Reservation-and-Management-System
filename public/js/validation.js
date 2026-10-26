// Do not allow past dates on the new booking form
var dateInput = document.getElementById('safari_date');
if (dateInput && dateInput.dataset.futureOnly === 'true') {
  dateInput.min = new Date().toLocaleDateString('en-CA');
}

// Stop the form from sending if something is wrong, and show red messages
document.querySelectorAll('.needs-validation').forEach(function (form) {
  form.addEventListener('submit', function (event) {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add('was-validated');
  });
});