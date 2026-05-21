$(document).ready(function () {
    $('.gimbal-btn').on('click', function () {
        var direction = $(this).data('direction');
        var statusEl = $('#gimbalStatus');
        statusEl.text('Sending ' + direction + ' …');

        $.ajax({
            url: '/camera/gimbal/' + direction,
            method: 'POST'
        })
            .done(function (resp) {
                if (resp && resp.ok) {
                    statusEl.text(
                        'Sent ' + resp.direction +
                        ' (tilt Δ ' + resp.tilt_delta_deg + '°, pan Δ ' + resp.pan_delta_deg + '°)'
                    );
                } else {
                    statusEl.text('Sent ' + direction);
                }
            })
            .fail(function (xhr) {
                statusEl.text('Failed: ' + xhr.status + ' ' + xhr.statusText);
            });
    });
});

function updateTelemetryUI(isTelemetryRunning) {
    return;
}
